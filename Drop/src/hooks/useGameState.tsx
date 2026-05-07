// src/hooks/useGameState.tsx
import { useState, useEffect, useCallback } from 'react';
import { useDiscordSdk } from './useDiscordSdk';
import { useSyncState } from '@robojs/sync';
import type { DropGameState, ActionType } from '../game/types';

export function useGameState() {
    const { authenticated, session, discordSdk } = useDiscordSdk();
    const channelId = discordSdk.channelId;
    const userId = session?.user?.id;

    // Local React state to hold the authoritative game board
    const [gameState, setGameState] = useState<DropGameState | null>(null);

    // Real-time synchronization trigger via @robojs/sync
    // The dependency array isolates this websocket room to the specific Discord Channel
    const [syncTick, setSyncTick] = useSyncState<number>(0, ['drop-game-sync', channelId]);

    // Fetch the authoritative state from the secure backend
    const fetchState = useCallback(async () => {
        if (!channelId || !authenticated) return;
        try {
            const response = await fetch(`/api/game/state?channelId=${channelId}`);
            if (response.ok) {
                const data = await response.json();
                setGameState(data);
            } else if (response.status === 404) {
                setGameState(null); // No game active in this channel yet
            }
        } catch (error) {
            console.error("Failed to fetch game state:", error);
        }
    }, [channelId, authenticated]);

    // Listen for websocket updates: Re-fetch whenever the syncTick is updated by any client
    useEffect(() => {
        fetchState();
    }, [syncTick, fetchState]);

    // Dispatch an action to the backend API
    const executeAction = useCallback(async (
        action: ActionType | 'PassSmuggle' | 'ChallengeSmuggle' | 'Initialize' | 'Join' | 'StartHand',
        payload?: any
    ) => {
        if (!channelId || !userId) return;

        try {
            const response = await fetch('/api/game/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId,
                    userId,
                    action,
                    payload
                })
            });

            if (response.ok) {
                // If the action succeeded on the backend, update the global sync tick.
                // This instantly notifies all other players' websockets to refresh their screens!
                setSyncTick(Date.now());
            } else {
                console.warn(`Action ${action} rejected by server.`);
            }
        } catch (error) {
            console.error(`Failed to execute action ${action}:`, error);
        }
    }, [channelId, userId, setSyncTick]);

    return {
        gameState,
        userId,
        executeAction,
        isReady: authenticated && channelId != null
    };
}