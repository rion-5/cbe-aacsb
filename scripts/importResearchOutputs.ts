import 'dotenv/config';
import xlsx from 'xlsx';
import { query } from '../src/lib/server/db';

const excelFile = process.argv[2];
if (!excelFile) {
  console.error('❌ 엑셀 파일명을 인자로 입력해주세요.\n예: npx tsx scripts/importResearchOutputs.ts 연구성과.xlsx');
  process.exit(1);
}

const workbook = xlsx.readFile(excelFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

async function main() {
  for (const row of data as any[]) {
    // 필수 필드
    const api_research_id = row['연구실적번호']?.toString().trim() || null;
    const fac_nip = row['개인번호']?.toString().trim();
    const title = row['논문제목']?.toString().trim();
    const raw_published_at = row['발표일']?.toString().trim();
    const published_at = raw_published_at ? raw_published_at.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : null;

    // 선택 필드
    const name = row['성명']?.toString().trim() || null;
    const type = row['업적구분']?.toString().trim() || null;
    const is_domestic = row['국외국내'] ? row['국외국내'].trim() === '국내' : null;
    const doi = row['doi(논문아이디)']?.toString().trim() || null;
    const publisher = row['발행기관/주관부처']?.toString().trim() || null;
    const journal_name = row['학술지명']?.toString().trim() || null;
    const journal_index = row['index']?.toString().trim() || null;
    const role = row['참여형태']?.toString().trim() || null;
    const journal_category = row['구분(논문/저서)']?.toString().trim() || null;
    const impact_factor = row['if'] && !isNaN(Number(row['if'])) ? Number(row['if']) : null;
    const is_q1_last3years = row['최근3년q1여부'] ? row['최근3년q1여부'].trim().toLowerCase() === 'y' : null;

    // 필수값 검증
    if (!fac_nip || !title || !published_at) {
      console.warn(`⚠️ 필수값 누락: fac_nip=${fac_nip || 'N/A'}, title=${title || 'N/A'}, published_at=${published_at || 'N/A'}, 행: ${JSON.stringify(row)}`);
      continue;
    }

    // 제외 조건: 업적구분='연구비수혜'이고 publisher에 '한양대학교' 포함
    if (type === '연구비수혜' && publisher?.includes('한양대학교')) {
      console.warn(`⚠️ 제외됨 (연구비수혜 & 한양대학교): api_research_id=${api_research_id || 'N/A'}, fac_nip=${fac_nip}, publisher=${publisher}`);
      continue;
    }

    // fac_nip 유효성 검증
    const facultyExists = await queryOne<{ fac_nip: string }>(
      'SELECT fac_nip FROM faculty WHERE fac_nip = $1',
      [fac_nip]
    );
    if (!facultyExists) {
      console.warn(`⚠️ 유효하지 않은 fac_nip: ${fac_nip}, 행: ${JSON.stringify(row)}`);
      continue;
    }

    // api_research_id 중복 확인
    if (api_research_id) {
      const existing = await queryOne<{ research_id: number }>(
        'SELECT research_id FROM aacsb_research_outputs WHERE api_research_id = $1',
        [api_research_id]
      );
      if (existing) {
        console.warn(`⚠️ 중복된 api_research_id: ${api_research_id}, fac_nip=${fac_nip}, 행: ${JSON.stringify(row)}`);
        continue;
      }
    }

    // 데이터 삽입
    try {
      await query(
        `INSERT INTO aacsb_research_outputs (
          api_research_id, fac_nip, data_source, title, english_title, doi, published_at, 
          journal_name, english_journal, journal_index, type, journal_category, 
          impact_factor, is_q1_last3years, is_peer_reviewed, role, is_domestic, 
          publisher, name, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (api_research_id) DO NOTHING`,
        [
          api_research_id,
          fac_nip,
          'EXCEL',
          title,
          null,
          doi,
          published_at,
          journal_name,
          null,
          journal_index,
          type,
          journal_category,
          impact_factor,
          is_q1_last3years,
          null,
          role,
          is_domestic,
          publisher,
          name
        ]
      );
      console.log(`✅ 삽입 완료: api_research_id=${api_research_id || 'N/A'}, fac_nip=${fac_nip}, name=${name || 'N/A'}`);
    } catch (err) {
      console.error(`❌ 삽입 실패: api_research_id=${api_research_id || 'N/A'}, fac_nip=${fac_nip}, name=${name || 'N/A'}, 행: ${JSON.stringify(row)}`, err);
    }
  }

  console.log('✅ 연구성과 데이터 삽입 완료');
}

async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

main().catch(err => {
  console.error('❌ 에러 발생:', err);
  process.exit(1);
});