// src/api/game/state.ts
import { RoboResponse } from '@robojs/server';
import type { RoboRequest } from '@robojs/server';
import { getDropState } from '../../game/state.js';

export default async (req: RoboRequest) => {
    // Parse the URL to get the query parameters
    const url = new URL(req.url);
    const channelId = url.searchParams.get('channelId');

    if (!channelId) {
        return RoboResponse.json({ error: 'Missing channelId' }, { status: 400 });
    }

    // Fetch the state from Robo's namespace memory
    const state = await getDropState(channelId);

    if (!state) {
        return RoboResponse.json({ error: 'No game found in this channel' }, { status: 404 });
    }

    return RoboResponse.json(state);
};