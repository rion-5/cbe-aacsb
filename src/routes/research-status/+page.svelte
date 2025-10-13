<!-- src/routes/research-status/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { auth } from '$lib/stores/auth';

	export let data: PageData;

	let { facultyList, yearRange } = data;
	let loading = false;

	onMount(() => {
		fetchData();
	});

	async function fetchData() {
		loading = true;
		const res = await fetch('/api/research-status');
		if (res.ok) {
			const result = await res.json();
			facultyList = result.facultyList;
			yearRange = result.yearRange;
		}
		loading = false;
	}

	async function downloadExcel() {
		const res = await fetch('/api/research-status', { method: 'POST' });
		if (res.ok) {
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `research_status_${yearRange}.xlsx`;
			a.click();
		}
	}
</script>

<svelte:head>
	<title>연구성과 입력 상태</title>
</svelte:head>

<div class="mx-auto max-w-full px-4 py-6">
	<div class="mb-6">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">연구성과 입력 상태</h1>
		<p class="text-gray-600">최근 5년: {yearRange}</p>
	</div>

	{#if loading}
		<div class="rounded-lg bg-white p-8 text-center shadow-md">
			<div class="inline-flex items-center">
				<svg class="mr-3 -ml-1 h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<span class="text-lg font-medium text-gray-700">데이터를 불러오고 있습니다...</span>
			</div>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg bg-white shadow-md">
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">
					교수별 입력 현황 ({facultyList.length}명)
				</h2>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								ID
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								성명
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								학과
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								직급
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								최종학위
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								필요 수
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								처리 수
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								처리 비율
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each facultyList as fac}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{fac.user_id}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{fac.name || '-'}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{fac.department || '-'}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{fac.job_rank || '-'}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{fac.highest_degree || '-'}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{fac.required}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{fac.processed}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap">
									<span
										class="font-medium {fac.ratio >= 100
											? 'text-green-600'
											: fac.ratio >= 50
												? 'text-yellow-600'
												: 'text-red-600'}"
									>
										{fac.ratio}%
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="border-t border-gray-200 px-6 py-4">
				<div class="flex justify-end">
					<button
						on:click={downloadExcel}
						disabled={facultyList.length === 0}
						class="rounded bg-blue-500 px-6 py-2 text-white transition-colors duration-200 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400"
					>
						Excel 다운로드
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
