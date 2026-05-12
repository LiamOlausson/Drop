// src/app/views/RankRevealView.tsx
import React, { useEffect, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';

interface RankRevealViewProps {
    result: 'Baron' | 'Survivor' | 'Dead' | undefined;
    playerName: string;
    onDone: () => void;
}

const RANK_CONFIG: Record<string, { icon: IconName; color: string; label: string; subtitle: string; glow: string }> = {
    Baron:    { icon: 'crown',   color: '#f0c040', label: 'BARON',    subtitle: 'Claims the Peak',              glow: 'radial-gradient(ellipse 120% 120% at 50% 50%, rgba(240,192,64,0.28) 0%, rgba(8,6,4,0) 65%)' },
    Survivor: { icon: 'eye',     color: '#6abf6a', label: 'SURVIVOR', subtitle: 'Slips away with your coin',    glow: 'radial-gradient(ellipse 120% 120% at 50% 50%, rgba(74,122,74,0.24) 0%, rgba(8,6,4,0) 65%)' },
    Dead:     { icon: 'obelisk', color: '#6b5e5e', label: 'DEAD',     subtitle: 'Everything to the Sump',       glow: 'radial-gradient(ellipse 120% 120% at 50% 50%, rgba(30,20,14,0.6)  0%, rgba(8,6,4,0) 65%)' },
};

// stage: 0 = blank  1 = "You"  2 = "are"  3 = "the"  4 = rank splash
const WORD_TIMINGS = [300, 900, 1500];   // ms each word appears
const SPLASH_AT   = 2200;
const DONE_AT     = 5000;

export const RankRevealView: React.FC<RankRevealViewProps> = ({ result, playerName, onDone }) => {
    const [stage, setStage] = useState(0);
    const cfg = result ? RANK_CONFIG[result] : RANK_CONFIG.Dead;

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [
            ...WORD_TIMINGS.map((ms, i) => setTimeout(() => setStage(i + 1), ms)),
            setTimeout(() => setStage(4), SPLASH_AT),
            setTimeout(() => onDone(),    DONE_AT),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div
            onClick={onDone}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(8,6,4,0.99)',
                cursor: 'default',
            }}
        >
            {/* Rank-specific ambient glow — fades in with splash */}
            {stage >= 4 && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                    background: cfg.glow,
                    animation: 'baron-splash-out 2.8s ease-out forwards',
                }} />
            )}

            {/* "You are the" word-stagger */}
            {stage < 4 && (
                <div style={{
                    display: 'flex', gap: 22, alignItems: 'baseline',
                    position: 'relative', zIndex: 1,
                }}>
                    {(['You', 'are', 'the'] as const).map((word, i) => (
                        <span
                            key={word}
                            style={{
                                fontFamily: 'Cinzel, serif',
                                fontWeight: 900,
                                fontSize: 38,
                                letterSpacing: 5,
                                color: 'rgba(201,173,135,0.88)',
                                display: 'inline-block',
                                opacity: stage > i ? 1 : 0,
                                transform: stage > i ? 'translateY(0)' : 'translateY(16px)',
                                transition: 'opacity 0.42s ease-out, transform 0.42s ease-out',
                            }}
                        >{word}</span>
                    ))}
                </div>
            )}

            {/* Rank splash */}
            {stage >= 4 && (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 12,
                    position: 'relative', zIndex: 1,
                    animation: 'baron-splash-out 2.8s ease-out forwards',
                    pointerEvents: 'none',
                }}>
                    <div style={{ animation: 'baron-crown-in 0.75s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                        <Icon name={cfg.icon} size={100} color={cfg.color} />
                    </div>
                    <div style={{
                        fontFamily: 'Cinzel, serif', fontWeight: 900,
                        fontSize: 52, letterSpacing: 8, color: cfg.color,
                        textShadow: `0 0 40px ${cfg.color}cc, 0 0 80px ${cfg.color}55`,
                        animation: 'baron-text-in 0.5s ease-out 0.45s both',
                    }}>{cfg.label}</div>
                    <div style={{
                        fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                        fontSize: 20, letterSpacing: 4,
                        color: cfg.color + '99',
                        animation: 'baron-text-in 0.5s ease-out 0.75s both',
                    }}>{cfg.subtitle}</div>
                    <div style={{
                        fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 2,
                        color: cfg.color + '55', marginTop: 8,
                        animation: 'baron-text-in 0.4s ease-out 1.0s both',
                    }}>{playerName}</div>
                </div>
            )}
        </div>
    );
};
