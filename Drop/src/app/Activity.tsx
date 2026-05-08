// src/app/Activity.tsx
import { useEffect, useState } from 'react';
import { useDiscordSdk } from '../hooks/useDiscordSdk';
import { useGameState } from '../hooks/useGameState';
import { LobbyView } from './views/LobbyView';
import { ActiveGameView } from './views/ActiveGameView';
import { JudgementView } from './views/JudgementView';

export const Activity = () => {
    const { authenticated, discordSdk, status } = useDiscordSdk();
    const { gameState, userId, executeAction, isReady } = useGameState();
    const [channelName, setChannelName] = useState<string>();

    useEffect(() => {
        if (!authenticated || !discordSdk.channelId || !discordSdk.guildId) return;
        discordSdk.commands.getChannel({ channel_id: discordSdk.channelId }).then((channel) => {
            if (channel.name) setChannelName(channel.name);
        });
    }, [authenticated, discordSdk]);

    if (!isReady || !userId) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '100vh', gap: 20, position: 'relative', zIndex: 1,
            }}>
                {/* Candle flicker loader */}
                <div style={{
                    fontSize: 48,
                    animation: 'flicker 1.5s ease-in-out infinite',
                }}>🕯</div>
                <p style={{
                    fontFamily: 'Cinzel, serif', letterSpacing: 3,
                    fontSize: 13, color: 'rgba(240,192,64,0.5)',
                    textTransform: 'uppercase',
                }}>
                    {status === 'authenticating' ? 'Proving yourself…' : 'Lighting the candles…'}
                </p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            width: '100%', minHeight: '100vh',
            position: 'relative', zIndex: 1,
        }}>
            {!gameState ? (
                <LobbyView channelName={channelName} executeAction={executeAction} />
            ) : gameState.phase === 'Judgement' ? (
                <JudgementView gameState={gameState} userId={userId} executeAction={executeAction} />
            ) : (
                <ActiveGameView gameState={gameState} userId={userId} executeAction={executeAction} />
            )}
        </div>
    );
};