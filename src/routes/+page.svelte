<script lang="ts">
  import { onMount } from 'svelte';
  import type { ResearchOutput, ResearchClassification } from '$lib/types/research';

  let facNip = '';
  let researchOutputs: (ResearchOutput & ResearchClassification)[] = [];
  let year = new Date().getFullYear();

  async function fetchResearchOutputs() {
    if (!facNip) return;
    const response = await fetch(`/api/research?fac_nip=${facNip}`);
    researchOutputs = await response.json();
  }

  async function updateClassification(research_id: number, field: string, value: boolean) {
    const classification = researchOutputs.find(r => r.research_id === research_id);
    if (!classification) return;

    // 모든 필드를 포함하여 기존 값을 유지
    const researchTypeFields = ['is_basic', 'is_applied', 'is_teaching'];
    const contributionTypeFields = ['is_peer_journal', 'is_other_reviewed', 'is_other_nonreviewed'];

    // 기존 분류 데이터 가져오기
    const updateData: Partial<ResearchClassification> = {
      fac_nip: facNip,
      research_id,
      is_basic: classification.is_basic,
      is_applied: classification.is_applied,
      is_teaching: classification.is_teaching,
      is_peer_journal: classification.is_peer_journal,
      is_other_reviewed: classification.is_other_reviewed,
      is_other_nonreviewed: classification.is_other_nonreviewed
    };

    // 선택된 필드에 따라 업데이트
    if (researchTypeFields.includes(field)) {
      // 연구 유형 그룹: 선택된 필드만 true, 나머지는 false
      updateData[field] = value;
      researchTypeFields.forEach(f => {
        if (f !== field) updateData[f] = false;
      });
    } else if (contributionTypeFields.includes(field)) {
      // 성과 형태 그룹: 선택된 필드만 true, 나머지는 false
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
      <th class="border p-2">제목</th>
      <th class="border p-2">발행일</th>
      <th class="border p-2">저널명</th>
      <th class="border p-2">연구 유형</th>
      <th class="border p-2">성과 형태</th>
    </tr>
  </thead>
  <tbody>
    {#each researchOutputs as output}
      <tr>
        <td class="border p-2">{output.title}</td>
        <td class="border p-2">{output.published_at}</td>
        <td class="border p-2">{output.journal_name || '-'}</td>
        <td class="border p-2">
          <label class="inline-flex items-center mr-2">
            <input
              type="radio"
              name={`research_type_${output.research_id}`}
              checked={output.is_basic}
              on:change={() => updateClassification(output.research_id, 'is_basic', true)}
            />
            <span class="ml-1">기초</span>
          </label>
          <label class="inline-flex items-center mr-2">
            <input
              type="radio"
              name={`research_type_${output.research_id}`}
              checked={output.is_applied}
              on:change={() => updateClassification(output.research_id, 'is_applied', true)}
            />
            <span class="ml-1">응용/통합</span>
          </label>
          <label class="inline-flex items-center">
            <input
              type="radio"
              name={`research_type_${output.research_id}`}
              checked={output.is_teaching}
              on:change={() => updateClassification(output.research_id, 'is_teaching', true)}
            />
            <span class="ml-1">교수법</span>
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
            <span class="ml-1">동료 평가 저널</span>
          </label>
          <label class="inline-flex items-center mr-2">
            <input
              type="radio"
              name={`contribution_type_${output.research_id}`}
              checked={output.is_other_reviewed}
              on:change={() => updateClassification(output.research_id, 'is_other_reviewed', true)}
            />
            <span class="ml-1">기타 평가 자료</span>
          </label>
          <label class="inline-flex items-center">
            <input
              type="radio"
              name={`contribution_type_${output.research_id}`}
              checked={output.is_other_nonreviewed}
              on:change={() => updateClassification(output.research_id, 'is_other_nonreviewed', true)}
            />
            <span class="ml-1">비공식 자료</span>
          </label>
        </td>
      </tr>
    {/each}
  </tbody>
</table>