// src/routes/api/research-status/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { FacultyData } from '$lib/types/faculty';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async ({ url }: { url: URL }) => {
  try {
    // 교원 목록: 기존 유지
    const facultyList = await query<FacultyData>(
      `
      SELECT
          af.user_id as user_id,
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
      ORDER BY af.name
      `
    );

    // 최근 5년 계산
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4;
    const endYear = currentYear;

    // 필요수: 최근 5년 is_aacsb_managed=true outputs 수
    const requiredQuery = `
      SELECT af.user_id, COUNT(aro.research_id) as required_count
      FROM aacsb_research_outputs aro 
      INNER JOIN aacsb_faculty af ON (aro.fac_nip = af.user_id)
      WHERE aro.is_aacsb_managed = true 
        AND EXTRACT(YEAR FROM aro.published_at) BETWEEN $1 AND $2
      GROUP BY af.user_id, af.name
      ORDER BY af.name
    `;
    const requiredData = await query<{ user_id: string, required_count: number }>(requiredQuery, [startYear, endYear]);

    const requiredOutputs: Record<string, number> = {};
    requiredData.forEach(r => requiredOutputs[r.user_id] = r.required_count);

    // 처리수: 최근 5년 전체 classifications 수 (연도 필터 제거)
    const processed = await query<{ fac_nip: string, processed_count: number }>(
      `
  SELECT arc.fac_nip, COUNT(*) as processed_count
  FROM aacsb_research_classifications arc
  INNER JOIN aacsb_research_outputs aro ON arc.research_id = aro.research_id
  WHERE aro.is_aacsb_managed = true
    AND EXTRACT(YEAR FROM aro.published_at) BETWEEN $1 AND $2
    AND (
      (CASE WHEN arc.is_basic THEN 1 ELSE 0 END) +
      (CASE WHEN arc.is_applied THEN 1 ELSE 0 END) +
      (CASE WHEN arc.is_teaching THEN 1 ELSE 0 END) +
      (CASE WHEN arc.is_peer_journal THEN 1 ELSE 0 END) +
      (CASE WHEN arc.is_other_reviewed THEN 1 ELSE 0 END) +
      (CASE WHEN arc.is_other_nonreviewed THEN 1 ELSE 0 END)
    ) = 2
  GROUP BY arc.fac_nip
  `,
      [startYear, endYear]
    );

    // 상태 계산
    const statusList = facultyList.map(f => {
      const required = requiredOutputs[f.user_id] || 0;
      const processedCount = processed.find(p => p.fac_nip === f.user_id)?.processed_count || 0;
      const ratio = required > 0 ? Math.round((processedCount / required) * 100) : 0;
      return {
        user_id: f.user_id,
        name: f.name || f.fac_name,
        department: f.department,
        required,
        processed: processedCount,
        ratio
      };
    });

    return json({
      facultyList: statusList,
      yearRange: `${startYear}-${endYear}`
    });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }: { request: Request }) => {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4;
    const endYear = currentYear;

    const data = await query<any>(
      `
      SELECT 
        aro.fac_nip,
        aro.name,
        aro.type,
        aro.title,
        aro.journal_name,
        aro.publisher,
        aro.published_at,
        EXTRACT(YEAR FROM aro.published_at) as year,
        arc.is_basic as B,
        arc.is_applied as A,
        arc.is_teaching as T,
        arc.is_peer_journal as JO,
        arc.is_other_reviewed as AD,
        arc.is_other_nonreviewed as OT
      FROM aacsb_research_outputs aro 
      LEFT JOIN aacsb_research_classifications arc ON (arc.research_id = aro.research_id)
      WHERE aro.is_aacsb_managed = true 
        AND EXTRACT(YEAR FROM aro.published_at) BETWEEN $1 AND $2
      ORDER BY aro.fac_nip, year
      `,
      [startYear, endYear]
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Research Outputs');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=research_outputs_${startYear}-${endYear}.xlsx`
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};