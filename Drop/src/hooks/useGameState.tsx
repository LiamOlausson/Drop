// src/hooks/useGameState.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDiscordSdk } from './useDiscordSdk';
import { useSyncState } from '@robojs/sync';
import type { DropGameState, ActionType } from '../game/types';

export function useGameState() {
    const { authenticated, session, discordSdk } = useDiscordSdk();
    const channelId = discordSdk.channelId;
    const userId    = session?.user?.id;

    const [gameState, setGameState]     = useState<DropGameState | null>(null);
    const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
    const [actionError, setActionError] = useState<string | null>(null);
    const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [syncTick, setSyncTick] = useSyncState<number>(0, ['drop-game-sync', channelId]);

    const fetchState = useCallback(async () => {
        if (!channelId || !authenticated) return;
        try {
            const response = await fetch(`/api/game/state?channelId=${channelId}`);
            if (response.ok) {
                const data: DropGameState = await response.json();
                setGameState(data);
                fetchNames(data.turnOrder, discordSdk, session, setPlayerNames);
            } else if (response.status === 404) {
                setGameState(null);
            }
        } catch (error) {
            console.error('Failed to fetch game state:', error);
        }
    }, [channelId, authenticated]);

    useEffect(() => {
        fetchState();
    }, [syncTick, fetchState]);

    const executeAction = useCallback(async (
        action: ActionType | 'PassSmuggle' | 'ChallengeSmuggle' | 'RespondAscend' | 'Initialize' | 'Join' | 'StartHand',
        payload?: any
    ) => {
        if (!channelId || !userId) return;
        try {
            const response = await fetch('/api/game/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId, userId, action, payload })
            });
            if (response.ok) {
                setSyncTick(Date.now());
            } else {
                const text = await response.text().catch(() => '');
                let message = 'Action rejected by the table.';
                try {
                    const json = JSON.parse(text);
                    message = json.error || json.message || message;
                } catch {
                    if (text.trim()) message = text.trim();
                }
                if (errorTimer.current) clearTimeout(errorTimer.current);
                setActionError(message);
                errorTimer.current = setTimeout(() => setActionError(null), 3000);
            }
        } catch (error) {
            console.error(`Failed to execute action ${action}:`, error);
            if (errorTimer.current) clearTimeout(errorTimer.current);
            setActionError('Connection error — please try again.');
            errorTimer.current = setTimeout(() => setActionError(null), 3000);
        }
    }, [channelId, userId, setSyncTick]);

    return {
        gameState,
        userId,
        playerNames,
        executeAction,
        actionError,
        isReady: authenticated && channelId != null
    };
}

/**
 * Resolve Discord display names for a list of user IDs.
 * Uses the Discord SDK's getInstanceConnectedParticipants for users in the current
 * activity, prioritizing server nicknames, then global names, then base usernames.
 */
async function fetchNames(
    userIds: string[],
    discordSdk: any,
    session: any,
    setPlayerNames: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
    if (!userIds || userIds.length === 0) return;

    const resolved: Record<string, string> = {};

    // Try to get participants from the current activity instance
    try {
        const participants = await discordSdk.commands.getInstanceConnectedParticipants();
        if (participants?.participants) {
            for (const p of participants.participants) {
                if (p.id) {
                    resolved[p.id] = p.nickname || p.global_name || p.username;
                }
            }
        }
    } catch {
    }

    // Always include the current user's own name from session
    if (session?.user?.id && !resolved[session.user.id]) {
        resolved[session.user.id] = session.user.global_name || session.user.username;
    }

    // For any still-unresolved IDs, use a short fallback
    for (const id of userIds) {
        if (!resolved[id]) {
            resolved[id] = id.length > 8 ? id.substring(0, 8) + '…' : id;
        }
    }

    setPlayerNames(prev => ({ ...prev, ...resolved }));
}
