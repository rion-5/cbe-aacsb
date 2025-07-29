// scripts/importFaculty.ts
// 제외조건 : 직종 === 장학조교, 대학 !== 경상대학

// 엑셀에서 개행(줄바꿈) 미리 수정할것 : 석사학위취득년도, 박사학위취득년도

import 'dotenv/config';
import xlsx from 'xlsx';
import { query } from '../src/lib/server/db';

const excelFile = process.argv[2];
if (!excelFile) {
  console.error('❌ 엑셀 파일명을 인자로 입력해주세요.\n예: npx tsx scripts/importFaculty.ts 교원정보.xlsx');
  process.exit(1);
}

const workbook = xlsx.readFile(excelFile);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

async function main() {
  for (const row of data as any[]) {
    const user_id = row['개인번호']?.toString().trim();
    const campus = row['캠퍼스']?.toString().trim() || null;
    const college = row['대학']?.toString().trim() || null;
    const department = row['학과']?.toString().trim() || null;
    const tenure_track = row['정년트랙구분']?.toString().trim() || null;
    const job_type = row['직종']?.toString().trim() || null;
    const job_rank = row['직급']?.toString().trim() || null;
    const name = row['성명']?.toString().trim() || null;
    const english_name = row['영문성명']?.toString().trim() || null;
    const highest_degree = row['최종학위']?.toString().trim() || null;
    const employment_status = row['재직구분']?.toString().trim() || null;
    const email = row['이메일']?.toString().trim() || null;
    const bachelor_degree_year = row['학사학위취득년도'] ? parseInt(row['학사학위취득년도']) : null;
    const master_degree_year = row['석사학위취득년도'] ? parseInt(row['석사학위취득년도']) : null;
    const doctoral_degree_year = row['박사학위취득년도'] ? parseInt(row['박사학위취득년도']) : null;

    if (!user_id || !name) {
      console.warn(`⚠️ 필수값 누락: user_id=${user_id || 'N/A'}, name=${name || 'N/A'}, 행: ${JSON.stringify(row)}`);
      continue;
    }

    if (job_type === '장학조교') {
      console.warn(`⚠️ 제외됨 (장학조교): user_id=${user_id}, name=${name}`);
      continue;
    }

    if (college !== '경상대학') {
      console.warn(`⚠️ 제외됨 (경상대학 아님): user_id=${user_id}, name=${name}, college=${college}`);
      continue;
    }
    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM aacsb_faculty WHERE user_id = $1',
      [user_id]
    );
    if (existing) {
      console.warn(`⚠️ 중복된 user_id: ${user_id}, name=${name}, 행: ${JSON.stringify(row)}`);
      continue;
    }

    try {
      await query(
        `INSERT INTO aacsb_faculty (
          user_id, campus, college, department, tenure_track, job_type, job_rank, 
          name, english_name, highest_degree, employment_status, email, 
          bachelor_degree_year, master_degree_year, doctoral_degree_year, 
          data_source, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO NOTHING`,
        [
          user_id, campus, college, department, tenure_track, job_type, job_rank,
          name, english_name, highest_degree, employment_status, email,
          bachelor_degree_year, master_degree_year, doctoral_degree_year, 'EXCEL'
        ]
      );
      console.log(`✅ 삽입 완료: user_id=${user_id}, name=${name}`);
    } catch (err) {
      console.error(`❌ 삽입 실패: user_id=${user_id}, name=${name}, 행: ${JSON.stringify(row)}`, err);
    }
  }

  console.log('✅ 교원 데이터 삽입 완료');
}

async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

main().catch(err => {
  console.error('❌ 에러 발생:', err);
  process.exit(1);
});