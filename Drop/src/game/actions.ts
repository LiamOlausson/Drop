// src/game/actions.ts
import { getDropState, saveDropState } from './state';
import { getShuffledDeck } from './deck';
import type { CardRank, DropGameState, HandResult } from './types';

// ---------------------------------------------------------------------------
// PHASE TRANSITION HELPERS
// ---------------------------------------------------------------------------

function getActivePlayers(state: DropGameState): string[] {
    return state.turnOrder.filter(
        id => !state.players[id].isDead && !state.players[id].hasFolded
    );
}

/**
 * Advances turn index, tracks round boundaries, and handles phase transitions.
 * Returns true if the game should immediately enter Judgement scoring.
 */
function advanceTurn(state: DropGameState): boolean {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length === 0) return true;

    state.turnsInCurrentRound++;

    if (state.turnsInCurrentRound >= activePlayers.length) {
        state.turnsInCurrentRound = 0;

        if (state.phase === 'The Climb') {
            state.climbRoundCount++;
            if (state.climbRoundCount >= 2) {
                state.phase = 'Battle';
                state.climbRoundCount = 0;
                state.currentTurnIndex = state.handLeaderIndex;
                return false;
            }
        } else if (state.phase === 'Battle') {
            state.phase = 'Judgement';
            return true;
        }
    }

    // Advance to next active player
    do {
        state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    } while (
        state.players[state.turnOrder[state.currentTurnIndex]].isDead ||
        state.players[state.turnOrder[state.currentTurnIndex]].hasFolded
        );

    return false;
}

/**
 * Full scoring evaluation. Mutates state directly.
 *
 * Rules:
 *  - Opposing Barons Clause: 2+ different Baron card names → player is Dead.
 *  - Baron  (highest score): Wins the pot (split if tied).
 *  - Survivor (lowest score): Reclaims their antePaid from the pot.
 *  - Dead (everyone else):   Loses everything.
 */
function evaluateJudgementSync(state: DropGameState): void {
    state.phase = 'Judgement';
    const results: HandResult[] = [];

    // 1. Apply Opposing Barons Clause to all non-dead active players
    for (const id of state.turnOrder) {
        const p = state.players[id];
        if (p.isDead || p.hasFolded) continue;
        const baronNames = new Set(
            p.hand.filter(c => c.rank === 'Baron').map(c => c.name)
        );
        if (baronNames.size >= 2) {
            p.isDead = true;
        }
    }

    // 2. Collect active (survived) players and score them
    const active = state.turnOrder
        .map(id => state.players[id])
        .filter(p => !p.isDead && !p.hasFolded);

    // Mark dead/folded immediately
    for (const id of state.turnOrder) {
        const p = state.players[id];
        if (p.isDead || p.hasFolded) {
            p.handResult = 'Dead';
            results.push({
                playerId: id,
                score: p.hand.reduce((s, c) => s + c.value, 0),
                result: 'Dead',
                coinsChanged: -p.antePaid
            });
        }
    }

    if (active.length === 0) {
        state.handResults = results;
        return;
    }

    const scored = active.map(p => ({
        player: p,
        score: p.hand.reduce((s, c) => s + c.value, 0)
    }));

    const highScore = Math.max(...scored.map(s => s.score));
    const lowScore  = Math.min(...scored.map(s => s.score));

    const barons    = scored.filter(s => s.score === highScore);
    // Survivor only exists if there's a distinct low score (not everyone tied for high)
    const survivors = highScore !== lowScore
        ? scored.filter(s => s.score === lowScore)
        : [];
    const middle    = scored.filter(s => s.score !== highScore && s.score !== lowScore);

    // 3. Survivors reclaim their ante from the pot first
    for (const { player } of survivors) {
        const reclaimed = Math.min(player.antePaid, state.pot);
        player.balance      += reclaimed;
        player.handResult    = 'Survivor';
        state.pot            = Math.max(0, state.pot - reclaimed);
        results.push({
            playerId: player.id,
            score: player.hand.reduce((s, c) => s + c.value, 0),
            result: 'Survivor',
            coinsChanged: reclaimed - player.antePaid  // net: got back what they paid = 0 net, or partial positive
        });
    }

    // 4. Barons split the remaining pot
    const potShare = barons.length > 0 ? Math.floor(state.pot / barons.length) : 0;
    for (const { player } of barons) {
        player.balance   += potShare;
        player.handResult = 'Baron';
        results.push({
            playerId: player.id,
            score: player.hand.reduce((s, c) => s + c.value, 0),
            result: 'Baron',
            coinsChanged: potShare - player.antePaid  // net profit
        });
    }
    state.pot = state.pot - potShare * barons.length;

    // 5. Middle players (not baron, not survivor) → Dead
    for (const { player } of middle) {
        player.handResult = 'Dead';
        results.push({
            playerId: player.id,
            score: player.hand.reduce((s, c) => s + c.value, 0),
            result: 'Dead',
            coinsChanged: -player.antePaid
        });
    }

    state.handResults = results;
}

// ---------------------------------------------------------------------------
// BETWEEN-ROUND: Start a new hand on the same table
// ---------------------------------------------------------------------------

/**
 * Resets hand-specific state while preserving player balances, turn order,
 * and lobby settings. The hand leader rotates clockwise.
 */
export async function startNewRound(channelId: string): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.phase !== 'Judgement') return false;

    const freshDeck = getShuffledDeck();

    // Rotate hand leader
    state.handLeaderIndex = (state.handLeaderIndex + 1) % state.turnOrder.length;
    state.roundNumber++;

    // Reset table state
    state.pot               = 0;
    state.currentAnteToCall = 0;
    state.drawPile          = freshDeck;
    state.discardPile       = [];
    state.fallenPile        = [];
    state.phase             = 'Setup';
    state.currentTurnIndex  = state.handLeaderIndex;
    state.climbRoundCount   = 0;
    state.turnsInCurrentRound = 0;
    state.pendingSmuggle    = undefined;
    state.pendingAscend     = undefined;
    state.handResults       = undefined;

    // Reset per-hand player state; preserve balance
    for (const playerId of state.turnOrder) {
        const player = state.players[playerId];
        player.hand        = [];
        player.antePaid    = 0;
        player.isDead      = false;
        player.hasFolded   = false;
        player.handResult  = undefined;
    }

    await saveDropState(channelId, state);
    return true;
}

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------

export async function startHand(channelId: string, anteAmount: number): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.phase !== 'Setup') return false;

    // Validate all players can afford the ante
    for (const playerId of state.turnOrder) {
        if (state.players[playerId].balance < anteAmount) return false;
    }

    for (const playerId of state.turnOrder) {
        const player = state.players[playerId];
        player.balance  -= anteAmount;
        player.antePaid += anteAmount;
        state.pot       += anteAmount;
    }
    state.currentAnteToCall = anteAmount;

    // Deal 3 cards to each player
    for (const playerId of state.turnOrder) {
        state.players[playerId].hand = state.drawPile.splice(0, 3);
    }

    // Seed piles
    if (state.drawPile.length >= 2) {
        state.discardPile.push(state.drawPile.shift()!);
        state.fallenPile.push(state.drawPile.shift()!);
    }

    state.phase               = 'The Climb';
    state.currentTurnIndex    = state.handLeaderIndex;
    state.climbRoundCount     = 0;
    state.turnsInCurrentRound = 0;

    await saveDropState(channelId, state);
    return true;
}

// ---------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------

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

    let drawn;
    if (source === 'discard' && state.discardPile.length > 0) {
        drawn = state.discardPile.pop()!;
    } else if (source === 'fallen' && state.fallenPile.length > 0) {
        drawn = state.fallenPile.pop()!;
    } else {
        return false;
    }

    drawn.isRevealed = false;
    player.hand.push(drawn);
    state.discardPile.push(discarded);

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

export async function performDive(
    channelId: string, playerId: string,
    discardIds: string[]
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;
    if (discardIds.length !== 2) return false;

    const player = state.players[playerId];
    const validIds = discardIds.filter(id => player.hand.some(c => c.id === id));
    if (validIds.length !== 2) return false;
    if (state.drawPile.length < 2) return false;

    const cost = state.currentAnteToCall;
    if (player.balance < cost) return false;

    player.balance  -= cost;
    player.antePaid += cost;
    state.pot       += cost;

    const discarded = player.hand.filter(c => discardIds.includes(c.id));
    player.hand     = player.hand.filter(c => !discardIds.includes(c.id));
    state.discardPile.push(...discarded);

    const drawn1 = state.drawPile.shift()!;
    const drawn2 = state.drawPile.shift()!;

    // Revealed-Dive special case: if already holding a revealed card, don't add another
    const alreadyHasRevealed = player.hand.some(c => c.isRevealed);
    drawn1.isRevealed = !alreadyHasRevealed;
    drawn2.isRevealed = false;

    player.hand.push(drawn1, drawn2);

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

export async function performAscend(
    channelId: string, playerId: string,
    raiseAmount: number
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;
    if (state.phase !== 'The Climb' && state.phase !== 'Battle') return false;

    // FIX: If a player Passes (Raises 0), don't trigger the pending interaction, just advance their turn
    if (raiseAmount === 0) {
        const judge = advanceTurn(state);
        if (judge) evaluateJudgementSync(state);
        await saveDropState(channelId, state);
        return true;
    }

    state.currentAnteToCall += raiseAmount;
    const player = state.players[playerId];
    player.antePaid += raiseAmount;
    state.pot       += raiseAmount;

    // Pause the game state to force all other players to respond
    state.pendingAscend = {
        initiatorId: playerId,
        playersResponded: [playerId] // The initiator automatically counts as responded
    };

    // The turn advances after the betting round concludes.
    await saveDropState(channelId, state);
    return true;
}

export async function respondToAscend(
    channelId: string, playerId: string, response: 'Call' | 'Fold'
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || !state.pendingAscend) return false;

    const player = state.players[playerId];
    if (player.isDead || player.hasFolded) return false;
    if (state.pendingAscend.playersResponded.includes(playerId)) return false;

    if (response === 'Call') {
        const amountToCall = state.currentAnteToCall - player.antePaid;
        if (amountToCall > 0) {
            // Auto-fold if they can't afford it
            if (player.balance < amountToCall) {
                player.hasFolded = true;
            } else {
                player.balance  -= amountToCall;
                player.antePaid += amountToCall;
                state.pot       += amountToCall;
            }
        }
    } else {
        player.hasFolded = true;
    }

    state.pendingAscend.playersResponded.push(playerId);

    const activePlayers = state.turnOrder.filter(
        id => !state.players[id].isDead && !state.players[id].hasFolded
    );
    const allResponded = activePlayers.every(
        id => state.pendingAscend!.playersResponded.includes(id)
    );

    if (allResponded) {
        state.pendingAscend = undefined;
        const judge = advanceTurn(state);
        if (judge) evaluateJudgementSync(state);
    }

    await saveDropState(channelId, state);
    return true;
}

export async function performSnitch(
    channelId: string, playerId: string,
    targetId: string, type: 'High' | 'Low'
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const target = state.players[targetId];
    if (!target || target.isDead || target.hasFolded || target.hand.length === 0) return false;

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
    if (revealIndex < 0 || revealIndex >= actor.hand.length) return false;

    // Draw replacement card for target first
    let drawnCard;
    if (state.discardPile.length > 0) {
        drawnCard = state.discardPile.pop()!;
    } else if (state.fallenPile.length > 0) {
        drawnCard = state.fallenPile.pop()!;
    } else if (state.drawPile.length > 0) {
        drawnCard = state.drawPile.shift()!;
    } else {
        return false;
    }

    const [dropped] = target.hand.splice(cardIndex, 1);
    state.fallenPile.push(dropped);

    target.hand.push(drawnCard);
    actor.hand[revealIndex].isRevealed = true;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    await saveDropState(channelId, state);
    return true;
}

export async function performSmuggle(
    channelId: string, playerId: string,
    cardId: string, declaredRank: CardRank
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const player    = state.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1 || state.drawPile.length === 0) return false;

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

export async function challengeSmuggle(channelId: string, challengerId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state?.pendingSmuggle) return;

    state.pendingSmuggle.playersChallenged.push(challengerId);
    state.pendingSmuggle.status = 'ResolvingChallenge';

    await resolveSmuggle(state, challengerId);
    await saveDropState(channelId, state);
}

async function resolveSmuggle(state: DropGameState, challengerId?: string) {
    const smuggle  = state.pendingSmuggle!;
    const smuggler = state.players[smuggle.smugglerId];

    smuggler.hand.push(smuggle.drawnCard);

    if (challengerId) {
        const accuser   = state.players[challengerId];
        const toldTruth = smuggle.actualCard.rank === smuggle.declaredRank;

        state.discardPile.push({ ...smuggle.actualCard, isRevealed: true });

        const loser = toldTruth ? accuser : smuggler;

        switch (smuggle.actualCard.rank) {
            case 'Baron':
                // Loser must match current pot value
                loser.balance  -= state.pot;
                loser.antePaid += state.pot;
                state.pot      *= 2;
                break;
            case 'Warden':
                // Loser discards all Baron cards
                loser.hand = loser.hand.filter(c => c.rank !== 'Baron');
                break;
            case 'Citizen': {
                // Loser pays ante directly to winner
                const winner = toldTruth ? smuggler : accuser;
                const payment = Math.min(loser.balance, state.currentAnteToCall);
                loser.balance   -= payment;
                winner.balance  += payment;
                break;
            }
            case 'Glow Worm':
                loser.isDead = true;
                break;
            case 'Hollow':
                loser.isDead = true;
                break;
        }
    } else {
        // Unchallenged: card goes to Fallen pile face-down, decree applies
        state.fallenPile.push(smuggle.actualCard);
    }

    state.pendingSmuggle = undefined;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);
}