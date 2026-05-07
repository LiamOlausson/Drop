// src/game/deck.ts
import type { Card, CardName, CardRank } from './types'

/**
 * Base templates mapping each Card Name to its respective Rank and Point Value
 * as defined in the Drop ruleset.
 */
interface CardTemplate {
    name: CardName;
    rank: CardRank;
    value: number;
}

const MINOR_ARCANA_TEMPLATES: CardTemplate[] = [
    { name: 'King', rank: 'Baron', value: 15 },
    { name: 'Queen', rank: 'Baron', value: 15 },
    { name: 'Knight', rank: 'Baron', value: 15 },
    { name: 'Page', rank: 'Baron', value: 15 },
    { name: '10', rank: 'Warden', value: 10 },
    { name: '9', rank: 'Warden', value: 9 },
    { name: '8', rank: 'Warden', value: 8 },
    { name: '7', rank: 'Warden', value: 7 },
    { name: '6', rank: 'Citizen', value: 6 },
    { name: '5', rank: 'Citizen', value: 5 },
    { name: '4', rank: 'Citizen', value: 4 },
    { name: '3', rank: 'Glow Worm', value: 3 },
    { name: '2', rank: 'Glow Worm', value: 2 },
    { name: 'Ace', rank: 'Hollow', value: 1 }
];

/**
 * Generates a full standard Minor Arcana deck.
 * While suits do not matter in Drop, a standard deck has 4 copies of each rank.
 * Total deck size: 56 cards (14 ranks * 4 copies).
 */
export function generateDeck(): Card[] {
    const deck: Card[] = [];
    let idCounter = 0;

    // Loop 4 times to represent the 4 traditional minor arcana suits
    for (let suitIndex = 0; suitIndex < 4; suitIndex++) {
        for (const template of MINOR_ARCANA_TEMPLATES) {
            deck.push({
                id: `card-${idCounter++}`, // Generate a unique, serializable ID for state syncing
                name: template.name,
                rank: template.rank,
                value: template.value,
                isRevealed: false // By default, cards are not revealed
            });
        }
    }

    return deck;
}

/**
 * Shuffles an array of Cards using the Fisher-Yates (Knuth) algorithm.
 * Mutates the original array and returns it for convenience.
 * * @param deck The array of cards to shuffle
 * @returns The shuffled array of cards
 */
export function shuffleDeck(deck: Card[]): Card[] {
    let currentIndex = deck.length;
    let randomIndex: number;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [deck[currentIndex], deck[randomIndex]] = [deck[randomIndex], deck[currentIndex]];
    }

    return deck;
}

/**
 * Helper function to create a fresh, shuffled deck ready for a new game.
 */
export function getShuffledDeck(): Card[] {
    const freshDeck = generateDeck();
    return shuffleDeck(freshDeck);
}