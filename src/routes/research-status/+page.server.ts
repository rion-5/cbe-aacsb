// src/routes/research-status/+page.server.ts
import type { PageServerLoad } from './$types';
import { auth } from '$lib/stores/auth';

export interface PageData {
  facultyList: any[]; // 타입 필요시 확장
  yearRange: string;
}

export const load: PageServerLoad<PageData> = async ({ fetch, locals }) => {
  const appSession = locals.appSession;
  if (!appSession.user || !appSession.user.isAdmin) {
    return { facultyList: [], yearRange: '' };
  }

  const response = await fetch('/api/research-status');

  if (response.ok) {
    const data = await response.json();
    return { facultyList: data.facultyList || [], yearRange: data.yearRange || '' };
  } else {
    console.error('Failed to fetch status');
    return { facultyList: [], yearRange: '' };
  }
};