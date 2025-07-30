// src/routes/api/disciplines/+server.ts
import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    const results = await query<{ code: string; name: string; level: string }>(
      `SELECT code, name, level FROM disciplines ORDER BY level, name`
    );
    return json(results);
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};