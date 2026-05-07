// src/game/state.ts
import { getState, setState } from 'robo.js';
import type { DropGameState } from './types';
import { getShuffledDeck } from './deck';

const STATE_KEY = 'drop-game-state';

/**
 * Initializes a fresh game of Drop for a specific Discord channel.
 * This sets up the initial empty pot, starting phases, and generates a new shuffled deck.
 * * @param channelId The Discord Channel ID to use as the namespace
 */
export async function initializeGame(channelId: string): Promise<DropGameState> {
    const freshDeck = getShuffledDeck();

    const initialState: DropGameState = {
        pot: 0,
        currentAnteToCall: 0,

        turnOrder: [],
        currentTurnIndex: 0,
        handLeaderIndex: 0,
        climbRoundCount: 0,
        turnsInCurrentRound: 0,   // NEW: tracks when a full round completes

        players: {},

        drawPile: freshDeck,
        discardPile: [],
        fallenPile: [],

        phase: 'Setup'
    };

    await setState(STATE_KEY, initialState, { namespace: channelId });
    return initialState;
}


/**
 * Retrieves the current game state for a specific channel.
 * * @param channelId The Discord Channel ID to use as the namespace
 * @returns The current DropGameState, or null if no game exists in this channel
 */
export async function getDropState(channelId: string): Promise<DropGameState | null> {
    const state = await getState<DropGameState>(STATE_KEY, { namespace: channelId });
    return state ?? null;
}


/**
 * Saves an updated game state back to the channel's namespace.
 * * @param channelId The Discord Channel ID to use as the namespace
 * @param newState The modified DropGameState to save
 */
export async function saveDropState(channelId: string, newState: DropGameState): Promise<void> {
    await setState(STATE_KEY, newState, { namespace: channelId });
}


/**
 * Adds a player to the current game setup.
 * * @param channelId The Discord Channel ID
 * @param userId The Discord User ID of the player joining
 */
export async function joinGame(channelId: string, userId: string): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state) return false;
    if (state.phase !== 'Setup') return false;
    if (state.turnOrder.includes(userId)) return true;

    state.turnOrder.push(userId);
    state.players[userId] = {
        id: userId,
        hand: [],
        antePaid: 0,
        isDead: false,
        hasFolded: false
    };

    await saveDropState(channelId, state);
    return true;
}
