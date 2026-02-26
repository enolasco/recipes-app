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

	const dispatch = createEventDispatcher<{
		close: undefined;
		created: ApiRecipe;
	}>();

	let isSubmitting = false;
	let isLoadingCategories = false;
	let formError = '';
	let categoryError = '';

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
		const parsedServings = servings.trim() ? Number(servings) : undefined;
		const parsedPrepTime = prepTimeMinutes.trim() ? Number(prepTimeMinutes) : undefined;
		const parsedCookTime = cookTimeMinutes.trim() ? Number(cookTimeMinutes) : undefined;

		if (!normalizedName || !normalizedDescription) {
			formError = 'Name and description are required.';
			return;
		}

		if (!selectedCategoryId) {
			formError = 'Please select a category.';
			return;
		}

		if (normalizedIngredients.length === 0) {
			formError = 'Add at least one ingredient with quantity and name.';
			return;
		}

		if (normalizedSteps.length === 0) {
			formError = 'Add at least one preparation step.';
			return;
		}

		if (
			(parsedServings !== undefined && (!Number.isFinite(parsedServings) || parsedServings < 0)) ||
			(parsedPrepTime !== undefined && (!Number.isFinite(parsedPrepTime) || parsedPrepTime < 0)) ||
			(parsedCookTime !== undefined && (!Number.isFinite(parsedCookTime) || parsedCookTime < 0))
		) {
			formError = 'Numeric fields must be valid positive numbers.';
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
				return;
			}

			const data = (await response.json()) as { recipe: ApiRecipe };
			dispatch('created', data.recipe);
			resetForm();
			closeModal();
		} catch {
			formError = 'Could not connect to server.';
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

		<form class="space-y-5" on:submit={submitRecipe}>
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
									required
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
									required
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
							required
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
				<p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
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
