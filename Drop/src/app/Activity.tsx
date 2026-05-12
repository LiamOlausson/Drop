// src/app/Activity.tsx
import { useEffect, useState } from 'react';
import { useDiscordSdk } from '../hooks/useDiscordSdk';
import { useGameState } from '../hooks/useGameState';
import { LobbyView } from './views/LobbyView';
import { ActiveGameView } from './views/ActiveGameView';
import { JudgementView } from './views/JudgementView';
import { AdminView } from './views/AdminView';
import { DustParticles } from './components/DustParticles';

export const Activity = () => {
    const { authenticated, discordSdk, status } = useDiscordSdk();
    // pull playerNames from useGameState
    const { gameState, userId, playerNames, executeAction, isReady } = useGameState();
    const [channelName, setChannelName] = useState<string>();
    const [isAdminOpen, setIsAdminOpen] = useState(false);

    useEffect(() => {
        if (!authenticated || !discordSdk.channelId || !discordSdk.guildId) return;
        discordSdk.commands.getChannel({ channel_id: discordSdk.channelId }).then((channel: any) => {
            if (channel.name) setChannelName(channel.name);
        });
    }, [authenticated, discordSdk]);

    // Toggle body class for phase-specific ambient glow
    const phase = gameState?.phase;
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

            {!gameState ? (
                // Pass the function to open the admin view
                <LobbyView
                    channelName={channelName}
                    executeAction={executeAction}
                    onOpenAdmin={() => setIsAdminOpen(true)}
                />
            ) : gameState.phase === 'Judgement' ? (
                <JudgementView
                    gameState={gameState}
                    userId={userId}
                    playerNames={playerNames}
                    executeAction={executeAction}
                />
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
