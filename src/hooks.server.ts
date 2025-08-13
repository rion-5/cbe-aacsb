// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/app-session';
import { isAdmin } from '$lib/utils/admin';
//경로 설정을 더 체계적으로 관리
const ROUTE_CONFIG = {
  // 완전히 공개된 경로 (인증 불필요)
  public: ['/auth/callback'],
  // 인증된 사용자만 접근 가능한 경로
  protected: ['/intellectual_contribution','/', '/table3-1'],
  admin: ['/', '/table3-1'],
  // 로그인한 사용자는 접근할 수 없는 경로 (게스트 전용)
  guestOnly: ['/login'],
};

function isPathMatch(pathname: string, paths: string[]): boolean {
  return paths.some(path => pathname === path || pathname.startsWith(path + '/'));
}

function getRouteType(pathname: string, isAdmin: boolean): 'public' | 'protected' | 'guestOnly' | 'admin' {
  if (isPathMatch(pathname, ROUTE_CONFIG.guestOnly)) return 'guestOnly';
  if (isAdmin && isPathMatch(pathname, ROUTE_CONFIG.admin)) return 'admin';
  if (isPathMatch(pathname, ROUTE_CONFIG.protected)) return 'protected';
  return 'public';
}

export const handle: Handle = async ({ event, resolve }) => {
  // 세션 정보를 한 번만 조회하여 이벤트에 저장
  const appSession = await getSession(event.cookies);
  event.locals.appSession = appSession;
  const { pathname } = event.url;

  const isAdminUser = appSession.user ? await isAdmin(appSession.user.id_no) : false;
  const routeType = getRouteType(pathname, isAdminUser);

  // 로컬 및 배포 환경에 따라 허용된  Origin 설정
  const origin = event.request.headers.get('Origin') ?? '';
  const allowedOrigins = ['http://127.0.0.1:5173'];
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : '';

  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  // 보호된 경로 접근 시 리다이렉트
  if (routeType === 'protected' && !appSession.user) {
    const clientId = import.meta.env.VITE_CLIENT_ID || '';
    const redirectUri = import.meta.env.VITE_REDIRECT_URI || '';
    const scope = '10';
    const authUrl = `https://api.hanyang.ac.kr/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
    return Response.redirect(authUrl, 302);
  }
  // 관리자 경로 접근 시 리다이렉트
  if (routeType === 'admin' && !isAdminUser) {
    return Response.redirect(`${event.url.origin}/intellectual_contribution`, 302);
  }

  // 이미 로그인한 사용자가 게스트 전용 페이지에 접근하는 경우
  if (routeType === 'guestOnly' && appSession.user) {
    const redirectUrl = isAdminUser ? `${event.url.origin}/` : `${event.url.origin}/intellectual_contribution`;
    return Response.redirect(redirectUrl, 302);
  }
  
  // 실제 응답 처리
  const response = await resolve(event);
  
  // 모든 응답에 CORS 헤더 추가
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  return response;
};
