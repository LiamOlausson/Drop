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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>

            {/* The Main Center Table */}
            <GameBoard gameState={gameState} />

            {/* SETUP PHASE UI: Joining and Starting */}
            {gameState.phase === 'Setup' && (
                <div style={{ padding: '20px', backgroundColor: '#1e272e', border: '2px solid #333', borderRadius: '12px', textAlign: 'center', minWidth: '400px' }}>
                    <h2>Table Setup</h2>
                    <p>Players at table: <strong>{gameState.turnOrder.length}</strong></p>

                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
                        {!isPlayerInGame && (
                            <button onClick={() => executeAction('Join')} style={{ padding: '10px 20px', backgroundColor: '#3c40c6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Join Table
                            </button>
                        )}

                        {/* Only the first person who joined (the hand leader) can start the hand --- CHANGE BACK TO 2 LATER*/}
                        {isPlayerInGame && gameState.turnOrder[0] === userId && gameState.turnOrder.length >= 1 && (
                            <button onClick={() => executeAction('StartHand', { anteAmount: 10 })} style={{ padding: '10px 20px', backgroundColor: '#0be881', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Start Hand (Ante: 10) [Solo Test]
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ACTIVE PLAYERS LIST */}
            {gameState.phase !== 'Setup' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', width: '100%' }}>
                    {/* Render Opponents */}
                    {gameState.turnOrder.filter(id => id !== userId).map(opponentId => (
                        <PlayerHand
                            key={opponentId}
                            player={gameState.players[opponentId]}
                            isCurrentPlayer={false}
                            isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === opponentId}
                        />
                    ))}

                    {/* Render You (At the bottom/end of the list) */}
                    {isPlayerInGame && (
                        <PlayerHand
                            player={gameState.players[userId]}
                            isCurrentPlayer={true}
                            isActiveTurn={gameState.turnOrder[gameState.currentTurnIndex] === userId}
                        />
                    )}
                </div>
            )}

            {/* THE CONTROLS: Action Menu */}
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