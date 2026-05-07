// src/app/components/PlayerHand.tsx
import React from 'react';
import { Card } from './Card';
import type { PlayerState } from '../../game/types';

interface PlayerHandProps {
    player: PlayerState;
    isCurrentPlayer: boolean; // Determines if the screen viewer owns this hand
    isActiveTurn?: boolean; // Highlights the player if it's currently their turn
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, isCurrentPlayer, isActiveTurn }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: isActiveTurn ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.4)',
            border: isActiveTurn ? '2px solid #FFD700' : '2px solid #444',
            borderRadius: '12px',
            width: '320px',
            transition: 'all 0.3s ease',
            opacity: player.isDead || player.hasFolded ? 0.5 : 1 // Dim dead/folded players
        }}>
            {/* Player Info Header */}
            <div style={{
                width: '100%', display: 'flex', justifyContent: 'space-between',
                marginBottom: '12px', color: '#FFF', fontWeight: 'bold'
            }}>
                <span>User: {player.id.substring(0, 8)}... {isCurrentPlayer && '(You)'}</span>
                <span>Ante: {player.antePaid}</span>
            </div>

            {/* Status Badges */}
            {(player.isDead || player.hasFolded) && (
                <div style={{
                    backgroundColor: player.isDead ? '#d32f2f' : '#555',
                    color: 'white', padding: '4px 12px', borderRadius: '4px',
                    marginBottom: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase'
                }}>
                    {player.isDead ? 'Dead' : 'Folded'}
                </div>
            )}

            {/* The Cards */}
            <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                position: 'relative'
            }}>
                {player.hand.map((card) => {
                    // Logic to determine if the card should be hidden
                    const shouldHide = !isCurrentPlayer && !card.isRevealed;

                    return (
                        <div key={card.id} style={{
                            // Slight lift effect for the current player's cards to make them feel interactive
                            transform: isCurrentPlayer ? 'translateY(-10px)' : 'none',
                            transition: 'transform 0.2s ease',
                            cursor: isCurrentPlayer ? 'pointer' : 'default'
                        }}>
                            <Card
                                card={card}
                                hidden={shouldHide}
                            />
                        </div>
                    );
                })}

                {/* Empty Hand Fallback */}
                {player.hand.length === 0 && (
                    <span style={{ color: '#888', fontStyle: 'italic', padding: '40px 0' }}>
                        No cards in hand
                    </span>
                )}
            </div>
        </div>
    );
};