import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';

export async function GET({ url }) {
  const year = url.searchParams.get('year');
  const fac_nip = url.searchParams.get('fac_nip');

  const results = await query(`
    SELECT ro.*, rc.is_basic, rc.is_applied, rc.is_teaching,
                  rc.is_peer_journal, rc.is_other_reviewed, rc.is_other_nonreviewed
    FROM aacsb_research_outputs ro
    LEFT JOIN aacsb_research_classifications rc
      ON ro.research_id = rc.research_id AND ro.fac_nip = rc.fac_nip
    WHERE ($1::TEXT IS NULL OR EXTRACT(YEAR FROM ro.published_at)::TEXT = $1)
      AND ($2::TEXT IS NULL OR ro.fac_nip = $2)
    ORDER BY ro.published_at DESC
  `, [year, fac_nip]);

  return json(results);
}
