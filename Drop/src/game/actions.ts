// src/game/actions.ts
import { getDropState, saveDropState } from './state';
import type { CardRank, DropGameState } from './types';

/**
 * PHASE 1 & SETUP: Deals cards, sets up the table, and deducts the initial ante.
 */
export async function startHand(channelId: string, anteAmount: number): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.phase !== 'Setup') return false;

    // Deduct ante from all players and add to pot
    for (const playerId of state.turnOrder) {
        const player = state.players[playerId];
        player.antePaid += anteAmount;
        state.pot += anteAmount;
        player.isDead = false;
        player.hasFolded = false;
    }
    state.currentAnteToCall = anteAmount;

    // Deal 3 cards to each player
    for (const playerId of state.turnOrder) {
        state.players[playerId].hand = state.drawPile.splice(0, 3);
    }

    // Set up Discard and Fallen piles (1 card each)
    state.discardPile.push(state.drawPile.shift()!);
    state.fallenPile.push(state.drawPile.shift()!);

    state.phase = 'TheClimb';
    state.currentTurnIndex = state.handLeaderIndex;
    state.climbRoundCount = 1;

    await saveDropState(channelId, state);
    return true;
}

/**
 * HELPER: Advances the turn to the next active player.
 */
function advanceTurn(state: DropGameState) {
    do {
        state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    } while (
        state.players[state.turnOrder[state.currentTurnIndex]].isDead ||
        state.players[state.turnOrder[state.currentTurnIndex]].hasFolded
        );
}

/**
 * ACTION: Scavenge
 * Swap a card from your hand with the top of the discard, fallen, or draw pile (if allowed).
 */
export async function performScavenge(channelId: string, playerId: string, cardToDiscardId: string, source: 'discard' | 'fallen' | 'draw'): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const player = state.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardToDiscardId);
    if (cardIndex === -1) return false;

    // Discard chosen card
    const discardedCard = player.hand.splice(cardIndex, 1)[0];
    discardedCard.isRevealed = true; // Revealed temporarily in front
    state.discardPile.push(discardedCard);

    // Draw from chosen source
    let drawnCard;
    if (source === 'discard') {
        drawnCard = state.discardPile.pop()!;
    } else if (source === 'fallen') {
        drawnCard = state.fallenPile.pop()!;
    } else {
        drawnCard = state.drawPile.shift()!; // Allow pulling from draw pile
    }

    player.hand.push(drawnCard);

    advanceTurn(state);
    await saveDropState(channelId, state);
    return true;
}

/**
 * ACTION: Dive
 * Discard 2 cards, pay extra ante, draw 2. First is revealed.
 */
export async function performDive(channelId: string, playerId: string, discardIds: [string, string]): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const player = state.players[playerId];

    // Pay extra ante
    player.antePaid += state.currentAnteToCall;
    state.pot += state.currentAnteToCall;

    // Discard 2
    const keepHand = player.hand.filter(c => !discardIds.includes(c.id));
    const discarded = player.hand.filter(c => discardIds.includes(c.id));
    player.hand = keepHand;
    state.discardPile.push(...discarded);

    // Draw 2
    const drawn1 = state.drawPile.shift()!;
    const drawn2 = state.drawPile.shift()!;

    // Reveal rules: if they don't already have a revealed card, reveal the first drawn
    if (!player.hand.some(c => c.isRevealed)) {
        drawn1.isRevealed = true;
    }

    player.hand.push(drawn1, drawn2);

    advanceTurn(state);
    await saveDropState(channelId, state);
    return true;
}

/**
 * ACTION: Ascend
 * Raise the stakes. Table must match or fold.
 */
export async function performAscend(channelId: string, playerId: string, raiseAmount: number): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    state.currentAnteToCall += raiseAmount;
    const player = state.players[playerId];
    player.antePaid += state.currentAnteToCall;
    state.pot += state.currentAnteToCall;

    advanceTurn(state);
    await saveDropState(channelId, state);
    return true;
}

/**
 * ACTION: Snitch
 * Force a target to reveal their highest or lowest card.
 */
export async function performSnitch(channelId: string, playerId: string, targetId: string, type: 'High' | 'Low'): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const target = state.players[targetId];
    if (!target || target.isDead || target.hasFolded) return false;

    let targetCard = target.hand[0];
    for (const card of target.hand) {
        if (type === 'High' && card.value > targetCard.value) targetCard = card;
        if (type === 'Low' && card.value < targetCard.value) targetCard = card;
    }

    targetCard.isRevealed = true;

    advanceTurn(state);
    await saveDropState(channelId, state);
    return true;
}

/**
 * ACTION: Sabotage
 * Drop a target's chosen card (left/mid/right) to fallen pile. They draw from discard.
 */
export async function performSabotage(channelId: string, playerId: string, targetId: string, cardIndex: number, revealIndex: number): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const target = state.players[targetId];
    const player = state.players[playerId];

    // Drop target's card to fallen pile
    const droppedCard = target.hand.splice(cardIndex, 1)[0];
    state.fallenPile.push(droppedCard);

    // Target draws from discard
    target.hand.push(state.discardPile.pop()!);

    // Reveal one of your own cards
    player.hand[revealIndex].isRevealed = true;

    advanceTurn(state);
    await saveDropState(channelId, state);
    return true;
}

/**
 * ACTION: Smuggle (Initiate)
 * Drops a card face down, claims a rank, pauses state for challenges.
 */
export async function performSmuggle(channelId: string, playerId: string, cardId: string, declaredRank: CardRank): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const player = state.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    const actualCard = player.hand.splice(cardIndex, 1)[0];
    const drawnCard = state.drawPile.shift()!;

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

/**
 * SMUGGLE LISTENER: Pass Challenge
 */
export async function passSmuggle(channelId: string, playerId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state || !state.pendingSmuggle) return;

    if (!state.pendingSmuggle.playersPassed.includes(playerId)) {
        state.pendingSmuggle.playersPassed.push(playerId);
    }

    // If all other active players passed, smuggle succeeds
    const activePlayers = state.turnOrder.filter(id => id !== state.pendingSmuggle!.smugglerId && !state.players[id].isDead && !state.players[id].hasFolded);
    if (state.pendingSmuggle.playersPassed.length >= activePlayers.length) {
        state.pendingSmuggle.status = 'ResolvingDecree';
        await resolveSmuggle(state);
        await saveDropState(channelId, state);
    } else {
        await saveDropState(channelId, state);
    }
}

/**
 * SMUGGLE LISTENER: Challenge
 */
export async function challengeSmuggle(channelId: string, challengerId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state || !state.pendingSmuggle) return;

    state.pendingSmuggle.playersChallenged.push(challengerId);
    state.pendingSmuggle.status = 'ResolvingChallenge';

    await resolveSmuggle(state, challengerId);
    await saveDropState(channelId, state);
}

/**
 * Evaluates truth/lie of Smuggle and applies consequences/decrees[cite: 1, 62, 63, 64].
 */
async function resolveSmuggle(state: DropGameState, challengerId?: string) {
    const smuggle = state.pendingSmuggle!;
    const smuggler = state.players[smuggle.smugglerId];

    smuggler.hand.push(smuggle.drawnCard);

    if (challengerId) {
        // Challenged [cite: 60]
        const accuser = state.players[challengerId];
        const toldTruth = smuggle.actualCard.rank === smuggle.declaredRank;

        state.discardPile.push(smuggle.actualCard); // Revealed to table [cite: 61]

        const loser = toldTruth ? accuser : smuggler;

        // Apply Consequence based on ACTUAL dropped card's rank [cite: 64, 66]
        switch (smuggle.actualCard.rank) {
            case 'Baron':
                loser.antePaid += state.pot; // Loser matches pot [cite: 66]
                state.pot += state.pot;
                break;
            case 'Warden':
                loser.hand = loser.hand.filter(c => c.rank !== 'Baron'); // Discard barons [cite: 66]
                // Needs redraw logic in full implementation
                break;
            case 'Hollow':
                loser.isDead = true; // Loser immediately dead [cite: 66]
                break;
            // Citizen & Glow Worm consequences omitted for brevity, but map to state similarly
        }
    } else {
        // Successful Lie / Passed
        state.fallenPile.push(smuggle.actualCard);

        // Trigger Decree based on DECLARED rank [cite: 58, 59, 66]
        // Example: state.decreePending = true; (Would pause state again for Smuggler to select targets)
    }

    state.pendingSmuggle = undefined;
    advanceTurn(state);
}

/**
 * PHASE 5: JUDGEMENT
 * Evaluates hands, handles Opposing Barons Clause, finds Baron/Survivor, awards pot.
 */
export async function evaluateJudgement(channelId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state) return;

    state.phase = 'Judgement';

    let activePlayers = state.turnOrder
        .map(id => state.players[id])
        .filter(p => !p.isDead && !p.hasFolded);

    // Evaluate Opposing Barons Clause [cite: 83]
    for (const player of activePlayers) {
        const baronNames = new Set(player.hand.filter(c => c.rank === 'Baron').map(c => c.name));
        if (baronNames.size >= 2) { // 2 or more Baron Cards of different types cancel out [cite: 84]
            player.isDead = true; // Evaluated as dead [cite: 85]
        }
    }

    activePlayers = activePlayers.filter(p => !p.isDead);

    // Calculate Scores
    const scores = activePlayers.map(player => {
        const score = player.hand.reduce((total, card) => total + card.value, 0);
        return { id: player.id, score, antePaid: player.antePaid };
    });

    if (scores.length === 0) return;

    const highestScore = Math.max(...scores.map(s => s.score));
    const lowestScore = Math.min(...scores.map(s => s.score));

    const barons = scores.filter(s => s.score === highestScore);
    const survivors = scores.filter(s => s.score === lowestScore && highestScore !== lowestScore);

    // Award Pot
    if (barons.length > 0) {
        // const splitPot = Math.floor(state.pot / barons.length);

        // Note: In a fully persistent game, you would add `splitPot` to each Baron's global coin wallet here using Flashcore.
        // For now, we just empty the pot to conclude the hand.
        state.pot = 0;
    }

    // Survivors take back ante [cite: 12]
    if (survivors.length > 0) {
        for (const surv of survivors) {
            // Give surv.antePaid back to surv
            state.pot -= surv.antePaid;
        }
    }

    await saveDropState(channelId, state);
}