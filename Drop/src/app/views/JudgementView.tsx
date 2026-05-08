// src/app/views/JudgementView.tsx
import React, { useState } from 'react';
import { Card } from '../components/Card';
import type { DropGameState } from '../../game/types';

interface JudgementViewProps {
    gameState: DropGameState;
    userId: string;
    playerNames: Record<string, string>;
    executeAction: (action: any, payload?: any) => void;
}

const RESULT_STYLE = {
    Baron:    { icon: '♛', label: 'Baron',    color: '#f0c040', bg: 'rgba(240,192,64,0.08)',  border: 'rgba(240,192,64,0.35)' },
    Survivor: { icon: '⚔', label: 'Survivor', color: '#6abf6a', bg: 'rgba(74,122,74,0.08)',   border: 'rgba(74,122,74,0.35)' },
    Dead:     { icon: '✝', label: 'Dead',     color: '#6b5e5e', bg: 'rgba(26,20,16,0.8)',      border: 'rgba(60,46,30,0.4)' },
};

export const JudgementView: React.FC<JudgementViewProps> = ({ gameState, userId, playerNames, executeAction }) => {
    const myResult = gameState.players[userId]?.handResult;
    const myCfg    = myResult ? RESULT_STYLE[myResult] : null;
    const getName  = (id: string) => gameState.assignedNames?.[id] || playerNames[id] || id.substring(0, 10) + '…';
    const isHost = gameState.hostId === userId || (!gameState.hostId && gameState.turnOrder[0] === userId);
    const isLeader = gameState.turnOrder[gameState.handLeaderIndex] === userId;
    const [anteAmount, setAnteAmount] = useState<number>(10);

    return (
        // FIX 7: viewport-locked, inner content scrolls
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', zIndex: 1,
        }}>
            {/* Header */}
            <div style={{
                flexShrink: 0, textAlign: 'center',
                padding: '16px 20px 10px',
                borderBottom: '1px solid rgba(240,192,64,0.12)',
                background: 'rgba(13,10,7,0.85)',
            }}>
                <p style={{
                    fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                    fontSize: 11, letterSpacing: 4, color: 'rgba(201,173,135,0.4)',
                    textTransform: 'uppercase', marginBottom: 4,
                }}>The Cards are Laid Bare</p>
                <h1 style={{
                    fontFamily: 'Cinzel, serif', fontWeight: 900,
                    fontSize: 32, letterSpacing: 4, color: '#f0c040',
                    textShadow: '0 0 30px rgba(240,192,64,0.3)', margin: 0,
                }}>Judgement</h1>
            </div>

            {/* Scrollable content area */}
            <div style={{
                flex: 1, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 16, padding: '16px 20px 20px',
            }}>

                {/* Your result banner */}
                {myCfg && (
                    <div style={{
                        background: myCfg.bg, border: `2px solid ${myCfg.border}`,
                        borderRadius: 10, padding: '12px 36px',
                        textAlign: 'center',
                        boxShadow: `0 0 24px ${myCfg.bg}, 0 4px 16px rgba(0,0,0,0.5)`,
                        animation: 'pulse-glow 2s ease-in-out infinite',
                        width: '100%', maxWidth: 400,
                    }}>
                        <div style={{ fontSize: 28, marginBottom: 2 }}>{myCfg.icon}</div>
                        <div style={{
                            fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 20,
                            color: myCfg.color, letterSpacing: 2,
                        }}>You are the {myCfg.label}</div>
                        {myResult === 'Baron' && (
                            <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(240,192,64,0.6)', marginTop: 3 }}>
                                The highest hand claims the Sump.
                            </p>
                        )}
                        {myResult === 'Survivor' && (
                            <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(106,191,106,0.6)', marginTop: 3 }}>
                                The lowest hand slips away with their coin.
                            </p>
                        )}
                        {myResult === 'Dead' && (
                            <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(107,94,94,0.6)', marginTop: 3 }}>
                                Caught in the middle — everything to the Sump.
                            </p>
                        )}
                    </div>
                )}

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 500 }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,192,64,0.2))' }} />
                    <span style={{ color: 'rgba(240,192,64,0.3)', fontFamily: 'serif', fontSize: 14 }}>♦</span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(240,192,64,0.2), transparent)' }} />
                </div>

                {/* All player results */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 12,
                    justifyContent: 'center', width: '100%',
                }}>
                    {gameState.turnOrder.map(playerId => {
                        const p   = gameState.players[playerId];
                        const res = p.handResult ? RESULT_STYLE[p.handResult] : RESULT_STYLE.Dead;
                        const score = p.hand.reduce((s, c) => s + c.value, 0);
                        const isYou = playerId === userId;

                        return (
                            <div key={playerId} style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                padding: '12px 16px',
                                background: res.bg, border: `1px solid ${res.border}`,
                                borderRadius: 10, minWidth: 150,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 0.5,
                                        color: isYou ? '#f0c040' : '#c9ad87', fontWeight: isYou ? 700 : 400,
                                    }}>
                                        {res.icon} {getName(playerId)}{isYou ? ' (You)' : ''}
                                    </div>
                                    <div style={{
                                        fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: 2,
                                        color: res.color, textTransform: 'uppercase', marginTop: 2,
                                    }}>{res.label}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {p.hand.map(c => <Card key={c.id} card={c} size="sm" />)}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 20,
                                        color: res.color, lineHeight: 1,
                                    }}>{score}</div>
                                    <div style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(201,173,135,0.5)' }}>pts</div>
                                </div>
                                <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 12, color: 'rgba(201,173,135,0.6)' }}>
                                    🪙 {p.balance}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {gameState.pot > 0 && (
                    <div style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(201,173,135,0.5)' }}>
                        Remaining in Sump: <strong style={{ color: '#f0c040' }}>{gameState.pot} 🪙</strong>
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#c9ad87', textTransform: 'uppercase' }}>Next Ante:</span>
                        <input
                            type="number"
                            value={anteAmount}
                            min={1}
                            onChange={e => setAnteAmount(parseInt(e.target.value) || 1)}
                            style={{
                                width: 70, textAlign: 'center',
                                background: 'rgba(26,20,16,0.8)', border: '1px solid rgba(240,192,64,0.4)',
                                color: '#f0c040', borderRadius: 4, padding: '6px 8px',
                                fontFamily: 'Cinzel, serif', outline: 'none'
                            }}
                        />
                        <span style={{ fontFamily: 'Crimson Pro, serif', color: '#f0c040', fontSize: 16 }}>🪙</span>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Allow Leader or Host to start the next hand */}
                        {(isHost || isLeader) && (
                            <button
                                onClick={() => executeAction('StartHand', { anteAmount })}
                                style={{
                                    padding: '10px 28px',
                                    background: 'rgba(240,192,64,0.12)',
                                    border: '1px solid rgba(240,192,64,0.4)',
                                    borderRadius: 7, fontFamily: 'Cinzel, serif',
                                    fontSize: 13, fontWeight: 700, letterSpacing: 1,
                                    color: '#f0c040', cursor: 'pointer', transition: 'all 0.2s ease',
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(240,192,64,0.22)'; }}
                                onMouseOut={e  => { e.currentTarget.style.background = 'rgba(240,192,64,0.12)'; }}
                            >🃏 Deal Next Hand</button>
                        )}

                        {/* Restrict to Host and use ReturnToLobby */}
                        {isHost && (
                            <button
                                onClick={() => executeAction('ReturnToLobby')}
                                style={{
                                    padding: '10px 28px',
                                    background: 'rgba(26,20,16,0.8)',
                                    border: '1px solid rgba(60,46,30,0.8)',
                                    borderRadius: 7, fontFamily: 'Cinzel, serif',
                                    fontSize: 13, fontWeight: 600, letterSpacing: 1,
                                    color: 'rgba(201,173,135,0.5)', cursor: 'pointer', transition: 'all 0.2s ease',
                                }}
                                onMouseOver={e => { e.currentTarget.style.color = '#c9ad87'; }}
                                onMouseOut={e  => { e.currentTarget.style.color = 'rgba(201,173,135,0.5)'; }}
                            >← Return to Lobby</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};