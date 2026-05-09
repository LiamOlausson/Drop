// src/game/actions.ts
import { getDropState, saveDropState } from './state';
import { getShuffledDeck } from './deck';
import type {CardRank, DropGameState, HandResult, PlayerState} from './types';

// --------------------------------------------------------------
// Helper functions
// --------------------------------------------------------------


/**
 * Helper to get all active players
 */
function getActivePlayers(state: DropGameState): string[] {
    return state.turnOrder.filter(
        id => !state.players[id].isDead && !state.players[id].hasFolded
    );
}

/**
 * Helper to safely look up a player's display name or fallback to a short ID
 */
function getPlayerName(state: DropGameState, playerId: string): string {
    return state.assignedNames?.[playerId] || playerId.substring(0, 10) + '…';
}

/**
 * Advances turn index, tracks round boundaries, and handles phase transitions.
 * Returns true if the game should immediately enter Judgement scoring.
 */
function advanceTurn(state: DropGameState): boolean {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length <= 1) return true;

    const N = state.turnOrder.length;
    const oldIndex = state.currentTurnIndex;

    // Advance to next active player (skip dead / folded)
    let newIndex = oldIndex;
    do {
        newIndex = (newIndex + 1) % N;
    } while (
        state.players[state.turnOrder[newIndex]].isDead ||
        state.players[state.turnOrder[newIndex]].hasFolded
        );

    state.currentTurnIndex = newIndex;

    // Calculate distance from the hand leader to determine if we wrapped around
    const distOld = (oldIndex - state.handLeaderIndex + N) % N;
    const distNew = (newIndex - state.handLeaderIndex + N) % N;

    // If the new distance is less than or equal to the old distance, a full round has wrapped
    if (distNew <= distOld) {
        if (state.phase === 'The Climb') {
            state.climbRoundCount++;

            if (state.climbRoundCount >= 2) {
                // Two full Climb rounds done → enter Battle phase
                state.phase = 'Battle';
                state.climbRoundCount = 0;

                // Reset turn to the first active player starting from the hand leader
                let start = state.handLeaderIndex;
                while (
                    state.players[state.turnOrder[start]].isDead ||
                    state.players[state.turnOrder[start]].hasFolded
                    ) {
                    start = (start + 1) % N;
                }
                state.currentTurnIndex = start;
                return false;
            }
        } else if (state.phase === 'Battle') {
            state.phase = 'Judgement';
            return true;
        }
    }

    return false;
}

/**
 * Full scoring evaluation. Mutates state directly.
 */
function evaluateJudgementSync(state: DropGameState): void {
    state.phase = 'Judgement';
    const results: HandResult[] = [];

    // 1. Apply Opposing Barons Clause
    for (const id of state.turnOrder) {
        const p = state.players[id];
        if (p.isDead || p.hasFolded) continue;

        const baronNames = new Set(
            p.hand.filter(c => c.rank === 'Baron').map(c => c.name)
        );
        if (baronNames.size >= 2) {
            p.isDead = true; // Caught in the Baron's war
        }
    }

    // 2. Strictly separate dead/folded players from active players
    const active: PlayerState[] = [];
    for (const id of state.turnOrder) {
        const p = state.players[id];

        // If they are dead or folded, immediately assign 'Dead' and exclude them
        if (p.isDead || p.hasFolded) {
            p.handResult = 'Dead';
            results.push({
                playerId: id,
                score: p.hand.reduce((s, c) => s + (c.value || 0), 0),
                result: 'Dead',
                coinsChanged: -p.antePaid
            });
        } else {
            active.push(p);
        }
    }

    // If everyone is dead, end calculation early
    if (active.length === 0) {
        state.handResults = results;
        return;
    }

    // 3. Map strictly active players to their scores
    const scored = active.map(p => ({
        player: p,
        score: p.hand.reduce((s, c) => s + (c.value || 0), 0)
    }));

    // 4. Calculate High and Low Scores securely
    // Filter out Glow Worm penalty players so they don't skew the high score
    const baronCandidates = scored.filter(s => !s.player.cannotBeBaron);
    const highScore = baronCandidates.length > 0
        ? Math.max(...baronCandidates.map(s => s.score))
        : -Infinity;

    // Low score still considers all active players
    const lowScore = Math.min(...scored.map(s => s.score));

    // 5. Categorize players based on the secured scores
    const barons = baronCandidates.filter(s => s.score === highScore);

    // A survivor only exists if there is a distinct difference between high and low score
    const survivors = (highScore !== lowScore && scored.length > 1)
        ? scored.filter(s => s.score === lowScore)
        : [];

    const middle = scored.filter(s => !barons.includes(s) && !survivors.includes(s));

    // 6. Apply payouts and final results
    for (const { player, score } of survivors) {
        const reclaimed = Math.min(player.antePaid, state.pot);
        player.balance      += reclaimed;
        player.handResult    = 'Survivor';
        state.pot            = Math.max(0, state.pot - reclaimed);
        results.push({
            playerId: player.id,
            score: score,
            result: 'Survivor',
            coinsChanged: reclaimed - player.antePaid
        });
    }

    const potShare = barons.length > 0 ? Math.floor(state.pot / barons.length) : 0;
    for (const { player, score } of barons) {
        player.balance   += potShare;
        player.handResult = 'Baron';
        results.push({
            playerId: player.id,
            score: score,
            result: 'Baron',
            coinsChanged: potShare - player.antePaid
        });
    }
    state.pot = Math.max(0, state.pot - (potShare * barons.length));

    for (const { player, score } of middle) {
        player.handResult = 'Dead';
        results.push({
            playerId: player.id,
            score: score,
            result: 'Dead',
            coinsChanged: -player.antePaid
        });
    }

    state.handResults = results;
}

// ---------------------------------------------------------------------------
// Setup functions
// ---------------------------------------------------------------------------

export async function startHand(channelId: string, anteAmount: number): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state) return false;

    if (state.phase !== 'Setup' && state.phase !== 'Judgement') return false;

    if (state.phase === 'Judgement') {
        state.drawPile = getShuffledDeck();

        const lastDiscard = state.discardPile.pop();
        const lastFallen = state.fallenPile.pop();
        state.discardPile = lastDiscard ? [lastDiscard] : [];
        state.fallenPile = lastFallen ? [lastFallen] : [];

        state.handLeaderIndex = (state.handLeaderIndex + 1) % state.turnOrder.length;

        state.pendingAscend = undefined;
        state.pendingSmuggle = undefined;
    }

    // Save the chosen ante for the next round's default
    state.baseAnte = anteAmount;

    // Reset handResult and hand state for each player
    for (const playerId of state.turnOrder) {
        const player = state.players[playerId];
        player.isDead      = false;
        player.hasFolded   = false;
        player.cannotBeBaron = false;
        player.antePaid    = anteAmount;
        player.totalContribution = anteAmount;
        player.hand        = [];
        player.handResult  = undefined; // clear previous round result

        // Deduct ante from balance and add to pot
        player.balance -= anteAmount;
        state.pot      += anteAmount;
    }
    state.currentAnteToCall = anteAmount;

    // Deal 3 cards to each player
    for (const playerId of state.turnOrder) {
        state.players[playerId].hand = state.drawPile.splice(0, 3);
    }

    if (state.discardPile.length === 0) state.discardPile.push(state.drawPile.shift()!);
    if (state.fallenPile.length === 0) state.fallenPile.push(state.drawPile.shift()!);

    state.phase = 'The Climb';
    state.currentTurnIndex = state.handLeaderIndex;
    state.pot = anteAmount * state.turnOrder.length; // recalculate clean

    while (
        state.players[state.turnOrder[state.currentTurnIndex]].isDead ||
        state.players[state.turnOrder[state.currentTurnIndex]].hasFolded
        ) {
        state.currentTurnIndex = (state.currentTurnIndex + 1) % state.turnOrder.length;
    }

    // Reset to initial states
    state.climbRoundCount     = 0;
    state.turnsInCurrentRound = 0;
    state.handResults         = undefined;
    state.whispers            = [];
    state.lastActionLog       = undefined;

    await saveDropState(channelId, state);
    return true;
}

// ---------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------

export async function performScavenge(
    channelId: string, playerId: string,
    cardToDiscardId: string, source: 'discard' | 'fallen' | 'opponent',
    targetPlayerId?: string, targetCardId?: string
): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state || state.turnOrder[state.currentTurnIndex] !== playerId) return false;

    const player = state.players[playerId];
    const cardIndex = player.hand.findIndex(c => c.id === cardToDiscardId);
    if (cardIndex === -1) return false;

    let drawn;

    if (source === 'discard' && state.discardPile.length > 0) {
        drawn = state.discardPile.pop()!;
    } else if (source === 'fallen' && state.fallenPile.length > 0) {
        drawn = state.fallenPile.pop()!;
    } else if (source === 'opponent' && targetPlayerId && targetCardId) {
        const target = state.players[targetPlayerId];
        if (!target || target.isDead || target.hasFolded) return false;

        // Ensure the card exists and is actually revealed
        const targetCardIndex = target.hand.findIndex(c => c.id === targetCardId);
        if (targetCardIndex === -1 || !target.hand[targetCardIndex].isRevealed) return false;

        // 1. Take the revealed card from the opponent
        drawn = target.hand.splice(targetCardIndex, 1)[0];

        // 2. Opponent immediately redraws to replace it (Priority: Discard -> Fallen -> Draw)
        let replacementCard;
        if (state.discardPile.length > 0) {
            replacementCard = state.discardPile.pop()!;
        } else if (state.fallenPile.length > 0) {
            replacementCard = state.fallenPile.pop()!;
        } else if (state.drawPile.length > 0) {
            replacementCard = state.drawPile.shift()!;
        }

        // Add the replacement card to the opponent's hand face-down
        if (replacementCard) {
            replacementCard.isRevealed = false;
            target.hand.push(replacementCard);
        }
    } else {
        return false;
    }

    // Initiator drops their card to the discard pile face-up
    const discarded = player.hand.splice(cardIndex, 1)[0];
    discarded.isRevealed = true;

    // Initiator gains the drawn card face-down
    drawn.isRevealed = false;
    player.hand.push(drawn);
    state.discardPile.push(discarded);

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    // Update the action log based on who was targeted
    let logText = `Scavenged from the ${source} pile`;
    if (source === 'opponent') {
        logText = `Scavenged a card from ${getPlayerName(state, targetPlayerId!)}'s hand`;
    }

    state.lastActionLog = { subjectId: playerId, text: logText };
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
    player.totalContribution += cost;
    state.pot       += cost;

    const discarded = player.hand.filter(c => discardIds.includes(c.id));
    player.hand     = player.hand.filter(c => !discardIds.includes(c.id));
    state.discardPile.push(...discarded);

    const drawn1 = state.drawPile.shift()!;
    const drawn2 = state.drawPile.shift()!;

    const alreadyHasRevealed = player.hand.some(c => c.isRevealed);
    drawn1.isRevealed = !alreadyHasRevealed;
    drawn2.isRevealed = false;

    player.hand.push(drawn1, drawn2);

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    state.lastActionLog = { subjectId: playerId, text: 'Dove into the sump for new cards' };
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

    // Pass (raise 0) — just advance turn
    if (raiseAmount === 0) {
        const judge = advanceTurn(state);
        if (judge) evaluateJudgementSync(state);
        await saveDropState(channelId, state);
        return true;
    }

    // Deduct raise amount from ascender's balance
    const player = state.players[playerId];
    if (player.balance < raiseAmount) return false; // can't bet what you don't have

    player.balance           -= raiseAmount;
    player.antePaid          += raiseAmount;
    player.totalContribution += raiseAmount;
    state.pot                += raiseAmount;
    state.currentAnteToCall  += raiseAmount;

    state.pendingAscend = {
        initiatorId: playerId,
        playersResponded: [playerId] // initiator already responded
    };

    state.lastActionLog = { subjectId: playerId, text: `Ascended (+${raiseAmount} 🪙)` };
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
            if (player.balance < amountToCall) {
                player.hasFolded = true;
            } else {
                player.balance  -= amountToCall;
                player.antePaid += amountToCall;
                player.totalContribution += amountToCall;
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

    state.lastActionLog = { subjectId: playerId, text: response === 'Call' ? 'Climbed' : 'Went to the Bridge' };
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

    state.lastActionLog = { subjectId: playerId, text: `Snitched on ${getPlayerName(state, targetId)}` };
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
    if (cardIndex   < 0 || cardIndex   >= target.hand.length) return false;
    if (revealIndex < 0 || revealIndex >= actor.hand.length)  return false;

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

    state.lastActionLog = { subjectId: playerId, text: `Sabotaged ${getPlayerName(state, targetId)}` };
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

    state.lastActionLog = { subjectId: playerId, text: `Smuggled a ${declaredRank}` };
    await saveDropState(channelId, state);
    return true;
}

export async function passSmuggle(channelId: string, playerId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state?.pendingSmuggle) return;

    const player = state.players[playerId];
    if (player.isDead || player.hasFolded) return;

    const smuggle = state.pendingSmuggle;
    if (!smuggle.playersPassed.includes(playerId)) {
        smuggle.playersPassed.push(playerId);
    }

    const others = getActivePlayers(state).filter(id => id !== smuggle.smugglerId);
    if (smuggle.playersPassed.length >= others.length) {
        smuggle.status = 'ResolvingDecree';
        await resolveSmuggle(state);
    }
    state.lastActionLog = { subjectId: playerId, text: `Let the smuggle go through` };
    await saveDropState(channelId, state);
}

export async function challengeSmuggle(channelId: string, challengerId: string): Promise<void> {
    const state = await getDropState(channelId);
    if (!state?.pendingSmuggle) return;

    const player = state.players[challengerId];
    if (player.isDead || player.hasFolded) return;

    state.pendingSmuggle.playersChallenged.push(challengerId);
    state.pendingSmuggle.status = 'ResolvingChallenge';

    await resolveSmuggle(state, challengerId);
    state.lastActionLog = { subjectId: challengerId, text: `Challenged the Smuggle` };
    await saveDropState(channelId, state);
}

async function resolveSmuggle(state: DropGameState, challengerId?: string) {
    const smuggle  = state.pendingSmuggle!;
    const smuggler = state.players[smuggle.smugglerId];

    // The smuggler always gets the drawn card to replace their dropped card
    smuggler.hand.push(smuggle.drawnCard);

    if (challengerId) {
        const accuser = state.players[challengerId];
        const toldTruth = smuggle.actualCard.rank === smuggle.declaredRank;

        // The challenged card is revealed to the table and goes to the discard pile
        state.discardPile.push({ ...smuggle.actualCard, isRevealed: true });

        // Determine the loser and winner of the challenge
        // If the smuggler told the truth, the accuser loses. If the smuggler lied, the smuggler loses.
        const loser = toldTruth ? accuser : smuggler;
        const winner = toldTruth ? smuggler : accuser;

        // The loser suffers the consequence of the actual dropped card's rank
        switch (smuggle.actualCard.rank) {
            case 'Baron':
                // Loser matches the current value of the pot
                loser.balance -= state.pot;
                loser.totalContribution += state.pot;
                state.pot *= 2;
                break;
            case 'Warden': {
                // Loser must discard all baron cards in their hand then redraw
                const barons = loser.hand.filter(c => c.rank === 'Baron');
                loser.hand = loser.hand.filter(c => c.rank !== 'Baron');
                state.discardPile.push(...barons.map(c => ({ ...c, isRevealed: true })));

                // Redraw to replace the discarded barons
                for (let i = 0; i < barons.length; i++) {
                    if (state.drawPile.length > 0) {
                        loser.hand.push(state.drawPile.shift()!);
                    }
                }
                break;
            }
            case 'Citizen': {
                // Loser pays an ante directly to the winner
                const payment = Math.min(loser.balance, state.currentAnteToCall);
                loser.balance -= payment;
                winner.balance += payment;
                break;
            }
            case 'Glow Worm':
                loser.cannotBeBaron = true;
                break;
            case 'Hollow':
                loser.isDead = true;
                break;
        }
        // Clean up smuggle state and advance turn
        state.pendingSmuggle = undefined;
        const judge = advanceTurn(state);
        if (judge) evaluateJudgementSync(state);
        return;
    } else {
        // Unchallenged: card goes face down to the fallen pile
        smuggle.actualCard.isRevealed = false;
        state.fallenPile.push(smuggle.actualCard);

        // Transition from Smuggle to Decree phase
        const declaredRank = smuggle.declaredRank;
        const smugglerId = smuggle.smugglerId;
        state.pendingSmuggle = undefined; // Clear smuggle

        // Auto-skip decrees that require a revealed card if no one has one
        if (declaredRank === 'Warden' || declaredRank === 'Glow Worm') {
            const hasRevealedTarget = getActivePlayers(state).some(id =>
                state.players[id].hand.some(c => c.isRevealed)
            );

            if (!hasRevealedTarget) {
                const judge = advanceTurn(state);
                if (judge) evaluateJudgementSync(state);
                return; // End early, bypassing the decree
            }
        }
        // Auto-skip Citizen if the discard pile is empty
        else if (declaredRank === 'Citizen') {
            if (state.discardPile.length === 0) {
                const judge = advanceTurn(state);
                if (judge) evaluateJudgementSync(state);
                return; // End early, bypassing the decree
            }
        }

        // Transition to the decree state
        state.pendingDecree = {
            smugglerId: smugglerId,
            decreeType: declaredRank,
            step: 'AwaitingChoice'
        };
    }
}

// Decree Handling
export async function executeDecreeBaron(channelId: string, smugglerId: string, targetId: string) {
    const state = await getDropState(channelId);
    if (!state || !state.pendingDecree) return false;

    // Security checks
    if (state.pendingDecree.smugglerId !== smugglerId) return false;
    if (state.pendingDecree.decreeType !== 'Baron') return false;
    if (state.pendingDecree.step !== 'AwaitingChoice') return false;

    const target = state.players[targetId];
    if (!target || target.isDead || target.hasFolded) return false;

    // Extract unique card ranks from the target's hand
    const uniqueRanks = Array.from(new Set(target.hand.map(c => c.rank)));
    const ranksString = uniqueRanks.length > 0 ? uniqueRanks.join(', ') : 'Nothing';

    // Add the result to the Whispers log
    const text = `truthfully announces their hand contains: ${ranksString}.`;

    if (!state.whispers) state.whispers = [];
    state.whispers.push({ subjectId: targetId, text });

    // Clean up pending decree and advance
    state.pendingDecree = undefined;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    state.lastActionLog = { subjectId: smugglerId, text: `Executed the Baron's Decree on ${getPlayerName(state, targetId)}` };
    await saveDropState(channelId, state);
    return true;
}

export async function executeDecreeWarden(channelId: string, smugglerId: string, targetId: string) {
    const state = await getDropState(channelId);
    if (!state || !state.pendingDecree) return false;

    // Security checks
    if (state.pendingDecree.smugglerId !== smugglerId) return false;
    if (state.pendingDecree.decreeType !== 'Warden') return false;
    if (state.pendingDecree.step !== 'AwaitingChoice') return false;

    const target = state.players[targetId];
    if (!target || target.isDead || target.hasFolded) return false;

    // Verify the target has a revealed card
    const hasRevealed = target.hand.some(c => c.isRevealed);
    if (!hasRevealed) return false;

    // Safely calculate their current score
    const score = target.hand.reduce((sum, c) => sum + (c.value || 0), 0);
    const isTwentyOrMore = score >= 20;

    // Add the result to the Whispers log
    const text = isTwentyOrMore
        ? "declares their score is 20 or greater."
        : "declares their score is strictly less than 20.";

    if (!state.whispers) state.whispers = [];
    state.whispers.push({ subjectId: targetId, text });

    // Clean up pending decree and advance
    state.pendingDecree = undefined;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    state.lastActionLog = { subjectId: smugglerId, text: `Executed the Warden's Decree on ${getPlayerName(state, targetId)}` };
    await saveDropState(channelId, state);
    return true;
}

export async function executeDecreeCitizen(
    channelId: string, smugglerId: string,
    discardCardIdToTake: string, handCardIdToDrop: string
) {
    const state = await getDropState(channelId);
    if (!state || !state.pendingDecree) return false;

    // Security checks
    if (state.pendingDecree.smugglerId !== smugglerId) return false;
    if (state.pendingDecree.decreeType !== 'Citizen') return false;
    if (state.pendingDecree.step !== 'AwaitingChoice') return false;

    const player = state.players[smugglerId];
    if (!player || player.isDead || player.hasFolded) return false;

    // Verify both cards exist
    const discardIndex = state.discardPile.findIndex(c => c.id === discardCardIdToTake);
    if (discardIndex === -1) return false;

    const handIndex = player.hand.findIndex(c => c.id === handCardIdToDrop);
    if (handIndex === -1) return false;

    // Swap the cards
    const takenCard = state.discardPile.splice(discardIndex, 1)[0];
    const droppedCard = player.hand.splice(handIndex, 1)[0];

    // Card entering hand is hidden, card leaving hand is revealed
    takenCard.isRevealed = false;
    droppedCard.isRevealed = true;

    player.hand.push(takenCard);
    state.discardPile.push(droppedCard);

    // Clean up pending decree and advance
    state.pendingDecree = undefined;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    state.lastActionLog = { subjectId: smugglerId, text: `Executed the Citizen's Decree` };
    await saveDropState(channelId, state);
    return true;
}

export async function executeDecreeGlowWorm(channelId: string, smugglerId: string, targetId: string) {
    const state = await getDropState(channelId);
    if (!state || !state.pendingDecree) return false;

    // Security checks
    if (state.pendingDecree.smugglerId !== smugglerId) return false;
    if (state.pendingDecree.decreeType !== 'Glow Worm') return false;
    if (state.pendingDecree.step !== 'AwaitingChoice') return false;

    const target = state.players[targetId];
    if (!target || target.isDead || target.hasFolded) return false;

    // Validate that the target actually has a revealed card
    const hasRevealed = target.hand.some(c => c.isRevealed);
    if (!hasRevealed) return false;

    // Deduct standard base ante (10 coins) from the target
    const payment = Math.min(target.balance, state.currentAnteToCall);
    target.balance -= payment;
    target.totalContribution += payment;
    state.pot += payment;

    // Clean up the pending decree state and advance the turn
    state.pendingDecree = undefined;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    state.lastActionLog = { subjectId: smugglerId, text: `Executed the Glow Worm's Decree on ${getPlayerName(state, targetId)}` };
    await saveDropState(channelId, state);
    return true;
}

export async function executeDecreeHollow(channelId: string, smugglerId: string, targetId: string) {
    const state = await getDropState(channelId);
    if (!state || !state.pendingDecree) return false;

    // Security checks
    if (state.pendingDecree.smugglerId !== smugglerId) return false;
    if (state.pendingDecree.decreeType !== 'Hollow') return false;
    if (state.pendingDecree.step !== 'AwaitingChoice') return false;

    const target = state.players[targetId];
    if (!target || target.isDead || target.hasFolded || target.hand.length === 0) return false;

    // Find the highest value card in the target's hand
    let highestIndex = 0;
    for (let i = 1; i < target.hand.length; i++) {
        if (target.hand[i].value > target.hand[highestIndex].value) {
            highestIndex = i;
        }
    }

    // Discard their highest card [cite: 67]
    const discardedCard = target.hand.splice(highestIndex, 1)[0];
    discardedCard.isRevealed = true; // Discards are face-up
    state.discardPile.push(discardedCard);

    // Clean up the pending decree state and advance the turn
    state.pendingDecree = undefined;

    const judge = advanceTurn(state);
    if (judge) evaluateJudgementSync(state);

    state.lastActionLog = { subjectId: smugglerId, text: `Executed the Hollow One's Decree on ${getPlayerName(state, targetId)}` };
    await saveDropState(channelId, state);
    return true;
}

// Kick players
export async function kickPlayer(channelId: string, hostId: string, targetId: string) {
    const state = await getDropState(channelId);
    if (!state || state.hostId !== hostId) return false;

    const target = state.players[targetId];
    if (!target) return false;

    // Mark them dead
    target.isDead = true;

    // Set the flag forcing the table to close
    state.forceLobby = true;

    // Announce the kick in whispers
    if (!state.whispers) state.whispers = [];
    state.whispers.push({ subjectId: targetId, text: "was kicked by the Host. The table will close." });

    // Resolve any pending asynchronous blocks they might be holding up
    if (state.pendingAscend && !state.pendingAscend.playersResponded.includes(targetId)) {
        state.pendingAscend.playersResponded.push(targetId);

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
    }

    if (state.pendingSmuggle && state.pendingSmuggle.status === 'WaitingForResponses') {
        if (!state.pendingSmuggle.playersPassed.includes(targetId) && !state.pendingSmuggle.playersChallenged.includes(targetId)) {
            state.pendingSmuggle.playersPassed.push(targetId);

            const others = getActivePlayers(state).filter(id => id !== state.pendingSmuggle!.smugglerId);
            if (state.pendingSmuggle.playersPassed.length >= others.length) {
                state.pendingSmuggle.status = 'ResolvingDecree';
                await resolveSmuggle(state); // Safely resolves the smuggle
            }
        }
    }

    // If it was specifically their turn during the standard phase, advance it
    if (
        state.phase !== 'Setup' &&
        state.phase !== 'Judgement' &&
        !state.pendingAscend &&
        !state.pendingSmuggle &&
        !state.pendingDecree &&
        state.turnOrder[state.currentTurnIndex] === targetId
    ) {
        const judge = advanceTurn(state);
        if (judge) evaluateJudgementSync(state);
    }

    await saveDropState(channelId, state);
    return true;
}
