<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore';
</script>

<div class="pointer-events-none fixed right-3 top-3 z-[60] flex w-[min(92vw,24rem)] flex-col gap-2 sm:right-4 sm:top-4">
	{#each $toastStore as toast (toast.id)}
		<div
			class="pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg"
			class:border-emerald-300={toast.kind === 'success'}
			class:bg-emerald-50={toast.kind === 'success'}
			class:text-emerald-900={toast.kind === 'success'}
			class:border-rose-300={toast.kind === 'error'}
			class:bg-rose-50={toast.kind === 'error'}
			class:text-rose-900={toast.kind === 'error'}
			class:border-slate-300={toast.kind === 'info'}
			class:bg-white={toast.kind === 'info'}
			class:text-slate-900={toast.kind === 'info'}
			role="status"
			aria-live="polite"
		>
			<div class="flex items-start justify-between gap-3">
				<p>{toast.message}</p>
				<button
					type="button"
					on:click={() => toastStore.remove(toast.id)}
					class="rounded border border-black/10 px-1.5 py-0.5 text-xs"
					aria-label="Dismiss notification"
				>
					x
				</button>
			</div>
		</div>
	{/each}
</div>
