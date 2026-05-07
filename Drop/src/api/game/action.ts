// src/api/game/action.ts
import { RoboResponse } from '@robojs/server';
import type { RoboRequest } from '@robojs/server';
import { initializeGame, joinGame } from '../../game/state.js';
import {
    startHand, performScavenge, performDive, performAscend,
    performSnitch, performSabotage, performSmuggle,
    passSmuggle, challengeSmuggle
} from '../../game/actions.js';

export default async (req: RoboRequest) => {
    if (req.method !== 'POST') {
        return RoboResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { channelId, userId, action, payload } = body;

    if (!channelId || !userId || !action) {
        return RoboResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let success = false;

    try {
        // Route the requested action to the correct game engine function
        switch (action) {
            case 'Initialize':
                await initializeGame(channelId);
                success = true;
                break;
            case 'Join':
                success = await joinGame(channelId, userId);
                break;
            case 'StartHand':
                success = await startHand(channelId, payload?.anteAmount || 10);
                break;
            case 'Scavenge':
                success = await performScavenge(channelId, userId, payload.cardId, payload.source);
                break;
            case 'Dive':
                // Note: The UI needs a submenu to select 2 discardIds to fully pass this payload
                success = await performDive(channelId, userId, payload?.discardIds || []);
                break;
            case 'Ascend':
                success = await performAscend(channelId, userId, payload?.raiseAmount || 5);
                break;
            case 'Snitch':
                success = await performSnitch(channelId, userId, payload.targetId, payload.type);
                break;
            case 'Smuggle':
                success = await performSmuggle(channelId, userId, payload.cardId, payload.declaredRank);
                break;
            case 'Sabotage':
                success = await performSabotage(channelId, userId, payload.targetId, payload.cardIndex || 0, payload.revealIndex || 0);
                break;
            case 'PassSmuggle':
                await passSmuggle(channelId, userId);
                success = true;
                break;
            case 'ChallengeSmuggle':
                await challengeSmuggle(channelId, userId);
                success = true;
                break;
            default:
                return RoboResponse.json({ error: 'Unknown action type' }, { status: 400 });
        }

        if (success) {
            return RoboResponse.json({ success: true });
        } else {
            return RoboResponse.json({ error: 'Action rejected by game rules' }, { status: 400 });
        }

    } catch (error) {
        console.error(`Error executing action ${action}:`, error);
        return RoboResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
};