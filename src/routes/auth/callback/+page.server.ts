// src/routes/auth/callback/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { setSession } from '$lib/server/app-session';
import { auth } from '$lib/stores/auth';
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
    throw new Error('Failed to request token');
  }

  const tokenData = await tokenResponse.json();
  // console.log('tokenData', tokenData); // expires_in: 43200 는 12시간
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('No access token received');
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
    throw new Error('Failed to fetch user info');
  }

  const userData = await userResponse.json();
  const userInfo = userData.response.item;

  const daehakCd = userInfo.daehakCd;
  const userGb = userInfo.userGb;
  // if (daehakCd !== 'Y0000502') {
  //   throw redirect(302, '/?error=invalid_college');
  // }

  const allowedUserGbs = ['0010', '0020', '0030', '0110', '0120', '0150', '0180'];
  if (!allowedUserGbs.includes(userGb)) {
    throw redirect(302, '/?error=invalid_status');
  }

  // 사용자 정보 매핑
  const sessionUser = {
    id_no: userInfo.gaeinNo,
    user_name: userInfo.userNm,
    access_token: accessToken

  };


  // 세션 설정
  await setSession(cookies, sessionUser);

  // auth 스토어 업데이트
  auth.set({
    isLoggedIn: true,
    id_no: userInfo.gaeinNo,
    user_name: userInfo.user_name
  });

  throw redirect(302, '/');

};