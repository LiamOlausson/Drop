// src/app/views/LobbyView.tsx
import React, { useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import type { ActionType } from '../../game/types';

interface LobbyViewProps {
    channelName?: string;
    executeAction: (action: ActionType | 'Initialize' | 'Join' | 'StartHand', payload?: any) => void;
    onOpenAdmin?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ channelName, executeAction, onOpenAdmin}) => {
    const [playerTracking, setPlayerTracking] = useState(false);
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', padding: 40, textAlign: 'center', position: 'relative', zIndex: 1,
            animation: 'fadeUp 0.5s ease-out forwards',
        }}>

            {/* Decorative top rule */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, width: '100%', maxWidth: 420,
            }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,192,64,0.3))' }} />
                <span style={{ color: 'rgba(240,192,64,0.4)', fontSize: 18, fontFamily: 'serif' }}>♦</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(240,192,64,0.3), transparent)' }} />
            </div>

            {/* Title Block */}
            <div style={{ marginBottom: 8 }}>
                <p style={{
                    fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
                    fontSize: 13, letterSpacing: 4, color: 'rgba(201,173,135,0.5)',
                    textTransform: 'uppercase', marginBottom: 12,
                }}>
                    Sahalian's Favoured Game
                </p>

                <h1 style={{
                    fontFamily: 'Cinzel, serif', fontWeight: 900,
                    fontSize: 72, letterSpacing: 6,
                    color: '#f0c040',
                    textShadow: `
            0 0 40px rgba(240,192,64,0.3),
            0 2px 4px rgba(0,0,0,0.8),
            0 0 80px rgba(240,192,64,0.1)
          `,
                    margin: 0, lineHeight: 1,
                    animation: 'flicker 4s ease-in-out infinite',
                }}>
                    DROP
                </h1>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                    {(['crown', 'eye', 'moon', 'star-card', 'scales'] as IconName[]).map((name, i) => (
                        <span key={i} style={{
                            fontSize: 14, color: 'rgba(201,173,135,0.25)',
                            animationDelay: `${i * 0.3}s`,
                        }}>
                            <Icon name={name} size={14} color="rgba(201,173,135,0.25)" />
                        </span>
                    ))}
                </div>
            </div>

            {/* Channel badge */}
            {channelName && (
                <div style={{
                    margin: '24px 0 8px',
                    background: 'rgba(26,20,16,0.8)',
                    border: '1px solid rgba(60,46,30,0.8)',
                    borderRadius: 20, padding: '6px 20px',
                    fontFamily: 'Crimson Pro, serif', fontSize: 14,
                    color: 'rgba(201,173,135,0.55)', fontStyle: 'italic',
                }}>
                    # {channelName}
                </div>
            )}

            {/* Lore blurb */}
            <p style={{
                fontFamily: 'Crimson Pro, serif', fontSize: 17, lineHeight: 1.7,
                color: 'rgba(201,173,135,0.6)',
                maxWidth: 380, margin: '24px auto 40px',
                fontStyle: 'italic',
            }}>
                "Played in every tavern and home to sharpen the instincts
                needed to navigate Sahalian. Ruthlessly dominant, or
                perfectly invisible. There is no middle ground."
            </p>

            {/* CTA and Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <button
                    onClick={() => executeAction('Initialize', { playerTracking })}
                    style={{
                        background: 'linear-gradient(160deg, rgba(240,192,64,0.15) 0%, rgba(192,147,43,0.1) 100%)',
                        border: '1px solid rgba(240,192,64,0.45)',
                        borderRadius: 8, padding: '14px 44px',
                        fontFamily: 'Cinzel, serif', fontWeight: 700,
                        fontSize: 16, letterSpacing: 2, textTransform: 'uppercase',
                        color: '#f0c040', cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(240,192,64,0.1), 0 4px 16px rgba(0,0,0,0.5)',
                        transition: 'all 0.25s ease',
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.background = 'linear-gradient(160deg, rgba(240,192,64,0.25) 0%, rgba(192,147,43,0.2) 100%)';
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(240,192,64,0.2), 0 4px 20px rgba(0,0,0,0.6)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.background = 'linear-gradient(160deg, rgba(240,192,64,0.15) 0%, rgba(192,147,43,0.1) 100%)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(240,192,64,0.1), 0 4px 16px rgba(0,0,0,0.5)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    Open a Table
                </button>

                <label style={{
                    fontFamily: 'Crimson Pro, serif', fontSize: 15, color: 'rgba(201,173,135,0.7)',
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
                }}>
                    <input
                        type="checkbox"
                        checked={playerTracking}
                        onChange={e => setPlayerTracking(e.target.checked)}
                        style={{ accentColor: '#f0c040', width: 16, height: 16 }}
                    />
                    Canonical Version
                </label>
            </div>

            {/* Bottom rule */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginTop: 48, width: '100%', maxWidth: 420,
            }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,192,64,0.15))' }} />
                <span style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(201,173,135,0.25)', letterSpacing: 2 }}>
                    <span style={{ cursor: 'pointer' }} onClick={onOpenAdmin}>🔒</span> Scavengers Leap
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(240,192,64,0.15), transparent)' }} />
            </div>
        </div>
    );
};