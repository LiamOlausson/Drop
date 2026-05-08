// src/app/views/JudgementView.tsx
import React from 'react';
import { Card } from '../components/Card';
import type { DropGameState } from '../../game/types';

interface JudgementViewProps {
    gameState: DropGameState;
    userId: string;
    executeAction: (action: any, payload?: any) => void;
}

const RESULT_STYLE = {
    Baron:    { icon: '♛', label: 'Baron',    color: '#f0c040', bg: 'rgba(240,192,64,0.08)',  border: 'rgba(240,192,64,0.35)' },
    Survivor: { icon: '⚔', label: 'Survivor', color: '#6abf6a', bg: 'rgba(74,122,74,0.08)',   border: 'rgba(74,122,74,0.35)' },
    Dead:     { icon: '✝', label: 'Dead',     color: '#6b5e5e', bg: 'rgba(26,20,16,0.8)',      border: 'rgba(60,46,30,0.4)' },
};

export const JudgementView: React.FC<JudgementViewProps> = ({ gameState, userId, executeAction }) => {
    const myResult = gameState.players[userId]?.handResult;
    const myCfg = myResult ? RESULT_STYLE[myResult] : null;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 24, width: '100%', maxWidth: 900, padding: '32px 16px',
            position: 'relative', zIndex: 1,
            animation: 'fadeUp 0.5s ease-out forwards',
        }}>

            {/* Title */}
            <div style={{ textAlign: 'center' }}>
                <p style={{
                    fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                    fontSize: 13, letterSpacing: 4, color: 'rgba(201,173,135,0.4)',
                    textTransform: 'uppercase', marginBottom: 8,
                }}>The Cards are Laid Bare</p>
                <h1 style={{
                    fontFamily: 'Cinzel, serif', fontWeight: 900,
                    fontSize: 42, letterSpacing: 4,
                    color: '#f0c040',
                    textShadow: '0 0 40px rgba(240,192,64,0.3)',
                    margin: 0,
                }}>Judgement</h1>
            </div>

            {/* Your personal result */}
            {myCfg && (
                <div style={{
                    background: myCfg.bg, border: `2px solid ${myCfg.border}`,
                    borderRadius: 12, padding: '16px 40px',
                    textAlign: 'center',
                    boxShadow: `0 0 30px ${myCfg.bg}, 0 4px 16px rgba(0,0,0,0.5)`,
                    animation: 'pulse-glow 2s ease-in-out infinite',
                }}>
                    <div style={{ fontSize: 36, marginBottom: 4 }}>{myCfg.icon}</div>
                    <div style={{
                        fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 24,
                        color: myCfg.color, letterSpacing: 2,
                    }}>You are the {myCfg.label}</div>
                    {myResult === 'Baron' && (
                        <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(240,192,64,0.6)', marginTop: 4 }}>
                            The highest hand claims the Sump.
                        </p>
                    )}
                    {myResult === 'Survivor' && (
                        <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(106,191,106,0.6)', marginTop: 4 }}>
                            The lowest hand slips away with their coin.
                        </p>
                    )}
                    {myResult === 'Dead' && (
                        <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(107,94,94,0.6)', marginTop: 4 }}>
                            Caught in the middle — everything to the Sump.
                        </p>
                    )}
                </div>
            )}

            {/* Divider */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 600,
            }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,192,64,0.2))' }} />
                <span style={{ color: 'rgba(240,192,64,0.3)', fontFamily: 'serif', fontSize: 16 }}>♦</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(240,192,64,0.2), transparent)' }} />
            </div>

            {/* All player results */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', width: '100%',
            }}>
                {gameState.turnOrder.map(playerId => {
                    const p = gameState.players[playerId];
                    const res = p.handResult ? RESULT_STYLE[p.handResult] : RESULT_STYLE.Dead;
                    const score = p.hand.reduce((s, c) => s + c.value, 0);
                    const isYou = playerId === userId;

                    return (
                        <div key={playerId} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                            padding: '16px 20px',
                            background: res.bg, border: `1px solid ${res.border}`,
                            borderRadius: 12, minWidth: 170,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                        }}>
                            {/* Player header */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 1,
                                    color: isYou ? '#f0c040' : '#c9ad87', fontWeight: isYou ? 700 : 400,
                                }}>
                                    {res.icon} {playerId.substring(0, 12)}{isYou ? ' (You)' : ''}
                                </div>
                                <div style={{
                                    fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 2,
                                    color: res.color, textTransform: 'uppercase', marginTop: 3,
                                }}>{res.label}</div>
                            </div>

                            {/* Cards — all revealed */}
                            <div style={{ display: 'flex', gap: 6 }}>
                                {p.hand.map(c => (
                                    <Card key={c.id} card={c} size="sm" />
                                ))}
                            </div>

                            {/* Score & balance */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 22,
                                    color: res.color, lineHeight: 1,
                                }}>{score}</div>
                                <div style={{
                                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                    fontSize: 12, color: 'rgba(201,173,135,0.5)',
                                }}>pts</div>
                            </div>

                            <div style={{
                                fontFamily: 'Crimson Pro, serif', fontSize: 13,
                                color: 'rgba(201,173,135,0.6)',
                            }}>
                                🪙 {p.balance}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pot remaining */}
            {gameState.pot > 0 && (
                <div style={{
                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                    fontSize: 14, color: 'rgba(201,173,135,0.5)',
                }}>
                    Remaining in Sump: <strong style={{ color: '#f0c040' }}>{gameState.pot} 🪙</strong>
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                <button
                    onClick={() => executeAction('StartHand', { anteAmount: 10 })}
                    style={{
                        padding: '12px 32px',
                        background: 'rgba(240,192,64,0.12)',
                        border: '1px solid rgba(240,192,64,0.4)',
                        borderRadius: 7, fontFamily: 'Cinzel, serif',
                        fontSize: 14, fontWeight: 700, letterSpacing: 1,
                        color: '#f0c040', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(240,192,64,0.22)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(240,192,64,0.12)'; }}
                >
                    🃏 Deal Next Hand
                </button>

                <button
                    onClick={() => executeAction('Initialize')}
                    style={{
                        padding: '12px 32px',
                        background: 'rgba(26,20,16,0.8)',
                        border: '1px solid rgba(60,46,30,0.8)',
                        borderRadius: 7, fontFamily: 'Cinzel, serif',
                        fontSize: 14, fontWeight: 600, letterSpacing: 1,
                        color: 'rgba(201,173,135,0.5)', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseOver={e => { e.currentTarget.style.color = '#c9ad87'; }}
                    onMouseOut={e => { e.currentTarget.style.color = 'rgba(201,173,135,0.5)'; }}
                >
                    ← Return to Lobby
                </button>
            </div>

        </div>
    );
};