<!-- src/lib/components/SessionManager.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, logout } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	export let requiresAuth: boolean = true;

	let isLoading = true;
	let sessionTimeout: NodeJS.Timeout | null = null;
  let sessionWarning = false;

  function startSessionTimer() {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
      sessionWarning = true;
      setTimeout(() => {
        if (sessionWarning) {
          sessionWarning = false;
          logout();
          goto('/login');
        }
      }, 5 * 60 * 1000); // 5분 경고 후 로그아웃
    }, 120 * 60 * 1000); // 120분 후 경고
  }

	async function extendSession() {
    try {
      const response = await fetch('/api/auth/extend', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('세션 연장 실패');
      }
      sessionWarning = false;
      startSessionTimer();
    } catch (err) {
      console.error('Session extension failed:', err);
      logout();
      goto('/login');
    }
  }

	function resetSessionTimer() {
		if ($auth.id_no) startSessionTimer();
	}

  async function verifyAuth() {
    isLoading = true;
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Auth verification failed:', errorData);
        throw new Error(errorData.message || '인증 실패');
      }
      const data = await response.json();
      auth.set({
        isLoggedIn: true,
        id_no: data.id_no,
        user_name: data.user_name,
        isAdmin: data.isAdmin
      });
      startSessionTimer();
    } catch (err) {
      console.warn('Auth verification error:', err);
      auth.set({ isLoggedIn: false, id_no: null, user_name: null, isAdmin: false });
    } finally {
      isLoading = false;
    }
  }

	onMount(() => {
		if (!browser) return;
		if ((requiresAuth && !$auth.isLoggedIn)) {
			verifyAuth();
		} else {
			isLoading = false;
			if (requiresAuth && $auth.id_no) startSessionTimer();
		}
		['click', 'mousemove', 'keydown'].forEach((event) =>
			window.addEventListener(event, resetSessionTimer)
		);
		return () => {
			if (sessionTimeout) clearTimeout(sessionTimeout);
			['click', 'mousemove', 'keydown'].forEach((event) =>
				window.removeEventListener(event, resetSessionTimer)
			);
		};
	});
</script>

{#if sessionWarning}
	<div class="fixed top-4 left-1/2 -translate-x-1/2 rounded bg-gray-100 px-4 py-2 text-sm text-gray-700 shadow flex items-center space-x-4">
		<p class="m-0">5분 후 자동 로그아웃 됩니다. </p>
		<button on:click={extendSession} class="bg-blue-500 text-white text-sm px-2 py-1 rounded">
			로그인 연장
		</button>
	</div>
{/if}

{#if isLoading}
	<div class="text-center">
		<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
		<p>로딩 중...</p>
	</div>
{/if}