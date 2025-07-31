<!-- src/routes/intellcectual_contribution/+page.svlete -->
<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import type { ResearchOutput, ResearchClassification, BooleanKeys, Faculty } from '$lib/types/research';

  let searchQuery = '';
  let selectedYear = '2025';
  let researchOutputs: (ResearchOutput & ResearchClassification)[] = [];
  let selectedFaculty: Faculty | null = null;
  let facultyList: Faculty[] = [];
  let activeTab: string = '논문';
  let editingOutput: (ResearchOutput & ResearchClassification) | null = null;
  let editEnglishTitle = '';
  let editEnglishJournal = '';
  let addingOutput = false;
  let modifyingOutput: (ResearchOutput & ResearchClassification) | null = null;
  let deletingOutput: (ResearchOutput & ResearchClassification) | null = null;
  let addTitle = '';
  let addJournalName = '';
  let addPublishedAt = '';
  let modifyTitle = '';
  let modifyJournalName = '';
  let modifyPublishedAt = '';
  let editDialogRef: HTMLDivElement | null = null;
  let facultyDialogRef: HTMLDivElement | null = null;
  let addDialogRef: HTMLDivElement | null = null;
  let modifyDialogRef: HTMLDivElement | null = null;
  let deleteDialogRef: HTMLDivElement | null = null;

  const tabs = [
    { key: '논문', label: '논문' },
    { key: '저서', label: '저서' },
    { key: '학술발표', label: '학술활동' },
    { key: '연구비수혜', label: '연구비' },
    { key: '기타', label: '기타' }
  ];

  function isKorean(text: string): boolean {
    return /[\uAC00-\uD7AF]/.test(text);
  }

  $: filteredOutputs = researchOutputs.filter(output => {
    if (activeTab === '기타') {
      return !['논문', '저서', '학술발표', '연구비수혜'].includes(output.type ?? '');
    }
    return output.type === activeTab;
  });

  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0];
  }
  function formatDateKST(isoDate: string): string {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth()는 0부터 시작
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function fetchResearchOutputs() {
    if (!searchQuery) {
      researchOutputs = [];
      selectedFaculty = null;
      facultyList = [];
      return;
    }

    const params = new URLSearchParams({ searchQuery });
    if (selectedYear) params.append('year', selectedYear);
    const response = await fetch(`/api/intellectual_contribution?${params}`);
    if (response.ok) {
      const data = await response.json();
      if (data.facultyList) {
        facultyList = data.facultyList;
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
    selectedFaculty = faculty;
    searchQuery = faculty.user_id;
    facultyList = [];
    fetchResearchOutputs();
  }

  async function updateClassification(research_id: number, field: BooleanKeys, value: boolean) {
    const classification = researchOutputs.find(r => r.research_id === research_id);
    if (!classification) return;

    const researchTypeFields: BooleanKeys[] = ['is_basic', 'is_applied', 'is_teaching'];
    const contributionTypeFields: BooleanKeys[] = ['is_peer_journal', 'is_other_reviewed', 'is_other_nonreviewed'];

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
      researchTypeFields.forEach(f => { if (f !== field) updateData[f] = false; });
    } else if (contributionTypeFields.includes(field)) {
      updateData[field] = value;
      contributionTypeFields.forEach(f => { if (f !== field) updateData[f] = false; });
    }

    try {
      const response = await fetch('/api/classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) throw new Error('Failed to update classification');
      researchOutputs = researchOutputs.map(r =>
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
      researchOutputs = researchOutputs.map(r =>
        r.research_id === editingOutput!.research_id
          ? { ...r, english_title: editEnglishTitle || null, english_journal: editEnglishJournal || null }
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
          published_at: addPublishedAt,
          type: activeTab
        })
      });
      if (!response.ok) throw new Error('Failed to add');
      const newOutput = await response.json();
      researchOutputs = [
        { ...newOutput, is_basic: false, is_applied: false, is_teaching: false, is_peer_journal: false, is_other_reviewed: false, is_other_nonreviewed: false },
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
          published_at: modifyPublishedAt
        })
      });
      if (!response.ok) throw new Error('Failed to update');
      const updatedOutput = await response.json();
      researchOutputs = researchOutputs.map(r =>
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
      researchOutputs = researchOutputs.filter(r => r.research_id !== deletingOutput!.research_id);
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

  onMount(fetchResearchOutputs);
</script>

<div class="mb-4">
  <h2 class="text-xl font-semibold">연구성과 조회</h2>
  <div class="mt-2 flex gap-4">
    <div>
      <label for="searchQuery" class="mr-2">ID/성명:</label>
      <input
        id="searchQuery"
        type="text"
        bind:value={searchQuery}
        on:input={fetchResearchOutputs}
        class="border p-2 rounded"
        placeholder="ID 또는 성명 입력"
      />
    </div>
    <div>
      <label for="year" class="mr-2">연도:</label>
      {#each ['2023', '2024', '2025'] as year}
        <button
          class:bg-blue-500={selectedYear === year}
          class:bg-gray-200={selectedYear !== year}
          class="px-4 py-2 rounded mr-2 text-white"
          on:click={() => { selectedYear = year; fetchResearchOutputs(); }}
        >
          {year}
        </button>
      {/each}
    </div>
  </div>
</div>

{#if selectedFaculty}
  <div class="mb-4 bg-gray-100 p-3 rounded text-base text-gray-700">
    <!-- <span>{selectedFaculty.user_id}</span>  -->
    <span>{selectedFaculty.name ?? '-'}</span> 
    <span>{selectedFaculty.college ?? '-'}</span> 
    <span>{selectedFaculty.department ?? '-'}</span> 
    <span>{selectedFaculty.job_rank ?? '-'}</span> 
    <span>{selectedFaculty.highest_degree ?? '-'}({selectedFaculty.highest_degree_year ?? '-'})</span>
  </div>
{/if}

<div class="mb-4 flex justify-between items-center">
  <div class="flex border-b">
    {#each tabs as tab}
      <button
        class="px-4 py-2 text-sm font-medium transition-colors duration-200"
        class:text-blue-600={activeTab === tab.key}
        class:border-b-2={activeTab === tab.key}
        class:border-blue-600={activeTab === tab.key}
        class:hover:text-blue-500={activeTab !== tab.key}
        on:click={() => activeTab = tab.key}
      >
        {tab.label}
      </button>
    {/each}
  </div>
  {#if selectedFaculty}
    <div class="flex gap-2">
      <button
        class="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        on:click={openAddPopup}
        aria-label="Add new research output"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  {/if}
</div>


  <table class="w-full border-collapse border text-sm">
    <thead>
      <tr class="bg-gray-200">
        <th class="border p-2">Title</th>
        <th class="border p-2 w-25 whitespace-normal break-words">Publication<br />Date</th>
        <th class="border p-2 w-58 whitespace-normal break-words">Journal</th>
        <th class="border p-2 w-50 whitespace-normal break-words">Portfolio of<br />Intellectual</th>
        <th class="border p-2 w-50 whitespace-normal break-words">Types of Intellectual<br />Contributions</th>
        <th class="border p-2 w-20">Actions</th>
      </tr>
    </thead>
    <tbody>
          {#if filteredOutputs.length === 0 && selectedFaculty}
      <tr>
        <td colspan="6" class="border p-4 text-center text-gray-500">
          해당 탭에 데이터가 없습니다.
        </td>
      </tr>
    {:else}
      {#each filteredOutputs as output}
        <tr>
          <td class="border p-2">
            {output.english_title || output.title}            
            {#if output.english_title && isKorean(output.title)}
              <span class="text-gray-500 text-sm"> ({output.title})</span>
            {/if}
            {#if output.doi}
              <a href={`https://doi.org/${output.doi}`} target="_blank" class="text-blue-500 hover:underline">
               <!-- [DOI: {output.doi}] -->[DOI]
              </a>
            {/if}
            {#if isKorean(output.title)}
                <button class="ml-2 text-blue-500 hover:text-blue-700" on:click={() => openEditPopup(output)} aria-label="add english title">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            {/if}
          </td>
          <td class="border p-2">{formatDateKST(output.published_at)}</td>
          <td class="border p-2">
            {output.english_journal || output.journal_name || '-'}
            {#if output.english_journal && isKorean(output.journal_name ?? '')}
              <span class="text-gray-500 text-sm"> ({output.journal_name})</span>
            {/if}
          </td>
          <td class="border p-2">
            <label class="inline-flex items-center mr-2">
              <input
                type="radio"
                name={`research_type_${output.research_id}`}
                checked={output.is_basic}
                on:change={() => updateClassification(output.research_id, 'is_basic', true)}
              />
              <span class="ml-1">Basic Scholarship</span>
            </label>
            <label class="inline-flex items-center mr-2">
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
            <label class="inline-flex items-center mr-2">
              <input
                type="radio"
                name={`contribution_type_${output.research_id}`}
                checked={output.is_peer_journal}
                on:change={() => updateClassification(output.research_id, 'is_peer_journal', true)}
              />
              <span class="ml-1">Peer reviewed Journal</span>
            </label>
            <label class="inline-flex items-center mr-2">
              <input
                type="radio"
                name={`contribution_type_${output.research_id}`}
                checked={output.is_other_reviewed}
                on:change={() => updateClassification(output.research_id, 'is_other_reviewed', true)}
              />
              <span class="ml-1">Other reviewed Journal</span>
            </label>
            <label class="inline-flex items-center">
              <input
                type="radio"
                name={`contribution_type_${output.research_id}`}
                checked={output.is_other_nonreviewed}
                on:change={() => updateClassification(output.research_id, 'is_other_nonreviewed', true)}
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
                <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="text-red-500 hover:text-red-600"
                on:click={() => openDeletePopup(output)}
                aria-label="Delete research output"
              >
                <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
            {/if}
          </td>
        </tr>
      {/each}
      {/if}
    </tbody>
  </table>


{#if facultyList.length > 0}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="facultyModalTitle">
    <div bind:this={facultyDialogRef} class="bg-white p-6 rounded-lg shadow-lg w-[600px]" on:keydown={e => e.key === 'Escape' && closeFacultyPopup()} tabindex="-1"
                 role="dialog" 
      aria-labelledby="facultyModalTitle">
      <h3 id="facultyModalTitle" class="text-lg font-semibold mb-4">동명이인 선택</h3>
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
                  class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  on:click={() => selectFaculty(faculty)}
                >
                  선택
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div class="flex justify-end mt-4">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          on:click={closeFacultyPopup}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

{#if editingOutput}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="editModalTitle">
    <div bind:this={editDialogRef} class="bg-white p-6 rounded-lg shadow-lg w-96" on:keydown={e => e.key === 'Escape' && closeEditPopup()} tabindex="-1"
                 role="dialog" 
      aria-labelledby="editModalTitle" >
      <h3 id="editModalTitle" class="text-lg font-semibold mb-4">Edit English Title and Journal</h3>
      <div class="mb-4">
        <label for="editEnglishTitle" class="block mb-1">English Title:</label>
        <input
          id="editEnglishTitle"
          type="text"
          bind:value={editEnglishTitle}
          class="w-full border p-2 rounded"
          placeholder="Enter English title"
        />
        {#if isKorean(editingOutput!.title)}
          <p class="text-gray-500 text-sm mt-1">Korean Title: {editingOutput!.title}</p>
        {/if}
      </div>
      <div class="mb-4">
        <label for="editEnglishJournal" class="block mb-1">English Journal:</label>
        <input
          id="editEnglishJournal"
          type="text"
          bind:value={editEnglishJournal}
          class="w-full border p-2 rounded"
          placeholder="Enter English journal"
        />
        {#if isKorean(editingOutput!.journal_name ?? '')}
          <p class="text-gray-500 text-sm mt-1">Korean Journal: {editingOutput!.journal_name}</p>
        {/if}
      </div>
      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          on:click={closeEditPopup}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          on:click={saveEdit}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

{#if addingOutput}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="addModalTitle">
    <div bind:this={addDialogRef} class="bg-white p-6 rounded-lg shadow-lg w-96" on:keydown={e => e.key === 'Escape' && closeAddPopup()} tabindex="-1"
           role="dialog" 
      aria-labelledby="addModalTitle" >
      <h3 id="addModalTitle" class="text-lg font-semibold mb-4">Add Research Output</h3>
      <div class="mb-4">
        <label for="addTitle" class="block mb-1">Title:</label>
        <input
          id="addTitle"
          type="text"
          bind:value={addTitle}
          class="w-full border p-2 rounded"
          placeholder="Enter title"
        />
      </div>
      <div class="mb-4">
        <label for="addJournalName" class="block mb-1">Journal Name (optional):</label>
        <input
          id="addJournalName"
          type="text"
          bind:value={addJournalName}
          class="w-full border p-2 rounded"
          placeholder="Enter journal name"
        />
      </div>
      <div class="mb-4">
        <label for="addPublishedAt" class="block mb-1">Publication Date:</label>
        <input
          id="addPublishedAt"
          type="date"
          bind:value={addPublishedAt}
          class="w-full border p-2 rounded"
        />
      </div>
      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          on:click={closeAddPopup}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          on:click={saveAdd}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

{#if modifyingOutput}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="modifyModalTitle">
    <div bind:this={modifyDialogRef} class="bg-white p-6 rounded-lg shadow-lg w-96" on:keydown={e => e.key === 'Escape' && closeModifyPopup()} tabindex="-1"
           role="dialog" 
      aria-labelledby="modifyModalTitle" >
      <h3 id="modifyModalTitle" class="text-lg font-semibold mb-4">Modify Research Output</h3>
      <div class="mb-4">
        <label for="modifyTitle" class="block mb-1">Title:</label>
        <input
          id="modifyTitle"
          type="text"
          bind:value={modifyTitle}
          class="w-full border p-2 rounded"
          placeholder="Enter title"
        />
      </div>
      <div class="mb-4">
        <label for="modifyJournalName" class="block mb-1">Journal Name (optional):</label>
        <input
          id="modifyJournalName"
          type="text"
          bind:value={modifyJournalName}
          class="w-full border p-2 rounded"
          placeholder="Enter journal name"
        />
      </div>
      <div class="mb-4">
        <label for="modifyPublishedAt" class="block mb-1">Publication Date:</label>
        <input
          id="modifyPublishedAt"
          type="date"
          bind:value={modifyPublishedAt}
          class="w-full border p-2 rounded"
        />
      </div>
      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          on:click={closeModifyPopup}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          on:click={saveModify}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

{#if deletingOutput}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
    <div bind:this={deleteDialogRef} class="bg-white p-6 rounded-lg shadow-lg w-96" on:keydown={e => e.key === 'Escape' && closeDeletePopup()} tabindex="-1"
     role="dialog" 
      aria-labelledby="deleteModalTitle" >
      <h3 id="deleteModalTitle" class="text-lg font-semibold mb-4">Delete Research Output</h3>
      <p class="mb-4">Are you sure you want to delete "{deletingOutput.title}"?</p>
      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          on:click={closeDeletePopup}
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          on:click={confirmDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}