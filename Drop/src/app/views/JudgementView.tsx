// src/app/views/JudgementView.tsx
import React from 'react';
import { Card } from '../components/Card';
import type { DropGameState, HandResult } from '../../game/types';

interface JudgementViewProps {
    gameState: DropGameState;
    userId: string;
    executeAction: (action: any, payload?: any) => void;
}

const RESULT_CONFIG = {
    Baron:    { emoji: '👑', color: '#FFD700', label: 'Baron — Wins the Pot' },
    Survivor: { emoji: '🛡️', color: '#4caf50', label: 'Survivor — Reclaimed Ante' },
    Dead:     { emoji: '💀', color: '#d32f2f', label: 'Dead — Lost Everything' }
};

export const JudgementView: React.FC<JudgementViewProps> = ({ gameState, executeAction }) => {
    const { handResults, players, turnOrder } = gameState;

    // Build a lookup for quick access
    const resultMap: Record<string, HandResult> = {};
    if (handResults) {
        for (const r of handResults) resultMap[r.playerId] = r;
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '24px',
            alignItems: 'center', width: '100%', maxWidth: '900px'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)', margin: 0, fontSize: '2.5rem' }}>
                    ⚖️ Judgement
                </h1>
                <p style={{ color: '#aaa', marginTop: '6px' }}>Round {gameState.roundNumber} — All hands revealed</p>
            </div>

            {/* Pot summary */}
            <div style={{
                backgroundColor: '#1e272e', border: '2px solid #FFD700',
                borderRadius: '12px', padding: '14px 32px',
                color: '#FFD700', fontSize: '22px', fontWeight: 'bold'
            }}>
                Pot: {gameState.pot} coins
            </div>

            {/* Player result cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', width: '100%' }}>
                {turnOrder.map(playerId => {
                    const player  = players[playerId];
                    const result  = resultMap[playerId];
                    const cfg     = result ? RESULT_CONFIG[result.result] : null;
                    const score   = result?.score ?? player.hand.reduce((s, c) => s + c.value, 0);
                    const netSign = result && result.coinsChanged >= 0 ? '+' : '';

                    return (
                        <div key={playerId} style={{
                            backgroundColor: '#1e272e',
                            border: `2px solid ${cfg?.color ?? '#444'}`,
                            borderRadius: '14px', padding: '18px',
                            minWidth: '220px', textAlign: 'center',
                            boxShadow: cfg ? `0 0 16px ${cfg.color}33` : 'none'
                        }}>
                            {/* Result badge */}
                            {cfg && (
                                <div style={{
                                    backgroundColor: cfg.color, color: '#111',
                                    borderRadius: '20px', padding: '4px 16px',
                                    fontWeight: 'bold', fontSize: '13px',
                                    display: 'inline-block', marginBottom: '10px'
                                }}>
                                    {cfg.emoji} {cfg.label}
                                </div>
                            )}

                            <div style={{ color: '#ccc', fontSize: '13px', marginBottom: '4px' }}>
                                {playerId.substring(0, 10)}…
                            </div>

                            {/* Score */}
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#FFF', margin: '6px 0' }}>
                                {score} pts
                            </div>

                            {/* Balance info */}
                            <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>
                                Balance: <strong style={{ color: '#FFF' }}>{player.balance}</strong>
                                {result && (
                                    <span style={{
                                        marginLeft: '8px', fontSize: '13px',
                                        color: result.coinsChanged >= 0 ? '#4caf50' : '#d32f2f'
                                    }}>
                                        ({netSign}{result.coinsChanged})
                                    </span>
                                )}
                            </div>

                            {/* Hand display — all face up */}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {player.hand.map(card => (
                                    <Card key={card.id} card={{ ...card, isRevealed: true }} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div style={{
                display: 'flex', gap: '16px', marginTop: '10px',
                padding: '20px', backgroundColor: '#1e272e',
                borderRadius: '12px', border: '2px solid #333'
            }}>
                <button
                    onClick={() => executeAction('StartNewRound')}
                    style={{
                        padding: '14px 32px', fontSize: '18px',
                        backgroundColor: '#0be881', color: '#111',
                        border: 'none', borderRadius: '8px',
                        cursor: 'pointer', fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(11,232,129,0.35)'
                    }}
                >
                    ▶ Start Next Round
                </button>

                <button
                    onClick={() => executeAction('Initialize')}
                    style={{
                        padding: '14px 24px', fontSize: '14px',
                        backgroundColor: 'transparent', color: '#888',
                        border: '1px solid #555', borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Reset Table
                </button>
            </div>
        </div>
    );
};