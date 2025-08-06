// src/routes/api/auth/verify/+server.ts

import type { RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/app-session';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
  const appSession = await getSession(cookies);
  if (!appSession.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  return json({
    id_no: appSession.user.id_no,
    user_name: appSession.user.user_name
  });
};