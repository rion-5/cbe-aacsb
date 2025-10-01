<!-- src/routes/page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { FacultyData } from '$lib/types/faculty';
	let disciplines: { code: string; name: string; level: string }[] = [];
	let facultyData: FacultyData[] = [];
	let nonMatchedFaculty: {
		user_id: string;
		name: string;
		college: string;
		department: string;
		job_type: string;
		job_rank: string;
		highest_degree: string;
		highest_degree_year: number | null;
		english_name: string;
	}[] = [];
	let isLoading = false;
	let error: string | null = null;
	let selectedFaculty: FacultyData | null = null;
	let showModal = false;
	let isNewFaculty = false;

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

	async function fetchNonMatchedFaculty() {
		try {
			const response = await fetch('/api/faculty/non-matched');
			if (!response.ok) throw new Error('Failed to fetch non-matched faculty');
			nonMatchedFaculty = await response.json();
		} catch (err) {
			error = 'Failed to load non-matched faculty';
			console.error(err);
		}
	}

	function openFacultyModal(faculty: FacultyData | null, isNew: boolean = false) {
		selectedFaculty = faculty
			? { ...faculty }
			: {
					user_id: '',
					name: '',
					fac_name: '',
					college: '',
					department: '',
					specialty_field1: '',
					specialty_field2: '',
					normal_professional_responsibilities: '',
					fac_discipline: '',
					fac_time: 0,
					fac_ccataacsb: '',
					fac_cqualaacsb2013: '',
					full_time_equivalent: false,
					job_type: '',
					job_rank: '',
					highest_degree: '',
					highest_degree_year: null
				};
		isNewFaculty = isNew;
		showModal = true;
	}

	function handleKeydown(
		event: KeyboardEvent,
		faculty: FacultyData | null,
		isNew: boolean = false
	) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openFacultyModal(faculty, isNew);
		}
	}

	async function saveFaculty() {
		if (!selectedFaculty) return;
		if (isNewFaculty && !selectedFaculty.fac_discipline) {
			alert('Please select a Discipline before saving.');
			return;
		}
		try {
			const response = await fetch('/api/faculty', {
				method: isNewFaculty ? 'POST' : 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(selectedFaculty)
			});
			if (!response.ok) throw new Error('Failed to save faculty');
			showModal = false;
			selectedFaculty = null;
			await Promise.all([fetchFaculty(), fetchNonMatchedFaculty()]);
		} catch (err) {
			error = 'Failed to save faculty';
			console.error(err);
		}
	}
	async function downloadExcel() {
		const res = await fetch('/api/faculty/excel_download');
		if (res.ok) {
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'aacsb_faculty_list.xlsx';
			a.click();
		}
	}
	onMount(() => {
		fetchDisciplines();
		fetchFaculty();
		fetchNonMatchedFaculty();
	});
</script>

<div class="container mx-auto p-6">
	<h1 class="mb-6 text-3xl font-bold text-gray-800">AACSB Faculty List</h1>
	{#if isLoading}
		<p class="text-lg text-gray-500">Loading...</p>
	{:else if error}
		<p class="text-lg text-red-500">{error}</p>
	{:else}
		{#each ['Undergraduate', 'Graduate', 'IndustrialConvergence'] as level}
			<h2 class="mt-8 mb-4 text-2xl font-semibold text-blue-700">{level}</h2>
			{#each disciplines.filter((d) => d.level === level) as discipline}
				<h3 class="mt-6 mb-3 border-l-4 border-blue-500 pl-2 text-xl font-medium text-gray-700">
					{discipline.name}
				</h3>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
					{#each facultyData.filter((f) => f.fac_discipline === discipline.code) as faculty}
						<div
							role="button"
							tabindex="0"
							class="flex cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg"
							on:click={() => openFacultyModal(faculty)}
							on:keydown={(e) => handleKeydown(e, faculty)}
						>
							<div class="flex w-1/3 items-center">
								<h4 class="text-lg font-semibold text-gray-800">{faculty.name}</h4>
							</div>
							<div class="flex w-2/3 flex-col justify-center">
								<p class="text-sm text-gray-600">{faculty.fac_name || 'N/A'}</p>
								<p class="text-sm text-gray-500">
									{faculty.college}
									{faculty.department || faculty.college}
									{faculty.job_rank || 'N/A'}
									{faculty.highest_degree || 'N/A'} ({faculty.highest_degree_year ?? 'N/A'}) {faculty.fac_ccataacsb ||
										'N/A'}
									{faculty.fac_cqualaacsb2013 || 'N/A'}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/each}
		{/each}

		{#if nonMatchedFaculty.length > 0}
			<h2 class="mt-12 mb-4 text-2xl font-semibold text-blue-700">Non-Matched Faculty</h2>
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
				{#each nonMatchedFaculty as faculty}
					<div
						role="button"
						tabindex="0"
						class="flex cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg"
						on:click={() =>
							openFacultyModal(
								{
									user_id: faculty.user_id,
									name: faculty.name,
									fac_name: faculty.english_name || '',
									college: faculty.college,
									department: faculty.department,
									specialty_field1: '',
									specialty_field2: '',
									normal_professional_responsibilities: '',
									fac_discipline: '',
									fac_time: 0,
									fac_ccataacsb: '',
									fac_cqualaacsb2013: '',
									full_time_equivalent: false,
									job_type: faculty.job_type,
									job_rank: faculty.job_rank,
									highest_degree: faculty.highest_degree,
									highest_degree_year: faculty.highest_degree_year
								},
								true
							)}
						on:keydown={(e) =>
							handleKeydown(
								e,
								{
									user_id: faculty.user_id,
									name: faculty.name,
									fac_name: faculty.english_name || '',
									college: faculty.college,
									department: faculty.department,
									specialty_field1: '',
									specialty_field2: '',
									normal_professional_responsibilities: '',
									fac_discipline: '',
									fac_time: 0,
									fac_ccataacsb: '',
									fac_cqualaacsb2013: '',
									full_time_equivalent: false,
									job_type: faculty.job_type,
									job_rank: faculty.job_rank,
									highest_degree: faculty.highest_degree,
									highest_degree_year: faculty.highest_degree_year
								},
								true
							)}
					>
						<div class="flex w-1/3 items-center">
							<h4 class="text-lg font-semibold text-gray-800">{faculty.name}</h4>
						</div>
						<div class="flex w-2/3 flex-col justify-center">
							<p class="text-sm text-gray-600">{faculty.english_name || 'N/A'}</p>
							<p class="text-sm text-gray-500">
								{faculty.college}
								{faculty.department}
								{faculty.job_rank || 'N/A'}
								{faculty.highest_degree || 'N/A'} ({faculty.highest_degree_year ?? 'N/A'})
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
		<div class="actions">
			<button on:click={downloadExcel} disabled={isLoading}> Excel 다운로드 </button>
		</div>
	{/if}

	{#if showModal}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="w-full max-w-md rounded-lg bg-white p-6">
				<h2 class="mb-4 text-2xl font-semibold">{isNewFaculty ? 'Add Faculty' : 'Edit Faculty'}</h2>
				{#if selectedFaculty}
					<form on:submit|preventDefault={saveFaculty} class="grid grid-cols-2 gap-4">
						<label for="name" class="col-span-1 text-sm font-medium text-gray-700">Name</label>
						<p id="name" class="col-span-1 font-semibold text-gray-900">{selectedFaculty.name}</p>
						<label for="fac_name" class="col-span-1 text-sm font-medium text-gray-700"
							>English Name</label
						>
						<input
							id="fac_name"
							type="text"
							bind:value={selectedFaculty.fac_name}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
						/>
						<label for="specialty_field1" class="col-span-1 text-sm font-medium text-gray-700"
							>Specialty Field 1</label
						>
						<input
							id="specialty_field1"
							type="text"
							bind:value={selectedFaculty.specialty_field1}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
						/>
						<label for="specialty_field2" class="col-span-1 text-sm font-medium text-gray-700"
							>Specialty Field 2</label
						>
						<input
							id="specialty_field2"
							type="text"
							bind:value={selectedFaculty.specialty_field2}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
						/>
						<label
							for="normal_professional_responsibilities"
							class="col-span-1 text-sm font-medium text-gray-700"
							>Normal Professional Responsibilities</label
						>
						<textarea
							id="normal_professional_responsibilities"
							bind:value={selectedFaculty.normal_professional_responsibilities}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
						></textarea>
						<label for="fac_discipline" class="col-span-1 text-sm font-medium text-gray-700"
							>Discipline</label
						>
						<select
							id="fac_discipline"
							bind:value={selectedFaculty.fac_discipline}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
							required
						>
							<option value="" disabled selected>Select a discipline</option>
							{#each disciplines as discipline}
								<option value={discipline.code}>{discipline.name}</option>
							{/each}
						</select>
						<label for="fac_time" class="col-span-1 text-sm font-medium text-gray-700"
							>Faculty Time</label
						>
						<input
							id="fac_time"
							type="number"
							step="0.01"
							bind:value={selectedFaculty.fac_time}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
						/>
						<label for="fac_ccataacsb" class="col-span-1 text-sm font-medium text-gray-700"
							>CCAT AACSB</label
						>
						<input
							id="fac_ccataacsb"
							type="text"
							bind:value={selectedFaculty.fac_ccataacsb}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
						/>
						<label for="fac_cqualaacsb2013" class="col-span-1 text-sm font-medium text-gray-700"
							>CQUAL AACSB 2013</label
						>
						<input
							id="fac_cqualaacsb2013"
							type="text"
							bind:value={selectedFaculty.fac_cqualaacsb2013}
							class="col-span-1 w-full rounded-md border-gray-300 shadow-sm"
						/>
						<label for="full_time_equivalent" class="col-span-1 text-sm font-medium text-gray-700"
							>Full Time Equivalent</label
						>
						<input
							id="full_time_equivalent"
							type="checkbox"
							bind:checked={selectedFaculty.full_time_equivalent}
							class="col-span-1"
						/>
						<div class="col-span-2 mt-4 flex justify-end gap-4">
							<button
								type="button"
								class="rounded-md bg-gray-300 px-4 py-2"
								on:click={() => (showModal = false)}>Cancel</button
							>
							<button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-white">Save</button
							>
						</div>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* 기존 스타일에 추가 */
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
