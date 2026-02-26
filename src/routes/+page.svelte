<script lang="ts">
	const categories = ['Breakfast', 'Lunch', 'Dinner', 'Desserts'];

	const recipes = [
		{
			title: 'Avocado Toast Bowl',
			stats: '245 saves · 35 shares',
			image:
				'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=900&q=80'
		},
		{
			title: 'Lemon Herb Pasta',
			stats: '182 saves · 24 shares',
			image:
				'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80'
		},
		{
			title: 'Berry Yogurt Parfait',
			stats: '323 saves · 41 shares',
			image:
				'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80'
		},
		{
			title: 'Grilled Chicken Salad',
			stats: '211 saves · 29 shares',
			image:
				'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'
		},
		{
			title: 'Spicy Ramen Bowl',
			stats: '276 saves · 33 shares',
			image:
				'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=900&q=80'
		},
		{
			title: 'Chocolate Pancakes',
			stats: '398 saves · 58 shares',
			image:
				'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80'
		}
	];
</script>

<div class="flex min-h-screen items-center justify-center bg-cyan-50">
	<div class="m-2 w-[98vw] max-w-[1900px] space-y-10 rounded-3xl bg-white p-6 shadow-2xl md:space-y-12 md:p-14 lg:w-[97vw] lg:p-16">
		<div
			class="flex flex-col items-center justify-center space-y-3 md:mb-16 md:flex-row md:justify-end md:space-y-0 md:space-x-8 lg:mb-24"
		>
			{#each categories as category}
				<div class="group">
					<button type="button">{category}</button>
					<div class="mx-2 mt-2 border-b-2 border-black opacity-0 duration-500 group-hover:opacity-100"></div>
				</div>
			{/each}
		</div>

		<div class="flex flex-col justify-between space-y-5 md:flex-row md:space-y-0">
			<div class="flex justify-between border-b">
				<input
					type="text"
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
				class="rounded-md border border-black bg-black px-14 py-3 text-lg font-normal text-white shadow-2xl duration-200 hover:bg-white hover:text-black"
			>
				Add Recipe
			</button>
		</div>

		<div class="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each recipes as recipe}
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
			{/each}
		</div>
	</div>
</div>
