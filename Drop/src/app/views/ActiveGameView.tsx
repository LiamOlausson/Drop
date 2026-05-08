// src/app/views/ActiveGameView.tsx
import React, { useState } from 'react';
import { GameBoard } from '../components/GameBoard';
import { PlayerHand } from '../components/PlayerHand';
import { ActionMenu } from '../components/ActionMenu';
import type { DropGameState } from '../../game/types';

interface ActiveGameViewProps {
    gameState: DropGameState;
    userId: string;
    playerNames: Record<string, string>;
    executeAction: (action: any, payload?: any) => void;
}

export const ActiveGameView: React.FC<ActiveGameViewProps> = ({ gameState, userId, playerNames, executeAction }) => {
    const isPlayerInGame = gameState.turnOrder.includes(userId);
    const myPlayer = isPlayerInGame ? gameState.players[userId] : null;
    const opponents = gameState.turnOrder.filter(id => id !== userId);
    const isSetup = gameState.phase === 'Setup';
    const isLeader = gameState.turnOrder[gameState.handLeaderIndex] === userId;
    const isHost = gameState.hostId === userId || (!gameState.hostId && gameState.turnOrder[0] === userId);
    const [anteAmount, setAnteAmount] = useState<number>(10);
    const getName = (id: string) => gameState.assignedNames?.[id] || playerNames[id] || id.substring(0, 10) + '…';

    // FIX 7: Entire layout is viewport-locked, no scrolling
    return (
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1,
            padding: 'env(safe-area-inset-top, 16px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 24px) env(safe-area-inset-left, 16px)',
            boxSizing: 'border-box'
        }}>
            {/* ── Top Header Bar ── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 20px',
                borderBottom: '1px solid rgba(240,192,64,0.12)',
                background: 'rgba(13,10,7,0.85)',
                backdropFilter: 'blur(4px)',
                flexShrink: 0,
                zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                        fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 900,
                        color: '#f0c040', letterSpacing: 4,
                        textShadow: '0 0 20px rgba(240,192,64,0.2)',
                    }}>DROP</span>

                    {/* Admin buttons for the Host */}
                    {isHost && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => executeAction('ReturnToLobby')}
                                style={{
                                    background: 'rgba(139,26,26,0.2)', border: '1px solid rgba(192,57,43,0.5)',
                                    color: '#e05050', fontSize: 10, fontFamily: 'Cinzel, serif',
                                    padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                                    textTransform: 'uppercase', letterSpacing: 1
                                }}
                            >
                                Return to Lobby
                            </button>
                            <button
                                onClick={() => executeAction('Initialize', { playerTracking: gameState.playerTracking })}
                                style={{
                                    background: 'rgba(139,26,26,0.2)', border: '1px solid rgba(192,57,43,0.5)',
                                    color: '#e05050', fontSize: 10, fontFamily: 'Cinzel, serif',
                                    padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                                    textTransform: 'uppercase', letterSpacing: 1
                                }}
                            >
                                Reset Game
                            </button>
                        </div>
                    )}
                </div>

                <span style={{
                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                    fontSize: 13, color: 'rgba(201,173,135,0.4)', letterSpacing: 1,
                }}>Round {gameState.roundNumber} · {gameState.phase}</span>

                <div style={{
                    fontFamily: 'Cinzel, serif', fontSize: 12,
                    color: 'rgba(240,192,64,0.5)',
                }}>
                    🪙 {myPlayer?.balance ?? '—'}
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div style={{
                flex: 1, display: 'flex', overflow: 'hidden',
            }}>

                {/* ── Setup Phase ── */}
                {isSetup && (
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20,
                    }}>
                        <div style={{
                            width: '100%', maxWidth: 480,
                            background: 'linear-gradient(160deg, rgba(26,20,16,0.97) 0%, rgba(18,14,10,0.97) 100%)',
                            border: '1px solid rgba(60,46,30,0.9)',
                            borderTop: '3px solid rgba(240,192,64,0.35)',
                            borderRadius: 10, padding: '24px 28px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                        }}>
                            <h2 style={{
                                fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 16,
                                letterSpacing: 2, color: '#f0c040', textTransform: 'uppercase',
                                margin: '0 0 4px 0',
                            }}>The Table is Set</h2>
                            <p style={{
                                fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                fontSize: 14, color: 'rgba(201,173,135,0.5)', margin: '0 0 20px 0',
                            }}>
                                {gameState.turnOrder.length} player{gameState.turnOrder.length !== 1 ? 's' : ''} at the table.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
                                {gameState.turnOrder.map((id, i) => (
                                    <div key={id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '7px 12px',
                                        background: id === userId ? 'rgba(240,192,64,0.06)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: 5,
                                        border: id === userId ? '1px solid rgba(240,192,64,0.2)' : '1px solid transparent',
                                    }}>
                                        <span style={{
                                            fontFamily: 'Cinzel, serif', fontSize: 11,
                                            color: id === userId ? '#f0c040' : '#c9ad87', letterSpacing: 0.5,
                                        }}>
                                            {i === gameState.handLeaderIndex && <span title="Hand Leader">🌟 </span>}
                                            {getName(id)}{id === userId ? ' (You)' : ''}
                                        </span>
                                        <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(201,173,135,0.6)' }}>
                                            🪙 {gameState.players[id].balance}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {!isPlayerInGame && (
                                    <button onClick={() => executeAction('Join')} style={setupBtnStyle('#f0c040', 'rgba(240,192,64,0.12)')}>
                                        ⚔ Sit Down
                                    </button>
                                )}
                                {/* Allow isLeader OR isHost to deal */}
                                {isPlayerInGame && (isLeader || isHost) && gameState.turnOrder.length >= 1 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#c9ad87', textTransform: 'uppercase' }}>Base Ante:</span>
                                            <input
                                                type="number"
                                                value={anteAmount}
                                                min={1}
                                                onChange={e => setAnteAmount(parseInt(e.target.value) || 1)}
                                                style={{
                                                    width: 60, textAlign: 'center',
                                                    background: 'rgba(26,20,16,0.8)', border: '1px solid rgba(240,192,64,0.4)',
                                                    color: '#f0c040', borderRadius: 4, padding: '4px 8px',
                                                    fontFamily: 'Cinzel, serif', outline: 'none'
                                                }}
                                            />
                                            <span style={{ fontFamily: 'Crimson Pro, serif', color: '#f0c040' }}>🪙</span>
                                        </div>
                                        <button
                                            onClick={() => executeAction('StartHand', { anteAmount })}
                                            disabled={!!(myPlayer && myPlayer.balance < anteAmount)}
                                            style={setupBtnStyle('#6abf6a', 'rgba(74,122,74,0.12)')}
                                        >
                                            🃏 Deal the Cards
                                        </button>
                                    </div>
                                )}

                                {/* Waiting message only shows if you aren't the leader AND aren't the host */}
                                {isPlayerInGame && !isLeader && !isHost && (
                                    <p style={{
                                        fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                        fontSize: 13, color: 'rgba(201,173,135,0.4)', flex: 1,
                                    }}>
                                        Waiting for the Hand Leader to deal…
                                    </p>
                                )}
                            </div>

                            {/* update the warning to reference the new dynamic anteAmount */}
                            {myPlayer && myPlayer.balance < anteAmount && (
                                <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: '#c05050', marginTop: 10 }}>
                                    ⚠ Not enough coin to ante (need {anteAmount} 🪙)
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Active Game Layout ── */}
                {!isSetup && (
                    <>
                        {/* FIX 4: Center = table + your hand stacked */}
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', overflow: 'hidden',
                            padding: '12px 12px 0',
                            gap: 10,
                        }}>
                            {/* Game Board */}
                            <div style={{ flexShrink: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <GameBoard gameState={gameState} />
                            </div>

                            {/* Your hand + action menu stacked below board */}
                            {isPlayerInGame && (
                                <div style={{
                                    flex: 1, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', gap: 8, width: '100%',
                                    overflow: 'hidden', paddingBottom: 8,
                                }}>
                                    {/* Divider label */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        width: '100%', maxWidth: 500, flexShrink: 0,
                                    }}>
                                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,192,64,0.15))' }} />
                                        <span style={{
                                            fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 3,
                                            color: 'rgba(240,192,64,0.35)', textTransform: 'uppercase',
                                        }}>Your Hand</span>
                                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(240,192,64,0.15), transparent)' }} />
                                    </div>

                                    {/* Player's own hand — always visible */}
                                    <div style={{ flexShrink: 0 }}>
                                        <PlayerHand
                                            player={gameState.players[userId]}
                                            isCurrentPlayer={true}
                                            isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === userId}
                                            displayName={getName(userId)}
                                        />
                                    </div>

                                    {/* Action menu - takes remaining space */}
                                    <div style={{
                                        width: '100%', maxWidth: 600,
                                        flexShrink: 1,
                                        overflowY: 'auto',
                                        paddingBottom: 10
                                    }}>
                                        <ActionMenu
                                            gameState={gameState}
                                            playerId={userId}
                                            playerNames={playerNames}
                                            onAction={executeAction}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FIX 4: Right panel = opponents list */}
                        {opponents.length > 0 && (
                            <div style={{
                                width: 200,
                                borderLeft: '1px solid rgba(60,46,30,0.6)',
                                background: 'rgba(13,10,7,0.6)',
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}>
                                <div style={{
                                    padding: '10px 12px 8px',
                                    borderBottom: '1px solid rgba(60,46,30,0.5)',
                                    flexShrink: 0,
                                }}>
                                    <span style={{
                                        fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 3,
                                        color: 'rgba(240,192,64,0.4)', textTransform: 'uppercase',
                                    }}>At the Table</span>
                                </div>
                                <div style={{
                                    flex: 1, overflowY: 'auto', padding: '8px',
                                    display: 'flex', flexDirection: 'column', gap: 8,
                                }}>
                                    {opponents.map(opponentId => (
                                        <PlayerHand
                                            key={opponentId}
                                            player={gameState.players[opponentId]}
                                            isCurrentPlayer={false}
                                            isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === opponentId}
                                            displayName={getName(opponentId)}
                                            compact={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

function setupBtnStyle(color: string, bg: string): React.CSSProperties {
    return {
        flex: 1, padding: '10px 20px',
        background: bg, color, border: `1px solid ${color}40`,
        borderRadius: 6, fontFamily: 'Cinzel, serif',
        fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
        cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
    };
}
