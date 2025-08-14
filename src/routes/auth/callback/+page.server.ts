// src/routes/auth/callback/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { setSession } from '$lib/server/app-session';
import { auth } from '$lib/stores/auth';
import { isAdmin } from '$lib/utils/admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch, cookies }) => {
  const code = url.searchParams.get('code');
  if (!code) {
    throw redirect(302, '/?error=no_code');
  }

  const clientId = import.meta.env.VITE_CLIENT_ID as string;
  const clientSecret = import.meta.env.VITE_CLIENT_SECRET as string;
  const redirectUri = process.env.VITE_REDIRECT_URI as string;
  const scope = '10';
  const tokenUrl = 'https://api.hanyang.ac.kr/oauth/token';

  const tokenResponse = await fetch(
    `${tokenUrl}?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&scope=${scope}&redirect_uri=${redirectUri}&grant_type=authorization_code`,
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }
  );

  if (!tokenResponse.ok) {
    throw new Error(`Failed to request token: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('No access token received from token response');
  }

  const userResponse = await fetch('https://api.hanyang.ac.kr/rs/user/loginInfo.json', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'client_id': clientId,
      'access_token': accessToken,
      'swap_key': Date.now().toString()
    }
  });

  if (!userResponse.ok) {
    throw new Error(`Failed to fetch user info: ${userResponse.status} ${userResponse.statusText}`);
  }

  const userData = await userResponse.json();
  const userInfo = userData?.response?.item;

  if (!userInfo || !userInfo.gaeinNo || !userInfo.userNm) {
    throw new Error('Invalid user info received');
  }

  // const daehakCd = userInfo.daehakCd;
  const userGb = userInfo.userGb;
  // if (daehakCd !== 'Y0000502') {
  //   throw redirect(302, '/?error=invalid_college');
  // }

  const allowedUserGbs = ['0010', '0020', '0030'];
  // 0010 교수 0020 강사  0030 직원  0110 재학생 0120 휴학생  0150 수료생  0180 학사취득유예
  if (!allowedUserGbs.includes(userGb)) {
    throw redirect(302, '/?error=invalid_status');
  }

  // 관리자 여부 확인
  const isAdminUser: boolean = await isAdmin(userInfo.gaeinNo);

  // 사용자 정보 매핑
  const sessionUser = {
    id_no: userInfo.gaeinNo,
    user_name: userInfo.userNm,
    access_token: accessToken,
    isAdmin: isAdminUser
  };

  // 세션 설정
  await setSession(cookies, sessionUser);

  // auth 스토어 업데이트
  auth.set({
    isLoggedIn: true,
    id_no: userInfo.gaeinNo,
    user_name: userInfo.userNm,
    isAdmin: isAdminUser
  });

  // 관리자면 홈, 아니면 assign_contribution으로 리다이렉트
  throw redirect(302, isAdminUser ? '/' : '/intellectual_contribution');
};