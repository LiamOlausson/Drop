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
    // For Dive: track the two chosen card IDs
    const [diveCardIds, setDiveCardIds] = useState<string[]>([]);

    const isMyTurn = gameState.turnOrder[gameState.currentTurnIndex] === playerId;
    const player   = gameState.players[playerId];
    const opponents = gameState.turnOrder.filter(
        id => id !== playerId && !gameState.players[id].isDead
    );

    // -----------------------------------------------------------------------
    // 1. SMUGGLE CHALLENGE STATE
    // -----------------------------------------------------------------------
    if (gameState.pendingSmuggle?.status === 'WaitingForResponses') {
        const smuggle = gameState.pendingSmuggle;
        const isSmuggler   = smuggle.smugglerId === playerId;
        const hasResponded =
            smuggle.playersPassed.includes(playerId) ||
            smuggle.playersChallenged.includes(playerId);

        if (isSmuggler)    return <MenuBox>Waiting for table to challenge your Smuggle…</MenuBox>;
        if (hasResponded)  return <MenuBox>You have responded. Waiting for others…</MenuBox>;

        return (
            <MenuBox title="Smuggle Detected!">
                <p>
                    <strong>{smuggle.smugglerId}</strong> smuggled a card claiming it is a{' '}
                    <strong>{smuggle.declaredRank}</strong>.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <ActionButton color="#d32f2f" onClick={() => onAction('ChallengeSmuggle')}>
                        Challenge (Call Bluff)
                    </ActionButton>
                    <ActionButton color="#4caf50" onClick={() => onAction('PassSmuggle')}>
                        Pass
                    </ActionButton>
                </div>
            </MenuBox>
        );
    }

    // -----------------------------------------------------------------------
    // 2. NOT YOUR TURN
    // -----------------------------------------------------------------------
    if (!isMyTurn || (gameState.phase !== 'TheClimb' && gameState.phase !== 'Battle')) {
        if (gameState.phase === 'Setup' || gameState.phase === 'FeedingTheSump')
            return <MenuBox>Waiting for hand to start…</MenuBox>;
        if (gameState.phase === 'Judgement')
            return <MenuBox>Judgement Phase! Calculating scores…</MenuBox>;

        const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
        return <MenuBox>Waiting for <strong>{currentPlayerId}</strong> to move…</MenuBox>;
    }

    // -----------------------------------------------------------------------
    // 3. BATTLE PHASE — Ascend only
    // -----------------------------------------------------------------------
    if (gameState.phase === 'Battle') {
        if (!selectedAction) {
            return (
                <MenuBox title="⚔️ Battle Phase — Ascend or Pass">
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <ActionButton onClick={() => setSelectedAction('Ascend')}>Ascend (Raise)</ActionButton>
                        <ActionButton color="#555" onClick={() => {
                            // Passing Battle turn — Ascend with 0 raise to advance turn
                            onAction('Ascend', { raiseAmount: 0 });
                        }}>Pass</ActionButton>
                    </div>
                </MenuBox>
            );
        }
        // Ascend sub-menu (same as Climb)
        return (
            <MenuBox title="Ascend — Raise Amount">
                <div style={subMenuStyle}>
                    <input
                        type="number"
                        id="ascend-amount"
                        defaultValue={5}
                        min={0}
                        style={inputStyle}
                    />
                    <ConfirmButton onClick={() => {
                        const val = parseInt(
                            (document.getElementById('ascend-amount') as HTMLInputElement).value, 10
                        ) || 0;
                        onAction('Ascend', { raiseAmount: val });
                        setSelectedAction(null);
                    }} />
                    <BackButton onClick={() => setSelectedAction(null)} />
                </div>
            </MenuBox>
        );
    }

    // -----------------------------------------------------------------------
    // 4. THE CLIMB — action picker
    // -----------------------------------------------------------------------
    if (!selectedAction) {
        return (
            <MenuBox title="Your Turn — Choose an Action">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    <ActionButton onClick={() => setSelectedAction('Scavenge')}>Scavenge</ActionButton>
                    <ActionButton onClick={() => { setDiveCardIds([]); setSelectedAction('Dive'); }}>Dive</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Ascend')}>Ascend</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Snitch')}>Snitch</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Smuggle')}>Smuggle</ActionButton>
                    <ActionButton onClick={() => setSelectedAction('Sabotage')}>Sabotage</ActionButton>
                </div>
            </MenuBox>
        );
    }

    // -----------------------------------------------------------------------
    // 5. SUB-MENUS
    // -----------------------------------------------------------------------
    return (
        <MenuBox title={`Action: ${selectedAction}`}>

            {/* SCAVENGE */}
            {selectedAction === 'Scavenge' && (
                <div style={subMenuStyle}>
                    <label style={labelStyle}>Card to discard from hand:</label>
                    <select onChange={e => setSelectedCardId(e.target.value)} defaultValue="">
                        <option value="" disabled>Select card…</option>
                        {player.hand.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.rank}) — {c.value}pts
                            </option>
                        ))}
                    </select>
                    <label style={labelStyle}>Take from:</label>
                    <select id="scavenge-source" defaultValue="discard">
                        <option value="discard">Top of Discard Pile</option>
                        <option value="fallen">Top of Fallen Pile</option>
                    </select>
                    <ConfirmButton onClick={() => {
                        const source = (document.getElementById('scavenge-source') as HTMLSelectElement).value;
                        onAction('Scavenge', { cardId: selectedCardId, source });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            {/* DIVE */}
            {selectedAction === 'Dive' && (
                <div style={subMenuStyle}>
                    <label style={labelStyle}>
                        Select exactly 2 cards to discard (chosen: {diveCardIds.length}/2):
                    </label>
                    {player.hand.map(c => {
                        const checked = diveCardIds.includes(c.id);
                        return (
                            <label
                                key={c.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                                    backgroundColor: checked ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                                    border: checked ? '1px solid #FFD700' : '1px solid #555',
                                    color: '#FFF', width: '80%'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            if (diveCardIds.length < 2)
                                                setDiveCardIds(prev => [...prev, c.id]);
                                        } else {
                                            setDiveCardIds(prev => prev.filter(id => id !== c.id));
                                        }
                                    }}
                                />
                                {c.name} ({c.rank}) — {c.value}pts
                                {c.isRevealed && (
                                    <span style={{ fontSize: '11px', color: '#FFD700', marginLeft: 'auto' }}>
                                        Revealed
                                    </span>
                                )}
                            </label>
                        );
                    })}
                    <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0' }}>
                        Costs 1 extra ante. Draws 2 cards — first is revealed.
                    </p>
                    <ConfirmButton
                        disabled={diveCardIds.length !== 2}
                        onClick={() => {
                            onAction('Dive', { discardIds: diveCardIds });
                            setSelectedAction(null);
                            setDiveCardIds([]);
                        }}
                    />
                </div>
            )}

            {/* ASCEND */}
            {selectedAction === 'Ascend' && (
                <div style={subMenuStyle}>
                    <label style={labelStyle}>Raise Amount:</label>
                    <input
                        type="number"
                        id="ascend-amount"
                        defaultValue={5}
                        min={1}
                        style={inputStyle}
                    />
                    <ConfirmButton onClick={() => {
                        const val = parseInt(
                            (document.getElementById('ascend-amount') as HTMLInputElement).value, 10
                        ) || 0;
                        onAction('Ascend', { raiseAmount: val });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            {/* SNITCH */}
            {selectedAction === 'Snitch' && (
                <div style={subMenuStyle}>
                    <label style={labelStyle}>Target player:</label>
                    <select onChange={e => setTargetId(e.target.value)} defaultValue="">
                        <option value="" disabled>Select target…</option>
                        {opponents.map(id => (
                            <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                    <label style={labelStyle}>Force them to reveal:</label>
                    <select id="snitch-type" defaultValue="High">
                        <option value="High">Highest card</option>
                        <option value="Low">Lowest card</option>
                    </select>
                    <ConfirmButton onClick={() => {
                        const type = (document.getElementById('snitch-type') as HTMLSelectElement).value;
                        onAction('Snitch', { targetId, type });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            {/* SMUGGLE */}
            {selectedAction === 'Smuggle' && (
                <div style={subMenuStyle}>
                    <label style={labelStyle}>Card to drop face-down:</label>
                    <select onChange={e => setSelectedCardId(e.target.value)} defaultValue="">
                        <option value="" disabled>Select card…</option>
                        {player.hand.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.rank}) — {c.value}pts
                            </option>
                        ))}
                    </select>
                    <label style={labelStyle}>Declare rank as:</label>
                    <select id="smuggle-rank" defaultValue="Baron">
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

            {/* SABOTAGE */}
            {selectedAction === 'Sabotage' && (
                <div style={subMenuStyle}>
                    <label style={labelStyle}>Target player:</label>
                    <select onChange={e => setTargetId(e.target.value)} defaultValue="">
                        <option value="" disabled>Select target…</option>
                        {opponents.map(id => (
                            <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                    <label style={labelStyle}>Which of their cards to drop (position):</label>
                    <select id="sabotage-card-index" defaultValue="0">
                        <option value="0">Left / 1st card</option>
                        <option value="1">Middle / 2nd card</option>
                        <option value="2">Right / 3rd card</option>
                    </select>
                    <label style={labelStyle}>Which of your cards to reveal:</label>
                    <select id="sabotage-reveal-index" defaultValue="0">
                        {player.hand.map((c, i) => (
                            <option key={c.id} value={i}>
                                {i === 0 ? 'Left' : i === 1 ? 'Middle' : 'Right'} — {c.isRevealed ? '(already revealed)' : c.rank}
                            </option>
                        ))}
                    </select>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0' }}>
                        Their dropped card goes to Fallen Pile. They draw from Discard.
                    </p>
                    <ConfirmButton onClick={() => {
                        const cardIndex = parseInt(
                            (document.getElementById('sabotage-card-index') as HTMLSelectElement).value
                        );
                        const revealIndex = parseInt(
                            (document.getElementById('sabotage-reveal-index') as HTMLSelectElement).value
                        );
                        onAction('Sabotage', { targetId, cardIndex, revealIndex });
                        setSelectedAction(null);
                    }} />
                </div>
            )}

            <BackButton onClick={() => setSelectedAction(null)} />
        </MenuBox>
    );
};

// ---------------------------------------------------------------------------
// REUSABLE UI PRIMITIVES
// ---------------------------------------------------------------------------

const MenuBox: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
    <div style={{
        backgroundColor: '#1e272e', border: '2px solid #333', borderRadius: '12px',
        padding: '20px', width: '100%', maxWidth: '620px', margin: '20px auto',
        color: '#FFF', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', textAlign: 'center'
    }}>
        {title && (
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                {title}
            </h3>
        )}
        {children}
    </div>
);

const ActionButton: React.FC<{
    children: React.ReactNode;
    onClick: () => void;
    color?: string;
}> = ({ children, onClick, color = '#3c40c6' }) => (
    <button
        onClick={onClick}
        style={{
            flex: '1 1 28%', padding: '12px', fontSize: '15px', fontWeight: 'bold',
            backgroundColor: color, color: '#FFF', border: 'none', borderRadius: '6px',
            cursor: 'pointer'
        }}
        onMouseOver={e => (e.currentTarget.style.filter = 'brightness(1.2)')}
        onMouseOut={e  => (e.currentTarget.style.filter = 'brightness(1)')}
    >
        {children}
    </button>
);

const ConfirmButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: '10px 20px', backgroundColor: disabled ? '#555' : '#0be881',
            color: disabled ? '#999' : '#1e272e', border: 'none', borderRadius: '6px',
            fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer',
            marginTop: '10px'
        }}
    >
        Confirm Action
    </button>
);

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={onClick}
        style={{
            marginTop: '12px', background: 'transparent', border: 'none',
            color: '#ff7675', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px'
        }}
    >
        ← Back to Actions
    </button>
);

const subMenuStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center'
};

const labelStyle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 'bold', color: '#ccc', marginBottom: '-4px'
};

const inputStyle: React.CSSProperties = {
    padding: '8px', borderRadius: '4px', border: '1px solid #ccc',
    width: '80%', textAlign: 'center', color: '#111'
};