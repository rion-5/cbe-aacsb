<script lang="ts">
  import { onMount } from 'svelte';
  import type { ResearchOutput, ResearchClassification, BooleanKeys } from '$lib/types/research';

  let facNip = 'A033411';
  let researchOutputs: (ResearchOutput & ResearchClassification)[] = [];
  let year = new Date().getFullYear();

  // 발행일 포맷팅 함수
  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toISOString().split('T')[0]; // "2025-06-22"
    // 또는 다른 형식: return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`; // "2025.06.22"
  }

  async function fetchResearchOutputs() {
    if (!facNip) return;
    const response = await fetch(`/api/research?fac_nip=${facNip}`);
    researchOutputs = await response.json();
  }

  async function updateClassification(research_id: number, field: BooleanKeys, value: boolean) {
    const classification = researchOutputs.find(r => r.research_id === research_id);
    if (!classification) return;

    // 연구 유형과 성과 형태 필드 정의
    const researchTypeFields: BooleanKeys[] = ['is_basic', 'is_applied', 'is_teaching'];
    const contributionTypeFields: BooleanKeys[] = ['is_peer_journal', 'is_other_reviewed', 'is_other_nonreviewed'];

    // 모든 필드를 명시적으로 초기화하여 undefined 배제
    const updateData: ResearchClassification = {
      fac_nip: facNip,
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

    // 선택된 필드에 따라 업데이트
    if (researchTypeFields.includes(field)) {
      updateData[field] = value;
      researchTypeFields.forEach(f => {
        if (f !== field) updateData[f] = false;
      });
    } else if (contributionTypeFields.includes(field)) {
      updateData[field] = value;
      contributionTypeFields.forEach(f => {
        if (f !== field) updateData[f] = false;
      });
    }

    // 서버에 업데이트 요청
    await fetch('/api/classifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    // UI 즉시 갱신
    researchOutputs = researchOutputs.map(r =>
      r.research_id === research_id ? { ...r, ...updateData } : r
    );
  }

  onMount(fetchResearchOutputs);
</script>

<div class="mb-4">
  <h2 class="text-xl font-semibold">연도: {year}</h2>
  <div class="mt-2">
    <label for="facNip" class="mr-2">교원 NIP:</label>
    <input
      id="facNip"
      type="text"
      bind:value={facNip}
      on:input={fetchResearchOutputs}
      class="border p-2 rounded"
      placeholder="교원 NIP 입력"
    />
  </div>
</div>

<table class="w-full border-collapse border">
  <thead>
    <tr class="bg-gray-200">
      <th class="border p-2">Title</th>
      <th class="border p-2">Publication Date</th>
      <th class="border p-2">Journal</th>
      <th class="border p-2">Portfolio of Intellectual</th>
      <th class="border p-2">Types of Intellectual Contributions</th>
    </tr>
  </thead>
  <tbody>
    {#each researchOutputs as output}
      <tr>
        <td class="border p-2">{output.title}</td>
        <td class="border p-2">{formatDate(output.published_at)}</td>
        <td class="border p-2">{output.journal_name || '-'}</td>
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
      </tr>
    {/each}
  </tbody>
</table>