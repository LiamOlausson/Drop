// src/app/components/Card.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Card as CardType, CardRank } from '../../game/types';
import { Icon, type IconName } from './Icon';

const ICON_NAMES = new Set<string>(['coin', 'crown', 'obelisk', 'eye', 'moon', 'scales', 'star-card']);

interface CardProps {
    card?: CardType;
    hidden?: boolean;
    size?: 'sm' | 'md' | 'lg';
    style?: React.CSSProperties;
}

const RANK_CONFIG: Record<CardRank, { color: string; symbol: string; glow: string; bgTint: string }> = {
    Baron:       { color: '#c0392b', symbol: 'crown',     glow: 'rgba(192,57,43,0.5)',   bgTint: 'rgba(192,57,43,0.09)' },
    Warden:      { color: '#c0932b', symbol: 'eye',       glow: 'rgba(192,147,43,0.4)',  bgTint: 'rgba(192,147,43,0.06)' },
    Citizen:     { color: '#4a7a4a', symbol: 'scales',    glow: 'rgba(74,122,74,0.3)',   bgTint: 'rgba(74,122,74,0.06)' },
    'Glow Worm': { color: '#5a8a9a', symbol: 'star-card', glow: 'rgba(90,138,154,0.3)',  bgTint: 'rgba(90,138,154,0.1)' },
    Hollow:      { color: '#6b5e8d', symbol: 'moon',      glow: 'rgba(107,94,141,0.35)', bgTint: 'rgba(107,94,141,0.08)' },
};

const SIZE_MAP = {
    sm: { w: 70,  h: 100, font: 11, val: 18, sym: 14 },
    md: { w: 88,  h: 128, font: 12, val: 24, sym: 18 },
    lg: { w: 110, h: 158, font: 13, val: 30, sym: 22 },
};

const RANK_TOOLTIPS: Record<CardRank, { range: string; decree: string; bluff: string }> = {
    Baron:       { range: '15 pts', decree: 'Target announces all card ranks in their hand.', bluff: 'Smuggler loses double the ante.' },
    Warden:      { range: '7–10 pts',  decree: 'Target with a revealed card declares if their score is ≥ 20.', bluff: 'Smuggler loses double the ante.' },
    Citizen:     { range: '4–6 pts',   decree: 'Take any Discard card, then drop one from your hand.', bluff: 'Smuggler loses double the ante.' },
    'Glow Worm': { range: '2–3 pts',   decree: 'Target with a revealed card pays another ante into the Sump.', bluff: 'Smuggler cannot claim the pot this hand.' },
    Hollow:      { range: '1 pt',      decree: 'Target discards their highest rank card.', bluff: 'Smuggler is eliminated from the hand.' },
};

export const Card: React.FC<CardProps> = ({ card, hidden, size = 'md', style }) => {
    const sz = SIZE_MAP[size];
    const [hovered, setHovered] = useState(false);
    const prevHidden = useRef(hidden);
    const [isFlipping, setIsFlipping] = useState(false);
    const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (prevHidden.current === true && hidden === false) {
            setIsFlipping(true);
            const t = setTimeout(() => setIsFlipping(false), 320);
            return () => clearTimeout(t);
        }
        prevHidden.current = hidden;
    }, [hidden]);

    useEffect(() => () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    }, []);

    const handleMouseEnter = () => {
        setHovered(true);
        if (!hidden && card) {
            tooltipTimer.current = setTimeout(() => {
                if (cardRef.current) {
                    const rect = cardRef.current.getBoundingClientRect();
                    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                }
            }, 400);
        }
    };

    const handleMouseLeave = () => {
        setHovered(false);
        if (tooltipTimer.current) {
            clearTimeout(tooltipTimer.current);
            tooltipTimer.current = null;
        }
        setTooltipPos(null);
    };

    /* ── Card Back ── */
    if (hidden || !card) {
        return (
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                width: sz.w, height: sz.h,
                borderRadius: 8,
                border: '2px solid #4a3820',
                background: `radial-gradient(circle at 50% 50%, #2e2318 0%, #1a1410 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4,
                boxShadow: hovered
                    ? '0 2px 4px rgba(0,0,0,0.95), 4px 8px 20px rgba(0,0,0,0.8), -1px -1px 0 rgba(255,255,255,0.04), 0 0 14px rgba(240,192,64,0.1)'
                    : '0 2px 4px rgba(0,0,0,0.9), 3px 6px 16px rgba(0,0,0,0.75), -1px -1px 0 rgba(255,255,255,0.03)',
                transition: 'box-shadow 0.2s ease',
                position: 'relative', overflow: 'hidden',
                flexShrink: 0,
                ...style,
            }}>
                <div style={{
                    position: 'absolute', inset: 5,
                    border: '1px solid rgba(240,192,64,0.2)',
                    borderRadius: 4,
                    backgroundImage: `repeating-linear-gradient(
                        45deg, transparent, transparent 4px,
                        rgba(240,192,64,0.03) 4px, rgba(240,192,64,0.03) 5px
                    )`,
                }} />
                <Icon name="star-card" size={sz.sym} color="rgba(240,192,64,0.5)" style={{ zIndex: 1 }} />
                <span style={{
                    fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 2,
                    color: 'rgba(240,192,64,0.35)', zIndex: 1, textTransform: 'uppercase'
                }}>Drop</span>
            </div>
        );
    }

    const cfg = RANK_CONFIG[card.rank] ?? RANK_CONFIG['Hollow'];
    const tip = RANK_TOOLTIPS[card.rank];

    /* Card Face */
    return (
        <>
            <div
                ref={cardRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                width: sz.w, height: sz.h,
                borderRadius: 8,
                background: `linear-gradient(160deg, #f0e8d0 0%, #e4d4b0 50%, #d8c496 100%)`,
                border: card.isRevealed
                    ? `3px solid ${cfg.color}`
                    : '1px solid rgba(160,130,80,0.55)',
                display: 'flex', flexDirection: 'column',
                padding: 6,
                boxShadow: card.isRevealed
                    ? hovered
                        ? `0 6px 24px rgba(0,0,0,0.7), 0 0 40px ${cfg.glow}, inset 0 0 36px ${cfg.glow}`
                        : `0 4px 18px rgba(0,0,0,0.6), 0 0 28px ${cfg.glow}, inset 0 0 26px ${cfg.glow}`
                    : hovered
                        ? '0 2px 4px rgba(0,0,0,0.95), 4px 8px 20px rgba(0,0,0,0.75), -1px -1px 0 rgba(255,255,255,0.05)'
                        : '0 2px 4px rgba(0,0,0,0.9), 3px 6px 16px rgba(0,0,0,0.7), -1px -1px 0 rgba(255,255,255,0.03)',
                transition: 'box-shadow 0.2s ease',
                position: 'relative', overflow: 'hidden',
                animation: isFlipping ? 'cardFlip 0.28s cubic-bezier(0.4,0,0.2,1) forwards' : 'cardDeal 0.3s ease-out forwards',
                filter: card.rank === 'Glow Worm' ? 'drop-shadow(0 0 4px rgba(90,138,154,0.45))' : undefined,
                flexShrink: 0,
                ...style,
            }}>
                {/* Off-color card edge frame */}
                <div style={{
                    position: 'absolute', inset: 4,
                    borderRadius: 5,
                    border: card.isRevealed
                        ? `2px solid ${cfg.color}70`
                        : '1px solid rgba(150,115,55,0.25)',
                    pointerEvents: 'none', zIndex: 0,
                }} />
                {/* Rank material tint overlay */}
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: 7,
                    background: cfg.bgTint,
                    pointerEvents: 'none', zIndex: 0,
                }} />

                {/* Top-left corner */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 1, lineHeight: 1.1 }}>
                    <span style={{
                        fontFamily: 'Cinzel, serif', fontWeight: 700,
                        fontSize: sz.font, color: '#1a1410', lineHeight: 1,
                    }}>{card.name}</span>
                    <span style={{
                        fontSize: sz.font - 2, color: cfg.color,
                        fontFamily: 'IM Fell English, serif', fontStyle: 'italic'
                    }}>
                        {card.rank}
                    </span>
                </div>

                {/* Center symbol */}
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                }}>
                    {ICON_NAMES.has(cfg.symbol)
                        ? <Icon name={cfg.symbol as IconName} size={Math.round(sz.sym * 1.4)} color={cfg.color} style={{ opacity: 0.7 }} />
                        : <span style={{ fontSize: sz.sym * 1.4, color: cfg.color, opacity: 0.7, userSelect: 'none' }}>{cfg.symbol}</span>
                    }
                </div>

                {/* Bottom value */}
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', zIndex: 1,
                }}>
                    <span style={{
                        fontFamily: 'Cinzel, serif', fontWeight: 900,
                        fontSize: sz.val, color: cfg.color, lineHeight: 1,
                        textShadow: `0 1px 0 rgba(0,0,0,0.2)`,
                    }}>{card.value}</span>
                </div>
            </div>

            {tooltipPos && tip && ReactDOM.createPortal(
                <div className="card-rank-tooltip" style={{
                    position: 'fixed',
                    left: tooltipPos.x,
                    top: tooltipPos.y,
                    transform: 'translate(-50%, -100%)',
                }}>
                    <div style={{
                        fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 11,
                        color: cfg.color, letterSpacing: 1, marginBottom: 5,
                    }}>
                        {card.rank} — {tip.range}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: 0.5, color: 'rgba(240,192,64,0.5)', textTransform: 'uppercase' }}>Decree </span>
                        <span style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(201,173,135,0.85)' }}>{tip.decree}</span>
                    </div>
                    <div>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 8, letterSpacing: 0.5, color: 'rgba(192,57,43,0.7)', textTransform: 'uppercase' }}>Bluff </span>
                        <span style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(201,173,135,0.65)' }}>{tip.bluff}</span>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
