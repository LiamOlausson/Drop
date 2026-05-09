// src/app/components/Card.tsx
import React from 'react';
import type { Card as CardType, CardRank } from '../../game/types';

interface CardProps {
    card?: CardType;
    hidden?: boolean;
    size?: 'sm' | 'md' | 'lg';
    style?: React.CSSProperties;
}

const RANK_CONFIG: Record<CardRank, { color: string; symbol: string; glow: string }> = {
    Baron:       { color: '#c0392b', symbol: '♛', glow: 'rgba(192,57,43,0.5)' },
    Warden:      { color: '#c0932b', symbol: '⚔', glow: 'rgba(192,147,43,0.4)' },
    Citizen:     { color: '#4a7a4a', symbol: '⚖', glow: 'rgba(74,122,74,0.3)' },
    'Glow Worm': { color: '#5a8a9a', symbol: '✦', glow: 'rgba(90,138,154,0.3)' },
    Hollow:      { color: '#6b5e8d', symbol: '☽', glow: 'rgba(107,94,141,0.35)' },
};

const SIZE_MAP = {
    sm: { w: 70,  h: 100, font: 11, val: 18, sym: 14 },
    md: { w: 88,  h: 128, font: 12, val: 24, sym: 18 },
    lg: { w: 110, h: 158, font: 13, val: 30, sym: 22 },
};

export const Card: React.FC<CardProps> = ({ card, hidden, size = 'md', style }) => {
    const sz = SIZE_MAP[size];

    /* ── Card Back ── */
    if (hidden || !card) {
        return (
            <div style={{
                width: sz.w, height: sz.h,
                borderRadius: 8,
                border: '2px solid #4a3820',
                background: `radial-gradient(circle at 50% 50%, #2e2318 0%, #1a1410 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
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
                <span style={{ fontSize: sz.sym, color: 'rgba(240,192,64,0.5)', zIndex: 1, fontFamily: 'serif' }}>✦</span>
                <span style={{
                    fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 2,
                    color: 'rgba(240,192,64,0.35)', zIndex: 1, textTransform: 'uppercase'
                }}>Drop</span>
            </div>
        );
    }

    const cfg = RANK_CONFIG[card.rank] ?? RANK_CONFIG['Hollow'];

    /* ── Card Face ── */
    return (
        <div style={{
            width: sz.w, height: sz.h,
            borderRadius: 8,
            background: `linear-gradient(160deg, #f0e8d0 0%, #e4d4b0 50%, #d8c496 100%)`,
            // revealed = thicker colored border only, no banner
            border: card.isRevealed
                ? `3px solid ${cfg.color}`
                : '2px solid rgba(200,180,140,0.6)',
            display: 'flex', flexDirection: 'column',
            padding: 6,
            boxShadow: card.isRevealed
                ? `0 4px 16px rgba(0,0,0,0.6), 0 0 14px ${cfg.glow}, inset 0 0 0 1px ${cfg.color}40`
                : '0 4px 12px rgba(0,0,0,0.6)',
            position: 'relative', overflow: 'hidden',
            animation: 'cardDeal 0.3s ease-out forwards',
            flexShrink: 0,
            ...style,
        }}>
            {/* Parchment texture lines */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.15, zIndex: 0,
                backgroundImage: `repeating-linear-gradient(
                    transparent, transparent 11px,
                    rgba(100,70,30,0.4) 11px, rgba(100,70,30,0.4) 12px
                )`,
            }} />

            {/* Revealed indicator — small symbol in top-right corner only */}
            {card.isRevealed && (
                <div style={{
                    position: 'absolute', top: 3, right: 4, zIndex: 3,
                    fontSize: sz.font - 1,
                    color: cfg.color,
                    opacity: 0.85,
                    lineHeight: 1,
                    textShadow: `0 0 4px ${cfg.glow}`,
                }}>👁</div>
            )}

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
                <span style={{ fontSize: sz.sym * 1.4, color: cfg.color, opacity: 0.7, userSelect: 'none' }}>
                    {cfg.symbol}
                </span>
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
    );
};