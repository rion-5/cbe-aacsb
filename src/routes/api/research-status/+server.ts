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
      inner JOIN faculty f ON af.user_id = f.fac_nip
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
        job_rank: f.job_rank,
        highest_degree: f.highest_degree,
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

// POST 핸들러 수정 부분
export const POST: RequestHandler = async ({ request }: { request: Request }) => {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4;
    const endYear = currentYear;

    const data = await query<any>(
      `
      SELECT
        f.fac_discipline as t_discpline,
        aro.fac_nip,
        EXTRACT(YEAR FROM aro.published_at) as year,
        aro.published_at as date,
        COALESCE(NULLIF(TRIM(aro.english_title), ''), aro.title) AS title,
        COALESCE(NULLIF(TRIM(aro.english_journal), ''), aro.journal_name) AS journal_name,
        COALESCE(NULLIF(TRIM(aro.english_publisher), ''), aro.publisher) AS publisher,
        arc.is_basic as B,
        arc.is_applied as A,
        arc.is_teaching as T,
        arc.is_peer_journal as JO,
        arc.is_other_reviewed as AD,
        arc.is_other_nonreviewed as OT
      FROM aacsb_research_outputs aro 
      inner JOIN aacsb_research_classifications arc ON (arc.research_id = aro.research_id)
      inner join faculty f on (aro.fac_nip = f.fac_nip)
      WHERE aro.is_aacsb_managed = true 
      AND EXTRACT(YEAR FROM aro.published_at) BETWEEN $1 AND $2
      ORDER BY aro.name, year
      `,
      [startYear, endYear]
    );

    // 헤더에서 published_at과 year 컬럼 인덱스 찾기
    const headers = ['t_discpline', 'fac_nip', 'year', 'date', 'title', 'journal_name', 'publisher', 'B', 'A', 'T', 'JO', 'AD', 'OT'];
    const publishedAtCol = headers.indexOf('date');
    const yearCol = headers.indexOf('year');

    // 데이터를 변환하여 날짜 객체로 변경
    const processedData = data.map(row => ({
      ...row,
      date: row.date ? new Date(row.date) : null,
      year: row.year ? Number(row.year) : null
    }));

    // 변환된 데이터로 시트 재생성
    const ws2 = XLSX.utils.json_to_sheet(processedData);

    // 날짜 형식 적용
    const range2 = XLSX.utils.decode_range(ws2['!ref'] || 'A1');

    // 각 행에 대해 날짜 형식 적용
    for (let R = range2.s.r + 1; R <= range2.e.r; ++R) {
      // published_at 컬럼 (날짜-시간 형식)
      const publishedAtCell = ws2[XLSX.utils.encode_cell({ r: R, c: publishedAtCol })];
      if (publishedAtCell && publishedAtCell.v instanceof Date) {
        publishedAtCell.t = 'd'; // 날짜 타입으로 설정
        publishedAtCell.z = 'yyyy-mm-dd'; // 날짜 형식 지정
      }

      // year 컬럼 (연도만 표시)
      const yearCell = ws2[XLSX.utils.encode_cell({ r: R, c: yearCol })];
      if (yearCell && yearCell.v) {
        yearCell.t = 'n'; // 숫자 타입으로 설정
        yearCell.z = '0'; // 정수 형식
      }
    }

    // 컬럼 너비 자동 조정
    const colWidths = headers.map((header, idx) => {
      let maxWidth = header.length;
      for (let R = range2.s.r + 1; R <= range2.e.r; ++R) {
        const cell = ws2[XLSX.utils.encode_cell({ r: R, c: idx })];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }
      return { wch: Math.min(maxWidth + 2, 50) }; // 최대 50자로 제한
    });
    ws2['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws2, 'Research Outputs');
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