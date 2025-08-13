// src/intellectual_contribution/+page.server.ts

import type { PageServerLoad } from './$types';
import { auth } from '$lib/stores/auth';
import type { ResearchOutput, ResearchClassification, Faculty } from '$lib/types/research';

export const load: PageServerLoad = async ({ url, fetch, locals }) => {
  const appSession = locals.appSession;
  if (!appSession.user) {
    return { researchOutputs: [], selectedFaculty: null, facultyList: [] };
  }

  const isAdmin = appSession.user.isAdmin || false;
  const id_no = appSession.user.id_no || '';
  let searchQuery = isAdmin ? url.searchParams.get('searchQuery') || '' : id_no;
  const selectedYear = url.searchParams.get('year') || '2025';

  // 관리자이면서 searchQuery가 비어있는 경우, API 호출하지 않음
  if (isAdmin && !searchQuery) {
    return { researchOutputs: [], selectedFaculty: null, facultyList: [] };
  }

  // 일반 사용자인데 id_no가 없는 경우도 API 호출하지 않음
  if (!isAdmin && !id_no) {
    return { researchOutputs: [], selectedFaculty: null, facultyList: [] };
  }
  const params = new URLSearchParams();
  params.append('searchQuery', searchQuery);
  if (selectedYear) params.append('year', selectedYear);

  const response = await fetch(`/api/intellectual_contribution?${params}`, {
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.ok) {
    const data = await response.json();
    if (data.facultyList) {
      return {
        researchOutputs: [],
        selectedFaculty: null,
        facultyList: isAdmin ? data.facultyList : []
      };
    } else {
      return {
        researchOutputs: data.researchOutputs,
        selectedFaculty: data.faculty,
        facultyList: []
      };
    }
  } else {
    console.error('Failed to fetch data:', await response.json());
    return { researchOutputs: [], selectedFaculty: null, facultyList: [] };
  }
};