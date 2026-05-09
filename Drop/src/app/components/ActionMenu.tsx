// src/app/components/ActionMenu.tsx
import React, { useState } from 'react';
import type { DropGameState, ActionType } from '../../game/types';

interface ActionMenuProps {
    gameState: DropGameState;
    playerId: string;
    playerNames: Record<string, string>;  // FIX 5
    onAction: (action: ActionType | 'PassSmuggle' | 'ChallengeSmuggle' | 'RespondAscend', payload?: any) => void;
}

type SubAction = ActionType | null;

const ACTIONS: Array<{ id: ActionType; label: string; icon: string; desc: string; color: string }> = [
    { id: 'Scavenge', label: 'Scavenge', icon: '⚒',  desc: 'Swap a card with the Discard or Fallen pile.',       color: '#6a8c4a' },
    { id: 'Dive',     label: 'Dive',     icon: '⬇',  desc: 'Discard 2, pay ante, draw 2 from the deck.',          color: '#4a6a8c' },
    { id: 'Ascend',   label: 'Ascend',   icon: '⬆',  desc: 'Raise the stakes. Others must call or fold.',          color: '#8c4a4a' },
    { id: 'Snitch',   label: 'Snitch',   icon: '👁',  desc: 'Force a target to reveal their highest or lowest.',    color: '#7a6a2a' },
    { id: 'Smuggle',  label: 'Smuggle',  icon: '🃏',  desc: 'Drop a card face-down, declare its rank.',            color: '#6a4a8c' },
    { id: 'Sabotage', label: 'Sabotage', icon: '⚡',  desc: "Choose an opponent's card to cast to the Fallen pile.",color: '#8c6a2a' },
];

export const ActionMenu: React.FC<ActionMenuProps> = ({ gameState, playerId, playerNames, onAction }) => {
    const [selectedAction, setSelectedAction] = useState<SubAction>(null);
    const [targetId, setTargetId]             = useState<string>('');
    const [selectedCardId, setSelectedCardId] = useState<string>('');
    const [diveCardIds, setDiveCardIds]       = useState<string[]>([]);
    const [raiseAmount, setRaiseAmount]       = useState<number>(5);
    const [raiseInput, setRaiseInput]         = useState<string>('5'); // FIX 6

    const isMyTurn = gameState.turnOrder[gameState.currentTurnIndex] === playerId;
    const player   = gameState.players[playerId];
    const opponents = gameState.turnOrder.filter(
        id => id !== playerId && !gameState.players[id].isDead && !gameState.players[id].hasFolded
    );

    const getName = (id: string) => gameState.assignedNames?.[id] || playerNames[id] || id.substring(0, 10) + '…';

    const back = () => {
        setSelectedAction(null);
        setSelectedCardId('');
        setTargetId('');
        setDiveCardIds([]);
        setRaiseAmount(5);
        setRaiseInput('5');
    };

    // FIX 6: sync raise helpers
    const setRaise = (v: number) => {
        const clamped = Math.max(1, Math.min(v, player.balance));
        setRaiseAmount(clamped);
        setRaiseInput(String(clamped));
    };
    const handleRaiseInput = (raw: string) => {
        setRaiseInput(raw);
        const n = parseInt(raw);
        if (!isNaN(n) && n > 0) setRaiseAmount(Math.min(n, player.balance));
    };
    const goAllIn = () => setRaise(player.balance);

    /* ── Smuggle challenge overlay ── */
    if (gameState.pendingSmuggle?.status === 'WaitingForResponses') {
        const sm = gameState.pendingSmuggle;
        const isSmuggler   = sm.smugglerId === playerId;
        const hasResponded = sm.playersPassed.includes(playerId) || sm.playersChallenged.includes(playerId);

        if (isSmuggler) return <Scroll><WaitMsg icon="🃏">Waiting for the table to respond to your Smuggle…</WaitMsg></Scroll>;
        if (player.isDead || player.hasFolded) return <Scroll><WaitMsg icon="⚑">Waiting… (you're out)</WaitMsg></Scroll>;
        if (hasResponded) return <Scroll><WaitMsg icon="⏳">You've responded. Waiting for others…</WaitMsg></Scroll>;

        return (
            <Scroll title="⚠ A Smuggle Has Occurred">
                <p style={descStyle}>
                    <strong style={{ color: '#f0c040' }}>{getName(sm.smugglerId)}</strong>{' '}
                    dropped a card claiming it is a{' '}
                    <strong style={{ color: '#c0932b' }}>{sm.declaredRank}</strong>.
                    Do you believe them?
                </p>
                <div style={rowStyle}>
                    <TavernBtn color="blood" onClick={() => onAction('ChallengeSmuggle')}>
                        ⚔ Challenge
                    </TavernBtn>
                    <TavernBtn color="mold" onClick={() => onAction('PassSmuggle')}>
                        ✓ Pass
                    </TavernBtn>
                </div>
            </Scroll>
        );
    }

    /* ── Decree overlay ── */
    if (gameState.pendingDecree) {
        const dec = gameState.pendingDecree;
        const isSmuggler = dec.smugglerId === playerId;

        if (!isSmuggler) return <Scroll><WaitMsg icon="📜">Waiting for the Smuggler to issue their Decree…</WaitMsg></Scroll>;

        // Specific UI for Hollow
        if (dec.decreeType === 'Hollow') {
            return (
                <Scroll title="📜 Decree of the Hollow">
                    <p style={descStyle}>Choose a player. They must discard their highest rank card.</p>
                    <Field label="Target:">
                        <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="" disabled>Select target…</option>
                            {opponents.map(id => (
                                <option key={id} value={id}>{getName(id)}</option>
                            ))}
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="rust" disabled={!targetId} onClick={() => {
                            onAction('ExecuteDecree', { decreeType: 'Hollow', targetId });
                            back();
                        }}>Execute Decree</TavernBtn>
                    </div>
                </Scroll>
            );
        }

        // Specific UI for Glow Worm
        if (dec.decreeType === 'Glow Worm') {
            const validTargets = gameState.turnOrder.filter(id => {
                const p = gameState.players[id];
                return !p.isDead && !p.hasFolded && p.hand.some(c => c.isRevealed);
            });

            return (
                <Scroll title="📜 Decree of the Glow Worm">
                    <p style={descStyle}>Choose a player with a revealed card. They must add another ante (10 🪙) into the pot.</p>
                    <Field label="Target:">
                        <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="" disabled>Select target…</option>
                            {validTargets.map(id => (
                                <option key={id} value={id}>{getName(id)}</option>
                            ))}
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="rust" disabled={!targetId} onClick={() => {
                            onAction('ExecuteDecree', { decreeType: 'Glow Worm', targetId });
                            back();
                        }}>Execute Decree</TavernBtn>
                    </div>
                </Scroll>
            );
        }

        // Specific UI for Citizen
        if (dec.decreeType === 'Citizen') {
            return (
                <Scroll title="📜 Decree of the Citizen">
                    <p style={descStyle}>Take any card from the Discard Pile, then discard one from your hand.</p>

                    <Field label="Card to take (from Discard):">
                        <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="" disabled>Select discard card…</option>
                            {gameState.discardPile.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.rank}) — {c.value}pts
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Card to drop (from Hand):">
                        <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)}>
                            <option value="" disabled>Select hand card…</option>
                            {player.hand.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.rank}) — {c.value}pts
                                </option>
                            ))}
                        </select>
                    </Field>

                    <div style={rowStyle}>
                        <TavernBtn color="rust" disabled={!targetId || !selectedCardId} onClick={() => {
                            onAction('ExecuteDecree', {
                                decreeType: 'Citizen',
                                discardCardId: targetId,
                                handCardId: selectedCardId
                            });
                            back();
                        }}>Execute Decree</TavernBtn>
                    </div>
                </Scroll>
            );
        }

        // Specific UI for Warden
        if (dec.decreeType === 'Warden') {
            const validTargets = gameState.turnOrder.filter(id => {
                const p = gameState.players[id];
                return !p.isDead && !p.hasFolded && p.hand.some(c => c.isRevealed);
            });

            return (
                <Scroll title="📜 Decree of the Warden">
                    <p style={descStyle}>Choose a player with a revealed card. They must declare if their score is ≥ 20.</p>
                    <Field label="Target:">
                        <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="" disabled>Select target…</option>
                            {validTargets.map(id => (
                                <option key={id} value={id}>{getName(id)}</option>
                            ))}
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="rust" disabled={!targetId} onClick={() => {
                            onAction('ExecuteDecree', { decreeType: 'Warden', targetId });
                            back();
                        }}>Execute Decree</TavernBtn>
                    </div>
                </Scroll>
            );
        }

        // Specific UI for Baron
        if (dec.decreeType === 'Baron') {
            return (
                <Scroll title="📜 Decree of the Baron">
                    <p style={descStyle}>Choose a player. They must truthfully announce which card ranks are present in their hand.</p>
                    <Field label="Target:">
                        <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="" disabled>Select target…</option>
                            {opponents.map(id => (
                                <option key={id} value={id}>{getName(id)}</option>
                            ))}
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="rust" disabled={!targetId} onClick={() => {
                            onAction('ExecuteDecree', { decreeType: 'Baron', targetId });
                            back();
                        }}>Execute Decree</TavernBtn>
                    </div>
                </Scroll>
            );
        }

        // Fallback for decrees we haven't built yet
        return <Scroll><WaitMsg icon="📜">The {dec.decreeType} Decree is being written…</WaitMsg></Scroll>;
    }

    /* ── Ascend response overlay ── */
    if (gameState.pendingAscend) {
        const asc = gameState.pendingAscend;
        const hasResponded = asc.playersResponded.includes(playerId);
        const isInitiator  = asc.initiatorId === playerId;
        const amountToCall = gameState.currentAnteToCall - player.antePaid;

        if (isInitiator)  return <Scroll><WaitMsg icon="⬆">Waiting for the table to respond…</WaitMsg></Scroll>;
        if (player.isDead || player.hasFolded) return <Scroll><WaitMsg icon="⚑">Waiting… (you're out)</WaitMsg></Scroll>;
        if (hasResponded) return <Scroll><WaitMsg icon="⏳">You've responded. Waiting for others…</WaitMsg></Scroll>;

        return (
            <Scroll title="⬆ The Stakes Rise">
                <p style={descStyle}>
                    <strong style={{ color: '#f0c040' }}>{getName(asc.initiatorId)}</strong>{' '}
                    has Ascended. Pay{' '}
                    <strong style={{ color: '#c0932b' }}>{amountToCall} 🪙</strong> to stay.
                </p>
                <div style={rowStyle}>
                    <TavernBtn color="mold" onClick={() => onAction('RespondAscend', { response: 'Call' })}>
                        ✓ Call — {amountToCall} 🪙
                    </TavernBtn>
                    <TavernBtn color="blood" onClick={() => onAction('RespondAscend', { response: 'Fold' })}>
                        ⚑ Fold
                    </TavernBtn>
                </div>
            </Scroll>
        );
    }

    /* ── Waiting / Phase gates ── */
    if (!isMyTurn || (gameState.phase !== 'The Climb' && gameState.phase !== 'Battle')) {
        if (gameState.phase === 'Setup' || gameState.phase === 'Feeding The Sump')
            return <Scroll><WaitMsg icon="🕯">The hand hasn't started yet…</WaitMsg></Scroll>;
        if (gameState.phase === 'Judgement')
            return <Scroll><WaitMsg icon="⚖">Scores being tallied…</WaitMsg></Scroll>;

        const acting = gameState.turnOrder[gameState.currentTurnIndex];
        return (
            <Scroll>
                <WaitMsg icon="⏳">
                    Waiting for <strong style={{ color: '#f0c040' }}>{getName(acting)}</strong>…
                </WaitMsg>
            </Scroll>
        );
    }

    /* ── Battle phase ── */
    if (gameState.phase === 'Battle') {
        if (!selectedAction) {
            return (
                <Scroll title="⚔ Battle — Final Round">
                    <p style={descStyle}>Ascend the stakes or pass.</p>
                    <div style={rowStyle}>
                        <TavernBtn color="candle" onClick={() => setSelectedAction('Ascend')}>⬆ Ascend</TavernBtn>
                        <TavernBtn color="muted" onClick={() => onAction('Ascend', { raiseAmount: 0 })}>— Pass</TavernBtn>
                    </div>
                </Scroll>
            );
        }
        return (
            <Scroll title="⬆ Ascend">
                <AscendInput
                    value={raiseAmount}
                    inputValue={raiseInput}
                    playerBalance={player.balance}
                    onStep={setRaise}
                    onInput={handleRaiseInput}
                    onAllIn={goAllIn}
                />
                <div style={rowStyle}>
                    <TavernBtn color="candle" onClick={() => { onAction('Ascend', { raiseAmount }); back(); }}>
                        Confirm +{raiseAmount} 🪙
                    </TavernBtn>
                    <BackLink onClick={back} />
                </div>
            </Scroll>
        );
    }

    /* ── Action picker ── */
    if (!selectedAction) {
        return (
            <Scroll title="Your Turn — Choose Action">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {ACTIONS.map(a => (
                        <ActionTile key={a.id} action={a} onClick={() => {
                            if (a.id === 'Dive') setDiveCardIds([]);
                            setSelectedAction(a.id);
                        }} />
                    ))}
                </div>
            </Scroll>
        );
    }

    /* ── Sub-menus ── */
    return (
        <Scroll title={`${ACTIONS.find(a => a.id === selectedAction)?.icon} ${selectedAction}`}>

            {/* SCAVENGE */}
            {selectedAction === 'Scavenge' && (
                <div style={formStyle}>
                    <Field label="Card to discard:">
                        <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)}>
                            <option value="" disabled>Select a card…</option>
                            {player.hand.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.rank}) — {c.value}pts{c.isRevealed ? ' [Revealed]' : ''}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Take from:">
                        <select id="scavenge-source" defaultValue="discard">
                            <option value="discard">Top of Discard Pile</option>
                            <option value="fallen">Top of Fallen Pile</option>
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="candle" disabled={!selectedCardId} onClick={() => {
                            const src = (document.getElementById('scavenge-source') as HTMLSelectElement).value;
                            onAction('Scavenge', { cardId: selectedCardId, source: src }); back();
                        }}>Confirm</TavernBtn>
                        <BackLink onClick={back} />
                    </div>
                </div>
            )}

            {/* DIVE */}
            {selectedAction === 'Dive' && (
                <div style={formStyle}>
                    <p style={descStyle}>Select exactly 2 cards to discard.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {player.hand.map(c => {
                            const checked = diveCardIds.includes(c.id);
                            return (
                                <label key={c.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                                    background: checked ? 'rgba(240,192,64,0.1)' : 'rgba(255,255,255,0.03)',
                                    border: checked ? '1px solid rgba(240,192,64,0.4)' : '1px solid rgba(60,46,30,0.6)',
                                    color: '#c9ad87', fontFamily: 'Crimson Pro, serif', fontSize: 14,
                                }}>
                                    <input type="checkbox" checked={checked} style={{ accentColor: '#f0c040' }} onChange={e => {
                                        if (e.target.checked) { if (diveCardIds.length < 2) setDiveCardIds(p => [...p, c.id]); }
                                        else setDiveCardIds(p => p.filter(id => id !== c.id));
                                    }} />
                                    {c.name} ({c.rank}) — {c.value}pts
                                    {c.isRevealed && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#c0932b' }}>revealed</span>}
                                </label>
                            );
                        })}
                    </div>
                    <div style={rowStyle}>
                        <TavernBtn color="candle" disabled={diveCardIds.length !== 2} onClick={() => {
                            onAction('Dive', { discardIds: diveCardIds }); back();
                        }}>Dive ({diveCardIds.length}/2)</TavernBtn>
                        <BackLink onClick={back} />
                    </div>
                </div>
            )}

            {/* ASCEND — FIX 6: input + all-in */}
            {selectedAction === 'Ascend' && (
                <div style={formStyle}>
                    <p style={descStyle}>Raise the stakes. Others must call or fold.</p>
                    <AscendInput
                        value={raiseAmount}
                        inputValue={raiseInput}
                        playerBalance={player.balance}
                        onStep={setRaise}
                        onInput={handleRaiseInput}
                        onAllIn={goAllIn}
                    />
                    <div style={rowStyle}>
                        <TavernBtn color="blood" onClick={() => { onAction('Ascend', { raiseAmount }); back(); }}>
                            ⬆ Ascend +{raiseAmount} 🪙
                        </TavernBtn>
                        <BackLink onClick={back} />
                    </div>
                </div>
            )}

            {/* SNITCH */}
            {selectedAction === 'Snitch' && (
                <div style={formStyle}>
                    <p style={descStyle}>Force a player to reveal a card.</p>
                    <Field label="Target:">
                        <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="" disabled>Select target…</option>
                            {opponents.map(id => (
                                <option key={id} value={id}>{getName(id)}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Reveal their:">
                        <select id="snitch-type" defaultValue="High">
                            <option value="High">Highest card</option>
                            <option value="Low">Lowest card</option>
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="rust" disabled={!targetId} onClick={() => {
                            const type = (document.getElementById('snitch-type') as HTMLSelectElement).value;
                            onAction('Snitch', { targetId, type }); back();
                        }}>👁 Snitch</TavernBtn>
                        <BackLink onClick={back} />
                    </div>
                </div>
            )}

            {/* SMUGGLE */}
            {selectedAction === 'Smuggle' && (
                <div style={formStyle}>
                    <p style={descStyle}>Drop a card face-down — truthfully or not.</p>
                    <Field label="Card to smuggle:">
                        <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)}>
                            <option value="" disabled>Select a card…</option>
                            {player.hand.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.rank}) — {c.value}pts
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Declare rank as:">
                        <select id="smuggle-rank" defaultValue="Baron">
                            {['Baron', 'Warden', 'Citizen', 'Glow Worm', 'Hollow'].map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="candle" disabled={!selectedCardId} onClick={() => {
                            const rank = (document.getElementById('smuggle-rank') as HTMLSelectElement).value;
                            onAction('Smuggle', { cardId: selectedCardId, declaredRank: rank }); back();
                        }}>🃏 Smuggle</TavernBtn>
                        <BackLink onClick={back} />
                    </div>
                </div>
            )}

            {/* SABOTAGE */}
            {selectedAction === 'Sabotage' && (
                <div style={formStyle}>
                    <p style={descStyle}>Cast an opponent's card to the Fallen pile. Reveal one of yours.</p>
                    <Field label="Target:">
                        <select value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="" disabled>Select target…</option>
                            {opponents.map(id => (
                                <option key={id} value={id}>{getName(id)}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Their card to drop:">
                        <select id="sab-card" defaultValue="0">
                            <option value="0">Left (1st)</option>
                            <option value="1">Middle (2nd)</option>
                            <option value="2">Right (3rd)</option>
                        </select>
                    </Field>
                    <Field label="Your card to reveal:">
                        <select id="sab-reveal" defaultValue="0">
                            {player.hand.map((c, i) => (
                                <option key={c.id} value={i}>
                                    {['Left','Middle','Right'][i] ?? i} — {c.isRevealed ? '(already revealed)' : c.rank}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <div style={rowStyle}>
                        <TavernBtn color="rust" disabled={!targetId} onClick={() => {
                            const cardIndex   = parseInt((document.getElementById('sab-card') as HTMLSelectElement).value);
                            const revealIndex = parseInt((document.getElementById('sab-reveal') as HTMLSelectElement).value);
                            onAction('Sabotage', { targetId, cardIndex, revealIndex }); back();
                        }}>⚡ Sabotage</TavernBtn>
                        <BackLink onClick={back} />
                    </div>
                </div>
            )}

        </Scroll>
    );
};

/* ── Primitives ── */

const Scroll: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
    <div style={{
        background: 'linear-gradient(160deg, rgba(26,20,16,0.97) 0%, rgba(18,14,10,0.97) 100%)',
        border: '1px solid rgba(60,46,30,0.9)',
        borderTop: '3px solid rgba(240,192,64,0.35)',
        borderRadius: 10, padding: '14px 18px 12px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        animation: 'fadeUp 0.25s ease-out forwards',
        display: 'flex', flexDirection: 'column', gap: 10,
    }}>
        {title && (
            <h3 style={{
                fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 12,
                letterSpacing: 1.5, color: '#f0c040', textTransform: 'uppercase',
                margin: 0, paddingBottom: 8, borderBottom: '1px solid rgba(240,192,64,0.15)',
            }}>{title}</h3>
        )}
        {children}
    </div>
);

const WaitMsg: React.FC<{ children: React.ReactNode; icon?: string }> = ({ children, icon }) => (
    <p style={{
        fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 15,
        color: 'rgba(201,173,135,0.6)', textAlign: 'center', padding: '4px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
        {icon && <span>{icon}</span>}
        {children}
    </p>
);

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    candle: { bg: 'rgba(240,192,64,0.15)',  text: '#f0c040', border: 'rgba(240,192,64,0.45)' },
    blood:  { bg: 'rgba(139,26,26,0.25)',   text: '#e05050', border: 'rgba(192,57,43,0.5)' },
    mold:   { bg: 'rgba(58,90,58,0.25)',    text: '#6abf6a', border: 'rgba(74,122,74,0.5)' },
    rust:   { bg: 'rgba(181,84,26,0.2)',    text: '#e0a060', border: 'rgba(181,84,26,0.5)' },
    muted:  { bg: 'rgba(60,46,30,0.4)',     text: '#9aa5b4', border: 'rgba(60,46,30,0.7)' },
};

const TavernBtn: React.FC<{
    children: React.ReactNode; color: string;
    onClick: () => void; disabled?: boolean;
}> = ({ children, color, onClick, disabled }) => {
    const cfg = COLOR_MAP[color] ?? COLOR_MAP.candle;
    return (
        <button onClick={onClick} disabled={disabled} style={{
            flex: 1, padding: '9px 14px',
            background: disabled ? 'rgba(30,20,16,0.5)' : cfg.bg,
            color: disabled ? 'rgba(201,173,135,0.3)' : cfg.text,
            border: `1px solid ${disabled ? 'rgba(60,46,30,0.4)' : cfg.border}`,
            borderRadius: 6, fontSize: 13, fontFamily: 'Cinzel, serif',
            letterSpacing: 0.5, fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
        }}
                onMouseOver={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.2)'; }}
                onMouseOut={e  => { e.currentTarget.style.filter = 'brightness(1)'; }}
        >{children}</button>
    );
};

const ActionTile: React.FC<{ action: typeof ACTIONS[0]; onClick: () => void }> = ({ action, onClick }) => (
    <button onClick={onClick} title={action.desc} style={{
        background: 'rgba(26,20,16,0.8)',
        border: `1px solid rgba(60,46,30,0.8)`,
        borderBottom: `2px solid ${action.color}60`,
        borderRadius: 8, padding: '9px 6px',
        color: '#c9ad87', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        transition: 'all 0.2s ease',
    }}
            onMouseOver={e => {
                e.currentTarget.style.background = `${action.color}18`;
                e.currentTarget.style.color = '#f0c040';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(26,20,16,0.8)';
                e.currentTarget.style.color = '#c9ad87';
                e.currentTarget.style.transform = 'translateY(0)';
            }}>
        <span style={{ fontSize: 18 }}>{action.icon}</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {action.label}
        </span>
    </button>
);

/* FIX 6: Enhanced AscendInput with text field and all-in button */
const AscendInput: React.FC<{
    value: number;
    inputValue: string;
    playerBalance: number;
    onStep: (v: number) => void;
    onInput: (raw: string) => void;
    onAllIn: () => void;
}> = ({ value, inputValue, playerBalance, onStep, onInput, onAllIn }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {/* Step controls + input box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => onStep(value - 5)} style={stepBtnStyle}>−</button>

            {/* Text input for exact amount */}
            <div style={{ textAlign: 'center' }}>
                <input
                    type="number"
                    value={inputValue}
                    min={1}
                    max={playerBalance}
                    onChange={e => onInput(e.target.value)}
                    style={{
                        width: 80, textAlign: 'center',
                        fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 26,
                        color: '#f0c040', background: 'transparent',
                        border: 'none', borderBottom: '2px solid rgba(240,192,64,0.4)',
                        outline: 'none', padding: '0 4px',
                    }}
                />
                <div style={{
                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                    fontSize: 11, color: '#9aa5b4', marginTop: 2,
                }}>coins raised</div>
            </div>

            <button onClick={() => onStep(value + 5)} style={stepBtnStyle}>+</button>
        </div>

        {/* All-in button */}
        <button onClick={onAllIn} style={{
            padding: '5px 20px',
            background: 'rgba(139,26,26,0.2)',
            border: '1px solid rgba(192,57,43,0.5)',
            borderRadius: 5, color: '#e05050',
            fontFamily: 'Cinzel, serif', fontSize: 11,
            fontWeight: 700, letterSpacing: 1,
            cursor: 'pointer', transition: 'all 0.2s ease',
        }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(139,26,26,0.35)'; }}
                onMouseOut={e  => { e.currentTarget.style.background = 'rgba(139,26,26,0.2)'; }}
        >
            ALL IN — {playerBalance} 🪙
        </button>
    </div>
);

const stepBtnStyle: React.CSSProperties = {
    width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(60,46,30,0.6)', border: '1px solid rgba(240,192,64,0.3)',
    color: '#f0c040', fontSize: 18, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{
            fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 1,
            color: 'rgba(240,192,64,0.55)', textTransform: 'uppercase',
        }}>{label}</label>
        {children}
    </div>
);

const BackLink: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} style={{
        background: 'transparent', border: 'none',
        color: 'rgba(201,173,135,0.4)', fontSize: 13,
        fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
        cursor: 'pointer', textDecoration: 'underline', padding: '0 8px', flexShrink: 0,
    }}>← Back</button>
);

const descStyle: React.CSSProperties = {
    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
    fontSize: 13, color: 'rgba(201,173,135,0.7)', lineHeight: 1.5,
};
const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };