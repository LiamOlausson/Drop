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
    antePaid: number; // Strictly tracks bets to match the current round
    totalContribution: number; // Tracks total money put into the pot (bets + fees)
    balance: number;  // Running coin balance for this lobby session
    isDead: boolean; // True if eliminated via Hollow consequence or Opposing Barons Clause
    hasFolded: boolean; // True if they went to the bridge (folded) during an Ascend action
    cannotBeBaron?: boolean; // True if Glow Worm consequence prevents them from winning the pot
    handResult?: 'Baron' | 'Survivor' | 'Dead'; // Result of the completed hand
}

/** Records the outcome of a single player at the end of a hand. */
export interface HandResult {
    playerId: string;
    score: number;
    result: 'Baron' | 'Survivor' | 'Dead';
    coinsChanged: number; // Positive = coins gained, negative = lost (relative to ante paid)
}

/**
 * Game Phases
 * Matches the explicit phases defined in the Drop ruleset.
 */
export type TurnPhase =
    | 'Setup'
    | 'Feeding The Sump' // Phase 1: Ante collection
    | 'The Climb'       // Phase 2-3: 2 Rounds of standard actions
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
    | 'Sabotage'
    | 'ExecuteDecree';

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
 * Pending State for Ascend Action
 * Because Ascending requires input from other players (Call/Fold),
 * the game state must pause and track this temporary interaction.
 */
export interface AscendChallengeState {
    initiatorId: string;
    playersResponded: string[]; // Tracks who has already called or folded
}

/**
 * Whispers ui to help with decrees
 */
export interface Whisper {
    subjectId: string;
    text: string;
}

/**
 * Pending State for a Decree Action
 * Occurs when a Smuggle goes unchallenged. The smuggler must now make a choice based on their declared rank.
 */
export interface PendingDecreeState {
    smugglerId: string;
    decreeType: CardRank; // The rank they *declared*, which dictates the power
    step: 'AwaitingChoice' | 'RevealingInformation'; // Some decrees just do an action, others reveal info

    // For storing the results of info-revealing decrees so the UI can display them
    revealedInfo?: {
        targetId: string;
        message: string;
    };
}

/**
 * Master Game State
 * The root object synced across all clients via Robo.js Sync / Flashcore.
 */
export interface DropGameState {
    // Table Stats
    pot: number;
    baseAnte: number;
    currentAnteToCall: number; // The current highest bet that players must match to stay in
    startingBalance: number;  // The initial balance each player gets when the lobby is created
    roundNumber: number;      // Increments each hand

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
    handResults?: HandResult[]; // Populated after Judgement; cleared at start of next hand
    pendingAscend?: AscendChallengeState;
    lastActionLog?: { subjectId: string; text: string; };

    // Smuggle Action
    pendingSmuggle?: SmuggleChallengeState;
    pendingDecree?: PendingDecreeState;
    whispers: Whisper[];

    // Gamemodes
    playerTracking: boolean;
    assignedNames: Record<string, string>;

    // Dev/Admin/Host
    hostId: string;
    forceLobby?: boolean;
}
