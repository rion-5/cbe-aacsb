// src/routes/api/faculty/+server.ts
import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { FacultyData } from '$lib/types/faculty';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    const results = await query<FacultyData>(
      `
SELECT 
    af.user_id,
    af.name,
    f.fac_name AS english_name,
    af.college,
    af.department,
    af.job_type,
    af.job_rank,
    af.highest_degree,
    CASE 
        WHEN af.highest_degree = '학사' THEN af.bachelor_degree_year
        WHEN af.highest_degree = '석사' THEN af.master_degree_year
        WHEN af.highest_degree = '박사' THEN af.doctoral_degree_year
    END AS highest_degree_year,
    d.code AS discipline_code
FROM aacsb_faculty af
JOIN faculty f ON af.user_id = f.fac_nip
JOIN disciplines d ON f.fac_discipline = d.code
ORDER BY 
    d.level,
    d.name,
    CASE af.job_rank
        WHEN '교수' THEN 1
        WHEN '부교수' THEN 2
        WHEN '조교수' THEN 3
        WHEN '교육석학교수' THEN 4
        WHEN '명예교수' THEN 5
        WHEN '겸임교수' THEN 6
        WHEN '객원교수' THEN 7
        WHEN '특임교수' THEN 8
        WHEN '강사' THEN 9
        WHEN 'Teaching Fellow' THEN 10
        ELSE 11
    END,
    CASE af.highest_degree
        WHEN '박사' THEN 1
        WHEN '석사' THEN 2
        WHEN '학사' THEN 3
        ELSE 4
    END,
    CASE 
        WHEN af.highest_degree = '학사' THEN af.bachelor_degree_year
        WHEN af.highest_degree = '석사' THEN af.master_degree_year
        WHEN af.highest_degree = '박사' THEN af.doctoral_degree_year
        ELSE NULL
    END
      `
    );
    return json(results);
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};