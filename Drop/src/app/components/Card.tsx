// src/app/components/Card.tsx
import React from 'react';
import type { Card as CardType } from '../../game/types';

interface CardProps {
    card?: CardType;
    hidden?: boolean; // If true, renders the back of the card
}

export const Card: React.FC<CardProps> = ({ card, hidden }) => {
    // Render the card back
    if (hidden || !card) {
        return (
            <div style={{
                width: '90px', height: '130px', backgroundColor: '#646cff',
                border: '3px solid #fff', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}>
                Drop
            </div>
        );
    }

    // Render the face-up card
    return (
        <div style={{
            width: '90px', height: '130px', backgroundColor: '#FFF',
            border: '2px solid #333', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#000', padding: '6px', textAlign: 'center',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)', position: 'relative'
        }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#111' }}>{card.name}</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{card.rank}</div>

            {/* Large Point Value at the bottom */}
            <div style={{
                fontSize: '24px', fontWeight: '900', marginTop: 'auto',
                color: card.rank === 'Baron' ? '#d32f2f' : '#111' // Highlight Barons in red
            }}>
                {card.value}
            </div>

            {/* Revealed Indicator */}
            {card.isRevealed && (
                <div style={{
                    position: 'absolute', top: '-10px', right: '-10px',
                    background: '#ffeb3b', color: '#000', fontSize: '10px',
                    padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold',
                    border: '1px solid #333'
                }}>
                    Revealed
                </div>
            )}
        </div>
    );
};