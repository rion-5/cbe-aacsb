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

<div class="container">
	<h1>연구성과 입력 상태 (최근 5년: {yearRange})</h1>

	{#if loading}
		<p>로딩 중...</p>
	{:else}
		<table class="status-table">
			<thead>
				<tr>
					<th>ID</th>
					<th>성명</th>
					<th>학과</th>
					<th>필요 수</th>
					<th>처리 수</th>
					<th>처리 비율 (%)</th>
				</tr>
			</thead>
			<tbody>
				{#each facultyList as fac}
					<tr>
						<td>{fac.user_id}</td>
						<td>{fac.name || '-'}</td>
						<td>{fac.department || '-'}</td>
						<td>{fac.required}</td>
						<td>{fac.processed}</td>
						<td>{fac.ratio}%</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<div class="actions">
			<button on:click={downloadExcel} disabled={facultyList.length === 0}> Excel 다운로드 </button>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 8px;
		text-align: left;
	}
	th {
		background-color: #f2f2f2;
	}
	.actions {
		margin-top: 20px;
		text-align: right;
	}
	button {
		padding: 10px 20px;
		background: #007acc;
		color: white;
		border: none;
		cursor: pointer;
	}
</style>
