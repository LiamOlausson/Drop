// src/app/components/ActionMenu.tsx
import React, { useState } from 'react';
import type { DropGameState, ActionType } from '../../game/types';

interface ActionMenuProps {
    gameState: DropGameState;
    playerId: string;
    onAction: (action: ActionType | 'PassSmuggle' | 'ChallengeSmuggle', payload?: any) => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ gameState, playerId, onAction }) => {
    const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
    const [targetId, setTargetId] = useState<string>('');
    const [selectedCardId, setSelectedCardId] = useState<string>('');

    const isMyTurn = gameState.turnOrder[gameState.currentTurnIndex] === playerId;
    const player = gameState.players[playerId];
    const opponents = gameState.turnOrder.filter(id => id !== playerId && !gameState.players[id].isDead);

    // --- 1. SMUGGLE CHALLENGE STATE ---
    if (gameState.pendingSmuggle && gameState.pendingSmuggle.status === 'WaitingForResponses') {
        const smuggle = gameState.pendingSmuggle;
        const hasResponded = smuggle.playersPassed.includes(playerId) || smuggle.playersChallenged.includes(playerId);
        const isSmuggler = smuggle.smugglerId === playerId;

        if (isSmuggler) {
            return <MenuBox>Waiting for table to challenge your Smuggle...</MenuBox>;
        }

        if (hasResponded) {
            return <MenuBox>You have responded. Waiting for others...</MenuBox>;
        }

        return (
            <MenuBox title="Smuggle Detected!">
                <p>Player <strong>{smuggle.smugglerId}</strong> smuggled a card claiming it is a <strong>{smuggle.declaredRank}</strong>.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <ActionButton color="#d32f2f" onClick={() => onAction('ChallengeSmuggle')}>Challenge (Call Bluff)</ActionButton>
                    <ActionButton color="#4caf50" onClick={() => onAction('PassSmuggle')}>Pass</ActionButton>
                </div>
            </MenuBox>
        );
    }

    // --- 2. NOT YOUR TURN ---
    if (!isMyTurn || gameState.phase !== 'TheClimb') {
        if (gameState.phase === 'Setup' || gameState.phase === 'FeedingTheSump') return <MenuBox>Waiting for hand to start...</MenuBox>;
        if (gameState.phase === 'Judgement') return <MenuBox>Judgement Phase! Calculating scores...</MenuBox>;

        const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
        return <MenuBox>Waiting for <strong>{currentPlayerId}</strong> to make a move...</MenuBox>;
    }

    // --- 3. YOUR TURN: ACTION SELECTION ---
    if (!selectedAction) {
        return (
            <MenuBox title="Your Turn: Choose an Action">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <ActionButton onClick={() => setSelectedAction('Scavenge')}>Scavenge</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Dive')}>Dive</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Ascend')}>Ascend</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Snitch')}>Snitch</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Smuggle')}>Smuggle</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Sabotage')}>Sabotage</ActionButton>
                </div>
            </MenuBox>
        );
    }

    // --- 4. YOUR TURN: ACTION SUB-MENUS ---
    return (
        <MenuBox title={`Action: ${selectedAction}`}>

            {selectedAction === 'Scavenge' && (
                <div style={subMenuStyle}>
                    <select onChange={(e) => setSelectedCardId(e.target.value)} defaultValue="">
                        <option value="" disabled>Select card to discard...</option>
                        {player.hand.map(c => <option key={c.id} value={c.id}>{c.name} ({c.rank})</option>)}
                    </select>
                    <select id="scavenge-source" defaultValue="discard">
                        <option value="discard">Take from Discard Pile</option>
                        <option value="fallen">Take from Fallen Pile</option>
                        {/* The Hand Leader's turn exception */}
                        <option value="draw">Take from Draw Pile (Leader 1st Turn)</option>
                    </select>
                    <ConfirmButton onClick={() => {
                        const source = (document.getElementById('scavenge-source') as HTMLSelectElement).value;
                        onAction('Scavenge', { cardId: selectedCardId, source });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            {/* NEW: Ascend Sub-Menu */}
            {selectedAction === 'Ascend' && (
                <div style={subMenuStyle}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Raise Amount:</label>
                    <input
                        type="number"
                        id="ascend-amount"
                        defaultValue={5}
                        min={1}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '80%', textAlign: 'center', color: '#111' }}
                    />
                    <ConfirmButton onClick={() => {
                        const amountStr = (document.getElementById('ascend-amount') as HTMLInputElement).value;
                        const raiseAmount = parseInt(amountStr, 10) || 0;
                        onAction('Ascend', { raiseAmount });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            {/* Remaining Sub-Menus (Snitch and Smuggle) stay exactly the same */}
            {selectedAction === 'Snitch' && (
                <div style={subMenuStyle}>
                    <select onChange={(e) => setTargetId(e.target.value)} defaultValue="">
                        <option value="" disabled>Select target player...</option>
                        {opponents.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                    <select id="snitch-type" defaultValue="High">
                        <option value="High">Force reveal Highest</option>
                        <option value="Low">Force reveal Lowest</option>
                    </select>
                    <ConfirmButton onClick={() => {
                        const type = (document.getElementById('snitch-type') as HTMLSelectElement).value;
                        onAction('Snitch', { targetId, type });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            {selectedAction === 'Smuggle' && (
                <div style={subMenuStyle}>
                    <select onChange={(e) => setSelectedCardId(e.target.value)} defaultValue="">
                        <option value="" disabled>Select card to drop face down...</option>
                        {player.hand.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select id="smuggle-rank" defaultValue="Baron">
                        <option value="" disabled>Declare a fake/real rank...</option>
                        <option value="Baron">Baron</option>
                        <option value="Warden">Warden</option>
                        <option value="Citizen">Citizen</option>
                        <option value="Glow Worm">Glow Worm</option>
                        <option value="Hollow">Hollow</option>
                    </select>
                    <ConfirmButton onClick={() => {
                        const rank = (document.getElementById('smuggle-rank') as HTMLSelectElement).value;
                        onAction('Smuggle', { cardId: selectedCardId, declaredRank: rank });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            {/* Cancel Button */}
            <button
                onClick={() => setSelectedAction(null)}
                style={{ marginTop: '15px', background: 'transparent', border: 'none', color: '#ff7675', cursor: 'pointer', textDecoration: 'underline' }}
            >
                Back to Actions
            </button>
        </MenuBox>
    );
};

// --- REUSABLE UI COMPONENTS ---

const MenuBox: React.FC<{ children: React.ReactNode, title?: string }> = ({ children, title }) => (
    <div style={{
        backgroundColor: '#1e272e', border: '2px solid #333', borderRadius: '12px',
        padding: '20px', width: '100%', maxWidth: '600px', margin: '20px auto',
        color: '#FFF', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', textAlign: 'center'
    }}>
        {title && <h3 style={{ marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>{title}</h3>}
        {children}
    </div>
);

const ActionButton: React.FC<{ children: React.ReactNode, onClick: () => void, color?: string }> = ({ children, onClick, color = '#3c40c6' }) => (
    <button onClick={onClick} style={{
        flex: '1 1 30%', padding: '12px', fontSize: '16px', fontWeight: 'bold',
        backgroundColor: color, color: '#FFF', border: 'none', borderRadius: '6px',
        cursor: 'pointer', transition: 'filter 0.2s'
    }} onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
            onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}>
        {children}
    </button>
);

const ConfirmButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} style={{
        padding: '10px 20px', backgroundColor: '#0be881', color: '#1e272e',
        border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
        alignSelf: 'center', marginTop: '10px'
    }}>
        Confirm Action
    </button>
);

const subMenuStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center'
};