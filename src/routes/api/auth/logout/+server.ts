// src/routes/api/auth/logout/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSession } from '$lib/server/app-session';

export const POST: RequestHandler = async ({ cookies }) => {
    clearSession(cookies);
    return json({ success: true });
};