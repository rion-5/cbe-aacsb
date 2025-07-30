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
    const facultyList = await query<Faculty>(
      `
      SELECT user_id, name, college, department, job_type, job_rank, highest_degree,
        CASE 
          WHEN highest_degree = '학사' THEN bachelor_degree_year
          WHEN highest_degree = '석사' THEN master_degree_year
          WHEN highest_degree = '박사' THEN doctoral_degree_year
        END AS highest_degree_year
      FROM aacsb_faculty
      WHERE user_id = $1 OR name = $1
      `,
      [searchQuery]
    );

    if (facultyList.length === 0) {
      return new Response(JSON.stringify({ error: 'No faculty found' }), { status: 404 });
    }

    if (facultyList.length > 1) {
      return new Response(JSON.stringify({ facultyList }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { status: 500 });
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
  } catch (error: any) {
    console.error('Error adding research output:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { research_id, english_title, english_journal } = await request.json();
    if (!research_id) {
      return new Response(JSON.stringify({ error: 'research_id is required' }), { status: 400 });
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
    console.log(params);
    const result = await query<ResearchOutput>(
      `
      UPDATE aacsb_research_outputs
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE research_id = $1
      RETURNING *
      `,
      params
    );

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'No record updated' }), { status: 404 });
    }

    return new Response(JSON.stringify(result[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error updating research output:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { research_id, title, journal_name, published_at } = await request.json();
    if (!research_id || !title || !published_at) {
      return new Response(JSON.stringify({ error: 'research_id, title, published_at are required' }), { status: 400 });
    }

    const research = await query<ResearchOutput>(
      `SELECT data_source FROM aacsb_research_outputs WHERE research_id = $1`,
      [research_id]
    );
    if (research.length === 0) {
      return new Response(JSON.stringify({ error: 'Research record not found' }), { status: 404 });
    }
    if (research[0].data_source !== 'manual') {
      return new Response(JSON.stringify({ error: 'Only manual data can be updated' }), { status: 403 });
    }

    const result = await query<ResearchOutput>(
      `
      UPDATE aacsb_research_outputs
      SET title = $2, journal_name = $3, published_at = $4, updated_at = CURRENT_TIMESTAMP
      WHERE research_id = $1
      RETURNING *
      `,
      [research_id, title, journal_name || null, published_at]
    );

    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'No record updated' }), { status: 404 });
    }

    return new Response(JSON.stringify(result[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error updating research output:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { research_id } = await request.json();
    if (!research_id) {
      return new Response(JSON.stringify({ error: 'research_id is required' }), { status: 400 });
    }

    const research = await query<ResearchOutput>(
      `SELECT data_source FROM aacsb_research_outputs WHERE research_id = $1`,
      [research_id]
    );
    if (research.length === 0) {
      return new Response(JSON.stringify({ error: 'Research record not found' }), { status: 404 });
    }
    if (research[0].data_source !== 'manual') {
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
  } catch (error: any) {
    console.error('Error deleting research output:', error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), { status: 500 });
  }
};