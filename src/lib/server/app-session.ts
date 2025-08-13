//  src/lib/server/app-session.ts
import { type Cookies } from '@sveltejs/kit';
import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from '$env/static/private';
import type { AppSession } from '$lib/types';

// JWT 생성
export async function createJWT(user: { id_no: string; user_name: string; isAdmin: boolean }): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ id_no: user.id_no, user_name: user.user_name, isAdmin: user.isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);
}

// JWT 검증
export async function verifyJWT(token: string): Promise<AppSession> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.id_no && payload.user_name) {
      return {
        user: {
          id_no: payload.id_no as string,
          user_name: payload.user_name as string,
          isAdmin: payload.isAdmin as boolean
        },
      };
    }
    return { user: null };
  } catch (err) {
    console.error('verifyJWT Error:', err);
    return { user: null };
  }
}

// 쿠키에서 세션 데이터 가져오기
export async function getSession(cookies: Cookies): Promise<AppSession> {
  const token = cookies.get('session_token');
  if (!token) {
    return { user: null };
  }
  return verifyJWT(token);
}

// access_token 가져오기
export function getAccessToken(cookies: Cookies): string | undefined {
  const accessToken = cookies.get('access_token');
  return accessToken;
}

// 세션 설정 (로그인 시 호출)
export async function setSession(
  cookies: Cookies,
  user: { id_no: string; user_name: string; access_token: string; isAdmin: boolean }
) {
  try {
    const token = await createJWT({ id_no: user.id_no, user_name: user.user_name, isAdmin: user.isAdmin });
    // session_token 설정
    cookies.set('session_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60, // 2시간
    });
    // access_token 설정
    cookies.set('access_token', user.access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // access_token 만료 시간 (12시간)
    });
  } catch (err) {
    console.error('setSession Error:', err);
    throw new Error('Failed to set session');
  }
}

// 세션 연장
export async function extendSession(cookies: Cookies): Promise<boolean> {
  const token = cookies.get('session_token');
  if (!token) {
    return false;
  }

  try {
    const appSession = await verifyJWT(token);
    if (!appSession.user?.id_no || !appSession.user?.user_name) {
      return false;
    }
    const accessToken = cookies.get('access_token');
    if (!accessToken) {
      return false;
    }
    await setSession(cookies, {
      id_no: appSession.user.id_no,
      user_name: appSession.user.user_name,
      access_token: accessToken,
      isAdmin: appSession.user.isAdmin
    });
    return true;
  } catch (err) {
    console.error('extendSession Error:', err);
    return false;
  }
}

// 세션 삭제 (로그아웃 시 호출)
export function clearSession(cookies: Cookies) {
  cookies.delete('session_token', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  cookies.delete('access_token', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}