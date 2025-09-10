import 'dotenv/config';
import axios from 'axios';
import { query } from '../src/lib/server/db';

const API_URL = 'https://api.hanyang.ac.kr/rs/research/ygsj/findYgsjForAACSB.json';
const REMOTE_TOKEN = process.env.RESEARCH_REMOTE_TOKEN || '';
const CLIENT_ID = process.env.CLIENT_ID || '';
const SWAP_KEY = process.env.SWAP_KEY || '';

if (!REMOTE_TOKEN) {
	console.error('❌ RESEARCH_REMOTE_TOKEN 환경변수가 설정되지 않았습니다.');
	process.exit(1);
}

interface ResearchData {
	journalName: string;
	journalCategory: string;
	role: string;
	publishedAt: string;
	isQ1Last3years: string;
	type: string;
	userId: string;
	isDomestic: string;
	createdAt: string;
	name: string;
	journalIndex: string;
	publisher: string;
	impactFactor: number;
	tiltle: string; // API 응답에 맞게 오타 수정
	researchId: string;
	doi: string;
	updatedAt: string;
}

async function fetchResearchData(): Promise<ResearchData[]> {
	try {
		const response = await axios.get(API_URL, {
			params: { in_user_id: '%', in_published_year: '%' },
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

function parseDate(dateStr: string | undefined): string | null {
	if (!dateStr) return null;
	// "YYYYMMDD" -> "YYYY-MM-DD"
	return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function parseTimestamp(dateStr: string | undefined): string | null {
	if (!dateStr) return null;
	// "YYYY/MM/DD HH:MM:SS" -> "YYYY-MM-DD HH:MM:SS"
	const [date, time] = dateStr.split(' ');
	const [year, month, day] = date.split('/');
	return `${year}-${month}-${day} ${time}`;
}

function parseBoolean(str: string | null | undefined): boolean | null {
	return str ? str.toLowerCase() === 'true' : null;
}

function safeTrim(value: string | undefined | null): string | null {
	return value ? value.trim() : null;
}

async function syncToDb(data: ResearchData[]) {
	for (const row of data) {
		console.log(`🔍 처리 중 데이터: ${JSON.stringify(row)}`);

		// 필수 필드 확인
		if (!row.researchId || !row.userId || !row.tiltle || !row.publishedAt) {
			console.warn(
				`⚠️ 필수값 누락: researchId=${row.researchId || 'N/A'}, userId=${row.userId || 'N/A'}, tiltle=${row.tiltle || 'N/A'}, publishedAt=${row.publishedAt || 'N/A'}`
			);
			continue;
		}

		const api_research_id = safeTrim(row.researchId);
		const fac_nip = safeTrim(row.userId);
		const name = safeTrim(row.name);
		const title = safeTrim(row.tiltle); // API의 오타 반영
		const doi = safeTrim(row.doi);
		const published_at = parseDate(row.publishedAt);
		const publisher = safeTrim(row.publisher);
		const journal_name = safeTrim(row.journalName);
		const journal_index = safeTrim(row.journalIndex);
		const type = safeTrim(row.type);
		const journal_category = safeTrim(row.journalCategory);
		const impact_factor = row.impactFactor || null;
		const is_q1_last3years = parseBoolean(row.isQ1Last3years);
		const is_domestic = parseBoolean(row.isDomestic);
		const role = safeTrim(row.role);
		const source_created_at = parseTimestamp(row.createdAt);
		const source_updated_at = parseTimestamp(row.updatedAt);

		// 필수값 확인
		if (!api_research_id || !fac_nip || !title || !published_at) {
			console.warn(
				`⚠️ 필수값 누락 (파싱 후): api_research_id=${api_research_id || 'N/A'}, fac_nip=${fac_nip || 'N/A'}, title=${title || 'N/A'}, published_at=${published_at || 'N/A'}`
			);
			continue;
		}

		// 외래 키(fac_nip) 확인
		const facultyExists = await query(`SELECT fac_nip FROM faculty WHERE fac_nip = $1`, [fac_nip]);
		if (facultyExists.length === 0) {
			console.warn(`⚠️ 외래 키 위반: fac_nip=${fac_nip}이 faculty 테이블에 존재하지 않음`);
			continue;
		}

		try {
			// 기존 데이터 확인
			const existing = await query(
				`SELECT updated_at FROM aacsb_research_outputs WHERE api_research_id = $1`,
				[api_research_id]
			);

			// const now = new Date().toISOString(); // 현재 시간 (ISO 형식, PostgreSQL 호환)
			const now = new Date();
			let queryText: string;
			let queryParams: any[];

			if (existing.length === 0) {
				// 신규 삽입: created_at, updated_at 모두 현재 시간
				queryText = `
          INSERT INTO aacsb_research_outputs (
            api_research_id, fac_nip, name, data_source, title, doi, published_at,
            publisher, journal_name, journal_index, type, journal_category,
            impact_factor, is_q1_last3years, is_domestic, role, created_at, updated_at
          ) VALUES ($1, $2, $3, 'API', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
          RETURNING api_research_id`;
				queryParams = [
					api_research_id,
					fac_nip,
					name,
					title,
					doi,
					published_at,
					publisher,
					journal_name,
					journal_index,
					type,
					journal_category,
					impact_factor,
					is_q1_last3years,
					is_domestic,
					role,
					now
				];
			} else {
				// 기존 데이터 존재: updated_at 비교
				const target_updated_at = new Date(existing[0].updated_at);
				const source_updated_at_date = source_updated_at ? new Date(source_updated_at) : new Date();

				if (source_updated_at && source_updated_at_date > target_updated_at) {
					// 소스 데이터가 더 최신인 경우 업데이트
					queryText = `
            UPDATE aacsb_research_outputs SET
              fac_nip = $2,
              name = $3,
              data_source = 'API',
              title = $4,
              doi = $5,
              published_at = $6,
              publisher = $7,
              journal_name = $8,
              journal_index = $9,
              type = $10,
              journal_category = $11,
              impact_factor = $12,
              is_q1_last3years = $13,
              is_domestic = $14,
              role = $15,
              updated_at = $16
            WHERE api_research_id = $1
            RETURNING api_research_id`;
					queryParams = [
						api_research_id,
						fac_nip,
						name,
						title,
						doi,
						published_at,
						publisher,
						journal_name,
						journal_index,
						type,
						journal_category,
						impact_factor,
						is_q1_last3years,
						is_domestic,
						role,
						now
					];
				} else {
					console.log(
						`ℹ️ 최신 데이터 없음: api_research_id=${api_research_id}, source_updated_at=${source_updated_at}, target_updated_at=${target_updated_at}`
					);
					continue; // 최신 데이터가 아니면 스킵
				}
			}

			const result = await query(queryText, queryParams);
			console.log(
				// `✅ 쿼리 실행 결과: api_research_id=${api_research_id}, affected_rows=${result.rowCount}`
				`✅ 쿼리 실행 결과: api_research_id=${api_research_id}`
			);
		} catch (err) {
			console.error(`❌ 쿼리 실행 실패: api_research_id=${api_research_id}, name=${name}`, err);
		}
	}
}

async function main() {
	await testDbConnection();
	const data = await fetchResearchData();
	await syncToDb(data);
	console.log('✅ 연구성과 데이터 동기화 완료');
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
