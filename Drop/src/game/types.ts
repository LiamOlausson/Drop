// src/game/types.ts

/**
 * Core Card Definitions
 * The game is played with the Minor Arcana. Suits do not matter, only Rank and Point Value.
 */
export type CardRank = 'Baron' | 'Warden' | 'Citizen' | 'Glow Worm' | 'Hollow';

export type CardName =
    | 'King' | 'Queen' | 'Knight' | 'Page'
    | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'
    | 'Ace';

export interface Card {
    id: string; // Unique identifier for the specific card instance
    name: CardName;
    rank: CardRank;
    value: number; // Point value from 1 to 15
    isRevealed: boolean; // Tracks if the card was forced face-up (e.g., via Snitch or Scavenge)
}

/**
 * Player State
 * Tracks individual player data within the current hand.
 */
export interface PlayerState {
    id: string; // Discord User ID
    hand: Card[];
    antePaid: number; // Tracks how much this player has put into the pot this hand
    isDead: boolean; // True if eliminated via Hollow consequence or Opposing Barons Clause
    hasFolded: boolean; // True if they went to the bridge (folded) during an Ascend action
}

/**
 * Game Phases
 * Matches the explicit phases defined in the Drop ruleset.
 */
export type TurnPhase =
    | 'Setup'
    | 'FeedingTheSump' // Phase 1: Ante collection
    | 'TheClimb'       // Phase 2-3: 2 Rounds of standard actions
    | 'Battle'         // Phase 4: Final play round (Ascend only)
    | 'Judgement';     // Phase 5: Reveal and Scoring

/**
 * Action Types
 * The available moves a player can make during The Climb and Battle phases.
 */
export type ActionType =
    | 'Scavenge'
    | 'Dive'
    | 'Ascend'
    | 'Snitch'
    | 'Smuggle'
    | 'Sabotage';

/**
 * Pending State for Smuggle Action
 * Because Smuggling requires input from other players (Challenge/Pass),
 * the game state must pause and track this temporary interaction.
 */
export interface SmuggleChallengeState {
    smugglerId: string;
    declaredRank: CardRank;
    actualCard: Card;
    drawnCard: Card; // The card drawn from the top of the deck (kept hidden until resolved)
    playersChallenged: string[]; // Array of user IDs who have chosen to challenge
    playersPassed: string[]; // Array of user IDs who have chosen not to challenge
    status: 'WaitingForResponses' | 'ResolvingChallenge' | 'ResolvingDecree';
}

/**
 * Master Game State
 * The root object synced across all clients via Robo.js Sync / Flashcore.
 */
export interface DropGameState {
    pot: number;
    currentAnteToCall: number; // The current highest bet that players must match to stay in

    // Turn Management
    turnOrder: string[];
    currentTurnIndex: number;
    handLeaderIndex: number;
    climbRoundCount: number;       // How many full rounds have completed in the current phase
    turnsInCurrentRound: number;   // Turns taken since last round boundary — drives phase transitions

    // Player Data Map
    players: Record<string, PlayerState>;

    // Piles
    drawPile: Card[];
    discardPile: Card[];
    fallenPile: Card[];

    // Game Flow
    phase: TurnPhase;
    pendingSmuggle?: SmuggleChallengeState;

}