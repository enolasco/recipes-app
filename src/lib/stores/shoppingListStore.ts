import { writable } from 'svelte/store';

export type ShoppingListRecipe = {
	_id: string;
	name: string;
	servings?: number;
	currentServings?: number;
	ingredients: Array<{
		name: string;
		quantity: string;
		optional?: boolean;
	}>;
};

export type ConsolidatedIngredient = {
	name: string;
	quantities: string[];
	optional: boolean;
	originRecipes: string[];
};

function createShoppingListStore() {
	const { subscribe, set, update } = writable<ShoppingListRecipe[]>([]);

	return {
		subscribe,
		addRecipe: (recipe: ShoppingListRecipe) =>
			update((recipes) => {
				const exists = recipes.find((r) => r._id === recipe._id);
				if (!exists) {
					return [...recipes, recipe];
				}
				return recipes;
			}),
		removeRecipe: (recipeId: string) =>
			update((recipes) => recipes.filter((r) => r._id !== recipeId)),
		updateServing: (recipeId: string, servings: number) =>
			update((recipes) =>
				recipes.map((r) => (r._id === recipeId ? { ...r, currentServings: servings } : r))
			),
		clear: () => set([]),
		consolidateIngredients: (recipes: ShoppingListRecipe[]): ConsolidatedIngredient[] => {
			const ingredientMap = new Map<string, ConsolidatedIngredient>();

			recipes.forEach((recipe) => {
				const multiplier = recipe.currentServings && recipe.servings ? recipe.currentServings / recipe.servings : 1;

				recipe.ingredients.forEach((ingredient) => {
					const key = ingredient.name.toLowerCase().trim();

					if (!ingredientMap.has(key)) {
						ingredientMap.set(key, {
							name: ingredient.name,
							quantities: [],
							optional: ingredient.optional ?? false,
							originRecipes: []
						});
					}

					const consolidated = ingredientMap.get(key)!;
					const scaledQuantity = scaleQuantity(ingredient.quantity, multiplier);
					consolidated.quantities.push(scaledQuantity);
					if (!consolidated.originRecipes.includes(recipe.name)) {
						consolidated.originRecipes.push(recipe.name);
					}
					if (!ingredient.optional) {
						consolidated.optional = false;
					}
				});
			});

			return Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
		}
	};
}

function scaleQuantity(quantity: string, factor: number): string {
	if (factor === 1) return quantity;

	const normalized = quantity.trim();
	return normalized.replace(
		/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/g,
		(token) => {
			const parsed = parseNumericToken(token);
			if (parsed === null) return token;
			return formatScaledValue(parsed * factor);
		}
	);
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

export const shoppingListStore = createShoppingListStore();
