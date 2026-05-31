// src/game/state.ts
import { getState, setState, Flashcore } from 'robo.js';
import type { DropGameState } from './types';
import { getShuffledDeck } from './deck';

const STATE_KEY = 'drop-game-state';
const DEFAULT_STARTING_BALANCE = 500;

const ANONYMOUS_NAMES = [
    "Kaito", "Björn", "Marina", "Akari", "Etu",
    "Anabelle", "Elania", "Lime", "Abel", "Julian",
    "Vasses", "The First Listener", "Vane", "Kess", "Seraphiel",
    "Lailah", "Obi", "Rina", "Asa", "Hino"
];

/**
 * Initializes a fresh game of Drop for a specific Discord channel.
 * This sets up the initial empty pot, starting phases, and generates a new shuffled deck.
 * * @param channelId The Discord Channel ID to use as the namespace
 */
export async function initializeGame(channelId: string, hostId: string, playerTracking: boolean = false): Promise<DropGameState> {
    const freshDeck = getShuffledDeck();

    const initialState: DropGameState = {
        pot: 0,
        baseAnte: 10,
        currentAnteToCall: 0,
        startingBalance: DEFAULT_STARTING_BALANCE,
        turnOrder: [],
        currentTurnIndex: 0,
        handLeaderIndex: 0,
        climbRoundCount: 0,
        turnsInCurrentRound: 0,
        players: {},
        drawPile: freshDeck,
        discardPile: [],
        fallenPile: [],
        phase: 'Setup',
        hostId,
        playerTracking,
        assignedNames: {},
        whispers: [],
        actionLog: []
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
    // If tracking is enabled, persist every player's balance and name to Flashcore
    if (newState.playerTracking) {
        const savePromises = newState.turnOrder.map(playerId => {
            const player = newState.players[playerId];
            if (player) {
                return Promise.all([
                    Flashcore.set(`balance_${playerId}`, player.balance),
                    // Only persist the name if tracking is enabled and one exists
                    newState.assignedNames[playerId]
                        ? Flashcore.set(`name_${playerId}`, newState.assignedNames[playerId])
                        : Promise.resolve()
                ]);
            }
            return Promise.resolve();
        });
        await Promise.all(savePromises);
    }

    await setState(STATE_KEY, newState, { namespace: channelId });
}


/**
 * Adds a player to the current game setup.
 * * @param channelId The Discord Channel ID
 * @param userId The Discord User ID of the player joining
 */
export async function joinGame(channelId: string, userId: string, userName?: string): Promise<boolean> {
    const state = await getDropState(channelId);
    if (!state) return false;
    if (state.phase !== 'Setup') return false;
    if (state.turnOrder.includes(userId)) return true;

    let startingBalance = DEFAULT_STARTING_BALANCE;

    if (state.playerTracking) {
        // Load persistent balance from Flashcore
        const savedBalance = await Flashcore.get<number>(`balance_${userId}`);
        if (typeof savedBalance === 'number') {
            startingBalance = savedBalance;
        }

        // Track their Discord Name
        const savedName = await Flashcore.get<string>(`name_${userId}`);
        if (userName) {
            state.assignedNames[userId] = userName;
        } else if (savedName) {
            state.assignedNames[userId] = savedName;
        }

        // Add user to the master tracking registry for the Admin Panel
        const trackedUsers = await Flashcore.get<string[]>('tracked_users') || [];
        if (!trackedUsers.includes(userId)) {
            trackedUsers.push(userId);
            await Flashcore.set('tracked_users', trackedUsers);
        }
    } else {
        // Assign a random thematic name to the player
        const usedNames = Object.values(state.assignedNames);
        const availableNames = ANONYMOUS_NAMES.filter(n => !usedNames.includes(n));
        const chosenName = availableNames.length > 0
            ? availableNames[Math.floor(Math.random() * availableNames.length)]
            : `Anon-${Math.floor(Math.random() * 1000)}`;
        state.assignedNames[userId] = chosenName;
    }

    state.turnOrder.push(userId);
    state.players[userId] = {
        id: userId,
        hand: [],
        antePaid: 0,
        totalContribution: 0,
        balance: startingBalance,
        isDead: false,
        hasFolded: false,
        cannotBeBaron: false
    };

    await saveDropState(channelId, state);
    return true;
}

export async function destroyGame(channelId: string): Promise<void> {
    // Wiping the state to null sends all connected clients back to the LobbyView
    await setState(STATE_KEY, null, { namespace: channelId });
}
