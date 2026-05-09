// src/api/game/action.ts
import { RoboResponse } from '@robojs/server';
import type { RoboRequest } from '@robojs/server';
import { initializeGame, joinGame, destroyGame, getDropState } from '../../game/state.js';
import {
    startHand, performScavenge, performDive, performAscend,
    performSnitch, performSabotage, performSmuggle,
    passSmuggle, challengeSmuggle, respondToAscend,
    executeDecreeHollow, executeDecreeGlowWorm, executeDecreeCitizen,
    executeDecreeWarden, executeDecreeBaron
} from '../../game/actions.js';

// In-memory Mutex to prevent state-overwrite race conditions
const channelLocks = new Map<string, Promise<void>>();

export default async (req: RoboRequest) => {
    if (req.method !== 'POST') {
        return RoboResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { channelId, userId, action, payload } = body;

    if (!channelId || !userId || !action) {
        return RoboResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Queue the request for this specific channel so multiple players confirming don't overwrite each other
    return new Promise((resolve) => {
        const previous = channelLocks.get(channelId) || Promise.resolve();

        const task = async () => {
            let success = false;
            try {
                switch (action) {
                    case 'Initialize':
                        await initializeGame(channelId, userId, payload?.playerTracking ?? false);
                        success = true;
                        break;
                    case 'ReturnToLobby':
                        const currentState = await getDropState(channelId);
                        if (currentState && (
                            currentState.hostId === userId ||
                            (!currentState.hostId && currentState.turnOrder[0] === userId) ||
                            (!currentState.hostId && currentState.turnOrder.length === 0)
                        )) {
                            await destroyGame(channelId);
                            success = true;
                        } else {
                            success = false;
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
                        if (payload.decreeType === 'Hollow') {
                            success = await executeDecreeHollow(channelId, userId, payload.targetId);
                        } else if (payload.decreeType === 'Glow Worm') {
                            success = await executeDecreeGlowWorm(channelId, userId, payload.targetId);
                        } else if (payload.decreeType === 'Citizen') {
                            success = await executeDecreeCitizen(channelId, userId, payload.discardCardId, payload.handCardId);
                        } else if (payload.decreeType === 'Warden') {
                            success = await executeDecreeWarden(channelId, userId, payload.targetId);
                        } else if (payload.decreeType === 'Baron') {
                            success = await executeDecreeBaron(channelId, userId, payload.targetId);
                        }
                        break;
                    default:
                        resolve(RoboResponse.json({ error: 'Unknown action type' }, { status: 400 }));
                        return;
                }

                if (success) {
                    resolve(RoboResponse.json({ success: true }));
                } else {
                    resolve(RoboResponse.json({ error: 'Action rejected by game rules' }, { status: 400 }));
                }
            } catch (error) {
                console.error(`Error executing action ${action}:`, error);
                resolve(RoboResponse.json({ error: 'Internal server error' }, { status: 500 }));
            }
        };

        const next = previous.then(task).catch(() => {
            resolve(RoboResponse.json({ error: 'Server lock error' }, { status: 500 }));
        });

        channelLocks.set(channelId, next);

        // Clean up the lock queue
        next.finally(() => {
            if (channelLocks.get(channelId) === next) {
                channelLocks.delete(channelId);
            }
        });
    });
};