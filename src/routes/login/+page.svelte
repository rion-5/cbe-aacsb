<!-- src/routes/+page.svelte -->
<main class="mx-auto max-w-md space-y-8 p-6 text-center text-neutral-800">
	<h1 class="mb-4 text-xl font-semibold">경상대학 AACSB 시스템</h1>
	<div class="mb-4 text-sm text-gray-600">로그인하여 예약을 시작하세요.</div>
	<div class="grid grid-cols-3 gap-4">
		<button
			class="flex aspect-square cursor-not-allowed flex-col items-center justify-center rounded-xl border border-gray-300 bg-gray-100 p-2 text-sm font-semibold text-gray-400 shadow-none"
			disabled
		>
			<span class="text-2xl">💬</span>
			<span class="mt-1 text-center text-xs leading-tight">IC-PBL<br />토론실</span>
		</button>
		<button
			class="flex aspect-square cursor-not-allowed flex-col items-center justify-center rounded-xl border border-gray-300 bg-gray-100 p-2 text-sm font-semibold text-gray-400 shadow-none"
			disabled
		>
			<span class="text-2xl">📖</span>
			<span class="mt-1 text-center text-xs leading-tight">도담<br />열람실</span>
		</button>
		<button
			class="flex aspect-square cursor-not-allowed flex-col items-center justify-center rounded-xl border border-gray-300 bg-gray-100 p-2 text-sm font-semibold text-gray-400 shadow-none"
			disabled
		>
			<span class="text-2xl">🎓</span>
			<span class="mt-1 text-center text-xs leading-tight">강의실</span>
		</button>
	</div>
</main>
