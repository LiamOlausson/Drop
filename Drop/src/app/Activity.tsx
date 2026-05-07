// src/app/Activity.tsx
import { useEffect, useState } from 'react';
import { useDiscordSdk } from '../hooks/useDiscordSdk';
import { useGameState } from '../hooks/useGameState';
import { LobbyView } from './views/LobbyView';
import { ActiveGameView } from './views/ActiveGameView';
import { JudgementView } from './views/JudgementView';

/**
 * This is your Discord Activity's main component. Customize it as you like!
 *
 * Learn more:
 * https://robojs.dev/discord-activities
 */
export const Activity = () => {
    const { authenticated, discordSdk, status } = useDiscordSdk();
    const { gameState, userId, executeAction, isReady } = useGameState();
    const [channelName, setChannelName] = useState<string>();

    useEffect(() => {
        // Requesting the channel in GDMs (when the guild ID is null) requires
        // the dm_channels.read scope which requires Discord approval.
        if (!authenticated || !discordSdk.channelId || !discordSdk.guildId) {
            return;
        }

        // Collect channel info over RPC
        discordSdk.commands.getChannel({ channel_id: discordSdk.channelId }).then((channel) => {
            if (channel.name) {
                setChannelName(channel.name);
            }
        });
    }, [authenticated, discordSdk]);

    // Wait until the Discord SDK and our Sync Hook are fully initialized
    if (!isReady || !userId) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <img src="/rocket.png" className="logo react" alt="Loading" />
                <h2>Loading Drop...</h2>
                <small>SDK Status: {status}</small>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', minHeight: '100vh', padding: '20px' }}>

            {/* View Router */}
            {!gameState ? (
                <LobbyView
                    channelName={channelName}
                    executeAction={executeAction}
                />
            ) : gameState.phase === 'Judgement' ? (
                <JudgementView
                    gameState={gameState}
                    userId={userId}
                    executeAction={executeAction}
                />
            ) : (
                <ActiveGameView
                    gameState={gameState}
                    userId={userId}
                    executeAction={executeAction}
                />
            )}

        </div>
    );
};