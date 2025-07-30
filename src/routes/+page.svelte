<script lang="ts">
  import { onMount } from 'svelte';
  import type { FacultyData } from '$lib/types/faculty';

  let disciplines: { code: string; name: string; level: string }[] = [];
  let facultyData: FacultyData[] = [];
  let isLoading = false;
  let error: string | null = null;

  async function fetchDisciplines() {
    try {
      const response = await fetch('/api/disciplines');
      if (!response.ok) throw new Error('Failed to fetch disciplines');
      disciplines = await response.json();
    } catch (err) {
      error = 'Failed to load disciplines';
      console.error(err);
    }
  }

  async function fetchFaculty() {
    isLoading = true;
    error = null;
    try {
      const response = await fetch('/api/faculty');
      if (!response.ok) throw new Error('Failed to fetch faculty data');
      facultyData = await response.json();
    } catch (err) {
      error = 'Failed to load faculty data';
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchDisciplines();
    fetchFaculty();
  });
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">AACSB Faculty List</h1>

  {#if isLoading}
    <p class="text-gray-500">Loading...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else}
    {#each ['Undergraduate', 'Graduate', 'IndustrialConvergence'] as level}
      <h2 class="text-xl font-semibold mt-6 mb-4">{level}</h2>
      {#each disciplines.filter(d => d.level === level) as discipline}
        <h3 class="text-lg font-medium mt-4 mb-3">{discipline.name}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each facultyData.filter(f => f.discipline_code === discipline.code) as faculty}
            <div class="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow flex">
              <div class="w-1/3 flex items-center">
                <h4 class="text-xl font-semibold">{faculty.name}</h4>
              </div>
              <div class="w-2/3 flex flex-col justify-center">
                <p class="text-sm text-gray-600">{faculty.english_name}</p>
                <p class="text-sm text-gray-500">
                  {faculty.college} {faculty.department || faculty.college} {faculty.job_rank} 
                  {faculty.highest_degree}({faculty.highest_degree_year})
                </p>
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {/each}
  {/if}
</div>