// src/game/actions.ts
import { getDropState, saveDropState } from './state';
import type { CardRank, DropGameState } from './types';

// ---------------------------------------------------------------------------
// PHASE TRANSITION HELPERS
// ---------------------------------------------------------------------------

/**
 * Returns the list of players still active (not dead, not folded).
 */
function getActivePlayers(state: DropGameState): string[] {
    return state.turnOrder.filter(
        id => !state.players[id].isDead && !state.players[id].hasFolded
    );
}

/**
 * Advances currentTurnIndex to the next active player, tracks round completion,
 * and handles phase transitions (TheClimb → Battle → Judgement).
 *
 * Returns true if the game should immediately transition into Judgement scoring
 * (i.e. the caller should call evaluateJudgementSync before saving).
 */
function advanceTurn(state: DropGameState): boolean {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length === 0) return true;

    state.turnsInCurrentRound++;

    // --- Round boundary: every active player has acted once ---
    if (state.turnsInCurrentRound >= activePlayers.length) {
        state.turnsInCurrentRound = 0;

        if (state.phase === 'TheClimb') {
            state.climbRoundCount++;

            if (state.climbRoundCount >= 2) {
                // Two full Climb rounds done → enter Battle phase
                state.phase = 'Battle';
                state.climbRoundCount = 0;
                // Reset turn to the hand leader for the Battle round
                state.currentTurnIndex = state.handLeaderIndex;
                return false;
            }
        } else if (state.phase === 'Battle') {
            // One Battle round done → go straight to Judgement
            state.phase = 'Judgement';
            return true; // signal caller to score
        }
    }

    // Advance to next active player (skip dead / folded)
    do {
        state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    } while (
        state.players[state.turnOrder[state.currentTurnIndex]].isDead ||
        state.players[state.turnOrder[state.currentTurnIndex]].hasFolded
        );

    return false;
}

/**
 * Synchronous judgement evaluation — mutates state directly so the caller can
 * persist everything in a single saveDropState() call.
 */
function evaluateJudgementSync(state: DropGameState): void {
    state.phase = 'Judgement';

    let activePlayers = state.turnOrder
        .map(id => state.players[id])
        .filter(p => !p.isDead && !p.hasFolded);

    // Opposing Barons Clause: 2+ different Baron cards cancel each other out
    for (const player of activePlayers) {
        const baronNames = new Set(
            player.hand.filter(c => c.rank === 'Baron').map(c => c.name)
        );
        if (baronNames.size >= 2) {
            player.isDead = true;
        }
    }

    activePlayers = activePlayers.filter(p => !p.isDead);

    if (activePlayers.length === 0) return;

    const scores = activePlayers.map(player => ({
        id: player.id,
        score: player.hand.reduce((sum, c) => sum + c.value, 0),
        antePaid: player.antePaid
    }));

    const highestScore = Math.max(...scores.map(s => s.score));
    const lowestScore  = Math.min(...scores.map(s => s.score));

    const barons    = scores.filter(s => s.score === highestScore);
    const survivors = scores.filter(s => s.score === lowestScore && lowestScore !== highestScore);

    // Barons split the pot
    if (barons.length > 0) {
        state.pot = 0; // Pot awarded; persist wallet changes separately in real impl
    }

    // Survivors reclaim their ante
    for (const surv of survivors) {
        state.pot = Math.max(0, state.pot - surv.antePaid);
    }
}

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------

export async function startHand(channelId: string, anteAmount: number): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.phase !== 'Setup') return false;

    for (const playerId of state.turnOrder) {
        const player = state.players[playerId];
        player.antePaid  += anteAmount;
        state.pot        += anteAmount;
        player.isDead     = false;
        player.hasFolded  = false;
    }
    state.currentAnteToCall = anteAmount;

    // Deal 3 cards to each player
    for (const playerId of state.turnOrder) {
        state.players[playerId].hand = state.drawPile.splice(0, 3);
    }

    // Seed discard and fallen piles
    state.discardPile.push(state.drawPile.shift()!);
    state.fallenPile.push(state.drawPile.shift()!);

    state.phase               = 'TheClimb';
    state.currentTurnIndex    = state.handLeaderIndex;
    state.climbRoundCount     = 0;
    state.turnsInCurrentRound = 0;

    await saveDropState(channelId, state);
    return true;
}

// ---------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------

/** Scavenge: swap one card from hand with the top of discard, or fallen pile. */
export async function performScavenge(
    channelId: string, playerId: string,
    cardToDiscardId: string, source: 'discard' | 'fallen' | 'draw'
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const player = state.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardToDiscardId);
    if (cardIndex === -1) return false;

    const discarded = player.hand.splice(cardIndex, 1)[0];
    discarded.isRevealed = true;
    state.discardPile.push(discarded);

    let drawn;
    if (source === 'discard')       drawn = state.discardPile.pop()!;
    else                           drawn = state.fallenPile.pop()!;

    drawn.isRevealed = false;
    player.hand.push(drawn);

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

/** Dive: discard 2 cards, pay extra ante, draw 2 (first revealed). */
export async function performDive(
    channelId: string, playerId: string,
    discardIds: string[]
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;
    if (discardIds.length !== 2) return false;

    const player = state.players[playerId];

    // Validate both cards exist in hand
    const validIds = discardIds.filter(id => player.hand.some(c => c.id === id));
    if (validIds.length !== 2) return false;

    player.antePaid += state.currentAnteToCall;
    state.pot       += state.currentAnteToCall;

    const discarded = player.hand.filter(c => discardIds.includes(c.id));
    player.hand     = player.hand.filter(c => !discardIds.includes(c.id));
    state.discardPile.push(...discarded);

    if (state.drawPile.length < 2) return false;

    const drawn1 = state.drawPile.shift()!;
    const drawn2 = state.drawPile.shift()!;

    // Reveal the first drawn card unless the player already has a revealed card
    // (Revealed-Dive special case from the rules)
    const alreadyHasRevealed = player.hand.some(c => c.isRevealed);
    drawn1.isRevealed = !alreadyHasRevealed;
    drawn2.isRevealed = false;

    player.hand.push(drawn1, drawn2);

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

/** Ascend: raise the pot; others must call or fold. In Battle, anyone may Ascend. */
export async function performAscend(
    channelId: string, playerId: string,
    raiseAmount: number
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;
    if (state.phase !== 'TheClimb' && state.phase !== 'Battle') return false;

    state.currentAnteToCall += raiseAmount;
    const player = state.players[playerId];
    player.antePaid += raiseAmount;
    state.pot       += raiseAmount;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

/** Snitch: force a target to reveal their highest or lowest card. */
export async function performSnitch(
    channelId: string, playerId: string,
    targetId: string, type: 'High' | 'Low'
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const target = state.players[targetId];
    if (!target || target.isDead || target.hasFolded) return false;

    let chosen = target.hand[0];
    for (const card of target.hand) {
        if (type === 'High' && card.value > chosen.value) chosen = card;
        if (type === 'Low'  && card.value < chosen.value) chosen = card;
    }
    chosen.isRevealed = true;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

/**
 * Sabotage: drop one of the target's cards to the Fallen pile, target draws from
 * top of Discard, and you must reveal one of your own cards.
 */
export async function performSabotage(
    channelId: string, playerId: string,
    targetId: string, cardIndex: number, revealIndex: number
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const target = state.players[targetId];
    const actor  = state.players[playerId];

    if (!target || target.isDead || target.hasFolded) return false;
    if (cardIndex  < 0 || cardIndex  >= target.hand.length) return false;
    if (revealIndex < 0 || revealIndex >= actor.hand.length)  return false;
    if (state.discardPile.length === 0) return false;

    // Drop target's chosen card to fallen pile
    const [dropped] = target.hand.splice(cardIndex, 1);
    state.fallenPile.push(dropped);

    // Target draws top of discard
    target.hand.push(state.discardPile.pop()!);

    // Reveal one of your own cards
    actor.hand[revealIndex].isRevealed = true;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

/** Smuggle (initiate): drop a card face-down, declare a rank, wait for challenges. */
export async function performSmuggle(
    channelId: string, playerId: string,
    cardId: string, declaredRank: CardRank
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const player    = state.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;
    if (state.drawPile.length === 0) return false;

    const actualCard = player.hand.splice(cardIndex, 1)[0];
    const drawnCard  = state.drawPile.shift()!;

    state.pendingSmuggle = {
        smugglerId: playerId,
        declaredRank,
        actualCard,
        drawnCard,
        playersChallenged: [],
        playersPassed: [],
        status: 'WaitingForResponses'
    };

    await saveDropState(channelId, state);
    return true;
}

/** Smuggle response: pass (no challenge). */
export async function passSmuggle(channelId: string, playerId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state?.pendingSmuggle) return;

    const smuggle = state.pendingSmuggle;
    if (!smuggle.playersPassed.includes(playerId)) {
        smuggle.playersPassed.push(playerId);
    }

    const others = getActivePlayers(state).filter(id => id !== smuggle.smugglerId);
    if (smuggle.playersPassed.length >= others.length) {
        smuggle.status = 'ResolvingDecree';
        await resolveSmuggle(state);
    }

    await saveDropState(channelId, state);
}

/** Smuggle response: challenge (call the bluff). */
export async function challengeSmuggle(channelId: string, challengerId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state?.pendingSmuggle) return;

    state.pendingSmuggle.playersChallenged.push(challengerId);
    state.pendingSmuggle.status = 'ResolvingChallenge';

    await resolveSmuggle(state, challengerId);
    await saveDropState(channelId, state);
}

async function resolveSmuggle(state: DropGameState, challengerId?: string) {
    const smuggle = state.pendingSmuggle!;
    const smuggler = state.players[smuggle.smugglerId];

    // Smuggler keeps the drawn card regardless
    smuggler.hand.push(smuggle.drawnCard);

    if (challengerId) {
        const accuser   = state.players[challengerId];
        const toldTruth = smuggle.actualCard.rank === smuggle.declaredRank;

        // Reveal actual card to table
        state.discardPile.push({ ...smuggle.actualCard, isRevealed: true });

        const loser = toldTruth ? accuser : smuggler;

        switch (smuggle.actualCard.rank) {
            case 'Baron':
                loser.antePaid += state.pot;
                state.pot      *= 2;
                break;
            case 'Warden':
                loser.hand = loser.hand.filter(c => c.rank !== 'Baron');
                break;
            case 'Citizen': {
                // Loser pays ante directly to winner of challenge
                const winner = toldTruth ? smuggler : accuser;
                winner.antePaid += loser.antePaid;
                break;
            }
            case 'Glow Worm':
                // Loser cannot become the Baron for this hand
                loser.isDead = true; // simplified: eliminates them
                break;
            case 'Hollow':
                loser.isDead = true;
                break;
        }
    } else {
        // No challenge — smuggle succeeds, card goes to Fallen pile face-down
        state.fallenPile.push(smuggle.actualCard);
        // Decree effects would be applied here based on declaredRank
    }

    state.pendingSmuggle = undefined;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);
}