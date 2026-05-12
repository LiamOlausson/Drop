// src/app/Activity.tsx
import { useEffect, useState } from 'react';
import { useDiscordSdk } from '../hooks/useDiscordSdk';
import { useGameState } from '../hooks/useGameState';
import { LobbyView } from './views/LobbyView';
import { ActiveGameView } from './views/ActiveGameView';
import { JudgementView } from './views/JudgementView';
import { RankRevealView } from './views/RankRevealView';
import { AdminView } from './views/AdminView';
import { DustParticles } from './components/DustParticles';

export const Activity = () => {
    const { authenticated, discordSdk, status } = useDiscordSdk();
    // pull playerNames from useGameState
    const { gameState, userId, playerNames, executeAction, actionError, isReady } = useGameState();
    const [channelName, setChannelName] = useState<string>();
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [rankRevealDone, setRankRevealDone] = useState(false);

    useEffect(() => {
        if (!authenticated || !discordSdk.channelId || !discordSdk.guildId) return;
        discordSdk.commands.getChannel({ channel_id: discordSdk.channelId }).then((channel: any) => {
            if (channel.name) setChannelName(channel.name);
        });
    }, [authenticated, discordSdk]);

    // Reset rank reveal gate whenever we leave Judgement phase
    const phase = gameState?.phase;
    useEffect(() => {
        if (phase !== 'Judgement') setRankRevealDone(false);
    }, [phase]);

    // Toggle body class for phase-specific ambient glow
    useEffect(() => {
        document.body.classList.toggle('phase-climb', phase === 'The Climb' || phase === 'Battle');
        return () => { document.body.classList.remove('phase-climb'); };
    }, [phase]);

    if (!isReady || !userId) {
        return (
            // loading screen also viewport-locked
            <div style={{
                position: 'fixed', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 20, zIndex: 1,
            }}>
                <div style={{ fontSize: 48, animation: 'flicker 1.5s ease-in-out infinite' }}>🕯</div>
                <p style={{
                    fontFamily: 'Cinzel, serif', letterSpacing: 3,
                    fontSize: 13, color: 'rgba(240,192,64,0.5)', textTransform: 'uppercase',
                }}>
                    {status === 'authenticating' ? 'Proving yourself…' : 'Kaito: Who are you? (Restart Activity)'}
                </p>
            </div>
        );
    }

    return (
        // root container is fixed/viewport-locked
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1,
        }}>
            {/* Always-on ambient layer */}
            <DustParticles />
            {/* Climb phase breathing glow */}
            {(phase === 'The Climb' || phase === 'Battle') && <div className="phase-climb-glow" />}

            {isAdminOpen && <AdminView onClose={() => setIsAdminOpen(false)} />}

            {/* Q-05: Action error toast */}
            {actionError && (
                <div style={{
                    position: 'fixed', bottom: 36, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(100,18,18,0.95)', border: '1px solid rgba(192,57,43,0.7)',
                    color: '#f5ead0', padding: '9px 20px', borderRadius: 8,
                    fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: 0.5,
                    zIndex: 9000, animation: 'fadeUp 0.2s ease-out forwards',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.8), 0 0 16px rgba(139,26,26,0.4)',
                    maxWidth: '80vw', textAlign: 'center', pointerEvents: 'none',
                }}>
                    ⚠ {actionError}
                </div>
            )}

            {!gameState ? (
                // Pass the function to open the admin view
                <LobbyView
                    channelName={channelName}
                    executeAction={executeAction}
                    onOpenAdmin={() => setIsAdminOpen(true)}
                />
            ) : gameState.phase === 'Judgement' ? (
                !rankRevealDone && !gameState.players[userId]?.isSittingOut ? (
                    <RankRevealView
                        result={gameState.players[userId]?.handResult}
                        playerName={gameState.assignedNames?.[userId] || playerNames[userId] || userId.substring(0, 8) + '…'}
                        onDone={() => setRankRevealDone(true)}
                    />
                ) : (
                    <JudgementView
                        gameState={gameState}
                        userId={userId}
                        playerNames={playerNames}
                        executeAction={executeAction}
                    />
                )
            ) : (
                <ActiveGameView
                    gameState={gameState}
                    userId={userId}
                    playerNames={playerNames}
                    executeAction={executeAction}
                />
            )}
        </div>
    );
};
