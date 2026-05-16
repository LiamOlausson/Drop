// src/app/components/RulesPanel.tsx
import React from 'react';
import { Icon, type IconName } from './Icon';

interface RulesPanelProps {
    onClose: () => void;
}

const ACTIONS_REF: Array<{ label: string; icon: IconName; color: string; what: string; note: string }> = [
    { label: 'Scavenge', icon: 'swap',   color: '#6a8c4a', what: 'Swap a card in your hand with the top of the Discard or Fallen pile, or a revealed card from an opponent\'s hand.', note: 'Your new card is revealed; the card you give away goes face-down.' },
    { label: 'Dive',     icon: 'plunge', color: '#4a6a8c', what: 'Discard 2 cards from your hand and pay the current ante. Draw 2 fresh cards from the deck.', note: 'Your first drawn card is revealed unless you already have a revealed card.' },
    { label: 'Ascend',   icon: 'flame',  color: '#8c4a4a', what: 'Raise the stakes by any amount. All other active players must Call (match the raise) or Fold (go to the Bridge, eliminated).', note: 'Folded players keep their ante but lose their hand.' },
    { label: 'Snitch',   icon: 'accuse', color: '#cda716', what: 'Force a target player to reveal either their highest or their lowest card to the table.', note: 'Once revealed, that card stays face-up for all to see. The exposed player cannot become the Survivor this hand.' },
    { label: 'Smuggle',  icon: 'shroud', color: '#6a4a8c', what: 'Drop a card from your hand face-down into the Fallen pile and declare its rank (truthfully or not). Other players may Challenge or Pass.', note: 'If unchallenged, you gain the Decree power of your declared rank. If caught bluffing, you face the bluff consequence.' },
    { label: 'Sabotage', icon: 'dagger', color: '#8c6a2a', what: "Choose one of an opponent's cards (by position) to cast to the Fallen pile. They immediately draw a replacement.", note: 'You must also reveal one of your own cards as the cost.' },
];

const RANKS_REF: Array<{ rank: string; color: string; pts: string; decree: string; bluff: string }> = [
    { rank: 'Baron',     color: '#c0392b', pts: '15 pts',   decree: 'Target announces all card ranks in their hand.',                           bluff: 'Challenge loser must match the current pot.' },
    { rank: 'Warden',    color: '#c0932b', pts: '7–10 pts', decree: 'Target with a revealed card declares if their score is ≥ 20.',             bluff: 'Challenge loser discards all their Baron cards and redraws.' },
    { rank: 'Citizen',   color: '#4a7a4a', pts: '4–6 pts',  decree: 'Take any card from the Discard pile, then drop one from your hand.',       bluff: 'Challenge loser pays the ante directly to the winner.' },
    { rank: 'Glow Worm', color: '#5a8a9a', pts: '2–3 pts',  decree: 'Target with a revealed card pays another ante into the Sump.',             bluff: 'Challenge loser cannot claim the pot this hand.' },
    { rank: 'Hollow',    color: '#6b5e8d', pts: '1 pt',     decree: 'Target discards their highest rank card.',                                 bluff: 'Challenge loser of the challenge is eliminated from this hand.' },
];

export const RulesPanel: React.FC<RulesPanelProps> = ({ onClose }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(5,3,1,0.82)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '20px 12px',
            overflowY: 'auto',
        }}
    >
        <div
            onClick={e => e.stopPropagation()}
            style={{
                width: '100%', maxWidth: 520,
                background: 'linear-gradient(160deg, rgba(26,20,16,0.99) 0%, rgba(16,12,8,0.99) 100%)',
                border: '1px solid rgba(60,46,30,0.9)',
                borderTop: '3px solid rgba(240,192,64,0.4)',
                borderRadius: 12,
                boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px 12px',
                borderBottom: '1px solid rgba(60,46,30,0.7)',
                background: 'rgba(13,10,7,0.6)',
            }}>
                <div>
                    <p style={{ fontFamily: 'IM Fell English, serif', fontStyle: 'italic', fontSize: 10, letterSpacing: 3, color: 'rgba(201,173,135,0.4)', textTransform: 'uppercase', marginBottom: 2 }}>Quick Reference</p>
                    <h2 style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 18, letterSpacing: 3, color: '#f0c040', margin: 0 }}>Drop — Rules</h2>
                </div>
                <button onClick={onClose} style={{
                    background: 'rgba(60,46,30,0.5)', border: '1px solid rgba(60,46,30,0.8)',
                    color: 'rgba(201,173,135,0.6)', borderRadius: 6, padding: '6px 12px',
                    fontFamily: 'Cinzel, serif', fontSize: 11, cursor: 'pointer',
                    letterSpacing: 1, textTransform: 'uppercase',
                }}>Close</button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── Judgement Scoring ── */}
                <Section title="Judgement Scoring">
                    <p style={bodyStyle}>At the end of each hand, players are sorted by their total hand score.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {([
                            { label: 'Baron',    color: '#f0c040', icon: 'crown'   as IconName, desc: 'Highest score — claims the entire pot.' },
                            { label: 'Survivor', color: '#6abf6a', icon: 'eye'     as IconName, desc: 'Lowest score — gets their ante back.' },
                            { label: 'Dead',     color: '#6b5e5e', icon: 'obelisk' as IconName, desc: 'Everyone else — ante is lost to the Sump.' },
                        ] as const).map(r => (
                            <div key={r.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(60,46,30,0.4)' }}>
                                <Icon name={r.icon} size={14} color={r.color} />
                                <div>
                                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: r.color, letterSpacing: 0.5 }}>{r.label}</span>
                                    <span style={{ ...bodyStyle, marginLeft: 8 }}>{r.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── Actions ── */}
                <Section title="Actions">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ACTIONS_REF.map(a => (
                            <div key={a.label} style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 7, borderLeft: `3px solid ${a.color}60` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                    <Icon name={a.icon} size={12} color={a.color} />
                                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: a.color, letterSpacing: 0.8, textTransform: 'uppercase' }}>{a.label}</span>
                                </div>
                                <p style={{ ...bodyStyle, marginBottom: 3 }}>{a.what}</p>
                                <p style={{ ...noteStyle }}>{a.note}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── Card Ranks ── */}
                <Section title="Card Ranks &amp; Smuggle Decrees">
                    <p style={bodyStyle}>If a Smuggle goes unchallenged, the Smuggler issues the Decree matching their declared rank. If challenged and caught bluffing, the consequence below falls on the loser.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {RANKS_REF.map(r => (
                            <div key={r.rank} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.025)', borderRadius: 6, borderLeft: `3px solid ${r.color}55` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: r.color, letterSpacing: 0.5 }}>{r.rank}</span>
                                    <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 11, color: 'rgba(201,173,135,0.4)', fontStyle: 'italic' }}>{r.pts}</span>
                                </div>
                                <p style={{ ...noteStyle, marginBottom: 2 }}><span style={{ color: 'rgba(240,192,64,0.45)' }}>Decree: </span>{r.decree}</p>
                                <p style={{ ...noteStyle }}><span style={{ color: 'rgba(192,57,43,0.55)' }}>Bluff: </span>{r.bluff}</p>
                            </div>
                        ))}
                    </div>
                </Section>

            </div>
        </div>
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(240,192,64,0.2), transparent)' }} />
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 3, color: 'rgba(240,192,64,0.45)', textTransform: 'uppercase' }}>{title}</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,192,64,0.2))' }} />
        </div>
        {children}
    </div>
);

const bodyStyle: React.CSSProperties = {
    fontFamily: 'Crimson Pro, serif', fontSize: 13,
    color: 'rgba(201,173,135,0.75)', lineHeight: 1.5, margin: 0,
};
const noteStyle: React.CSSProperties = {
    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 12,
    color: 'rgba(201,173,135,0.45)', lineHeight: 1.4, margin: 0,
};
