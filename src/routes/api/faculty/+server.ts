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
          f.fac_name,
          af.college,
          af.department,
          af.job_type,
          af.job_rank,
          af.highest_degree,
          CASE
              WHEN af.highest_degree = '학사' THEN af.bachelor_degree_year
              WHEN af.highest_degree = '석사' THEN af.master_degree_year
              WHEN af.highest_degree = '박사' THEN af.doctoral_degree_year
              ELSE NULL
          END AS highest_degree_year,
          f.specialty_field1,
          f.specialty_field2,
          f.normal_professional_responsibilities,
          f.fac_discipline,
          f.fac_time,
          f.fac_ccataacsb,
          f.fac_cqualaacsb2013,
          f.full_time_equivalent
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
          highest_degree_year, af.name
      `
    );
    return json(results);
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const data: FacultyData = await request.json();
    await query(
      `
      UPDATE faculty
      SET
        fac_name = $1,
        specialty_field1 = $2,
        specialty_field2 = $3,
        normal_professional_responsibilities = $4,
        fac_discipline = $5,
        fac_time = $6,
        fac_ccataacsb = $7,
        fac_cqualaacsb2013 = $8,
        full_time_equivalent = $9
      WHERE fac_nip = $10
      `,
      [
        data.fac_name,
        data.specialty_field1,
        data.specialty_field2,
        data.normal_professional_responsibilities,
        data.fac_discipline,
        data.fac_time,
        data.fac_ccataacsb,
        data.fac_cqualaacsb2013,
        data.full_time_equivalent,
        data.user_id
      ]
    );
    return json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: FacultyData = await request.json();
    await query(
      `
      INSERT INTO faculty (
        fac_nip,
        fac_name,
        specialty_field1,
        specialty_field2,
        normal_professional_responsibilities,
        fac_discipline,
        fac_time,
        fac_ccataacsb,
        fac_cqualaacsb2013,
        full_time_equivalent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        data.user_id,
        data.fac_name,
        data.specialty_field1,
        data.specialty_field2,
        data.normal_professional_responsibilities,
        data.fac_discipline,
        data.fac_time,
        data.fac_ccataacsb,
        data.fac_cqualaacsb2013,
        data.full_time_equivalent
      ]
    );
    return json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { user_id } = await request.json();
    if (!user_id) {
      return json({ error: 'user_id is required' }, { status: 400 });
    }
    await query('DELETE FROM faculty WHERE fac_nip = $1', [user_id]);
    return json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};