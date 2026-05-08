// src/api/admin/players.ts
import { RoboResponse } from '@robojs/server';
import type { RoboRequest } from '@robojs/server';
import { Flashcore } from 'robo.js';

// You can set this in your .env file as ADMIN_PASSWORD=your_secure_password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'superadmin';

export default async (req: RoboRequest) => {
    try {
        let password = '';
        let body: any = {};

        if (req.method === 'GET') {
            const url = new URL(req.url);
            password = url.searchParams.get('password') || '';
        } else if (req.method === 'POST') {
            body = await req.json();
            password = body.password || '';
        } else {
            return RoboResponse.json({ error: 'Method not allowed' }, { status: 405 });
        }

        // Validate password
        if (password !== ADMIN_PASSWORD) {
            return RoboResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Handle GET: Return all tracked players
        if (req.method === 'GET') {
            const trackedIds = await Flashcore.get<string[]>('tracked_users') || [];

            const players = await Promise.all(trackedIds.map(async (id) => {
                const balance = await Flashcore.get<number>(`balance_${id}`) ?? 500;
                const name = await Flashcore.get<string>(`name_${id}`) ?? id;
                return { id, name, balance };
            }));

            // Sort highest balance first
            players.sort((a, b) => b.balance - a.balance);

            return RoboResponse.json({ players });
        }

        // Handle POST: Update a player's balance
        if (req.method === 'POST') {
            const { userId, newBalance } = body;
            if (!userId || typeof newBalance !== 'number') {
                return RoboResponse.json({ error: 'Invalid data' }, { status: 400 });
            }

            await Flashcore.set(`balance_${userId}`, newBalance);
            return RoboResponse.json({ success: true });
        }

    } catch (error) {
        console.error('Admin API Error:', error);
        return RoboResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
};