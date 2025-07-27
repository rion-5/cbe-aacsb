<script lang="ts">
  import { onMount } from 'svelte';
  import type { Table31ReportData } from '$lib/types/report';

  let selectedDiscipline = 'AS';
  let reportData: Table31ReportData[] = [];
  let year = '2025';
  let isLoading = false;
  let error: string | null = null;

  const disciplines = [
    { code: 'AS', name: 'Actuarial Science' },
    { code: 'TX', name: 'Accounting & Tax' },
    { code: 'AC', name: 'Accounting' },
    { code: 'FI', name: 'Finance' },
    { code: 'HR', name: 'Human & Resource' },
    { code: 'MI', name: 'Management Information Systems' },
    { code: 'MA', name: 'Marketing' },
    { code: 'OTH', name: 'Others' },
    { code: 'OM', name: 'Services & Operations' },
    { code: 'SM', name: 'Strategic Management' },
    { code: 'GMC', name: 'Management Consulting' },
    { code: 'GSM', name: 'Strategic Management (Graduate)' },
    { code: 'GFI', name: 'Finance & Insurance (Graduate)' },
    { code: 'GBM', name: 'Business Administration (Industrial Convergence)' },
  ];

  async function fetchReport(discipline: string, year: string) {
    isLoading = true;
    error = null;
    try {
      const response = await fetch(`/api/report/table3-1?discipline=${discipline}&year=${year}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      reportData = await response.json();
    } catch (err) {
      error = '데이터를 불러오는 중 오류가 발생했습니다.';
      console.error(err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchReport(selectedDiscipline, year);
  });

  function handleDisciplineChange(event: Event) {
    selectedDiscipline = (event.target as HTMLSelectElement).value;
    fetchReport(selectedDiscipline, year);
  }

  function handleYearChange(event: Event) {
    year = (event.target as HTMLSelectElement).value;
    fetchReport(selectedDiscipline, year);
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">AACSB Table 3-1 Report</h1>

  <div class="mb-6 flex space-x-4">
    <div>
      <label for="discipline" class="block text-sm font-medium text-gray-700">Discipline</label>
      <select
        id="discipline"
        bind:value={selectedDiscipline}
        on:change={handleDisciplineChange}
        class="mt-1 block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        {#each disciplines as discipline}
          <option value={discipline.code}>{discipline.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="year" class="block text-sm font-medium text-gray-700">Year</label>
      <select
        id="year"
        bind:value={year}
        on:change={handleYearChange}
        class="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        {#each Array.from({ length: 5 }, (_, i) => 2025 - i) as y}
          <option value={y}>{y}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if isLoading}
    <p class="text-gray-500">로딩 중...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else if reportData.length === 0}
    <p class="text-gray-500">선택한 학문 분야에 데이터가 없습니다.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr class="bg-gray-100">
            <!-- <th class="border px-4 py-2 text-left">학문 분야</th> -->
            <!-- <th class="border px-4 py-2 text-left">교수 NIP</th> -->
            <th class="border px-4 py-2 text-left">Faculty Member's Name</th>
            <th class="border px-4 py-2 text-left">Specialty Field</th>
            <th class="border px-4 py-2 text-left">Specialty Field(other)</th>
            <th class="border px-4 py-2 text-left">Highest Degree</th>
            <!-- <th class="border px-4 py-2 text-left">학위 연도</th> -->
            <th class="border px-4 py-2 text-left">Normal Professional Responsibilities</th>
            <!-- <th class="border px-4 py-2 text-left">근무 비율</th> -->
            <th class="border px-4 py-2 text-left">SA</th>
            <th class="border px-4 py-2 text-left">PA</th>
            <th class="border px-4 py-2 text-left">SP</th>
            <th class="border px-4 py-2 text-left">IP</th>
            <th class="border px-4 py-2 text-left">A</th>
          </tr>
        </thead>
        <tbody>
          {#each reportData as row}
            <tr class="hover:bg-gray-50">
              <!-- <td class="border px-4 py-2">{row.discipline}</td> -->
              <!-- <td class="border px-4 py-2">{row.fac_nip}</td> -->
              <td class="border px-4 py-2">{row.fac_name}</td>
              <td class="border px-4 py-2">{row.specialty_field1}</td>
              <td class="border px-4 py-2">{row.specialty_field2}</td>
              <td class="border px-4 py-2">{row.highest_degree}({row.highest_degree_year})</td>
              <!-- <td class="border px-4 py-2">{row.highest_degree_year}</td> -->
              <td class="border px-4 py-2">{row.normal_professional_responsibilities}</td>
              <!-- <td class="border px-4 py-2">{row.fac_time}</td> -->
              <td class="border px-4 py-2">{row.sa}</td>
              <td class="border px-4 py-2">{row.pa}</td>
              <td class="border px-4 py-2">{row.sp}</td>
              <td class="border px-4 py-2">{row.ip}</td>
              <td class="border px-4 py-2">{row.a}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>