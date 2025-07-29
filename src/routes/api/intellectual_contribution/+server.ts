// src/routes/api/intellcectual_contribution/+server.ts

import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { ResearchOutput, ResearchClassification, Faculty } from '$lib/types/research';

export const GET: RequestHandler = async ({ url }) => {
  const searchQuery = url.searchParams.get('searchQuery')?.trim();
  const year = url.searchParams.get('year')?.trim();

  if (!searchQuery) {
    return new Response(JSON.stringify({ error: 'searchQuery is required' }), { status: 400 });
  }

  try {
    // aacsb_faculty에서 user_id 또는 name으로 조회
    const facultyList = await query<Faculty>(
      `
      SELECT user_id, name, college, department, job_type, job_rank, highest_degree
      FROM aacsb_faculty
      WHERE user_id = $1 OR name = $1
      `,
      [searchQuery]
    );

    if (facultyList.length === 0) {
      return new Response(JSON.stringify({ error: 'No faculty found' }), { status: 404 });
    }

    // 동명이인 처리: 복수 faculty 반환
    if (facultyList.length > 1) {
      return new Response(JSON.stringify({ facultyList }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 단일 faculty의 연구성과 조회
    const fac_nip = facultyList[0].user_id;
    const params: (string | number)[] = [fac_nip];
    let conditions = ['ro.fac_nip = $1'];

    if (year && ['2023', '2024', '2025'].includes(year)) {
      conditions.push('EXTRACT(YEAR FROM ro.published_at) = $' + (params.length + 1));
      params.push(Number(year));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const researchOutputs = await query<(ResearchOutput & ResearchClassification)>(
      `
      SELECT 
        ro.*, 
        COALESCE(rc.is_basic, FALSE) as is_basic,
        COALESCE(rc.is_applied, FALSE) as is_applied,
        COALESCE(rc.is_teaching, FALSE) as is_teaching,
        COALESCE(rc.is_peer_journal, FALSE) as is_peer_journal,
        COALESCE(rc.is_other_reviewed, FALSE) as is_other_reviewed,
        COALESCE(rc.is_other_nonreviewed, FALSE) as is_other_nonreviewed,
        COALESCE(rc.created_at, CURRENT_TIMESTAMP) as created_at,
        COALESCE(rc.updated_at, CURRENT_TIMESTAMP) as updated_at
      FROM aacsb_research_outputs ro
      LEFT JOIN aacsb_research_classifications rc 
        ON ro.research_id = rc.research_id 
        AND ro.fac_nip = rc.fac_nip
      ${whereClause}
      ORDER BY ro.published_at DESC
      `,
      params
    );

    return new Response(JSON.stringify({ faculty: facultyList[0], researchOutputs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { fac_nip, title, english_title, journal_name, english_journal, published_at, type } = await request.json();
    if (!fac_nip || !title || !published_at || !type) {
      return new Response(JSON.stringify({ error: 'fac_nip, title, published_at, type are required' }), { status: 400 });
    }

    const result = await query<ResearchOutput>(
      `
      INSERT INTO aacsb_research_outputs (
        fac_nip, title, english_title, journal_name, english_journal, published_at, type, data_source,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [fac_nip, title, english_title || null, journal_name || null, english_journal || null, published_at, type]
    );

    return new Response(JSON.stringify(result[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error adding research output:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { research_id, english_title, english_journal } = await request.json();
    if (!research_id) {
      return new Response(JSON.stringify({ error: 'research_id is required' }), { status: 400 });
    }

    // data_source='manual' 확인
    const research = await query<ResearchOutput>(
      `SELECT data_source FROM aacsb_research_outputs WHERE research_id = $1`,
      [research_id]
    );
    if (research.length === 0 || research[0].data_source !== 'manual') {
      return new Response(JSON.stringify({ error: 'Only manual data can be updated' }), { status: 403 });
    }

    const params: (string | number | null)[] = [research_id];
    const updates: string[] = [];
    if (english_title !== undefined) {
      updates.push(`english_title = $${params.length + 1}`);
      params.push(english_title);
    }
    if (english_journal !== undefined) {
      updates.push(`english_journal = $${params.length + 1}`);
      params.push(english_journal);
    }
    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
    }

    await query(
      `
      UPDATE aacsb_research_outputs
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE research_id = $1
      `,
      params
    );

    return new Response(JSON.stringify({ message: 'Updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating research output:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { research_id } = await request.json();
    if (!research_id) {
      return new Response(JSON.stringify({ error: 'research_id is required' }), { status: 400 });
    }

    // data_source='manual' 확인
    const research = await query<ResearchOutput>(
      `SELECT data_source FROM aacsb_research_outputs WHERE research_id = $1`,
      [research_id]
    );
    if (research.length === 0 || research[0].data_source !== 'manual') {
      return new Response(JSON.stringify({ error: 'Only manual data can be deleted' }), { status: 403 });
    }

    await query(
      `DELETE FROM aacsb_research_outputs WHERE research_id = $1`,
      [research_id]
    );

    return new Response(JSON.stringify({ message: 'Deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting research output:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};