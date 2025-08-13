<!-- src/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import SessionManager from '$lib/components/SessionManager.svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { auth, logout } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  $: requiresAuth = $page.url.pathname !== '/auth/callback';
  $: isAdmin = $auth.isAdmin || false;

  // 관리자가 아닌 사용자가 admin 경로에 접근 시 리다이렉트
  $: if (browser && $auth.isLoggedIn && !isAdmin && ($page.url.pathname === '/' || $page.url.pathname.startsWith('/table3-1'))) {
    goto('/intellectual_contribution');
  }

  function handleLogout() {
    logout();
    goto('/login');
  }

  function handleLogin() {
    const clientId = import.meta.env.VITE_CLIENT_ID as string;
    const redirectUri = import.meta.env.VITE_REDIRECT_URI as string;
    const scope = '10';
    const authUrl = `https://api.hanyang.ac.kr/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.assign(authUrl);
  }
</script>

<header class="bg-blue-950 p-4 text-white">
  <nav class="container mx-auto flex items-center justify-between">
    <div class="flex flex-col items-center space-y-4 md:flex-row md:items-center md:gap-12 md:space-y-0">
      <h1 class="text-2xl font-bold">AACSB Management System</h1>
      {#if $auth.isLoggedIn}
        <ul class="flex space-x-6">
          {#if isAdmin}
            <li>
              <a href="/" class="relative px-2 py-1 transition-all duration-200 hover:scale-105 hover:text-blue-200 {$page.url.pathname === '/' ? 'font-bold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-blue-200' : ''}">
                Home
              </a>
            </li>
          {/if}

          <li>
            <a href="/intellectual_contribution" class="relative px-2 py-1 transition-all duration-200 hover:scale-105 hover:text-blue-200 {$page.url.pathname === '/intellectual_contribution' ? 'font-bold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-blue-200' : ''}">
              Intellectual Contribution
            </a>
          </li>

          {#if isAdmin}
            <li>
              <a href="/table3-1" class="relative px-2 py-1 transition-all duration-200 hover:scale-105 hover:text-blue-200 {$page.url.pathname === '/table3-1' ? 'font-bold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-blue-200' : ''}">
                Table 3-1
              </a>
            </li>
          {/if}


        </ul>
      {/if}
    </div>
    <div class="flex items-center space-x-4">
      {#if $auth.isLoggedIn && $page.url.pathname !== '/login'}
        <div class="flex items-center space-x-2">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
          </svg>
          <span class="text-sm">{$auth.user_name}</span>
        </div>
        <button on:click={handleLogout} class="text-sm hover:text-blue-200 transition-colors">
          Logout
        </button>
      {:else}
        <button on:click={handleLogin} class="text-sm hover:text-blue-200 transition-colors">
          Login
        </button>
      {/if}
    </div>
  </nav>
</header>

<main class="container mx-auto p-4">
  {#if browser && $page.url.pathname !== '/login'}
    <SessionManager {requiresAuth} />
  {/if}
  <slot />
</main>