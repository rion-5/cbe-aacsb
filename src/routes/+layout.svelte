<!-- src/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
</script>

<header class="bg-blue-950 p-4 text-white">
  <nav class="container mx-auto">
    <div class="flex flex-col items-center space-y-4 md:flex-row md:items-center md:space-y-0 md:gap-12">
      <h1 class="text-2xl font-bold">AACSB Management System</h1>
      <ul class="flex space-x-6">
        <li>
          <a
            href="/"
            class="relative px-2 py-1 transition-all duration-200 hover:text-blue-200 hover:scale-105 {$page.url.pathname === '/' ? 'font-bold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-blue-200' : ''}"
          >
            Home
          </a>
        </li>
        <li>
          <a
            href="/intellectual_contribution"
            class="relative px-2 py-1 transition-all duration-200 hover:text-blue-200 hover:scale-105 {$page.url.pathname === '/intellectual_contribution' ? 'font-bold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-blue-200' : ''}"
          >
            Intellectual Contribution
          </a>
        </li>
        <li>
          <a
            href="/table3-1"
            class="relative px-2 py-1 transition-all duration-200 hover:text-blue-200 hover:scale-105 {$page.url.pathname === '/table3-1' ? 'font-bold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-blue-200' : ''}"
          >
            Table 3-1
          </a>
        </li>
      </ul>
    </div>
  </nav>
</header>

<main class="container mx-auto p-4">
  <slot />
</main>