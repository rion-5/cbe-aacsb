import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';

export async function POST({ request }) {
  const { research_id, fac_nip, group, value } = await request.json();

  const resetFields =
    group === 'group1'
      ? ['is_basic', 'is_applied', 'is_teaching']
      : ['is_peer_journal', 'is_other_reviewed', 'is_other_nonreviewed'];

  const updates = resetFields.map((key) => `${key} = ${key === value ? 'TRUE' : 'FALSE'}`).join(', ');

  await query(`
    INSERT INTO aacsb_research_classifications (fac_nip, research_id, ${value})
    VALUES ($1, $2, TRUE)
    ON CONFLICT (fac_nip, research_id)
    DO UPDATE SET ${updates}, updated_at = NOW()
  `, [fac_nip, research_id]);

  return json({ success: true });
}
