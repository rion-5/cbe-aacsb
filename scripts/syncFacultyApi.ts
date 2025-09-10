// scripts/syncFacultyApi.ts
import 'dotenv/config';
import axios from 'axios';
import { query } from '../src/lib/server/db';

const API_URL = 'https://api.hanyang.ac.kr/rs/huas/findGwInfoForAACSB.json';
const REMOTE_TOKEN = process.env.REMOTE_TOKEN || '';
const CLIENT_ID = process.env.CLIENT_ID || '';
const SWAP_KEY = process.env.SWAP_KEY || '';

if (!REMOTE_TOKEN) {
	console.error('❌ REMOTE_TOKEN 환경변수가 설정되지 않았습니다.');
	process.exit(1);
}

interface FacultyData {
	college: string;
	tenureTrack: string | null;
	englishName: string | null;
	jobRank: string;
	highestDegree: string;
	campus: string;
	doctoralDegreeYear: string | null;
	masterDegreeYear: string | null;
	bachelorDegreeYear: string | null;
	userId: string;
	createdAt: string;
	name: string;
	department: string;
	jobType: string;
	email: string;
	updatedAt: string;
}

async function fetchFacultyData(): Promise<FacultyData[]> {
	try {
		const response = await axios.get(API_URL, {
			params: { in_user_id: '%' },
			headers: {
				Accept: 'application/json',
				client_id: CLIENT_ID,
				remote_token: REMOTE_TOKEN,
				swap_key: SWAP_KEY
			}
		});
		console.log(`🔍 API 응답 데이터: 총 ${response.data.response.totalCount} 건`);
		return response.data.response.list;
	} catch (error) {
		console.error('❌ API 호출 실패:', error);
		process.exit(1);
	}
}

function parseYear(year: string | null): number | null {
	return year ? parseInt(year, 10) : null;
}

function parseTimestamp(dateStr: string): string {
	const [date, time] = dateStr.split(' ');
	const [year, month, day] = date.split('/');
	return `${year}-${month}-${day} ${time}`;
}

async function syncToDb(data: FacultyData[]) {
	for (const row of data) {
		console.log(`🔍 처리 중 데이터: ${JSON.stringify(row)}`);
		const user_id = row.userId.trim();
		const campus = row.campus.trim() || null;
		const college = row.college.trim() || null;
		const department = row.department.trim() || null;
		const tenure_track = row.tenureTrack?.trim() || null;
		const job_type = row.jobType.trim() || null;
		const job_rank = row.jobRank.trim() || null;
		const name = row.name.trim() || null;
		const english_name = row.englishName?.trim() || null;
		const highest_degree = row.highestDegree.trim() || null;
		const employment_status = null; // API에 없음
		const email = row.email.trim() || null;
		const bachelor_degree_year = parseYear(row.bachelorDegreeYear);
		const master_degree_year = parseYear(row.masterDegreeYear);
		const doctoral_degree_year = parseYear(row.doctoralDegreeYear);
		const source_created_at = parseTimestamp(row.createdAt); // 소스 데이터의 created_at
		const source_updated_at = parseTimestamp(row.updatedAt); // 소스 데이터의 updated_at

		if (!user_id || !name) {
			console.warn(`⚠️ 필수값 누락: user_id=${user_id || 'N/A'}, name=${name || 'N/A'}`);
			continue;
		}

		if (job_type === '장학조교') {
			console.warn(`⚠️ 제외됨 (장학조교): user_id=${user_id}, name=${name}`);
			continue;
		}

		if (college !== '경상대학') {
			console.warn(
				`⚠️ 제외됨 (경상대학 아님): user_id=${user_id}, name=${name}, college=${college}`
			);
			continue;
		}

		try {
			// 기존 데이터 확인
			const existing = await query(
				`SELECT created_at, updated_at FROM aacsb_faculty WHERE user_id = $1`,
				[user_id]
			);

			const now = new Date().toISOString(); // 현재 시간 (ISO 형식, PostgreSQL과 호환)
			let queryText: string;
			let queryParams: any[];

			if (existing.length === 0) {
				// 신규 삽입: created_at, updated_at 모두 현재 시간
				queryText = `
          INSERT INTO aacsb_faculty (
            user_id, campus, college, department, tenure_track, job_type, job_rank,
            name, english_name, highest_degree, employment_status, email,
            bachelor_degree_year, master_degree_year, doctoral_degree_year,
            data_source, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'API', $16, $16)
          RETURNING user_id`;
				queryParams = [
					user_id,
					campus,
					college,
					department,
					tenure_track,
					job_type,
					job_rank,
					name,
					english_name,
					highest_degree,
					employment_status,
					email,
					bachelor_degree_year,
					master_degree_year,
					doctoral_degree_year,
					now // created_at, updated_at 모두 now
				];
			} else {
				// 기존 데이터 갱신: created_at은 유지, updated_at만 현재 시간
				queryText = `
          UPDATE aacsb_faculty SET
            campus = $2,
            college = $3,
            department = $4,
            tenure_track = $5,
            job_type = $6,
            job_rank = $7,
            name = $8,
            english_name = $9,
            highest_degree = $10,
            employment_status = $11,
            email = $12,
            bachelor_degree_year = $13,
            master_degree_year = $14,
            doctoral_degree_year = $15,
            data_source = 'API',
            updated_at = $16
          WHERE user_id = $1
          RETURNING user_id`;
				queryParams = [
					user_id,
					campus,
					college,
					department,
					tenure_track,
					job_type,
					job_rank,
					name,
					english_name,
					highest_degree,
					employment_status,
					email,
					bachelor_degree_year,
					master_degree_year,
					doctoral_degree_year,
					now // updated_at만 now
				];
			}

			const result = await query(queryText, queryParams);
			console.log(
				`✅ 쿼리 실행 결과: user_id=${user_id}, affected_rows=${(result as any).rowCount}`
			);
		} catch (err) {
			console.error(`❌ 쿼리 실행 실패: user_id=${user_id}, name=${name}`, err);
		}
	}
}

async function main() {
	await testDbConnection();
	const data = await fetchFacultyData();
	await syncToDb(data);
	console.log('✅ 교원 데이터 동기화 완료');
}

async function testDbConnection() {
	try {
		const result = await query('SELECT NOW()');
		console.log('✅ DB 연결 성공:', result);
	} catch (err) {
		console.error('❌ DB 연결 실패:', err);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('❌ 에러 발생:', err);
	process.exit(1);
});
