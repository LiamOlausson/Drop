// src/app/components/GameBoard.tsx
import React from 'react';
import { Card } from './Card';
import type { DropGameState } from '../../game/types';

interface GameBoardProps {
    gameState: DropGameState;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState }) => {
    // Safely get the top cards of the piles
    const topDiscard = gameState.discardPile.length > 0
        ? gameState.discardPile[gameState.discardPile.length - 1]
        : undefined;

    const topFallen = gameState.fallenPile.length > 0
        ? gameState.fallenPile[gameState.fallenPile.length - 1]
        : undefined;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '30px',
            backgroundColor: '#2E8B57', // Classic casino felt green
            borderRadius: '16px',
            border: '8px solid #1e5e3a',
            minWidth: '600px',
            minHeight: '400px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)'
        }}>
            {/* The Pot */}
            <div style={{
                backgroundColor: '#111', color: '#FFD700',
                padding: '10px 30px', borderRadius: '24px',
                fontSize: '28px', fontWeight: 'bold',
                border: '2px solid #FFD700', boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                marginBottom: '40px'
            }}>
                Pot: {gameState.pot} Coins
            </div>

            {/* The Center Table Piles */}
            <div style={{
                display: 'flex',
                gap: '50px',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Discard Pile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#FFF', textShadow: '1px 1px 2px #000' }}>Discard</h3>
                    {topDiscard ? <Card card={topDiscard} /> : <EmptyPile />}
                    <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 'bold' }}>
                        {gameState.discardPile.length} Cards
                    </span>
                </div>

                {/* Draw Pile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#FFF', textShadow: '1px 1px 2px #000' }}>Draw</h3>
                    {gameState.drawPile.length > 0 ? <Card hidden /> : <EmptyPile />}
                    <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 'bold' }}>
                        {gameState.drawPile.length} Cards
                    </span>
                </div>

                {/* Fallen Pile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#FFF', textShadow: '1px 1px 2px #000' }}>Fallen</h3>
                    {topFallen ? <Card card={topFallen} /> : <EmptyPile />}
                    <span style={{ color: '#FFF', fontSize: '14px', fontWeight: 'bold' }}>
                        {gameState.fallenPile.length} Cards
                    </span>
                </div>
            </div>

            {/* Game Context Information */}
            <div style={{
                marginTop: 'auto', paddingTop: '30px', width: '100%',
                display: 'flex', justifyContent: 'space-between',
                color: '#FFF', textShadow: '1px 1px 2px #000'
            }}>
                <span style={{ fontSize: '18px' }}>Current Phase: <strong>{gameState.phase}</strong></span>
                <span style={{ fontSize: '18px' }}>Ante to Call: <strong>{gameState.currentAnteToCall}</strong></span>
            </div>
        </div>
    );
};

// Helper component for empty pile slots
const EmptyPile = () => (
    <div style={{
        width: '90px', height: '130px',
        border: '3px dashed rgba(255,255,255,0.4)',
        borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Empty</span>
    </div>
);