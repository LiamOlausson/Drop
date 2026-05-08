// src/app/components/GameBoard.tsx
import React from 'react';
import { Card } from './Card';
import type { DropGameState } from '../../game/types';

interface GameBoardProps {
    gameState: DropGameState;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState }) => {
    const topDiscard = gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1] : undefined;
    const topFallen  = gameState.fallenPile.length > 0
        ? gameState.fallenPile[gameState.fallenPile.length - 1] : undefined;

    const phaseLabel: Record<string, string> = {
        'Setup':            '— Waiting for players —',
        'Feeding The Sump': '— Ante time —',
        'The Climb':        '— The Climb —',
        'Battle':           '— Battle —',
        'Judgement':        '— Judgement —',
    };

    return (
        <div style={{
            position: 'relative',
            width: '100%', maxWidth: 700,
            background: `
        radial-gradient(ellipse 80% 70% at 50% 50%, #2a4a2a 0%, #1e3a1e 50%, #152d15 100%)
      `,
            borderRadius: 20,
            border: '6px solid #1e1008',
            boxShadow: `
        0 0 0 1px rgba(240,192,64,0.12),
        0 8px 40px rgba(0,0,0,0.9),
        inset 0 0 60px rgba(0,0,0,0.4),
        inset 0 0 120px rgba(0,0,0,0.2)
      `,
            padding: '28px 32px 24px',
            overflow: 'hidden',
        }}>
            {/* Felt texture */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: `
          repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 3px
          )
        `,
                borderRadius: 14,
            }} />

            {/* Oval decorative inner ring */}
            <div style={{
                position: 'absolute', inset: 16, pointerEvents: 'none', zIndex: 0,
                border: '1px solid rgba(240,192,64,0.1)',
                borderRadius: 12,
            }} />

            {/* Phase Banner */}
            <div style={{
                textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 1,
            }}>
        <span style={{
            fontFamily: 'IM Fell English, serif', fontStyle: 'italic',
            fontSize: 15, color: 'rgba(240,192,64,0.65)', letterSpacing: 1,
        }}>
          {phaseLabel[gameState.phase] ?? `— ${gameState.phase} —`}
        </span>
            </div>

            {/* Pot */}
            <div style={{
                display: 'flex', justifyContent: 'center', marginBottom: 24, zIndex: 1, position: 'relative',
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #2e2318 0%, #1a1410 100%)',
                    border: '2px solid rgba(240,192,64,0.4)',
                    borderRadius: 40, padding: '8px 32px',
                    boxShadow: '0 0 20px rgba(240,192,64,0.15), 0 4px 12px rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <span style={{ fontSize: 20 }}>🪙</span>
                    <span style={{
                        fontFamily: 'Cinzel, serif', fontWeight: 700,
                        fontSize: 22, color: '#f0c040',
                        textShadow: '0 0 10px rgba(240,192,64,0.4)',
                    }}>{gameState.pot}</span>
                    <span style={{
                        fontFamily: 'Cinzel, serif', fontSize: 11,
                        color: 'rgba(240,192,64,0.5)', letterSpacing: 2,
                        textTransform: 'uppercase', alignSelf: 'flex-end', marginBottom: 2,
                    }}>in the Sump</span>
                </div>
            </div>

            {/* The three piles */}
            <div style={{
                display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start',
                position: 'relative', zIndex: 1,
            }}>
                <Pile label="Discard" count={gameState.discardPile.length} card={topDiscard} />
                <Pile label="Draw" count={gameState.drawPile.length} hidden />
                <Pile label="Fallen" count={gameState.fallenPile.length} card={topFallen} />
            </div>

            {/* Footer info bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 20, paddingTop: 16,
                borderTop: '1px solid rgba(240,192,64,0.1)',
                position: 'relative', zIndex: 1,
            }}>
        <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(201,173,135,0.6)', fontStyle: 'italic' }}>
          Round {gameState.roundNumber}
        </span>
                <span style={{ fontFamily: 'Crimson Pro, serif', fontSize: 13, color: 'rgba(201,173,135,0.6)', fontStyle: 'italic' }}>
          Ante to call: <strong style={{ color: '#c9ad87' }}>{gameState.currentAnteToCall} 🪙</strong>
        </span>
            </div>
        </div>
    );
};

const Pile: React.FC<{
    label: string;
    count: number;
    card?: any;
    hidden?: boolean;
}> = ({ label, count, card, hidden }) => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
    <span style={{
        fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2,
        color: 'rgba(240,192,64,0.5)', textTransform: 'uppercase',
    }}>{label}</span>

        {(card || hidden) && count > 0 ? (
            <Card card={card} hidden={hidden} size="md" />
        ) : (
            <EmptyPile />
        )}

        <span style={{
            fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
            fontSize: 12, color: 'rgba(201,173,135,0.4)',
        }}>{count} card{count !== 1 ? 's' : ''}</span>
    </div>
);

const EmptyPile = () => (
    <div style={{
        width: 88, height: 128,
        border: '2px dashed rgba(201,173,135,0.2)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <span style={{ fontFamily: 'serif', fontSize: 20, color: 'rgba(201,173,135,0.15)' }}>∅</span>
    </div>
);