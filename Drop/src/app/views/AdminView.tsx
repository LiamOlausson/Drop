// src/app/views/AdminView.tsx
import React, { useState } from 'react';

interface AdminViewProps {
    onClose: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const [players, setPlayers] = useState<Array<{ id: string; name: string; balance: number }>>([]);
    const [editValues, setEditValues] = useState<Record<string, string>>({});

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/admin/players?password=${encodeURIComponent(password)}`);
            if (res.ok) {
                const data = await res.json();
                setPlayers(data.players);
                setIsAuthenticated(true);
                setError('');
            } else {
                setError('Incorrect password or unauthorized.');
            }
        } catch (err) {
            setError('Failed to connect to the server.');
        }
    };

    const handleUpdateBalance = async (userId: string) => {
        const val = parseInt(editValues[userId]);
        if (isNaN(val) || val < 0) return;

        try {
            const res = await fetch('/api/admin/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, userId, newBalance: val })
            });

            if (res.ok) {
                setPlayers(prev => prev.map(p => p.id === userId ? { ...p, balance: val } : p));
                setEditValues(prev => {
                    const next = { ...prev };
                    delete next[userId];
                    return next;
                });
            } else {
                alert('Failed to update balance');
            }
        } catch (err) {
            alert('Error connecting to server');
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(13,10,7,0.95)', zIndex: 100,
            padding: 20
        }}>
            <div style={{
                width: '100%', maxWidth: 500,
                background: 'linear-gradient(160deg, rgba(26,20,16,0.97) 0%, rgba(18,14,10,0.97) 100%)',
                border: '1px solid rgba(60,46,30,0.9)',
                borderTop: '3px solid #c0392b',
                borderRadius: 10, padding: 30,
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column', gap: 20
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c0392b', margin: 0 }}>Superadmin Oversight</h2>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', color: 'rgba(201,173,135,0.5)',
                        cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 16
                    }}>✕</button>
                </div>

                {!isAuthenticated ? (
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontFamily: 'Crimson Pro, serif', color: 'rgba(201,173,135,0.7)', fontStyle: 'italic' }}>
                            Enter the master phrase to access the ledgers.
                        </p>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password..."
                            style={{
                                background: 'rgba(13,10,7,0.8)', border: '1px solid rgba(192,57,43,0.5)',
                                color: '#c9ad87', padding: '10px 14px', borderRadius: 6,
                                fontFamily: 'Crimson Pro, serif', fontSize: 16, outline: 'none'
                            }}
                        />
                        {error && <span style={{ color: '#e05050', fontSize: 13, fontStyle: 'italic' }}>{error}</span>}
                        <button type="submit" style={{
                            background: 'rgba(192,57,43,0.2)', border: '1px solid rgba(192,57,43,0.5)',
                            color: '#e05050', padding: '10px', borderRadius: 6,
                            fontFamily: 'Cinzel, serif', fontWeight: 700, cursor: 'pointer', marginTop: 10
                        }}>Unlock Ledgers</button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
                        {players.map(p => (
                            <div key={p.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'rgba(255,255,255,0.03)', padding: '10px 14px',
                                borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <span style={{ fontFamily: 'Cinzel, serif', color: '#c9ad87', fontSize: 14 }}>{p.name}</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        value={editValues[p.id] ?? p.balance}
                                        onChange={e => setEditValues({ ...editValues, [p.id]: e.target.value })}
                                        style={{
                                            width: 80, background: 'rgba(13,10,7,0.8)', border: '1px solid rgba(240,192,64,0.3)',
                                            color: '#f0c040', padding: '4px 8px', borderRadius: 4,
                                            fontFamily: 'Cinzel, serif', textAlign: 'center', outline: 'none'
                                        }}
                                    />
                                    {editValues[p.id] !== undefined && editValues[p.id] !== p.balance.toString() && (
                                        <button
                                            onClick={() => handleUpdateBalance(p.id)}
                                            style={{
                                                background: 'rgba(106,191,106,0.2)', border: '1px solid rgba(106,191,106,0.5)',
                                                color: '#6abf6a', padding: '4px 10px', borderRadius: 4,
                                                fontFamily: 'Cinzel, serif', cursor: 'pointer'
                                            }}
                                        >Save</button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {players.length === 0 && (
                            <p style={{ color: 'rgba(201,173,135,0.5)', fontStyle: 'italic', textAlign: 'center' }}>No tracked players found in the database.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};