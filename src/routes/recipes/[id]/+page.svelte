<script lang="ts">
	import { goto } from '$app/navigation';
	import AddRecipeModal from '$lib/components/AddRecipeModal.svelte';
	import { toastStore } from '$lib/stores/toastStore';
	import type { PageData } from './$types';

	export let data: PageData;

	type RecipeIngredient = {
		name: string;
		quantity: string;
		optional?: boolean;
	};

	type RecipeDetails = {
		_id?: string;
		name: string;
		description: string;
		category?: { _id: string; name: string } | string;
		ingredients?: RecipeIngredient[];
		preparationSteps?: string[];
		imageUrl?: string;
		servings?: number;
		prepTimeMinutes?: number;
		cookTimeMinutes?: number;
		tips?: string[];
		tags?: string[];
		isAlcoholic?: boolean;
	};

	const fallbackImage =
		'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80';

	let recipe = data.recipe as RecipeDetails;
	let multiplier = 1;
	let isEditRecipeOpen = false;
	let isShoppingListOpen = false;
	let isDeleteConfirmOpen = false;
	let isDeletingRecipe = false;
	let deleteRecipeError = '';
	let copySuccess = false;
	const multiplierPresets = [0.5, 1, 2, 4];

	function buildShoppingListText() {
		let content = `SHOPPING LIST — ${recipe.name}\n`;
		content += '='.repeat(50) + '\n';
		if (scaledServings !== undefined) content += `Servings: ${scaledServings}\n`;
		content += '\n';
		scaledIngredients.forEach((i) => {
			content += `☐ ${i.scaledQuantity} ${i.scaledName}${i.optional ? ' (optional)' : ''}\n`;
		});
		return content;
	}

	async function copyShoppingListToClipboard() {
		try {
			await navigator.clipboard.writeText(buildShoppingListText());
			copySuccess = true;
			toastStore.success('Shopping list copied to clipboard.');
			setTimeout(() => (copySuccess = false), 2000);
		} catch {
			toastStore.error('Unable to copy shopping list.');
		}
	}

	function escapeHtml(value: string): string {
		return value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	function printShoppingList() {
		const rows = scaledIngredients
			.map(
				(i) =>
					`<li><span class="checkbox">&#9744;</span><span><strong>${escapeHtml(
						i.scaledQuantity
					)}</strong> ${escapeHtml(i.scaledName)}${
						i.optional ? ' <em>(optional)</em>' : ''
					}</span></li>`
			)
			.join('');
		const servingsLine =
			scaledServings !== undefined
				? `<p class="meta-item"><span class="meta-label">Servings</span><span class="meta-value">${scaledServings}</span></p>`
				: '';
		const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shopping List</title>
			<style>
				@page { size: Letter; margin: 0.6in; }
				* { box-sizing: border-box; }
				body {
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
					max-width: 900px;
					margin: 0 auto;
					color: #111;
				}
				.kicker {
					margin: 0;
					font-size: 12px;
					font-weight: 700;
					letter-spacing: 0.08em;
					text-transform: uppercase;
					color: #555;
				}
				h1 {
					margin: 6px 0 0;
					font-size: 28px;
					line-height: 1.15;
				}
				.header-divider {
					margin: 14px 0 12px;
					border: 0;
					border-top: 2px solid #111;
				}
				.meta {
					display: flex;
					flex-wrap: wrap;
					gap: 14px;
					margin-bottom: 14px;
				}
				.meta-item {
					margin: 0;
					font-size: 13px;
					color: #444;
				}
				.meta-label {
					margin-right: 6px;
					font-weight: 600;
					text-transform: uppercase;
					font-size: 11px;
					letter-spacing: 0.04em;
					color: #666;
				}
				.meta-value {
					font-weight: 700;
					color: #111;
				}
				ul {
					list-style: none;
					padding: 0;
					margin: 0;
					column-gap: 28px;
				}
				li {
					display: flex;
					align-items: flex-start;
					gap: 8px;
					padding: 5px 0;
					border-bottom: 1px solid #ececec;
					font-size: 14px;
					line-height: 1.3;
					break-inside: avoid;
				}
				.checkbox {
					font-size: 18px;
					line-height: 1;
					margin-top: 1px;
				}
				@media print and (min-width: 900px) {
					ul {
						column-count: 2;
					}
				}
			</style>
			</head><body>
			<p class="kicker">Shopping List</p>
			<h1>${escapeHtml(recipe.name)}</h1>
			<hr class="header-divider" />
			<div class="meta">
				${servingsLine}
			</div>
			<ul>${rows}</ul>
			</body></html>`;
		const win = window.open('', '_blank');
		if (!win) {
			toastStore.error('Allow pop-ups to print the shopping list.');
			return;
		}
		win.document.write(html);
		win.document.close();
		win.focus();
		win.print();
		win.close();
		toastStore.info('Print dialog opened.');
	}

	function exportShoppingListAsText() {
		const content = buildShoppingListText();
		const el = document.createElement('a');
		el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
		el.setAttribute('download', 'shopping-list.txt');
		el.style.display = 'none';
		document.body.appendChild(el);
		el.click();
		document.body.removeChild(el);
		toastStore.success('Shopping list downloaded.');
	}

	$: categoryName =
		typeof recipe.category === 'object' && recipe.category && 'name' in recipe.category
			? recipe.category.name
			: typeof recipe.category === 'string'
				? recipe.category
				: 'Uncategorized';
	$: imageUrl = recipe.imageUrl?.trim() ? recipe.imageUrl : fallbackImage;
	$: hasExplicitServings =
		typeof recipe.servings === 'number' && Number.isFinite(recipe.servings) && recipe.servings > 0
			? true
			: false;
	$: baseServings = hasExplicitServings ? (recipe.servings as number) : 1;
	$: scaledServings = Math.max(0, Math.round(baseServings * multiplier * 100) / 100);
	$: targetServingsValue = String(scaledServings);
	$: scaledIngredients = (recipe.ingredients ?? []).map((ingredient) => ({
		...ingredient,
		scaledQuantity: scaleNumericText(ingredient.quantity, multiplier),
		scaledName: scaleNumericText(ingredient.name, multiplier)
	}));

	function incrementMultiplier() {
		multiplier += 1;
	}

	function decrementMultiplier() {
		if (multiplier > 1) {
			multiplier -= 1;
		}
	}

	function setMultiplier(nextMultiplier: number) {
		if (!Number.isFinite(nextMultiplier) || nextMultiplier <= 0) return;
		multiplier = Math.round(nextMultiplier * 100) / 100;
	}

	function applyTargetServings(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const nextTarget = Number(input.value);

		if (!Number.isFinite(nextTarget) || nextTarget <= 0) {
			toastStore.error('Enter a valid target servings value.');
			input.value = targetServingsValue;
			return;
		}

		setMultiplier(nextTarget / baseServings);
	}

	function resetServingScale() {
		setMultiplier(1);
		toastStore.info('Serving scale reset to base.');
	}

	function parseNumericToken(token: string): number | null {
		const normalizedToken = token.trim();
		const unicodeFractions: Record<string, number> = {
			'¼': 1 / 4,
			'½': 1 / 2,
			'¾': 3 / 4,
			'⅓': 1 / 3,
			'⅔': 2 / 3,
			'⅛': 1 / 8,
			'⅜': 3 / 8,
			'⅝': 5 / 8,
			'⅞': 7 / 8
		};

		if (normalizedToken in unicodeFractions) {
			return unicodeFractions[normalizedToken];
		}

		const mixedUnicodeFractionMatch = normalizedToken.match(/^(\d+)([¼½¾⅓⅔⅛⅜⅝⅞])$/);
		if (mixedUnicodeFractionMatch) {
			const whole = Number(mixedUnicodeFractionMatch[1]);
			const fraction = unicodeFractions[mixedUnicodeFractionMatch[2]];
			if (!Number.isFinite(whole) || fraction === undefined) {
				return null;
			}
			return whole + fraction;
		}

		const mixedFractionMatch = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
		if (mixedFractionMatch) {
			const whole = Number(mixedFractionMatch[1]);
			const numerator = Number(mixedFractionMatch[2]);
			const denominator = Number(mixedFractionMatch[3]);
			if (!Number.isFinite(whole) || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
				return null;
			}
			return whole + numerator / denominator;
		}

		const fractionMatch = token.match(/^(\d+)\/(\d+)$/);
		if (fractionMatch) {
			const numerator = Number(fractionMatch[1]);
			const denominator = Number(fractionMatch[2]);
			if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
				return null;
			}
			return numerator / denominator;
		}

		const parsed = Number(token);
		if (!Number.isFinite(parsed)) return null;
		return parsed;
	}

	function formatScaledValue(value: number): string {
		if (!Number.isFinite(value)) return '';
		if (Number.isInteger(value)) return String(value);
		return String(Math.round(value * 100) / 100);
	}

	function scaleNumericText(text: string, factor: number): string {
		const normalized = text.trim();
		if (!normalized || factor === 1) return text;

		const replaced = normalized.replace(
			/(\d+\s+\d+\/\d+|\d+[¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞]|\d+(?:\.\d+)?)/g,
			(token) => {
				const parsed = parseNumericToken(token);
				if (parsed === null) return token;
				return formatScaledValue(parsed * factor);
			}
		);

		return replaced;
	}

	function openEditRecipe() {
		isEditRecipeOpen = true;
	}

	function closeEditRecipe() {
		isEditRecipeOpen = false;
	}

	function handleRecipeUpdated(event: CustomEvent<RecipeDetails>) {
		recipe = event.detail;
		isEditRecipeOpen = false;
		toastStore.success('Recipe updated successfully.');
	}

	function openDeleteConfirm() {
		deleteRecipeError = '';
		isDeleteConfirmOpen = true;
	}

	function closeDeleteConfirm() {
		if (isDeletingRecipe) return;
		isDeleteConfirmOpen = false;
	}

	async function deleteRecipe() {
		if (!recipe._id || isDeletingRecipe) return;

		isDeletingRecipe = true;
		deleteRecipeError = '';

		try {
			const response = await fetch(`/api/recipes/${recipe._id}`, { method: 'DELETE' });

			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as { error?: string };
				deleteRecipeError = payload.error ?? 'Failed to delete recipe.';
				toastStore.error(deleteRecipeError);
				return;
			}

			isDeleteConfirmOpen = false;
			toastStore.success('Recipe deleted.');
			await goto('/');
		} catch {
			deleteRecipeError = 'Could not connect to server.';
			toastStore.error(deleteRecipeError);
		} finally {
			isDeletingRecipe = false;
		}
	}
</script>

<div class="min-h-screen bg-cyan-50 p-4 sm:p-6 lg:p-8">
	<div class="mx-auto w-full max-w-5xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
		<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
			<a href="/" class="rounded-md border border-gray-300 px-3 py-2 text-sm">← Back</a>
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					on:click={() => (isShoppingListOpen = true)}
					class="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
				>
					🛒 Shopping List
				</button>
				<button
					type="button"
					on:click={openEditRecipe}
					class="rounded-md border border-black bg-black px-4 py-2 text-sm text-white"
				>
					Edit Recipe
				</button>
				<button
					type="button"
					on:click={openDeleteConfirm}
					class="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
				>
					Delete Recipe
				</button>
			</div>
		</div>
		<div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
			<div class="space-y-4">
				<h1 class="text-3xl font-semibold">{recipe.name}</h1>
				<p class="text-sm text-gray-700">{recipe.description}</p>
				<div class="flex flex-wrap gap-2 text-xs">
					<span class="rounded-full border border-gray-200 px-3 py-1">{categoryName}</span>
					{#if recipe.prepTimeMinutes !== undefined}
						<span class="rounded-full border border-gray-200 px-3 py-1">Prep: {recipe.prepTimeMinutes} min</span>
					{/if}
					{#if recipe.cookTimeMinutes !== undefined}
						<span class="rounded-full border border-gray-200 px-3 py-1">Cook: {recipe.cookTimeMinutes} min</span>
					{/if}
					{#if recipe.isAlcoholic}
						<span class="rounded-full border border-gray-200 px-3 py-1">Alcoholic</span>
					{/if}
				</div>

				<div class="rounded-xl border border-gray-200 p-4">
					<div class="mb-3 flex items-center justify-between gap-3">
						<h2 class="text-lg font-semibold">Servings</h2>
						<div class="flex items-center gap-2">
							<button
								type="button"
								on:click={decrementMultiplier}
								disabled={multiplier === 1}
								class="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
							>
								-
							</button>
							<span class="min-w-14 text-center text-sm font-medium">x{multiplier}</span>
							<button
								type="button"
								on:click={incrementMultiplier}
								class="rounded-md border border-gray-300 px-3 py-1 text-sm"
							>
								+
							</button>
						</div>
					</div>
					<p class="text-sm text-gray-700">
						Base: {baseServings}{hasExplicitServings ? '' : ' (default)'} · Adjusted: {scaledServings}
					</p>
					<div class="mt-3 space-y-3">
						<div class="flex flex-wrap items-center gap-2">
							<label for="target-servings" class="text-xs font-medium text-gray-600">Target servings</label>
							<input
								id="target-servings"
								type="number"
								min="0.1"
								step="0.1"
								value={targetServingsValue}
								on:change={applyTargetServings}
								class="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
							/>
							<button
								type="button"
								on:click={resetServingScale}
								class="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
							>
								Reset
							</button>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-xs font-medium text-gray-600">Quick scale</span>
							{#each multiplierPresets as preset}
								<button
									type="button"
									on:click={() => setMultiplier(preset)}
									class="rounded-md border px-2 py-1 text-xs"
									class:border-black={multiplier === preset}
									class:bg-black={multiplier === preset}
									class:text-white={multiplier === preset}
									class:border-gray-300={multiplier !== preset}
									class:hover:bg-gray-50={multiplier !== preset}
								>
									x{preset}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div>
				<img src={imageUrl} alt={recipe.name} class="h-72 w-full rounded-2xl object-cover" />
			</div>
		</div>

		<div class="mt-8 grid gap-6 lg:grid-cols-2">
			<section class="rounded-xl border border-gray-200 p-4">
				<h2 class="mb-3 text-lg font-semibold">Ingredients</h2>
				{#if scaledIngredients.length === 0}
					<p class="text-sm text-gray-600">No ingredients listed.</p>
				{:else}
					<ul class="space-y-2 text-sm">
						{#each scaledIngredients as ingredient}
							<li class="rounded-md border border-gray-100 p-2">
								<span class="font-medium">{ingredient.scaledQuantity}</span>
								<span> {ingredient.scaledName}</span>
								{#if ingredient.optional}
									<span class="text-xs text-gray-500"> (optional)</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="rounded-xl border border-gray-200 p-4">
				<h2 class="mb-3 text-lg font-semibold">Preparation Steps</h2>
				{#if !recipe.preparationSteps || recipe.preparationSteps.length === 0}
					<p class="text-sm text-gray-600">No preparation steps listed.</p>
				{:else}
					<ol class="list-decimal space-y-2 pl-5 text-sm">
						{#each recipe.preparationSteps as step}
							<li>{step}</li>
						{/each}
					</ol>
				{/if}
			</section>
		</div>

		{#if (recipe.tips?.length ?? 0) > 0 || (recipe.tags?.length ?? 0) > 0}
			<div class="mt-6 grid gap-6 lg:grid-cols-2">
				{#if (recipe.tips?.length ?? 0) > 0}
					<section class="rounded-xl border border-gray-200 p-4">
						<h2 class="mb-3 text-lg font-semibold">Tips</h2>
						<ul class="list-disc space-y-1 pl-5 text-sm">
							{#each recipe.tips ?? [] as tip}
								<li>{tip}</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if (recipe.tags?.length ?? 0) > 0}
					<section class="rounded-xl border border-gray-200 p-4">
						<h2 class="mb-3 text-lg font-semibold">Tags</h2>
						<div class="flex flex-wrap gap-2 text-xs">
							{#each recipe.tags ?? [] as tag}
								<span class="rounded-full border border-gray-200 px-3 py-1">{tag}</span>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if isShoppingListOpen}
	<div
		class="fixed inset-0 z-50 bg-black/50 p-3 sm:p-4"
		on:click|self={() => (isShoppingListOpen = false)}
		on:keydown={(e) => e.key === 'Escape' && (isShoppingListOpen = false)}
		role="button"
		tabindex="0"
		aria-label="Close shopping list"
	>
		<div class="mx-auto flex max-h-[95vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white">
			<div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-6 sm:py-6">
				<div>
					<h2 class="text-lg font-semibold sm:text-xl">Shopping List</h2>
					<p class="mt-0.5 text-xs text-gray-500">
						{recipe.name}{scaledServings !== undefined ? ` · ${scaledServings} servings` : ''}
					</p>
				</div>
				<button
					type="button"
					on:click={() => (isShoppingListOpen = false)}
					class="rounded-md border border-gray-200 px-2 py-1 text-base leading-none"
					aria-label="Close"
				>
					×
				</button>
			</div>

			<div class="space-y-2 px-4 py-4 sm:px-6 sm:py-6">
				{#each scaledIngredients as ingredient}
					<div class="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 p-3">
						<span class="mt-0.5 text-base leading-none text-gray-400">☐</span>
						<div class="flex-1 text-sm">
							<span class="font-medium">{ingredient.scaledQuantity}</span>
						<span> {ingredient.scaledName}</span>
							{#if ingredient.optional}
								<span class="text-xs text-gray-500"> (optional)</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="border-t border-gray-200 px-4 py-4 sm:px-6 sm:py-6">
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						on:click={exportShoppingListAsText}
						class="rounded-md border border-black px-3 py-2 text-sm font-medium hover:bg-gray-50"
					>
						📄 Export as Text
					</button>
					<button
						type="button"
						on:click={copyShoppingListToClipboard}
						class="rounded-md border border-black px-3 py-2 text-sm font-medium hover:bg-gray-50"
					>
						{copySuccess ? '✅ Copied!' : '📋 Copy to Clipboard'}
					</button>
					<button
						type="button"
						on:click={printShoppingList}
						class="rounded-md border border-black px-3 py-2 text-sm font-medium hover:bg-gray-50"
					>
						🖨️ Print
					</button>
					<button
						type="button"
						on:click={() => (isShoppingListOpen = false)}
						class="ml-auto rounded-md border border-black bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if isDeleteConfirmOpen}
	<div
		class="fixed inset-0 z-50 bg-black/50 p-3 sm:p-4"
		on:click|self={closeDeleteConfirm}
		on:keydown={(event) => event.key === 'Escape' && closeDeleteConfirm()}
		role="button"
		tabindex="0"
		aria-label="Close delete recipe dialog"
	>
		<div class="mx-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
			<h2 class="text-lg font-semibold">Delete Recipe?</h2>
			<p class="mt-2 text-sm text-gray-600">
				This action permanently removes <span class="font-medium text-gray-800">{recipe.name}</span>.
			</p>

			{#if deleteRecipeError}
				<p class="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{deleteRecipeError}</p>
			{/if}

			<div class="mt-5 flex flex-wrap justify-end gap-2">
				<button
					type="button"
					on:click={closeDeleteConfirm}
					disabled={isDeletingRecipe}
					class="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={deleteRecipe}
					disabled={isDeletingRecipe}
					class="rounded-md border border-red-700 bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-60"
				>
					{isDeletingRecipe ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if isEditRecipeOpen}
	<AddRecipeModal
		mode="edit"
		initialRecipe={recipe}
		on:close={closeEditRecipe}
		on:updated={handleRecipeUpdated}
	/>
{/if}
