import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    const results = await query<{
      user_id: string;
      name: string;
      college: string;
      department: string;
      job_type: string;
      job_rank: string;
      highest_degree: string;
      highest_degree_year: number | null;
      english_name: string;
    }>(
      `
      SELECT
        af.user_id,
        af.name,
        af.college,
        af.department,
        af.job_type,
        af.job_rank,
        af.highest_degree,
        af.english_name,
        CASE
          WHEN af.highest_degree = '학사' THEN af.bachelor_degree_year
          WHEN af.highest_degree = '석사' THEN af.master_degree_year
          WHEN af.highest_degree = '박사' THEN af.doctoral_degree_year
          ELSE NULL
        END AS highest_degree_year
      FROM aacsb_faculty af
      LEFT JOIN faculty f ON af.user_id = f.fac_nip
      WHERE f.fac_nip IS NULL AND af.department != '경제학부'
      ORDER BY af.name
      `
    );
    return json(results);
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};