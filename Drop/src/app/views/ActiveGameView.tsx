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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>

            {/* Round indicator */}
            <div style={{ color: '#aaa', fontSize: '13px', letterSpacing: '1px' }}>
                ROUND {gameState.roundNumber}
            </div>

            <GameBoard gameState={gameState} />

            {/* Setup Phase */}
            {gameState.phase === 'Setup' && (
                <div style={{
                    padding: '24px', backgroundColor: '#1e272e',
                    border: '2px solid #333', borderRadius: '12px',
                    textAlign: 'center', minWidth: '420px'
                }}>
                    <h2 style={{ margin: '0 0 8px 0' }}>Table Setup — Round {gameState.roundNumber}</h2>
                    <p style={{ color: '#aaa', margin: '0 0 16px 0' }}>
                        Players seated: <strong>{gameState.turnOrder.length}</strong>
                    </p>

                    {/* Seated player balances */}
                    {gameState.turnOrder.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            {gameState.turnOrder.map((id, i) => (
                                <div key={id} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    padding: '6px 16px', color: '#ccc', fontSize: '13px',
                                    backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                                    borderRadius: '4px'
                                }}>
                                    <span>
                                        {id.substring(0, 10)}…
                                        {i === gameState.handLeaderIndex && ' 🌟'}
                                        {id === userId && ' (You)'}
                                    </span>
                                    <span style={{ color: '#FFD700' }}>💰 {gameState.players[id].balance}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        {!isPlayerInGame && (
                            <button
                                onClick={() => executeAction('Join')}
                                style={{ padding: '10px 20px', backgroundColor: '#3c40c6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Join Table
                            </button>
                        )}

                        {isPlayerInGame && gameState.turnOrder[gameState.handLeaderIndex] === userId && gameState.turnOrder.length >= 1 && (
                            <button
                                onClick={() => executeAction('StartHand', { anteAmount: 10 })}
                                style={{ padding: '10px 20px', backgroundColor: '#0be881', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                disabled={myPlayer !== null && myPlayer.balance < 10}
                            >
                                Start Hand (Ante: 10)
                            </button>
                        )}
                    </div>

                    {myPlayer && myPlayer.balance < 10 && (
                        <p style={{ color: '#d32f2f', marginTop: '10px', fontSize: '13px' }}>
                            ⚠ Insufficient balance to ante (need 10)
                        </p>
                    )}
                </div>
            )}

            {/* Active Players */}
            {gameState.phase !== 'Setup' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', width: '100%' }}>
                    {gameState.turnOrder.filter(id => id !== userId).map(opponentId => (
                        <PlayerHand
                            key={opponentId}
                            player={gameState.players[opponentId]}
                            isCurrentPlayer={false}
                            isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === opponentId}
                        />
                    ))}

                    {isPlayerInGame && (
                        <PlayerHand
                            player={gameState.players[userId]}
                            isCurrentPlayer={true}
                            isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === userId}
                        />
                    )}
                </div>
            )}

            {/* Action Menu */}
            {isPlayerInGame && gameState.phase !== 'Setup' && (
                <div style={{ position: 'sticky', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
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