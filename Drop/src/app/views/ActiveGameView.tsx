// src/app/views/ActiveGameView.tsx
import React from 'react';
import { GameBoard } from '../components/GameBoard';
import { PlayerHand } from '../components/PlayerHand';
import { ActionMenu } from '../components/ActionMenu';
import type { DropGameState } from '../../game/types';

interface ActiveGameViewProps {
    gameState: DropGameState;
    userId: string;
    executeAction: (action: any, payload?: any) => void;
}

export const ActiveGameView: React.FC<ActiveGameViewProps> = ({ gameState, userId, executeAction }) => {
    const isPlayerInGame = gameState.turnOrder.includes(userId);
    const myPlayer = isPlayerInGame ? gameState.players[userId] : null;

    const opponents = gameState.turnOrder.filter(id => id !== userId);
    const isSetup = gameState.phase === 'Setup';
    const isLeader = gameState.turnOrder[gameState.handLeaderIndex] === userId;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 20, width: '100%', maxWidth: 900, padding: '20px 16px',
            position: 'relative', zIndex: 1, animation: 'fadeUp 0.4s ease-out forwards',
        }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span style={{
            fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 900,
            color: '#f0c040', letterSpacing: 4,
            textShadow: '0 0 20px rgba(240,192,64,0.2)',
        }}>DROP</span>
                <span style={{
                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                    fontSize: 13, color: 'rgba(201,173,135,0.4)',
                    letterSpacing: 1,
                }}>Round {gameState.roundNumber} · {gameState.phase}</span>
            </div>

            {/* Setup Phase — Lobby Panel */}
            {isSetup && (
                <div style={{
                    width: '100%', maxWidth: 520,
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
                        fontSize: 14, color: 'rgba(201,173,135,0.5)',
                        margin: '0 0 20px 0',
                    }}>
                        {gameState.turnOrder.length} player{gameState.turnOrder.length !== 1 ? 's' : ''} at the table.
                    </p>

                    {/* Seated players */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 2,
                        marginBottom: 20, maxHeight: 180, overflowY: 'auto',
                    }}>
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
                    color: id === userId ? '#f0c040' : '#c9ad87',
                    letterSpacing: 0.5,
                }}>
                  {i === gameState.handLeaderIndex && <span title="Hand Leader">🌟 </span>}
                    {id.substring(0, 14)}{id === userId ? ' (You)' : ''}
                </span>
                                <span style={{
                                    fontFamily: 'Crimson Pro, serif', fontSize: 13,
                                    color: 'rgba(201,173,135,0.6)',
                                }}>
                  🪙 {gameState.players[id].balance}
                </span>
                            </div>
                        ))}
                        {gameState.turnOrder.length === 0 && (
                            <p style={{
                                fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                fontSize: 14, color: 'rgba(201,173,135,0.3)', textAlign: 'center', padding: 12,
                            }}>
                                No players yet — be first to sit.
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {!isPlayerInGame && (
                            <button
                                onClick={() => executeAction('Join')}
                                style={setupBtnStyle('#f0c040', 'rgba(240,192,64,0.12)')}
                            >
                                ⚔ Sit Down
                            </button>
                        )}
                        {isPlayerInGame && isLeader && gameState.turnOrder.length >= 1 && (
                            <button
                                onClick={() => executeAction('StartHand', { anteAmount: 10 })}
                                disabled={!!(myPlayer && myPlayer.balance < 10)}
                                style={setupBtnStyle('#6abf6a', 'rgba(74,122,74,0.12)')}
                            >
                                🃏 Deal the Cards (Ante: 10 🪙)
                            </button>
                        )}
                        {isPlayerInGame && !isLeader && (
                            <p style={{
                                fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                fontSize: 13, color: 'rgba(201,173,135,0.4)', flex: 1,
                            }}>
                                Waiting for the Hand Leader to deal…
                            </p>
                        )}
                    </div>

                    {myPlayer && myPlayer.balance < 10 && (
                        <p style={{
                            fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                            fontSize: 13, color: '#c05050', marginTop: 10,
                        }}>
                            ⚠ Not enough coin to ante (need 10 🪙)
                        </p>
                    )}
                </div>
            )}

            {/* Game Board */}
            {!isSetup && <GameBoard gameState={gameState} />}

            {/* Opponents */}
            {!isSetup && opponents.length > 0 && (
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%',
                }}>
                    {opponents.map(opponentId => (
                        <PlayerHand
                            key={opponentId}
                            player={gameState.players[opponentId]}
                            isCurrentPlayer={false}
                            isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === opponentId}
                        />
                    ))}
                </div>
            )}

            {/* Your hand */}
            {!isSetup && isPlayerInGame && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 480,
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,192,64,0.15))' }} />
                        <span style={{
                            fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 3,
                            color: 'rgba(240,192,64,0.35)', textTransform: 'uppercase',
                        }}>Your Hand</span>
                        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(240,192,64,0.15), transparent)' }} />
                    </div>
                    <PlayerHand
                        player={gameState.players[userId]}
                        isCurrentPlayer={true}
                        isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === userId}
                    />
                </div>
            )}

            {/* Action Menu */}
            {isPlayerInGame && !isSetup && (
                <div style={{
                    position: 'sticky', bottom: 12, width: '100%',
                    display: 'flex', justifyContent: 'center', zIndex: 100,
                }}>
                    <ActionMenu
                        gameState={gameState}
                        playerId={userId}
                        onAction={executeAction}
                    />
                </div>
            )}
        </div>
    );
};

function setupBtnStyle(color: string, bg: string): React.CSSProperties {
    return {
        flex: 1, padding: '10px 20px',
        background: bg, color, border: `1px solid ${color}40`,
        borderRadius: 6, fontFamily: 'Cinzel, serif',
        fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
        cursor: 'pointer', transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
    };
}