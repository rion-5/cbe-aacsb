// src/routes/api/research/+server.ts

import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { ResearchOutput, ResearchClassification } from '$lib/types/research';

export const GET: RequestHandler = async ({ url }) => {
  const fac_nip = url.searchParams.get('fac_nip');
  if (!fac_nip) {
    return new Response(JSON.stringify({ error: 'fac_nip is required' }), { status: 400 });
  }

  try {
    const researchOutputs = await query<ResearchOutput & ResearchClassification>(
      `
      SELECT 
        ro.*, 
        COALESCE(rc.is_basic, FALSE) as is_basic,
        COALESCE(rc.is_applied, FALSE) as is_applied,
        COALESCE(rc.is_teaching, FALSE) as is_teaching,
        COALESCE(rc.is_peer_journal, FALSE) as is_peer_journal,
        COALESCE(rc.is_other_reviewed, FALSE) as is_other_reviewed,
        COALESCE(rc.is_other_nonreviewed, FALSE) as is_other_nonreviewed,
        COALESCE(rc.created_at, CURRENT_TIMESTAMP) as created_at,
        COALESCE(rc.updated_at, CURRENT_TIMESTAMP) as updated_at
      FROM aacsb_research_outputs ro
      LEFT JOIN aacsb_research_classifications rc 
        ON ro.research_id = rc.research_id 
        AND ro.fac_nip = rc.fac_nip
      WHERE ro.fac_nip = $1
      ORDER BY ro.published_at DESC
      `,
      [fac_nip]
    );

    return new Response(JSON.stringify(researchOutputs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching research outputs:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};