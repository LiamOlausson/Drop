import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/Card';
import { Icon, type IconName } from '../components/Icon';
import type { DropGameState } from '../../game/types';

interface JudgementViewProps {
    gameState: DropGameState;
    userId: string;
    playerNames: Record<string, string>;
    executeAction: (action: any, payload?: any) => void;
}

const RESULT_STYLE: Record<string, { icon: IconName; label: string; color: string; bg: string; border: string }> = {
    Baron:    { icon: 'crown',   label: 'Baron',    color: '#f0c040', bg: 'rgba(240,192,64,0.08)',  border: 'rgba(240,192,64,0.35)' },
    Survivor: { icon: 'eye',     label: 'Survivor', color: '#6abf6a', bg: 'rgba(74,122,74,0.08)',   border: 'rgba(74,122,74,0.35)' },
    Dead:     { icon: 'obelisk', label: 'Dead',     color: '#6b5e5e', bg: 'rgba(26,20,16,0.8)',      border: 'rgba(60,46,30,0.4)' },
    SatOut:   { icon: 'obelisk', label: 'Sat Out',  color: '#7a8595', bg: 'rgba(18,16,14,0.7)',      border: 'rgba(50,42,32,0.4)' },
};

const FLAVOR: Record<'Baron' | 'Survivor' | 'Dead', string[]> = {
    Baron: [
        'The highest hand claims the Peak.',
        'Fortune favors the bold.',
        'All debts flow to the Baron.',
        'Every coin at the table was yours to claim.',
        'The Sump gives to those who can take.',
        'The Peak was never in doubt.',
        'The Sun Smiles upon you',
        'The Moon Sighs',
        'The Deep is content',
        'The Shield is wary',
    ],
    Survivor: [
        'The lowest hand slips away with their coin.',
        'Sometimes losing small is winning enough.',
        'The wise know when to keep their head down.',
        'Not glory, but coin. And coin endures.',
        'The Sump wanted more.',
        'Small hands escape the tallest falls.',
        'Hidden Beneath the Moon',
        'Protected By The Shield',
    ],
    Dead: [
        'Caught in the middle, everything to the Sump.',
        'Not high enough to rule, not low enough to flee.',
        'The Sump is patient. It always collects.',
        'Lost in the middle where no one survives.',
        'The Sump doesn\'t mourn.',
        'Flew Yoo Close To The Sun',
        'Drowned in the deep',
        'Warped Iron Breaks Violently',
    ],
};

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const JudgementView: React.FC<JudgementViewProps> = ({ gameState, userId, playerNames, executeAction }) => {
    const myResult = gameState.players[userId]?.handResult;
    const getName  = (id: string) => gameState.assignedNames?.[id] || playerNames[id] || id.substring(0, 10) + '…';
    const isHost = gameState.hostId === userId || (!gameState.hostId && gameState.turnOrder[0] === userId);
    const isLeader = gameState.turnOrder[gameState.handLeaderIndex] === userId;
    const [anteAmount, setAnteAmount] = useState<number>(gameState.baseAnte || 10);

    const brokeIds   = gameState.turnOrder.filter(id => gameState.players[id].balance < anteAmount);
    const canStart   = gameState.turnOrder.length - brokeIds.length >= 2;

    // sequential reveal
    const activePlayerIds = gameState.turnOrder.filter(id => !gameState.players[id].isSittingOut);
    const totalCards = activePlayerIds.length * 3;
    const [revealedCount, setRevealedCount] = useState(0);

    useEffect(() => {
        if (revealedCount >= totalCards) return;
        const delay = revealedCount === 0 ? 600 : 350;
        const t = setTimeout(() => setRevealedCount(c => c + 1), delay);
        return () => clearTimeout(t);
    }, [revealedCount, totalCards]);

    const isCardRevealed = (activeIndex: number, cardIndex: number) =>
        activeIndex < 0 || revealedCount >= activeIndex * 3 + cardIndex + 1;

    const isPlayerFullyRevealed = (activeIndex: number) =>
        activeIndex < 0 || revealedCount >= (activeIndex + 1) * 3;

    // balance delta lookup
    const handResultMap = Object.fromEntries(
        (gameState.handResults ?? []).map(r => [r.playerId, r])
    );

    const myActiveIndex = activePlayerIds.indexOf(userId);
    const myFullyRevealed = isPlayerFullyRevealed(myActiveIndex);
    const myCfg = myResult && myFullyRevealed ? RESULT_STYLE[myResult] : null;

    const flavor = useMemo(() => ({
        Baron:    pick(FLAVOR.Baron),
        Survivor: pick(FLAVOR.Survivor),
        Dead:     pick(FLAVOR.Dead),
    }), []);

    return (
        // viewport-locked, inner content scrolls
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', zIndex: 1,
        }}>
            {/* Judgement atmosphere — deep vignette */}
            <div className="judgement-vignette" />
            {/* Baron victory — warm golden wash */}
            {myResult === 'Baron' && <div className="baron-flood" />}

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

                {/* Your result banner — shown only once your cards are fully revealed */}
                {myCfg && (
                    <div style={{
                        background: myCfg.bg, border: `2px solid ${myCfg.border}`,
                        borderRadius: 10, padding: '12px 36px',
                        textAlign: 'center',
                        boxShadow: `0 0 24px ${myCfg.bg}, 0 4px 16px rgba(0,0,0,0.5)`,
                        animation: 'pulse-glow 2s ease-in-out infinite',
                        width: '100%', maxWidth: 400,
                    }}>
                        <div style={{ marginBottom: 2 }}><Icon name={myCfg.icon} size={myResult === 'Dead' ? 62 : 32} color={myCfg.color} /></div>
                        <div style={{
                            fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 20,
                            color: myCfg.color, letterSpacing: 2,
                        }}>You are the {myCfg.label}</div>
                        {myResult === 'Baron' && (
                            <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(240,192,64,0.6)', marginTop: 3 }}>
                                {flavor.Baron}
                            </p>
                        )}
                        {myResult === 'Survivor' && (
                            <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(106,191,106,0.6)', marginTop: 3 }}>
                                {flavor.Survivor}
                            </p>
                        )}
                        {myResult === 'Dead' && (
                            <p style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(107,94,94,0.6)', marginTop: 3 }}>
                                {flavor.Dead}
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

                {/* All player results — tap to reveal all */}
                <div
                    onClick={revealedCount < totalCards ? () => setRevealedCount(totalCards) : undefined}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', cursor: revealedCount < totalCards ? 'pointer' : undefined }}
                >
                    {revealedCount < totalCards && (
                        <p style={{
                            fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                            fontSize: 12, color: 'rgba(201,173,135,0.35)',
                            margin: 0, letterSpacing: 1,
                        }}>tap to reveal all</p>
                    )}
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 12,
                        justifyContent: 'center', width: '100%',
                    }}>
                        {gameState.turnOrder.map(playerId => {
                            const p         = gameState.players[playerId];
                            const satOut    = !!p.isSittingOut;
                            const res       = satOut
                                ? RESULT_STYLE.SatOut
                                : (p.handResult ? RESULT_STYLE[p.handResult] : RESULT_STYLE.Dead);
                            const score     = p.hand.reduce((s, c) => s + c.value, 0);
                            const isYou     = playerId === userId;
                            const isDead    = !satOut && p.handResult === 'Dead';
                            const activeIdx = activePlayerIds.indexOf(playerId);
                            const fullyRev  = isPlayerFullyRevealed(activeIdx);
                            const hr        = handResultMap[playerId];

                            return (
                                <div key={playerId} style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                    padding: '12px 16px',
                                    background: res.bg, border: `1px solid ${res.border}`,
                                    borderRadius: 10, minWidth: 150,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                    position: 'relative', overflow: 'hidden',
                                    filter: isDead ? 'grayscale(0.65) brightness(0.72)' : satOut ? 'grayscale(0.8) brightness(0.55)' : undefined,
                                    opacity: satOut ? 0.7 : 1,
                                    transition: 'filter 0.9s ease',
                                }}>
                                    {/* Dead sludge overlay */}
                                    {isDead && (
                                        <div style={{
                                            position: 'absolute', inset: 0, borderRadius: 10,
                                            background: 'rgba(8,5,3,0.45)', pointerEvents: 'none', zIndex: 5,
                                            animation: 'sludge-in 0.9s ease forwards',
                                        }} />
                                    )}
                                    <div style={{ textAlign: 'center', position: 'relative', zIndex: 6 }}>
                                        <div style={{
                                            fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 0.5,
                                            color: isYou ? '#f0c040' : '#c9ad87', fontWeight: isYou ? 700 : 400,
                                        }}>
                                            <Icon name={res.icon} size={10} color={res.color} /> {getName(playerId)}{isYou ? ' (You)' : ''}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: 2,
                                            color: res.color, textTransform: 'uppercase', marginTop: 2,
                                        }}>{res.label}</div>
                                    </div>
                                    {satOut ? (
                                        <div style={{
                                            fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                            fontSize: 11, color: 'rgba(201,173,135,0.35)',
                                            position: 'relative', zIndex: 6,
                                        }}>insufficient funds</div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', gap: 4, position: 'relative', zIndex: 6 }}>
                                                {p.hand.map((c, ci) => (
                                                    <Card
                                                        key={c.id}
                                                        card={c}
                                                        size="sm"
                                                        hidden={!isCardRevealed(activeIdx, ci)}
                                                    />
                                                ))}
                                            </div>
                                            {fullyRev && (
                                                <div style={{ textAlign: 'center', position: 'relative', zIndex: 6, animation: 'fadeUp 0.3s ease-out forwards' }}>
                                                    <div style={{
                                                        fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 20,
                                                        color: res.color, lineHeight: 1,
                                                    }}>{score}</div>
                                                    <div style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(201,173,135,0.5)' }}>pts</div>
                                                </div>
                                            )}
                                            {/* balance delta */}
                                            {fullyRev && hr && hr.coinsChanged !== 0 && (
                                                <div style={{
                                                    fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 13,
                                                    color: hr.coinsChanged > 0 ? '#6abf6a' : '#e05050',
                                                    position: 'relative', zIndex: 6,
                                                    animation: 'fadeUp 0.4s ease-out forwards',
                                                }}>
                                                    {hr.coinsChanged > 0 ? '+' : ''}{hr.coinsChanged}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div style={{ fontFamily: 'Crimson Pro, serif', fontSize: 12, color: 'rgba(201,173,135,0.6)', position: 'relative', zIndex: 6 }}>
                                        <Icon name="coin" size={12} color="#f0c040" /> {p.balance}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {gameState.pot > 0 && (
                    <div style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(201,173,135,0.5)' }}>
                        Remaining in Sump: <strong style={{ color: '#f0c040' }}>{gameState.pot} <Icon name="coin" size={13} color="#f0c040" /></strong>
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 4 }}>
                    {(isHost || isLeader) && !gameState.forceLobby && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', paddingTop: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: '#c9ad87', textTransform: 'uppercase' }}>Next Ante:</span>
                                <input
                                    type="number"
                                    value={anteAmount}
                                    min={0}
                                    onChange={e => setAnteAmount(parseInt(e.target.value) || 0)}
                                    style={{
                                        width: 70, textAlign: 'center',
                                        background: 'rgba(26,20,16,0.8)', border: '1px solid rgba(240,192,64,0.4)',
                                        color: '#f0c040', borderRadius: 4, padding: '6px 8px',
                                        fontFamily: 'Cinzel, serif', outline: 'none'
                                    }}
                                />
                                <Icon name="coin" size={16} color="#f0c040" />
                            </div>
                            {brokeIds.length > 0 && canStart && (
                                <p style={{
                                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                    fontSize: 12, color: '#e0a060', textAlign: 'center', margin: 0, maxWidth: 300,
                                }}>
                                    {brokeIds.map(id => getName(id)).join(', ')} cannot afford this ante and will sit out.
                                </p>
                            )}
                            {!canStart && (
                                <p style={{
                                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                                    fontSize: 12, color: '#e05050', textAlign: 'center', margin: 0, maxWidth: 300,
                                }}>
                                    Fewer than 2 players can afford this ante. Lower it or top up balances via the admin panel.
                                </p>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {/* Allow Leader or Host to start the next hand */}
                        {(isHost || isLeader) && !gameState.forceLobby && (
                            <button
                                disabled={!canStart}
                                onClick={() => canStart && executeAction('StartHand', { anteAmount })}
                                style={{
                                    padding: '10px 28px',
                                    background: canStart ? 'rgba(240,192,64,0.12)' : 'rgba(30,20,16,0.5)',
                                    border: `1px solid ${canStart ? 'rgba(240,192,64,0.4)' : 'rgba(60,46,30,0.4)'}`,
                                    borderRadius: 7, fontFamily: 'Cinzel, serif',
                                    fontSize: 13, fontWeight: 700, letterSpacing: 1,
                                    color: canStart ? '#f0c040' : 'rgba(201,173,135,0.3)',
                                    cursor: canStart ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease',
                                }}
                                onMouseOver={e => { if (canStart) e.currentTarget.style.background = 'rgba(240,192,64,0.22)'; }}
                                onMouseOut={e  => { if (canStart) e.currentTarget.style.background = 'rgba(240,192,64,0.12)'; }}
                            >Deal Next Hand</button>
                        )}

                        {/* Closure warning */}
                        {gameState.forceLobby && (
                            <span style={{
                                fontFamily: 'Cinzel, serif', color: '#e05050', fontSize: 14,
                                alignSelf: 'center', fontWeight: 700, padding: '10px 0'
                            }}>
                                ⚠ Table closed by Host.
                            </span>
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
                            >Return to Lobby</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
