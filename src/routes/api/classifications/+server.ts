import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { fac_nip, research_id, is_basic, is_applied, is_teaching, is_peer_journal, is_other_reviewed, is_other_nonreviewed } = await request.json();

    await query(
      `
      INSERT INTO aacsb_research_classifications (
        fac_nip, research_id, is_basic, is_applied, is_teaching,
        is_peer_journal, is_other_reviewed, is_other_nonreviewed, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (fac_nip, research_id)
      DO UPDATE SET
        is_basic = $3,
        is_applied = $4,
        is_teaching = $5,
        is_peer_journal = $6,
        is_other_reviewed = $7,
        is_other_nonreviewed = $8,
        updated_at = CURRENT_TIMESTAMP
      `,
      [fac_nip, research_id, is_basic, is_applied, is_teaching, is_peer_journal, is_other_reviewed, is_other_nonreviewed]
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error updating classification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};