<!-- src/routes/intellcectual_contribution/+page.svlete -->
<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import type {
		ResearchOutput,
		ResearchClassification,
		BooleanKeys,
		Faculty
	} from '$lib/types/research';

	export let data: {
		researchOutputs: (ResearchOutput & ResearchClassification)[];
		selectedFaculty: Faculty | null;
		facultyList: Faculty[];
	};

	let searchQuery = $auth.isAdmin ? '' : $auth.id_no || '';
	let selectedYear = '2025';
	let researchOutputs: (ResearchOutput & ResearchClassification)[] = data.researchOutputs;
	let selectedFaculty: Faculty | null = data.selectedFaculty;
	let facultyList: Faculty[] = data.facultyList;
	let activeTab: string = '논문';
	let editingOutput: (ResearchOutput & ResearchClassification) | null = null;
	let editEnglishTitle = '';
	let editEnglishJournal = '';
	let addingOutput = false;
	let modifyingOutput: (ResearchOutput & ResearchClassification) | null = null;
	let deletingOutput: (ResearchOutput & ResearchClassification) | null = null;
	let addTitle = '';
	let addJournalName = '';
  let addPublisher = '';
	let addPublishedAt = '';
	let modifyTitle = '';
	let modifyJournalName = '';
  let modifyPublisher = '';
	let modifyPublishedAt = '';
	let editDialogRef: HTMLDivElement | null = null;
	let facultyDialogRef: HTMLDivElement | null = null;
	let addDialogRef: HTMLDivElement | null = null;
	let modifyDialogRef: HTMLDivElement | null = null;
	let deleteDialogRef: HTMLDivElement | null = null;

	const getTypeLabel = (type: string | null | undefined) => {
		if (!type) return '';

		const typeLabels: Record<string, string> = {
			논문: '논문',
			저서: '저서',
			학술발표: '학술활동',
			연구비수혜: '연구비',
			기타: '기타'
		};

		return typeLabels[type] || type;
	};

	function isKorean(text: string): boolean {
		return /[\uAC00-\uD7AF]/.test(text);
	}

	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		return date.toISOString().split('T')[0];
	}

	function formatDateKST(isoDate: string): string {
		const date = new Date(isoDate);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	async function fetchResearchOutputs() {
		if (!$auth.isLoggedIn) {
			researchOutputs = [];
			selectedFaculty = null;
			facultyList = [];
			return;
		}

		const params = new URLSearchParams();
		if ($auth.isAdmin) {
			if (searchQuery) params.append('searchQuery', searchQuery);
		} else {
			params.append('searchQuery', $auth.id_no || '');
		}
		if (selectedYear) params.append('year', selectedYear);

		const response = await fetch(`/api/intellectual_contribution?${params}`, {
			credentials: 'include'
		});
		if (response.ok) {
			const data = await response.json();
			if (data.facultyList) {
				facultyList = $auth.isAdmin ? data.facultyList : [];
				researchOutputs = [];
				selectedFaculty = null;
			} else {
				facultyList = [];
				selectedFaculty = data.faculty;
				researchOutputs = data.researchOutputs;
			}
		} else {
			console.error('Failed to fetch data:', await response.json());
			researchOutputs = [];
			selectedFaculty = null;
			facultyList = [];
		}
	}

	function selectFaculty(faculty: Faculty) {
		if (!$auth.isAdmin) return;
		selectedFaculty = faculty;
		searchQuery = faculty.user_id;
		facultyList = [];
		fetchResearchOutputs();
	}

	async function updateClassification(research_id: number, field: BooleanKeys, value: boolean) {
		const classification = researchOutputs.find((r) => r.research_id === research_id);
		if (!classification) return;

		const researchTypeFields: BooleanKeys[] = ['is_basic', 'is_applied', 'is_teaching'];
		const contributionTypeFields: BooleanKeys[] = [
			'is_peer_journal',
			'is_other_reviewed',
			'is_other_nonreviewed'
		];

		const updateData: ResearchClassification = {
			fac_nip: classification.fac_nip,
			research_id,
			is_basic: classification.is_basic ?? false,
			is_applied: classification.is_applied ?? false,
			is_teaching: classification.is_teaching ?? false,
			is_peer_journal: classification.is_peer_journal ?? false,
			is_other_reviewed: classification.is_other_reviewed ?? false,
			is_other_nonreviewed: classification.is_other_nonreviewed ?? false,
			created_at: classification.created_at,
			updated_at: classification.updated_at
		};

		if (researchTypeFields.includes(field)) {
			updateData[field] = value;
			researchTypeFields.forEach((f) => {
				if (f !== field) updateData[f] = false;
			});
		} else if (contributionTypeFields.includes(field)) {
			updateData[field] = value;
			contributionTypeFields.forEach((f) => {
				if (f !== field) updateData[f] = false;
			});
		}

		try {
			const response = await fetch('/api/classifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData)
			});
			if (!response.ok) throw new Error('Failed to update classification');
			researchOutputs = researchOutputs.map((r) =>
				r.research_id === research_id ? { ...r, ...updateData } : r
			);
		} catch (error) {
			console.error('Error updating classification:', error);
		}
	}

	function openEditPopup(output: ResearchOutput & ResearchClassification) {
		editingOutput = output;
		editEnglishTitle = output.english_title ?? '';
		editEnglishJournal = output.english_journal ?? '';
	}

	async function saveEdit() {
		if (!editingOutput) return;

		try {
			const response = await fetch('/api/intellectual_contribution', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					research_id: editingOutput!.research_id,
					english_title: editEnglishTitle || null,
					english_journal: editEnglishJournal || null
				})
			});
			if (!response.ok) throw new Error('Failed to update');
			researchOutputs = researchOutputs.map((r) =>
				r.research_id === editingOutput!.research_id
					? {
							...r,
							english_title: editEnglishTitle || null,
							english_journal: editEnglishJournal || null
						}
					: r
			);
			editingOutput = null;
		} catch (error) {
			console.error('Error saving edit:', error);
			alert('수정 저장에 실패했습니다.');
		}
	}

	function openAddPopup() {
		if (!selectedFaculty) return;
		addingOutput = true;
		addTitle = '';
		addJournalName = '';
    addPublisher = '';
		addPublishedAt = '';
	}

	async function saveAdd() {
		if (!selectedFaculty) return;

		try {
			const response = await fetch('/api/intellectual_contribution', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fac_nip: selectedFaculty.user_id,
					title: addTitle,
					journal_name: addJournalName || null,
          publisher : addPublisher,
					published_at: addPublishedAt,
					type: activeTab
				})
			});
			if (!response.ok) throw new Error('Failed to add');
			const newOutput = await response.json();
			researchOutputs = [
				{
					...newOutput,
					is_basic: false,
					is_applied: false,
					is_teaching: false,
					is_peer_journal: false,
					is_other_reviewed: false,
					is_other_nonreviewed: false
				},
				...researchOutputs
			];
			addingOutput = false;
		} catch (error) {
			console.error('Error adding output:', error);
			alert('추가에 실패했습니다.');
		}
	}

	function openModifyPopup(output: ResearchOutput & ResearchClassification) {
		modifyingOutput = output;
		modifyTitle = output.title;
		modifyJournalName = output.journal_name ?? '';
    modifyPublisher = output.publisher ?? '';
		modifyPublishedAt = output.published_at;
	}

	async function saveModify() {
		if (!modifyingOutput) return;

		try {
			const response = await fetch('/api/intellectual_contribution', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					research_id: modifyingOutput.research_id,
					title: modifyTitle,
					journal_name: modifyJournalName || null,
          publisher: modifyPublisher || null,
					published_at: modifyPublishedAt
				})
			});
			if (!response.ok) throw new Error('Failed to update');
			const updatedOutput = await response.json();
			researchOutputs = researchOutputs.map((r) =>
				r.research_id === modifyingOutput!.research_id ? { ...r, ...updatedOutput } : r
			);
			modifyingOutput = null;
		} catch (error) {
			console.error('Error modifying output:', error);
			alert('수정에 실패했습니다.');
		}
	}

	function openDeletePopup(output: ResearchOutput & ResearchClassification) {
		deletingOutput = output;
	}

	async function confirmDelete() {
		if (!deletingOutput) return;

		try {
			const response = await fetch('/api/intellectual_contribution', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ research_id: deletingOutput.research_id })
			});
			if (!response.ok) throw new Error('Failed to delete');
			researchOutputs = researchOutputs.filter(
				(r) => r.research_id !== deletingOutput!.research_id
			);
			deletingOutput = null;
		} catch (error) {
			console.error('Error deleting output:', error);
			alert('삭제에 실패했습니다.');
		}
	}

	function closeEditPopup() {
		editingOutput = null;
	}

	function closeFacultyPopup() {
		facultyList = [];
	}

	function closeAddPopup() {
		addingOutput = false;
	}

	function closeModifyPopup() {
		modifyingOutput = null;
	}

	function closeDeletePopup() {
		deletingOutput = null;
	}

	function trapFocus(dialog: HTMLDivElement | null, isOpen: boolean) {
		if (!dialog || !isOpen) return;
		const focusableElements = dialog.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		) as NodeListOf<HTMLElement>;
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		dialog.addEventListener('keydown', (e) => {
			if (e.key === 'Tab') {
				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						e.preventDefault();
						lastElement.focus();
					}
				} else {
					if (document.activeElement === lastElement) {
						e.preventDefault();
						firstElement.focus();
					}
				}
			}
		});

		if (firstElement) firstElement.focus();
	}

	$: trapFocus(editDialogRef, !!editingOutput);
	$: trapFocus(facultyDialogRef, facultyList.length > 0);
	$: trapFocus(addDialogRef, addingOutput);
	$: trapFocus(modifyDialogRef, !!modifyingOutput);
	$: trapFocus(deleteDialogRef, !!deletingOutput);

	$: if ($auth.isAdmin) {
		// 관리자는 검색 쿼리 변경 시 클라이언트에서 데이터를 다시 로드
		fetchResearchOutputs();
	}
</script>

<div class="mb-4">
	<h2 class="text-xl font-semibold">연구성과 조회</h2>
	<div class="mt-2 flex gap-4">
		<div>
			{#if $auth.isAdmin}
				<label for="searchQuery" class="mr-2">ID/성명:</label>
				<input
					id="searchQuery"
					type="text"
					bind:value={searchQuery}
					on:input={fetchResearchOutputs}
					class="rounded border p-2"
					placeholder="ID 또는 성명 입력"
				/>
			{:else}
				<label for="searchQuery" class="mr-2">ID:</label>
				<input
					id="searchQuery"
					type="text"
					value={$auth.id_no || ''}
					disabled
					class="rounded border bg-gray-100 p-2"
				/>
			{/if}
		</div>
		<div>
			<label for="year" class="mr-2">연도:</label>
			{#each ['2019', '2020', '2021', '2022', '2023', '2024', '2025'] as year}
				<button
					class:bg-blue-500={selectedYear === year}
					class:bg-gray-200={selectedYear !== year}
					class="mr-2 rounded px-4 py-2 text-white"
					on:click={() => {
						selectedYear = year;
						fetchResearchOutputs();
					}}
				>
					{year}
				</button>
			{/each}
		</div>
	</div>
</div>

<!-- {#if selectedFaculty}

{/if} -->

<div class="mb-4 flex items-center justify-between">
	{#if selectedFaculty}
		<div class="mb-4 rounded bg-gray-100 p-3 text-base text-gray-700">
			<span>{selectedFaculty.name ?? '-'}</span>
			<span>{selectedFaculty.college ?? '-'}</span>
			<span>{selectedFaculty.department ?? '-'}</span>
			<span>{selectedFaculty.job_rank ?? '-'}</span>
			<span
				>{selectedFaculty.highest_degree ?? '-'}({selectedFaculty.highest_degree_year ?? '-'})</span
			>
		</div>
		<div class="flex gap-2">
			<button
				class="rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
				on:click={openAddPopup}
				aria-label="Add new research output"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			</button>
		</div>
	{/if}
</div>

<table class="w-full border-collapse border text-sm">
	<thead>
		<tr class="bg-gray-200">
			<th class="w-18 border p-2">Type</th>
			<th class="border p-2">Title</th>
			<th class="w-25 border p-2">Publisher</th>
			<th class="w-25 border p-2 break-words whitespace-normal">Publication<br />Date</th>
			<th class="w-25 border p-2 break-words whitespace-normal">Journal</th>
			<th class="w-50 border p-2 break-words whitespace-normal">Portfolio of<br />Intellectual</th>
			<th class="w-50 border p-2 break-words whitespace-normal"
				>Types of Intellectual<br />Contributions</th
			>
			<th class="w-20 border p-2">Actions</th>
		</tr>
	</thead>
	<tbody>
		{#if researchOutputs.length === 0 && selectedFaculty}
			<tr>
				<td colspan="8" class="border p-4 text-center text-gray-500">
					해당 탭에 데이터가 없습니다.
				</td>
			</tr>
		{:else}
			{#each researchOutputs as output}
				<tr>
					<td class="border p-2">{getTypeLabel(output.type)}</td>
					<td class="border p-2">
						{output.english_title || output.title}
						{#if output.english_title && isKorean(output.title)}
							<span class="text-sm text-gray-500"> ({output.title})</span>
						{/if}
						{#if output.doi}
							<a
								href={`https://doi.org/${output.doi}`}
								target="_blank"
								class="text-blue-500 hover:underline"
							>
								[DOI]
							</a>
						{/if}
						{#if isKorean(output.title)}
							<button
								class="ml-2 text-blue-500 hover:text-blue-700"
								on:click={() => openEditPopup(output)}
								aria-label="add english title"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
									/>
								</svg>
							</button>
						{/if}
					</td>
					<td class="border p-2">{output.publisher || '-'}</td>
					<td class="border p-2">{formatDateKST(output.published_at)}</td>
					<td class="border p-2">
						{output.english_journal || output.journal_name || '-'}
						{#if output.english_journal && isKorean(output.journal_name ?? '')}
							<span class="text-sm text-gray-500"> ({output.journal_name})</span>
						{/if}
					</td>
					<td class="border p-2">
						<label class="mr-2 inline-flex items-center">
							<input
								type="radio"
								name={`research_type_${output.research_id}`}
								checked={output.is_basic}
								on:change={() => updateClassification(output.research_id, 'is_basic', true)}
							/>
							<span class="ml-1">Basic Scholarship</span>
						</label>
						<label class="mr-2 inline-flex items-center">
							<input
								type="radio"
								name={`research_type_${output.research_id}`}
								checked={output.is_applied}
								on:change={() => updateClassification(output.research_id, 'is_applied', true)}
							/>
							<span class="ml-1">Applied Scholarship</span>
						</label>
						<label class="inline-flex items-center">
							<input
								type="radio"
								name={`research_type_${output.research_id}`}
								checked={output.is_teaching}
								on:change={() => updateClassification(output.research_id, 'is_teaching', true)}
							/>
							<span class="ml-1">Teaching Scholarship</span>
						</label>
					</td>
					<td class="border p-2">
						<label class="mr-2 inline-flex items-center">
							<input
								type="radio"
								name={`contribution_type_${output.research_id}`}
								checked={output.is_peer_journal}
								on:change={() => updateClassification(output.research_id, 'is_peer_journal', true)}
							/>
							<span class="ml-1">Peer reviewed Journal</span>
						</label>
						<label class="mr-2 inline-flex items-center">
							<input
								type="radio"
								name={`contribution_type_${output.research_id}`}
								checked={output.is_other_reviewed}
								on:change={() =>
									updateClassification(output.research_id, 'is_other_reviewed', true)}
							/>
							<span class="ml-1">Other reviewed Journal</span>
						</label>
						<label class="inline-flex items-center">
							<input
								type="radio"
								name={`contribution_type_${output.research_id}`}
								checked={output.is_other_nonreviewed}
								on:change={() =>
									updateClassification(output.research_id, 'is_other_nonreviewed', true)}
							/>
							<span class="ml-1">Other Nonreviewed</span>
						</label>
					</td>
					<td class="border p-2">
						{#if output.data_source === 'manual'}
							<button
								class="mr-2 text-yellow-500 hover:text-yellow-600"
								on:click={() => openModifyPopup(output)}
								aria-label="Modify research output"
							>
								<svg class="inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</button>
							<button
								class="text-red-500 hover:text-red-600"
								on:click={() => openDeletePopup(output)}
								aria-label="Delete research output"
							>
								<svg class="inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M20 12H4"
									/>
								</svg>
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		{/if}
	</tbody>
</table>

{#if facultyList.length > 0 && $auth.isAdmin}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		aria-labelledby="facultyModalTitle"
	>
		<div
			bind:this={facultyDialogRef}
			class="w-[600px] rounded-lg bg-white p-6 shadow-lg"
			on:keydown={(e) => e.key === 'Escape' && closeFacultyPopup()}
			tabindex="-1"
			role="dialog"
			aria-labelledby="facultyModalTitle"
		>
			<h3 id="facultyModalTitle" class="mb-4 text-lg font-semibold">동명이인 선택</h3>
			<table class="w-full border-collapse border text-sm">
				<thead>
					<tr class="bg-gray-200">
						<th class="border p-2">ID</th>
						<th class="border p-2">성명</th>
						<th class="border p-2">단과대학</th>
						<th class="border p-2">학과</th>
						<th class="border p-2">직무유형</th>
						<th class="border p-2">직급</th>
						<th class="border p-2">최종학위</th>
						<th class="border p-2">선택</th>
					</tr>
				</thead>
				<tbody>
					{#each facultyList as faculty}
						<tr>
							<td class="border p-2">{faculty.user_id}</td>
							<td class="border p-2">{faculty.name ?? '-'}</td>
							<td class="border p-2">{faculty.college ?? '-'}</td>
							<td class="border p-2">{faculty.department ?? '-'}</td>
							<td class="border p-2">{faculty.job_type ?? '-'}</td>
							<td class="border p-2">{faculty.job_rank ?? '-'}</td>
							<td class="border p-2">{faculty.highest_degree ?? '-'}</td>
							<td class="border p-2">
								<button
									class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
									on:click={() => selectFaculty(faculty)}
								>
									선택
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="mt-4 flex justify-end">
				<button
					class="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
					on:click={closeFacultyPopup}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

{#if editingOutput}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		aria-labelledby="editModalTitle"
	>
		<div
			bind:this={editDialogRef}
			class="w-96 rounded-lg bg-white p-6 shadow-lg"
			on:keydown={(e) => e.key === 'Escape' && closeEditPopup()}
			tabindex="-1"
			role="dialog"
			aria-labelledby="editModalTitle"
		>
			<h3 id="editModalTitle" class="mb-4 text-lg font-semibold">Edit English Title and Journal</h3>
			<div class="mb-4">
				<label for="editEnglishTitle" class="mb-1 block">English Title:</label>
				<input
					id="editEnglishTitle"
					type="text"
					bind:value={editEnglishTitle}
					class="w-full rounded border p-2"
					placeholder="Enter English title"
				/>
				{#if isKorean(editingOutput!.title)}
					<p class="mt-1 text-sm text-gray-500">Korean Title: {editingOutput!.title}</p>
				{/if}
			</div>
			<div class="mb-4">
				<label for="editEnglishJournal" class="mb-1 block">English Journal:</label>
				<input
					id="editEnglishJournal"
					type="text"
					bind:value={editEnglishJournal}
					class="w-full rounded border p-2"
					placeholder="Enter English journal"
				/>
				{#if isKorean(editingOutput!.journal_name ?? '')}
					<p class="mt-1 text-sm text-gray-500">Korean Journal: {editingOutput!.journal_name}</p>
				{/if}
			</div>
			<div class="flex justify-end gap-2">
				<button class="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400" on:click={closeEditPopup}>
					Cancel
				</button>
				<button
					class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
					on:click={saveEdit}
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

{#if addingOutput}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		aria-labelledby="addModalTitle"
	>
		<div
			bind:this={addDialogRef}
			class="w-96 rounded-lg bg-white p-6 shadow-lg"
			on:keydown={(e) => e.key === 'Escape' && closeAddPopup()}
			tabindex="-1"
			role="dialog"
			aria-labelledby="addModalTitle"
		>
			<h3 id="addModalTitle" class="mb-4 text-lg font-semibold">Add Research Output</h3>
			<div class="mb-4">
				<label for="addTitle" class="mb-1 block">Title:</label>
				<input
					id="addTitle"
					type="text"
					bind:value={addTitle}
					class="w-full rounded border p-2"
					placeholder="Enter title"
				/>
			</div>
			<div class="mb-4">
				<label for="addJournalName" class="mb-1 block">Journal Name:</label>
				<input
					id="addJournalName"
					type="text"
					bind:value={addJournalName}
					class="w-full rounded border p-2"
					placeholder="Enter journal name"
				/>
			</div>
      <div class="mb-4">
				<label for="addPublisher" class="mb-1 block">Publisher:</label>
				<input
					id="addPublisher"
					type="text"
					bind:value={addPublisher}
					class="w-full rounded border p-2"
					placeholder="Enter Publisher"
				/>
			</div>
			<div class="mb-4">
				<label for="addPublishedAt" class="mb-1 block">Publication Date:</label>
				<input
					id="addPublishedAt"
					type="date"
					bind:value={addPublishedAt}
					class="w-full rounded border p-2"
				/>
			</div>
			<div class="flex justify-end gap-2">
				<button class="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400" on:click={closeAddPopup}>
					Cancel
				</button>
				<button
					class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
					on:click={saveAdd}
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

{#if modifyingOutput}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modifyModalTitle"
	>
		<div
			bind:this={modifyDialogRef}
			class="w-96 rounded-lg bg-white p-6 shadow-lg"
			on:keydown={(e) => e.key === 'Escape' && closeModifyPopup()}
			tabindex="-1"
			role="dialog"
			aria-labelledby="modifyModalTitle"
		>
			<h3 id="modifyModalTitle" class="mb-4 text-lg font-semibold">Modify Research Output</h3>
			<div class="mb-4">
				<label for="modifyTitle" class="mb-1 block">Title:</label>
				<input
					id="modifyTitle"
					type="text"
					bind:value={modifyTitle}
					class="w-full rounded border p-2"
					placeholder="Enter title"
				/>
			</div>
			<div class="mb-4">
				<label for="modifyJournalName" class="mb-1 block">Journal Name:</label>
				<input
					id="modifyJournalName"
					type="text"
					bind:value={modifyJournalName}
					class="w-full rounded border p-2"
					placeholder="Enter journal name"
				/>
			</div>
      <div class="mb-4">
				<label for="modifyPublisher" class="mb-1 block">Publisher:</label>
				<input
					id="modifyPublisher"
					type="text"
					bind:value={modifyPublisher}
					class="w-full rounded border p-2"
          placeholder="Enter Publisher"
				/>
			</div>
			<div class="mb-4">
				<label for="modifyPublishedAt" class="mb-1 block">Publication Date:</label>
				<input
					id="modifyPublishedAt"
					type="date"
					bind:value={modifyPublishedAt}
					class="w-full rounded border p-2"
				/>
			</div>
			<div class="flex justify-end gap-2">
				<button class="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400" on:click={closeModifyPopup}>
					Cancel
				</button>
				<button
					class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
					on:click={saveModify}
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

{#if deletingOutput}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		role="dialog"
		aria-modal="true"
		aria-labelledby="deleteModalTitle"
	>
		<div
			bind:this={deleteDialogRef}
			class="w-96 rounded-lg bg-white p-6 shadow-lg"
			on:keydown={(e) => e.key === 'Escape' && closeDeletePopup()}
			tabindex="-1"
			role="dialog"
			aria-labelledby="deleteModalTitle"
		>
			<h3 id="deleteModalTitle" class="mb-4 text-lg font-semibold">Delete Research Output</h3>
			<p class="mb-4">Are you sure you want to delete "{deletingOutput.title}"?</p>
			<div class="flex justify-end gap-2">
				<button class="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400" on:click={closeDeletePopup}>
					Cancel
				</button>
				<button
					class="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
					on:click={confirmDelete}
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
