import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { Table31ReportData } from '$lib/types/report';
import type { RequestHandler } from '@sveltejs/kit'; // RequestHandler 임포트

export const GET: RequestHandler = async ({ url }) => {
  const discipline = url.searchParams.get('discipline') || 'AS';
  const year = url.searchParams.get('year') || '2025';

  try {
    const results = await query<Table31ReportData>(
      `
      WITH total_credits AS (
        SELECT fac_nip, year, semester, SUM(credit) AS total_credit
        FROM teaching
        WHERE year = $1
        GROUP BY fac_nip, year, semester
      ),
      discipline_credits AS (
        SELECT fac_nip, year, semester, t_discipline AS discipline, SUM(credit) AS discipline_credit
        FROM teaching
        WHERE year = $1 AND t_discipline = $2
        GROUP BY fac_nip, year, semester, t_discipline
      ),
      base_data AS (
        SELECT d.fac_nip, d.discipline, f.fac_name, f.specialty_field1, f.specialty_field2,
               f.highest_degree, f.highest_degree_year, f.normal_professional_responsibilities,
               f.fac_time, f.fac_cqualaacsb2013, d.discipline_credit, t.total_credit
        FROM discipline_credits d
        JOIN total_credits t ON d.fac_nip = t.fac_nip AND d.year = t.year AND d.semester = t.semester
        JOIN faculty f ON d.fac_nip = f.fac_nip
      ),
      final AS (
        SELECT discipline, fac_nip, fac_name, specialty_field1, specialty_field2,
               highest_degree, highest_degree_year, normal_professional_responsibilities,
               fac_time,
               ROUND(CASE WHEN fac_cqualaacsb2013 = 'SA' THEN (discipline_credit::numeric / NULLIF(total_credit,0)) * fac_time ELSE 0 END, 2) AS sa,
               ROUND(CASE WHEN fac_cqualaacsb2013 = 'PA' THEN (discipline_credit::numeric / NULLIF(total_credit,0)) * fac_time ELSE 0 END, 2) AS pa,
               ROUND(CASE WHEN fac_cqualaacsb2013 = 'SP' THEN (discipline_credit::numeric / NULLIF(total_credit,0)) * fac_time ELSE 0 END, 2) AS sp,
               ROUND(CASE WHEN fac_cqualaacsb2013 = 'IP' THEN (discipline_credit::numeric / NULLIF(total_credit,0)) * fac_time ELSE 0 END, 2) AS ip,
               ROUND(CASE WHEN fac_cqualaacsb2013 = 'A' THEN (discipline_credit::numeric / NULLIF(total_credit,0)) * fac_time ELSE 0 END, 2) AS a
        FROM base_data
      )
      SELECT * FROM final
      ORDER BY discipline, fac_name
      `,
      [year, discipline]
    );

    return json(results);
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};