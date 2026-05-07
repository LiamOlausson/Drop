// src/app/views/JudgementView.tsx
import React from 'react';
import { GameBoard } from '../components/GameBoard';
import { PlayerHand } from '../components/PlayerHand';
import type { DropGameState } from '../../game/types';

interface JudgementViewProps {
    gameState: DropGameState;
    userId: string;
    executeAction: (action: any, payload?: any) => void;
}

export const JudgementView: React.FC<JudgementViewProps> = ({ gameState, executeAction }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', width: '100%', maxWidth: '1200px' }}>

            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h1 style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)', margin: 0 }}>Judgement Phase</h1>
                <p style={{ color: '#aaa', marginTop: '10px' }}>The dust settles. All hands are revealed.</p>
            </div>

            <GameBoard gameState={gameState} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', width: '100%' }}>
                {/* Render everyone's hand face up */}
                {gameState.turnOrder.map(playerId => (
                    <PlayerHand
                        key={playerId}
                        player={gameState.players[playerId]}
                        isCurrentPlayer={true} // Forces all cards to render face-up
                        isActiveTurn={false}
                    />
                ))}
            </div>

            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#1e272e', borderRadius: '12px', border: '2px solid #333' }}>
                <button
                    onClick={() => executeAction('Initialize')}
                    style={{ padding: '15px 30px', fontSize: '18px', backgroundColor: '#0be881', color: '#111', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Return to Lobby (Reset Table)
                </button>
            </div>

        </div>
    );
};