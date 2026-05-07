// src/app/views/LobbyView.tsx
import React from 'react';
import type { ActionType } from '../../game/types';

interface LobbyViewProps {
    channelName?: string;
    executeAction: (action: ActionType | 'Initialize' | 'Join' | 'StartHand', payload?: any) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ channelName, executeAction }) => {
    return (
        <div style={{ textAlign: 'center', marginTop: '10vh' }}>
            <img src="/rocket.png" className="logo" alt="Discord" style={{ height: '100px' }} />
            <h1>Welcome to Drop</h1>
            <h3>{channelName ? `Table: #${channelName}` : 'Private Table'}</h3>
            <p style={{ color: '#aaa', maxWidth: '400px', margin: '0 auto 30px auto' }}>
                The city's favored pastime. Gather your friends, bluff your way to the top, and survive the climb.
            </p>

            <button
                onClick={() => executeAction('Initialize')}
                style={{
                    padding: '16px 32px', fontSize: '20px', fontWeight: 'bold',
                    backgroundColor: '#0be881', color: '#1e272e', border: 'none',
                    borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(11, 232, 129, 0.4)'
                }}
            >
                Initialize New Game
            </button>
        </div>
    );
};