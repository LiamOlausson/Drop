// src/app/components/PlayerHand.tsx
import React from 'react';
import { Card } from './Card';
import type { PlayerState } from '../../game/types';

interface PlayerHandProps {
    player: PlayerState;
    isCurrentPlayer: boolean;
    isActiveTurn?: boolean;
}

const RESULT_STYLE: Record<string, { label: string; color: string }> = {
    Baron:    { label: '👑 Baron',    color: '#FFD700' },
    Survivor: { label: '🛡️ Survivor', color: '#4caf50' },
    Dead:     { label: '💀 Dead',     color: '#d32f2f' }
};

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, isCurrentPlayer, isActiveTurn }) => {
    const resultCfg = player.handResult ? RESULT_STYLE[player.handResult] : null;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '16px',
            backgroundColor: isActiveTurn ? 'rgba(255,215,0,0.12)' : 'rgba(0,0,0,0.4)',
            border: isActiveTurn ? '2px solid #FFD700' : '2px solid #444',
            borderRadius: '12px', width: '300px',
            transition: 'all 0.3s ease',
            opacity: (player.isDead || player.hasFolded) ? 0.5 : 1
        }}>
            {/* Header row */}
            <div style={{
                width: '100%', display: 'flex', justifyContent: 'space-between',
                marginBottom: '8px', color: '#FFF', fontWeight: 'bold', fontSize: '13px'
            }}>
                <span>{player.id.substring(0, 10)}… {isCurrentPlayer && '(You)'}</span>
                <span style={{ color: '#FFD700' }}>💰 {player.balance}</span>
            </div>

            {/* Ante paid */}
            <div style={{
                width: '100%', display: 'flex', justifyContent: 'flex-end',
                marginBottom: '8px', color: '#aaa', fontSize: '12px'
            }}>
                Ante in: <strong style={{ color: '#FFF', marginLeft: '4px' }}>{player.antePaid}</strong>
            </div>

            {/* Status badges */}
            {resultCfg && (
                <div style={{
                    backgroundColor: resultCfg.color, color: '#111',
                    padding: '3px 12px', borderRadius: '4px',
                    marginBottom: '10px', fontSize: '12px', fontWeight: 'bold'
                }}>
                    {resultCfg.label}
                </div>
            )}
            {!resultCfg && (player.isDead || player.hasFolded) && (
                <div style={{
                    backgroundColor: player.isDead ? '#d32f2f' : '#555',
                    color: 'white', padding: '4px 12px', borderRadius: '4px',
                    marginBottom: '10px', fontSize: '12px', fontWeight: 'bold'
                }}>
                    {player.isDead ? '💀 Dead' : 'Folded'}
                </div>
            )}

            {/* Cards */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {player.hand.map(card => (
                    <div
                        key={card.id}
                        style={{
                            transform: isCurrentPlayer ? 'translateY(-8px)' : 'none',
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        <Card card={card} hidden={!isCurrentPlayer && !card.isRevealed} />
                    </div>
                ))}
                {player.hand.length === 0 && (
                    <span style={{ color: '#666', fontStyle: 'italic', padding: '40px 0' }}>
                        No cards
                    </span>
                )}
            </div>
        </div>
    );
};