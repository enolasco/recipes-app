<script lang="ts">
	import { onMount } from 'svelte';
	import AddRecipeModal from '$lib/components/AddRecipeModal.svelte';

		const defaultCategories = ['Breakfast', 'Lunch', 'Dinner', 'Desserts'];
	const fallbackImage =
		'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80';

	type ApiRecipe = {
		_id?: unknown;
		name: string;
		description: string;
		category?: { _id: string; name: string } | string;
		ingredients?: Array<{ name: string; quantity: string }>;
		preparationSteps?: string[];
		imageUrl?: string;
	};

	type RecipeCard = {
		id: string;
		title: string;
		stats: string;
		image: string;
		category: string;
		detailsHref?: string;
	};

	const demoRecipes: RecipeCard[] = [
		{
			id: 'demo-1',
			title: 'Avocado Toast Bowl',
			stats: '245 saves · 35 shares',
			category: 'Breakfast',
			image:
				'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=900&q=80'
		},
		{
			id: 'demo-2',
			title: 'Lemon Herb Pasta',
			stats: '182 saves · 24 shares',
			category: 'Lunch',
			image:
				'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80'
		},
		{
			id: 'demo-3',
			title: 'Berry Yogurt Parfait',
			stats: '323 saves · 41 shares',
			category: 'Desserts',
			image:
				'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80'
		},
		{
			id: 'demo-4',
			title: 'Grilled Chicken Salad',
			stats: '211 saves · 29 shares',
			category: 'Dinner',
			image:
				'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'
		},
		{
			id: 'demo-5',
			title: 'Spicy Ramen Bowl',
			stats: '276 saves · 33 shares',
			category: 'Dinner',
			image:
				'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=900&q=80'
		},
		{
			id: 'demo-6',
			title: 'Chocolate Pancakes',
			stats: '398 saves · 58 shares',
			category: 'Breakfast',
			image:
				'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80'
		}
	];

	let recipes: RecipeCard[] = demoRecipes;
	let categories: string[] = defaultCategories;
	let isAddRecipeOpen = false;
	let searchQuery = '';
	let selectedCategory = '';

	$: normalizedSearchQuery = searchQuery.trim().toLowerCase();
	$: normalizedSelectedCategory = selectedCategory.trim().toLowerCase();
	$: filteredRecipes = recipes.filter((recipe) => {
		const matchesSearch = normalizedSearchQuery
			? recipe.title.toLowerCase().includes(normalizedSearchQuery)
			: true;
		const matchesCategory = normalizedSelectedCategory
			? recipe.category.toLowerCase() === normalizedSelectedCategory
			: true;

		return matchesSearch && matchesCategory;
	});

	function toRecipeId(value: unknown): string {
		if (typeof value === 'string' && value.trim()) return value;
		if (typeof value === 'number' && Number.isFinite(value)) return String(value);

		if (value && typeof value === 'object' && 'toString' in value) {
			const toString = (value as { toString?: () => string }).toString;
			if (typeof toString === 'function') {
				const serialized = toString.call(value);
				if (serialized && serialized !== '[object Object]') {
					return serialized;
				}
			}
		}

		return crypto.randomUUID();
	}

	function toRecipeCard(recipe: ApiRecipe): RecipeCard {
		const ingredientCount = recipe.ingredients?.length ?? 0;
		const stepCount = recipe.preparationSteps?.length ?? 0;
		const categoryName =
			typeof recipe.category === 'object' && recipe.category && 'name' in recipe.category
				? String(recipe.category.name)
				: 'Uncategorized';

		return {
			id: toRecipeId(recipe._id),
			title: recipe.name,
			stats: `${categoryName} · ${ingredientCount} ingredients · ${stepCount} steps`,
			image: recipe.imageUrl || fallbackImage,
			category: categoryName,
			detailsHref: recipe._id ? `/recipes/${toRecipeId(recipe._id)}` : undefined
		};
	}

	async function loadCategories() {
		try {
			const response = await fetch('/api/categories');
			if (!response.ok) return;

			const data = (await response.json()) as { categories?: Array<{ name: string }> };
			const names = (data.categories ?? []).map((category) => category.name);
			if (names.length > 0) {
				categories = names;
				if (selectedCategory && !names.includes(selectedCategory)) {
					selectedCategory = '';
				}
			}
		} catch {
			categories = defaultCategories;
			if (selectedCategory && !defaultCategories.includes(selectedCategory)) {
				selectedCategory = '';
			}
		}
	}

	async function loadRecipes() {
		try {
			const response = await fetch('/api/recipes');
			if (!response.ok) return;

			const data = (await response.json()) as { recipes?: ApiRecipe[] };
			if (!data.recipes || data.recipes.length === 0) return;

			recipes = data.recipes.map(toRecipeCard);
		} catch {
			recipes = demoRecipes;
		}
	}

	onMount(() => {
		void loadCategories();
		void loadRecipes();
	});

	function openAddRecipeModal() {
		isAddRecipeOpen = true;
	}

	function closeAddRecipeModal() {
		isAddRecipeOpen = false;
		void loadCategories();
		void loadRecipes();
	}

	function toggleCategoryFilter(category: string) {
		selectedCategory = selectedCategory === category ? '' : category;
	}

	function handleRecipeCreated(event: CustomEvent<ApiRecipe>) {
		const createdRecipe = toRecipeCard(event.detail);
		recipes = [createdRecipe, ...recipes.filter((recipe) => recipe.id !== createdRecipe.id)];
		void loadCategories();
		void loadRecipes();
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-cyan-50">
	<div class="m-2 w-[98vw] max-w-475 space-y-10 rounded-3xl bg-white p-6 shadow-2xl md:space-y-12 md:p-14 lg:w-[97vw] lg:p-16">
		<div
			class="flex flex-col items-center justify-center space-y-3 md:mb-16 md:flex-row md:justify-end md:space-y-0 md:space-x-8 lg:mb-24"
		>
			{#each categories as category}
				<div class="group">
					<button type="button" on:click={() => toggleCategoryFilter(category)}>{category}</button>
					<div
						class="mx-2 mt-2 border-b-2 border-black duration-500 opacity-0 group-hover:opacity-100"
						class:opacity-100={selectedCategory === category}
					></div>
				</div>
			{/each}
		</div>

		<div class="flex flex-col justify-between space-y-5 md:flex-row md:space-y-0">
			<div class="flex justify-between border-b">
				<input
					type="text"
					bind:value={searchQuery}
					class="ml-6 border-none placeholder:font-thin focus:outline-none md:w-80"
					placeholder="Search recipes"
				/>
				<button type="button" aria-label="Search recipes">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-8 text-gray-300 duration-200 hover:scale-110"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						fill="none"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
						<circle cx="10" cy="10" r="7"></circle>
						<line x1="21" y1="21" x2="15" y2="15"></line>
					</svg>
				</button>
			</div>

			<button
				type="button"
				on:click={openAddRecipeModal}
				class="rounded-md border border-black bg-black px-14 py-3 text-lg font-normal text-white shadow-2xl duration-200 hover:bg-white hover:text-black"
			>
				Add Recipe
			</button>
		</div>

		<div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each filteredRecipes as recipe (recipe.id)}
				{#if recipe.detailsHref}
					<a href={recipe.detailsHref} class="group relative block">
						<img src={recipe.image} alt={recipe.title} class="h-56 w-full object-cover" />
						<div
							class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 p-2 px-4 text-white opacity-0 duration-500 group-hover:opacity-100"
						>
							<div class="flex w-full justify-between">
								<div class="font-normal">
									<p class="text-sm">{recipe.title}</p>
									<p class="text-xs">{recipe.stats}</p>
								</div>
								<div class="flex items-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
									>
										<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3-6 3V4.5Z"></path>
									</svg>
								</div>
							</div>
						</div>
					</a>
				{:else}
					<div class="group relative">
						<img src={recipe.image} alt={recipe.title} class="h-56 w-full object-cover" />
						<div
							class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 p-2 px-4 text-white opacity-0 duration-500 group-hover:opacity-100"
						>
							<div class="flex w-full justify-between">
								<div class="font-normal">
									<p class="text-sm">{recipe.title}</p>
									<p class="text-xs">{recipe.stats}</p>
								</div>
								<div class="flex items-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
									>
										<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3-6 3V4.5Z"></path>
									</svg>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>

{#if isAddRecipeOpen}
	<AddRecipeModal on:close={closeAddRecipeModal} on:created={handleRecipeCreated} />
{/if}
