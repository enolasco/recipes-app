<script lang="ts">
	import AddRecipeModal from '$lib/components/AddRecipeModal.svelte';
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

	$: categoryName =
		typeof recipe.category === 'object' && recipe.category && 'name' in recipe.category
			? recipe.category.name
			: typeof recipe.category === 'string'
				? recipe.category
				: 'Uncategorized';
	$: imageUrl = recipe.imageUrl?.trim() ? recipe.imageUrl : fallbackImage;
	$: scaledServings = recipe.servings !== undefined ? Math.max(0, recipe.servings * multiplier) : undefined;
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

	function parseNumericToken(token: string): number | null {
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
			/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/g,
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
	}
</script>

<div class="min-h-screen bg-cyan-50 p-4 sm:p-6 lg:p-8">
	<div class="mx-auto w-full max-w-5xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
		<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
			<a href="/" class="rounded-md border border-gray-300 px-3 py-2 text-sm">← Back</a>
			<button
				type="button"
				on:click={openEditRecipe}
				class="rounded-md border border-black bg-black px-4 py-2 text-sm text-white"
			>
				Edit Recipe
			</button>
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
						Base: {recipe.servings !== undefined ? recipe.servings : '—'} · Adjusted: {scaledServings !== undefined
							? scaledServings
							: '—'}
					</p>
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

{#if isEditRecipeOpen}
	<AddRecipeModal
		mode="edit"
		initialRecipe={recipe}
		on:close={closeEditRecipe}
		on:updated={handleRecipeUpdated}
	/>
{/if}
