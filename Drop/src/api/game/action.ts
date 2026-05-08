// src/api/game/action.ts
import { RoboResponse } from '@robojs/server';
import type { RoboRequest } from '@robojs/server';
import { initializeGame, joinGame, destroyGame, getDropState } from '../../game/state.js';
import {
    startHand, performScavenge, performDive, performAscend,
    performSnitch, performSabotage, performSmuggle,
    passSmuggle, challengeSmuggle, respondToAscend, executeDecreeHollow,
    executeDecreeGlowWorm, executeDecreeCitizen, executeDecreeWarden, executeDecreeBaron
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
        switch (action) {
            case 'Initialize':
                await initializeGame(channelId, userId, payload?.playerTracking ?? false);
                success = true;
                break;
            case 'ReturnToLobby':
                const currentState = await getDropState(channelId);
                // Allow the host, or the first player (if old state), or anyone (if empty old state) to wipe it
                if (currentState && (
                    currentState.hostId === userId ||
                    (!currentState.hostId && currentState.turnOrder[0] === userId) ||
                    (!currentState.hostId && currentState.turnOrder.length === 0)
                )) {
                    await destroyGame(channelId);
                    success = true;
                } else {
                    success = false; // Rejected: Not the host
                }
                break;
            case 'Join':
                success = await joinGame(channelId, userId, payload?.userName);
                break;
            case 'StartHand':
                success = await startHand(channelId, payload?.anteAmount || 10);
                break;
            case 'Scavenge':
                success = await performScavenge(channelId, userId, payload.cardId, payload.source);
                break;
            case 'Dive':
                success = await performDive(channelId, userId, payload?.discardIds || []);
                break;
            case 'Ascend':
                success = await performAscend(channelId, userId, payload?.raiseAmount ?? 5);
                break;
            case 'RespondAscend':
                success = await respondToAscend(channelId, userId, payload.response);
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
            case 'ExecuteDecree':
                // Route to the correct decree based on the payload
                if (payload.decreeType === 'Hollow') {
                    success = await executeDecreeHollow(channelId, userId, payload.targetId);
                }
                else if (payload.decreeType === 'Glow Worm') {
                    success = await executeDecreeGlowWorm(channelId, userId, payload.targetId);
                }
                else if (payload.decreeType === 'Citizen') {
                    success = await executeDecreeCitizen(channelId, userId, payload.discardCardId, payload.handCardId);
                }
                else if (payload.decreeType === 'Warden') {
                    success = await executeDecreeWarden(channelId, userId, payload.targetId);
                }
                else if (payload.decreeType === 'Baron') {
                    success = await executeDecreeBaron(channelId, userId, payload.targetId);
                }
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