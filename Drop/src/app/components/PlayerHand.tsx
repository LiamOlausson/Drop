// src/app/components/PlayerHand.tsx
import React from 'react';
import { Card } from './Card';
import type { PlayerState } from '../../game/types';

interface PlayerHandProps {
    player: PlayerState;
    isCurrentPlayer: boolean;
    isActiveTurn?: boolean;
}

const RESULT_CONFIG = {
    Baron:    { label: '♛ Baron',    bg: '#8b1a1a', color: '#f0c040' },
    Survivor: { label: '⚔ Survivor', bg: '#1e3a1e', color: '#6abf6a' },
    Dead:     { label: '✝ Dead',     bg: '#1a1410', color: '#6b5e5e' },
};

export const PlayerHand: React.FC<PlayerHandProps> = ({ player, isCurrentPlayer, isActiveTurn }) => {
    const result = player.handResult ? RESULT_CONFIG[player.handResult] : null;
    const isOut = player.isDead || player.hasFolded;

    const shortId = player.id.length > 12
        ? player.id.substring(0, 10) + '…'
        : player.id;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 10, padding: '14px 16px',
            background: isActiveTurn
                ? 'linear-gradient(160deg, rgba(240,192,64,0.08) 0%, rgba(46,35,24,0.9) 100%)'
                : 'linear-gradient(160deg, rgba(30,20,16,0.95) 0%, rgba(22,16,12,0.95) 100%)',
            border: isActiveTurn
                ? '2px solid rgba(240,192,64,0.45)'
                : '1px solid rgba(60,46,30,0.8)',
            borderRadius: 12,
            boxShadow: isActiveTurn
                ? '0 0 20px rgba(240,192,64,0.15), 0 4px 16px rgba(0,0,0,0.6)'
                : '0 4px 16px rgba(0,0,0,0.5)',
            transition: 'all 0.35s ease',
            opacity: isOut && !player.handResult ? 0.45 : 1,
            minWidth: 170,
            position: 'relative',
            animation: 'fadeUp 0.4s ease-out forwards',
        }}>
            {/* Active turn indicator */}
            {isActiveTurn && (
                <div style={{
                    position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #c0932b, #f0c040, #c0932b)',
                    borderRadius: '0 0 6px 6px',
                    padding: '2px 14px',
                    fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 2,
                    color: '#1a1410', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                    {isCurrentPlayer ? 'Your Turn' : 'Acting…'}
                </div>
            )}

            {/* Header */}
            <div style={{
                width: '100%', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginTop: isActiveTurn ? 8 : 0,
            }}>
        <span style={{
            fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 0.5,
            color: isCurrentPlayer ? '#f0c040' : '#c9ad87',
            fontWeight: isCurrentPlayer ? 700 : 400,
        }}>
          {shortId}{isCurrentPlayer && ' ★'}
        </span>
                <span style={{
                    fontFamily: 'Crimson Pro, serif', fontSize: 14,
                    color: '#c9ad87',
                }}>
          🪙 {player.balance}
        </span>
            </div>

            {/* Ante paid badge */}
            {player.antePaid > 0 && (
                <div style={{
                    alignSelf: 'flex-end',
                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                    fontSize: 11, color: 'rgba(201,173,135,0.5)',
                }}>
                    {player.antePaid} ante in
                </div>
            )}

            {/* Status badge */}
            {result ? (
                <div style={{
                    background: result.bg, color: result.color,
                    padding: '3px 14px', borderRadius: 4,
                    fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 1,
                    border: `1px solid ${result.color}40`,
                }}>
                    {result.label}
                </div>
            ) : isOut ? (
                <div style={{
                    background: '#1a1410', color: '#6b5e5e',
                    padding: '3px 14px', borderRadius: 4,
                    fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', fontSize: 12,
                }}>
                    {player.isDead ? '✝ Eliminated' : '⚑ Folded'}
                </div>
            ) : null}

            {/* Cards */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {player.hand.map((card, i) => (
                    <div key={card.id} style={{
                        transform: isCurrentPlayer ? `translateY(-${i % 2 === 0 ? 4 : 0}px)` : 'none',
                        transition: 'transform 0.2s ease',
                        animationDelay: `${i * 0.08}s`,
                    }}>
                        <Card
                            card={card}
                            hidden={!isCurrentPlayer && !card.isRevealed}
                            size="sm"
                        />
                    </div>
                ))}
                {player.hand.length === 0 && (
                    <span style={{
                        fontFamily: 'Crimson Pro, serif', fontStyle: 'italic',
                        color: 'rgba(201,173,135,0.3)', fontSize: 13, padding: '30px 20px',
                    }}>
            no cards
          </span>
                )}
            </div>
        </div>
    );
};