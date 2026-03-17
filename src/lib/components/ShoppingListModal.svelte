<script lang="ts">
	import { shoppingListStore, type ShoppingListRecipe, type ConsolidatedIngredient } from '$lib/stores/shoppingListStore';

	let showModal = false;
	let consolidatedIngredients: ConsolidatedIngredient[] = [];

	$: if (showModal && $shoppingListStore.length > 0) {
		consolidatedIngredients = shoppingListStore.consolidateIngredients($shoppingListStore);
	}

	function closeModal() {
		showModal = false;
	}

	function removeRecipe(recipeId: string) {
		shoppingListStore.removeRecipe(recipeId);
		if ($shoppingListStore.length === 0) {
			showModal = false;
		}
	}

	function updateServing(recipeId: string, servings: number) {
		shoppingListStore.updateServing(recipeId, servings);
		consolidatedIngredients = shoppingListStore.consolidateIngredients($shoppingListStore);
	}

	function exportAsText() {
		let content = 'SHOPPING LIST\n';
		content += '='.repeat(50) + '\n\n';

		content += 'RECIPES:\n';
		$shoppingListStore.forEach((recipe) => {
			const servings = recipe.currentServings || recipe.servings || 1;
			content += `• ${recipe.name} (${servings} servings)\n`;
		});

		content += '\n' + '='.repeat(50) + '\n';
		content += 'CONSOLIDATED INGREDIENTS:\n';
		content += '='.repeat(50) + '\n\n';

		consolidatedIngredients.forEach((ingredient) => {
			const quantities = ingredient.quantities.join(' + ');
			const optional = ingredient.optional ? ' (optional)' : '';
			content += `☐ ${ingredient.quantities[0]} ${ingredient.name}${optional}\n`;
			if (ingredient.quantities.length > 1) {
				content += `    (from: ${ingredient.originRecipes.join(', ')})\n`;
			}
		});

		// Download as text file
		const element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
		element.setAttribute('download', 'shopping-list.txt');
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}

	function exportAsJson() {
		const content = {
			recipes: $shoppingListStore.map((r) => ({
				name: r.name,
				servings: r.currentServings || r.servings || 1
			})),
			consolidatedIngredients: consolidatedIngredients,
			exportDate: new Date().toISOString()
		};

		const element = document.createElement('a');
		element.setAttribute(
			'href',
			'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2))
		);
		element.setAttribute('download', 'shopping-list.json');
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}

	function clearList() {
		if (confirm('Are you sure you want to clear the shopping list?')) {
			shoppingListStore.clear();
			showModal = false;
		}
	}
</script>

<!-- Shopping List Button -->
<button
	type="button"
	on:click={() => (showModal = true)}
	class="relative rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
>
	🛒 Shopping List
	{#if $shoppingListStore.length > 0}
		<span class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
			>{$shoppingListStore.length}</span
		>
	{/if}
</button>

<!-- Shopping List Modal -->
{#if showModal}
	<div
		class="fixed inset-0 z-50 bg-black/50 p-3 sm:p-4"
		on:click|self={closeModal}
		on:keydown={(event) => event.key === 'Escape' && closeModal()}
		role="button"
		tabindex="0"
		aria-label="Close shopping list modal"
	>
		<div class="mx-auto flex max-h-[95vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white">
			<!-- Modal Header -->
			<div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-6 sm:py-6">
				<h2 class="text-lg font-semibold sm:text-xl">Shopping List</h2>
				<button
					type="button"
					on:click={closeModal}
					class="rounded-md border border-gray-200 px-2 py-1 text-base leading-none"
					aria-label="Close"
				>
					×
				</button>
			</div>

			<!-- Modal Content -->
			<div class="space-y-5 px-4 py-4 sm:px-6 sm:py-6">
				{#if $shoppingListStore.length === 0}
					<p class="text-sm text-gray-600">No recipes in your shopping list. Add recipes to get started!</p>
				{:else}
					<!-- Selected Recipes Section -->
					<div class="space-y-2">
						<p class="block text-sm font-medium">Selected Recipes</p>
						<div class="space-y-2 rounded-md border border-gray-200 p-3">
							{#each $shoppingListStore as recipe (recipe._id)}
								<div class="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3">
									<div>
										<p class="text-sm font-medium">{recipe.name}</p>
										<div class="mt-1 flex items-center gap-2">
											<input
												type="number"
												min="1"
												value={recipe.currentServings || recipe.servings || 1}
												on:change={(e) => {
													const val = parseInt(e.currentTarget.value) || 1;
													updateServing(recipe._id, val);
												}}
												class="w-14 rounded-md border border-gray-300 px-2 py-1 text-xs"
											/>
											<span class="text-xs text-gray-600">servings</span>
										</div>
									</div>
									<button
										type="button"
										on:click={() => removeRecipe(recipe._id)}
										class="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
									>
										Remove
									</button>
								</div>
							{/each}
						</div>
					</div>

					<!-- Consolidated Ingredients -->
					<div class="space-y-2">
						<p class="block text-sm font-medium">Consolidated Ingredients</p>
						<div class="space-y-2 rounded-md border border-gray-200 p-3 max-h-96 overflow-y-auto">
							{#each consolidatedIngredients as ingredient (ingredient.name)}
								<div class="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 p-3">
									<input type="checkbox" class="mt-1 cursor-pointer" />
									<div class="flex-1 text-sm">
										<p class="font-medium">
											{ingredient.quantities[0]} {ingredient.name}
											{#if ingredient.optional}
												<span class="text-xs text-gray-500">(optional)</span>
											{/if}
										</p>
										{#if ingredient.originRecipes.length > 0}
											<p class="mt-1 text-xs text-gray-500">From: {ingredient.originRecipes.join(', ')}</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Modal Footer / Export Buttons -->
			{#if $shoppingListStore.length > 0}
				<div class="border-t border-gray-200 px-4 py-4 sm:px-6 sm:py-6">
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							on:click={exportAsText}
							class="rounded-md border border-black px-3 py-2 text-sm font-medium hover:bg-gray-50"
						>
							📄 Text
						</button>
						<button
							type="button"
							on:click={exportAsJson}
							class="rounded-md border border-black px-3 py-2 text-sm font-medium hover:bg-gray-50"
						>
							📋 JSON
						</button>
						<button
							type="button"
							on:click={clearList}
							class="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
						>
							Clear
						</button>
						<button
							type="button"
							on:click={closeModal}
							class="ml-auto rounded-md border border-black bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
						>
							Done
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
