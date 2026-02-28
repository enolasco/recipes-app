<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	type IngredientInput = {
		name: string;
		quantity: string;
		optional: boolean;
	};

	type ApiRecipe = {
		_id?: string;
		name: string;
		description: string;
		category?: { _id: string; name: string } | string;
		ingredients?: Array<{ name: string; quantity: string }>;
		preparationSteps?: string[];
		imageUrl?: string;
		servings?: number;
		prepTimeMinutes?: number;
		cookTimeMinutes?: number;
		tips?: string[];
		tags?: string[];
		isAlcoholic?: boolean;
	};

	type Category = {
		_id: string;
		name: string;
	};

	type ExtractedRecipeData = {
		name?: string;
		description?: string;
		imageUrl?: string;
		ingredients?: IngredientInput[];
		preparationSteps?: string[];
		servings?: number;
		prepTimeMinutes?: number;
		cookTimeMinutes?: number;
		tips?: string[];
		tags?: string[];
		isAlcoholic?: boolean;
		categoryName?: string;
	};

	type ImportRecipeResponse = {
		recipe?: ExtractedRecipeData;
		error?: string;
	};

	const dispatch = createEventDispatcher<{
		close: undefined;
		created: ApiRecipe;
	}>();

	let isSubmitting = false;
	let isLoadingCategories = false;
	let isImportingFromUrl = false;
	let formError = '';
	let categoryError = '';
	let importError = '';
	let formErrorElement: HTMLParagraphElement | null = null;

	let sourceUrl = '';
	let name = '';
	let description = '';
	let imageUrl = '';
	let selectedCategoryId = '';
	let servings = '';
	let prepTimeMinutes = '';
	let cookTimeMinutes = '';
	let tips = '';
	let tags = '';
	let isAlcoholic = false;
	let ingredients: IngredientInput[] = [{ name: '', quantity: '', optional: false }];
	let preparationSteps: string[] = [''];
	let categories: Category[] = [];
	let isManagingCategories = false;
	let newCategoryName = '';
	let editingCategoryId = '';
	let editingCategoryName = '';

	onMount(() => {
		void loadCategories();
	});

	async function loadCategories() {
		isLoadingCategories = true;
		categoryError = '';

		try {
			const response = await fetch('/api/categories');
			if (!response.ok) {
				categoryError = 'Failed to load categories.';
				return;
			}

			const data = (await response.json()) as { categories?: Category[] };
			categories = data.categories ?? [];

			if (!selectedCategoryId && categories.length > 0) {
				selectedCategoryId = categories[0]._id;
			}
		} catch {
			categoryError = 'Failed to load categories.';
		} finally {
			isLoadingCategories = false;
		}
	}

	async function createCategory() {
		categoryError = '';
		const name = newCategoryName.trim();
		if (!name) {
			categoryError = 'Category name is required.';
			return;
		}

		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { error?: string };
				categoryError = data.error ?? 'Failed to create category.';
				return;
			}

			const data = (await response.json()) as { category: Category };
			categories = [...categories, data.category].sort((first, second) =>
				first.name.localeCompare(second.name)
			);
			selectedCategoryId = data.category._id;
			newCategoryName = '';
		} catch {
			categoryError = 'Failed to create category.';
		}
	}

	function startEditingCategory(category: Category) {
		editingCategoryId = category._id;
		editingCategoryName = category.name;
	}

	function cancelEditingCategory() {
		editingCategoryId = '';
		editingCategoryName = '';
	}

	async function saveCategoryEdit(categoryId: string) {
		categoryError = '';
		const name = editingCategoryName.trim();
		if (!name) {
			categoryError = 'Category name is required.';
			return;
		}

		try {
			const response = await fetch(`/api/categories/${categoryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { error?: string };
				categoryError = data.error ?? 'Failed to update category.';
				return;
			}

			const data = (await response.json()) as { category: Category };
			categories = categories
				.map((category) => (category._id === categoryId ? data.category : category))
				.sort((first, second) => first.name.localeCompare(second.name));
			cancelEditingCategory();
		} catch {
			categoryError = 'Failed to update category.';
		}
	}

	async function removeCategory(categoryId: string) {
		categoryError = '';

		try {
			const response = await fetch(`/api/categories/${categoryId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { error?: string };
				categoryError = data.error ?? 'Failed to remove category.';
				return;
			}

			categories = categories.filter((category) => category._id !== categoryId);
			if (selectedCategoryId === categoryId) {
				selectedCategoryId = categories[0]?._id ?? '';
			}
		} catch {
			categoryError = 'Failed to remove category.';
		}
	}

	function closeModal() {
		dispatch('close');
	}

	function resetForm() {
		sourceUrl = '';
		name = '';
		description = '';
		imageUrl = '';
		selectedCategoryId = categories[0]?._id ?? '';
		servings = '';
		prepTimeMinutes = '';
		cookTimeMinutes = '';
		tips = '';
		tags = '';
		isAlcoholic = false;
		ingredients = [{ name: '', quantity: '', optional: false }];
		preparationSteps = [''];
		formError = '';
		importError = '';
	}

	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	function toSingleLineText(value: unknown): string | undefined {
		if (typeof value !== 'string') return undefined;
		const normalized = value.replace(/\s+/g, ' ').trim();
		return normalized || undefined;
	}

	function toMultilineText(value: unknown): string | undefined {
		if (typeof value !== 'string') return undefined;
		const normalized = value
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.join('\n');
		return normalized || undefined;
	}

	function toStringArray(value: unknown): string[] {
		if (Array.isArray(value)) {
			return value
				.map((entry) => toSingleLineText(entry))
				.filter((entry): entry is string => Boolean(entry));
		}

		if (typeof value === 'string') {
			return value
				.split(/\n|,/)
				.map((entry) => entry.trim())
				.filter((entry) => entry.length > 0);
		}

		return [];
	}

	function toAbsoluteUrl(value: unknown, baseUrl: string): string | undefined {
		if (typeof value !== 'string' || !value.trim()) return undefined;

		try {
			return new URL(value.trim(), baseUrl).toString();
		} catch {
			return undefined;
		}
	}

	function parseDurationToMinutes(value: unknown): number | undefined {
		if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
			return Math.round(value);
		}

		if (typeof value !== 'string') return undefined;
		const normalized = value.trim();
		if (!normalized) return undefined;

		const numericValue = Number(normalized);
		if (Number.isFinite(numericValue) && numericValue >= 0) {
			return Math.round(numericValue);
		}

		const isoMatch = normalized.match(
			/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i
		);
		if (!isoMatch) return undefined;

		const [, days, hours, minutes, seconds] = isoMatch;
		const totalMinutes =
			(Number(days || 0) * 24 + Number(hours || 0)) * 60 +
			Number(minutes || 0) +
			Math.round(Number(seconds || 0) / 60);

		return totalMinutes >= 0 ? totalMinutes : undefined;
	}

	function parseServings(value: unknown): number | undefined {
		if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
			return Math.round(value);
		}

		if (typeof value !== 'string') return undefined;
		const match = value.match(/\d+(?:\.\d+)?/);
		if (!match) return undefined;
		const parsed = Number(match[0]);
		return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
	}

	function normalizeIngredients(value: unknown): IngredientInput[] {
		if (!Array.isArray(value)) return [];

		const normalized: Array<IngredientInput | null> = value.map((entry): IngredientInput | null => {
				if (typeof entry === 'string') {
					const ingredientLine = entry.trim();
					if (!ingredientLine) return null;
					return {
						name: ingredientLine,
						quantity: 'to taste',
						optional: false as boolean
					};
				}

				if (isRecord(entry) && typeof entry.text === 'string') {
					const ingredientLine = entry.text.trim();
					if (!ingredientLine) return null;
					return {
						name: ingredientLine,
						quantity: 'to taste',
						optional: false as boolean
					};
				}

				return null;
			});

		return normalized.filter((entry): entry is IngredientInput => entry !== null);
	}

	function normalizeInstructions(value: unknown): string[] {
		if (typeof value === 'string') {
			return value
				.split('\n')
				.map((step) => step.trim())
				.filter((step) => step.length > 0);
		}

		if (!Array.isArray(value)) return [];

		return value
			.flatMap((entry) => {
				if (typeof entry === 'string') {
					const step = entry.trim();
					return step ? [step] : [];
				}

				if (isRecord(entry) && typeof entry.text === 'string') {
					const step = entry.text.trim();
					return step ? [step] : [];
				}

				if (isRecord(entry) && typeof entry.name === 'string') {
					const step = entry.name.trim();
					return step ? [step] : [];
				}

				return [];
			})
			.filter((step) => step.length > 0);
	}

	function collectJsonLdNodes(node: unknown): Record<string, unknown>[] {
		if (!isRecord(node)) return [];

		const nodes: Record<string, unknown>[] = [node];

		if (Array.isArray(node['@graph'])) {
			for (const entry of node['@graph']) {
				nodes.push(...collectJsonLdNodes(entry));
			}
		}

		return nodes;
	}

	function findRecipeSchema(doc: Document): Record<string, unknown> | undefined {
		const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
		const schemaNodes: Record<string, unknown>[] = [];

		for (const script of scripts) {
			const rawContent = script.textContent?.trim();
			if (!rawContent) continue;

			try {
				const parsed = JSON.parse(rawContent) as unknown;
				if (Array.isArray(parsed)) {
					for (const item of parsed) {
						schemaNodes.push(...collectJsonLdNodes(item));
					}
				} else {
					schemaNodes.push(...collectJsonLdNodes(parsed));
				}
			} catch {
				continue;
			}
		}

		return schemaNodes.find((node) => {
			const typeValue = node['@type'];
			if (typeof typeValue === 'string') {
				return typeValue.toLowerCase() === 'recipe';
			}

			if (Array.isArray(typeValue)) {
				return typeValue.some((entry) => typeof entry === 'string' && entry.toLowerCase() === 'recipe');
			}

			return false;
		});
	}

	function extractRecipeFromDocument(doc: Document, baseUrl: string): ExtractedRecipeData {
		const recipeSchema = findRecipeSchema(doc);
		const titleFromMeta =
			toSingleLineText(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')) ??
			toSingleLineText(doc.querySelector('title')?.textContent);
		const descriptionFromMeta = toMultilineText(
			doc.querySelector('meta[name="description"]')?.getAttribute('content') ??
				doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
		);
		const imageFromMeta = toAbsoluteUrl(
			doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
			baseUrl
		);

		if (!recipeSchema) {
			return {
				name: titleFromMeta,
				description: descriptionFromMeta,
				imageUrl: imageFromMeta
			};
		}

		const imageValue = recipeSchema.image;
		const imageSource = Array.isArray(imageValue)
			? imageValue.find((entry) => typeof entry === 'string')
			: imageValue;
		const image = toAbsoluteUrl(
			isRecord(imageSource) ? imageSource.url : imageSource,
			baseUrl
		);

		const instructions = normalizeInstructions(recipeSchema.recipeInstructions);
		const ingredientsList = normalizeIngredients(recipeSchema.recipeIngredient);
		const recipeCategory = toSingleLineText(
			Array.isArray(recipeSchema.recipeCategory)
				? recipeSchema.recipeCategory.find((entry) => typeof entry === 'string')
				: recipeSchema.recipeCategory
		);
		const tagsFromKeywords = toStringArray(recipeSchema.keywords);

		const prepTime = parseDurationToMinutes(recipeSchema.prepTime);
		const cookTime = parseDurationToMinutes(recipeSchema.cookTime);
		const totalTime = parseDurationToMinutes(recipeSchema.totalTime);

		return {
			name: toSingleLineText(recipeSchema.name) ?? titleFromMeta,
			description: toMultilineText(recipeSchema.description) ?? descriptionFromMeta,
			imageUrl: image ?? imageFromMeta,
			ingredients: ingredientsList,
			preparationSteps: instructions,
			servings: parseServings(recipeSchema.recipeYield),
			prepTimeMinutes: prepTime ?? (totalTime !== undefined && cookTime !== undefined ? totalTime - cookTime : undefined),
			cookTimeMinutes: cookTime,
			tags: tagsFromKeywords,
			categoryName: recipeCategory,
			isAlcoholic: /cocktail|alcohol|wine|beer|liqueur|rum|vodka|whiskey|tequila/i.test(
				[
					toSingleLineText(recipeSchema.name),
					toSingleLineText(recipeSchema.description),
					tagsFromKeywords.join(','),
					recipeCategory
				]
					.filter((entry): entry is string => Boolean(entry))
					.join(' ')
			)
		};
	}

	async function assignCategoryByName(categoryName: string) {
		const normalizedName = categoryName.trim();
		if (!normalizedName) return;

		const matched = categories.find(
			(category) => category.name.toLowerCase() === normalizedName.toLowerCase()
		);
		if (matched) {
			selectedCategoryId = matched._id;
			return;
		}

		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: normalizedName })
			});

			if (!response.ok) return;

			const data = (await response.json()) as { category: Category };
			categories = [...categories, data.category].sort((first, second) =>
				first.name.localeCompare(second.name)
			);
			selectedCategoryId = data.category._id;
		} catch {
			return;
		}
	}

	function applyExtractedRecipe(data: ExtractedRecipeData) {
		if (data.name) name = data.name;
		if (data.description) description = data.description;
		if (data.imageUrl) imageUrl = data.imageUrl;

		if (data.ingredients && data.ingredients.length > 0) {
			ingredients = data.ingredients;
		}

		if (data.preparationSteps && data.preparationSteps.length > 0) {
			preparationSteps = data.preparationSteps;
		}

		if (data.servings !== undefined) servings = String(data.servings);
		if (data.prepTimeMinutes !== undefined) prepTimeMinutes = String(data.prepTimeMinutes);
		if (data.cookTimeMinutes !== undefined) cookTimeMinutes = String(data.cookTimeMinutes);

		if (data.tips && data.tips.length > 0) {
			tips = data.tips.join('\n');
		}

		if (data.tags && data.tags.length > 0) {
			tags = data.tags.join(', ');
		}

		if (data.isAlcoholic !== undefined) {
			isAlcoholic = data.isAlcoholic;
		}
	}

	async function importRecipeFromUrl() {
		importError = '';
		formError = '';
		const normalizedUrl = sourceUrl.trim();

		if (!normalizedUrl) {
			importError = 'Please provide a recipe URL.';
			return;
		}

		let parsedUrl: URL;
		try {
			parsedUrl = new URL(normalizedUrl);
		} catch {
			importError = 'Please provide a valid URL.';
			return;
		}

		isImportingFromUrl = true;

		try {
			const response = await fetch('/api/recipes/import-from-url', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ url: parsedUrl.toString() })
			});

			const data = (await response.json().catch(() => ({}))) as ImportRecipeResponse;

			if (!response.ok) {
				importError = data.error ?? 'Failed to read that URL. Try another recipe page.';
				return;
			}

			const extracted = data.recipe;
			if (!extracted) {
				importError = 'Could not extract recipe details from this URL.';
				return;
			}
			const hasImportedData = Boolean(
				extracted.name ||
					extracted.description ||
					extracted.imageUrl ||
					(extracted.ingredients && extracted.ingredients.length > 0) ||
					(extracted.preparationSteps && extracted.preparationSteps.length > 0)
			);

			if (!hasImportedData) {
				importError = 'Could not extract recipe details from this URL.';
				return;
			}

			applyExtractedRecipe(extracted);

			if (extracted.categoryName) {
				await assignCategoryByName(extracted.categoryName);
			}
		} catch {
			importError = 'Could not import from URL right now. Please try again.';
		} finally {
			isImportingFromUrl = false;
		}
	}

	function addIngredient() {
		ingredients = [...ingredients, { name: '', quantity: '', optional: false }];
	}

	function removeIngredient(index: number) {
		if (ingredients.length === 1) return;
		ingredients = ingredients.filter((_, itemIndex) => itemIndex !== index);
	}

	function updateIngredient(index: number, field: keyof IngredientInput, value: string | boolean) {
		ingredients = ingredients.map((ingredient, itemIndex) => {
			if (itemIndex !== index) return ingredient;
			return { ...ingredient, [field]: value };
		});
	}

	function addPreparationStep() {
		preparationSteps = [...preparationSteps, ''];
	}

	function removePreparationStep(index: number) {
		if (preparationSteps.length === 1) return;
		preparationSteps = preparationSteps.filter((_, stepIndex) => stepIndex !== index);
	}

	function updatePreparationStep(index: number, value: string) {
		preparationSteps = preparationSteps.map((step, stepIndex) => (stepIndex === index ? value : step));
	}

	function revealFormError() {
		queueMicrotask(() => {
			formErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		});
	}

	async function submitRecipe(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		const normalizedName = name.trim();
		const normalizedDescription = description.trim();
		const normalizedIngredients = ingredients
			.map((ingredient) => ({
				name: ingredient.name.trim(),
				quantity: ingredient.quantity.trim(),
				optional: ingredient.optional
			}))
			.filter((ingredient) => ingredient.name && ingredient.quantity);
		const normalizedSteps = preparationSteps
			.map((step) => step.trim())
			.filter((step) => step.length > 0);
		const normalizedImageUrl = imageUrl.trim();
		const normalizedTips = tips
			.split('\n')
			.map((tip) => tip.trim())
			.filter((tip) => tip.length > 0);
		const normalizedTags = tags
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
		const normalizedServingsValue = String(servings ?? '').trim();
		const normalizedPrepTimeValue = String(prepTimeMinutes ?? '').trim();
		const normalizedCookTimeValue = String(cookTimeMinutes ?? '').trim();
		const parsedServings = normalizedServingsValue ? Number(normalizedServingsValue) : undefined;
		const parsedPrepTime = normalizedPrepTimeValue ? Number(normalizedPrepTimeValue) : undefined;
		const parsedCookTime = normalizedCookTimeValue ? Number(normalizedCookTimeValue) : undefined;

		if (!normalizedName || !normalizedDescription) {
			formError = 'Name and description are required.';
			revealFormError();
			return;
		}

		if (!selectedCategoryId) {
			formError = 'Please select a category.';
			revealFormError();
			return;
		}

		if (normalizedIngredients.length === 0) {
			formError = 'Add at least one ingredient with quantity and name.';
			revealFormError();
			return;
		}

		if (normalizedSteps.length === 0) {
			formError = 'Add at least one preparation step.';
			revealFormError();
			return;
		}

		if (
			(parsedServings !== undefined && (!Number.isFinite(parsedServings) || parsedServings < 0)) ||
			(parsedPrepTime !== undefined && (!Number.isFinite(parsedPrepTime) || parsedPrepTime < 0)) ||
			(parsedCookTime !== undefined && (!Number.isFinite(parsedCookTime) || parsedCookTime < 0))
		) {
			formError = 'Numeric fields must be valid positive numbers.';
			revealFormError();
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/recipes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: normalizedName,
					description: normalizedDescription,
					category: selectedCategoryId,
					ingredients: normalizedIngredients,
					preparationSteps: normalizedSteps,
					imageUrl: normalizedImageUrl || undefined,
					servings: parsedServings,
					prepTimeMinutes: parsedPrepTime,
					cookTimeMinutes: parsedCookTime,
					tips: normalizedTips,
					tags: normalizedTags,
					isAlcoholic
				})
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { error?: string };
				formError = data.error ?? 'Failed to create recipe.';
				revealFormError();
				return;
			}

			const data = (await response.json()) as { recipe: ApiRecipe };
			dispatch('created', data.recipe);
			resetForm();
			closeModal();
		} catch {
			formError = 'Could not connect to server.';
			revealFormError();
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-50 bg-black/50 p-3 sm:p-4"
	on:click|self={closeModal}
	on:keydown={(event) => event.key === 'Escape' && closeModal()}
	role="button"
	tabindex="0"
	aria-label="Close add recipe modal"
>
	<div class="mx-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 sm:p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold sm:text-xl">Add Recipe</h2>
			<button
				type="button"
				on:click={closeModal}
				class="rounded-md border border-gray-200 px-2 py-1 text-base leading-none"
				aria-label="Close"
			>
				×
			</button>
		</div>

		<form class="space-y-5" novalidate on:submit={submitRecipe}>
			<div class="space-y-2 rounded-md border border-gray-200 p-3">
				<label for="sourceUrl" class="block text-sm font-medium">Import from URL</label>
				<div class="flex flex-col gap-2 sm:flex-row">
					<input
						id="sourceUrl"
						type="url"
						bind:value={sourceUrl}
						placeholder="https://example.com/recipe"
						class="w-full rounded-md border-gray-300 text-sm"
					/>
					<button
						type="button"
						on:click={importRecipeFromUrl}
						disabled={isImportingFromUrl}
						class="rounded-md border border-black px-3 py-2 text-sm disabled:opacity-60"
					>
						{isImportingFromUrl ? 'Importing...' : 'Import'}
					</button>
				</div>
				{#if importError}
					<p class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{importError}</p>
				{/if}
			</div>

			<div class="space-y-4">
				<div>
					<label for="name" class="mb-1 block text-sm font-medium">Recipe Name</label>
					<input
						id="name"
						type="text"
						required
						bind:value={name}
						class="w-full rounded-md border-gray-300 text-sm"
					/>
				</div>

				<div>
					<label for="description" class="mb-1 block text-sm font-medium">Description</label>
					<textarea
						id="description"
						required
						rows="3"
						bind:value={description}
						class="w-full rounded-md border-gray-300 text-sm"
					></textarea>
				</div>

				<div class="space-y-2 rounded-md border border-gray-200 p-3">
					<div class="flex items-center justify-between">
						<label for="category" class="block text-sm font-medium">Dish Category</label>
						<button
							type="button"
							on:click={() => (isManagingCategories = !isManagingCategories)}
							class="rounded-md border border-gray-300 px-2 py-1 text-xs"
						>
							{isManagingCategories ? 'Hide' : 'Manage'}
						</button>
					</div>

					<select
						id="category"
						required
						bind:value={selectedCategoryId}
						disabled={isLoadingCategories}
						class="w-full rounded-md border-gray-300 text-sm"
					>
						<option value="">Select category</option>
						{#each categories as category}
							<option value={category._id}>{category.name}</option>
						{/each}
					</select>

					{#if isManagingCategories}
						<div class="space-y-3 border-t border-gray-200 pt-3">
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={newCategoryName}
									placeholder="New category"
									class="w-full rounded-md border-gray-300 text-sm"
								/>
								<button
									type="button"
									on:click={createCategory}
									class="rounded-md border border-black px-3 py-1 text-sm"
								>
									Add
								</button>
							</div>

							<div class="max-h-36 space-y-2 overflow-y-auto pr-1">
								{#each categories as category}
									<div class="flex items-center gap-2 rounded-md border border-gray-200 p-2">
										{#if editingCategoryId === category._id}
											<input
												type="text"
												bind:value={editingCategoryName}
												class="w-full rounded-md border-gray-300 text-sm"
											/>
											<button
												type="button"
												on:click={() => saveCategoryEdit(category._id)}
												class="rounded-md border border-black px-2 py-1 text-xs"
											>
												Save
											</button>
											<button
												type="button"
												on:click={cancelEditingCategory}
												class="rounded-md border border-gray-300 px-2 py-1 text-xs"
											>
												Cancel
											</button>
										{:else}
											<p class="w-full truncate text-sm">{category.name}</p>
											<button
												type="button"
												on:click={() => startEditingCategory(category)}
												class="rounded-md border border-gray-300 px-2 py-1 text-xs"
											>
												Edit
											</button>
											<button
												type="button"
												on:click={() => removeCategory(category._id)}
												class="rounded-md border border-gray-300 px-2 py-1 text-xs"
											>
												Delete
											</button>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if categoryError}
						<p class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{categoryError}</p>
					{/if}
				</div>

				<div>
					<label for="imageUrl" class="mb-1 block text-sm font-medium">Image URL</label>
					<input
						id="imageUrl"
						type="url"
						bind:value={imageUrl}
						placeholder="https://..."
						class="w-full rounded-md border-gray-300 text-sm"
					/>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<div>
						<label for="servings" class="mb-1 block text-sm font-medium">Servings</label>
						<input
							id="servings"
							type="number"
							min="0"
							bind:value={servings}
							class="w-full rounded-md border-gray-300 text-sm"
						/>
					</div>
					<div>
						<label for="prepTimeMinutes" class="mb-1 block text-sm font-medium">Prep (min)</label>
						<input
							id="prepTimeMinutes"
							type="number"
							min="0"
							bind:value={prepTimeMinutes}
							class="w-full rounded-md border-gray-300 text-sm"
						/>
					</div>
					<div>
						<label for="cookTimeMinutes" class="mb-1 block text-sm font-medium">Cook (min)</label>
						<input
							id="cookTimeMinutes"
							type="number"
							min="0"
							bind:value={cookTimeMinutes}
							class="w-full rounded-md border-gray-300 text-sm"
						/>
					</div>
				</div>

				<div>
					<label for="tips" class="mb-1 block text-sm font-medium">Tips (one per line)</label>
					<textarea
						id="tips"
						rows="2"
						bind:value={tips}
						class="w-full rounded-md border-gray-300 text-sm"
					></textarea>
				</div>

				<div>
					<label for="tags" class="mb-1 block text-sm font-medium">Tags (comma separated)</label>
					<input
						id="tags"
						type="text"
						bind:value={tags}
						placeholder="winter, drink"
						class="w-full rounded-md border-gray-300 text-sm"
					/>
				</div>

				<label class="flex items-center gap-2 text-sm font-medium">
					<input type="checkbox" bind:checked={isAlcoholic} class="rounded border-gray-300" />
					Alcoholic recipe
				</label>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="text-base font-semibold">Ingredients</h3>
					<button
						type="button"
						on:click={addIngredient}
						class="rounded-md border border-black px-3 py-1 text-sm"
					>
						Add Ingredient
					</button>
				</div>

				{#each ingredients as ingredient, index}
					<div class="space-y-2 rounded-md border border-gray-200 p-3">
						<div class="grid gap-2 sm:grid-cols-2">
							<div>
								<label for={`quantity-${index}`} class="mb-1 block text-xs font-medium">Quantity</label>
								<input
									id={`quantity-${index}`}
									type="text"
									value={ingredient.quantity}
									on:input={(event) =>
										updateIngredient(index, 'quantity', (event.currentTarget as HTMLInputElement).value)}
									class="w-full rounded-md border-gray-300 text-sm"
								/>
							</div>
							<div>
								<label for={`ingredient-${index}`} class="mb-1 block text-xs font-medium"
									>Ingredient Name</label
								>
								<input
									id={`ingredient-${index}`}
									type="text"
									value={ingredient.name}
									on:input={(event) =>
										updateIngredient(index, 'name', (event.currentTarget as HTMLInputElement).value)}
									class="w-full rounded-md border-gray-300 text-sm"
								/>
							</div>
						</div>

						<div class="flex items-center justify-between">
							<label class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={ingredient.optional}
									on:change={(event) =>
										updateIngredient(index, 'optional', (event.currentTarget as HTMLInputElement).checked)}
									class="rounded border-gray-300"
								/>
								Optional ingredient
							</label>
							<button
								type="button"
								on:click={() => removeIngredient(index)}
								disabled={ingredients.length === 1}
								class="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
							>
								Remove
							</button>
						</div>
					</div>
				{/each}
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="text-base font-semibold">Preparation Steps</h3>
					<button
						type="button"
						on:click={addPreparationStep}
						class="rounded-md border border-black px-3 py-1 text-sm"
					>
						Add Step
					</button>
				</div>

				{#each preparationSteps as step, index}
					<div class="space-y-2 rounded-md border border-gray-200 p-3">
						<label for={`step-${index}`} class="mb-1 block text-xs font-medium">Step {index + 1}</label>
						<textarea
							id={`step-${index}`}
							rows="2"
							value={step}
							on:input={(event) =>
								updatePreparationStep(index, (event.currentTarget as HTMLTextAreaElement).value)}
							class="w-full rounded-md border-gray-300 text-sm"
						></textarea>
						<div class="flex justify-end">
							<button
								type="button"
								on:click={() => removePreparationStep(index)}
								disabled={preparationSteps.length === 1}
								class="rounded-md border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
							>
								Remove
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if formError}
				<p bind:this={formErrorElement} class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
					{formError}
				</p>
			{/if}

			<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					on:click={closeModal}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					class="rounded-md border border-black bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
				>
					{isSubmitting ? 'Saving...' : 'Save Recipe'}
				</button>
			</div>
		</form>
	</div>
</div>
