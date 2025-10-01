// src/routes/api/faculty/excel_download/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async () => {
  try {
    const data = await query<any>(
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
      LEFT JOIN faculty f ON af.user_id = f.fac_nip
      LEFT JOIN disciplines d ON f.fac_discipline = d.code
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

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AACSB Faculty');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=aacsb_faculty_list.xlsx'
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};