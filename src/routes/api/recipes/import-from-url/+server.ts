import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type IngredientInput = {
	name: string;
	quantity: string;
	optional: boolean;
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

	const isoMatch = normalized.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
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

const commonMeasureUnits = [
	'ml',
	'l',
	'dl',
	'cl',
	'g',
	'kg',
	'mg',
	'oz',
	'lb',
	'lbs',
	'pound',
	'pounds',
	'cup',
	'cups',
	'tablespoon',
	'tablespoons',
	'tbsp',
	'tsp',
	'teaspoon',
	'teaspoons',
	'pinch',
	'pinches',
	'handful',
	'handfuls',
	'sprig',
	'sprigs',
	'bunch',
	'bunches',
	'stick',
	'sticks',
	'slice',
	'slices',
	'piece',
	'pieces',
	'package',
	'packages',
	'packet',
	'packets',
	'can',
	'cans',
	'jar',
	'jars',
	'bottle',
	'bottles'
].join('|');

const numberToken = '(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])';

const leadingMeasuredQuantityRegex = new RegExp(
	`^((?:about\\s+|approx\\.?\\s+|around\\s+)?${numberToken}(?:\\s*(?:-|–|to)\\s*${numberToken})?\\s*(?:${commonMeasureUnits})\\b)` ,
	'i'
);

const leadingCountRegex = new RegExp(`^(${numberToken}(?:\\s*(?:-|–|to)\\s*${numberToken})?)\\b`, 'i');

function parseIngredientLine(ingredientLine: string): IngredientInput {
	const normalizedLine = ingredientLine.replace(/\s+/g, ' ').trim();

	const measuredMatch = normalizedLine.match(leadingMeasuredQuantityRegex);
	if (measuredMatch) {
		const quantity = measuredMatch[1].trim();
		const remainder = normalizedLine
			.slice(measuredMatch[0].length)
			.replace(/^\s*[-,:;)]\s*/, '')
			.trim();

		return {
			quantity,
			name: remainder || normalizedLine,
			optional: false
		};
	}

	const countMatch = normalizedLine.match(leadingCountRegex);
	if (countMatch) {
		const quantity = countMatch[1].trim();
		const remainder = normalizedLine
			.slice(countMatch[0].length)
			.replace(/^\s*[-,:;)]\s*/, '')
			.trim();

		if (remainder) {
			return {
				quantity,
				name: remainder,
				optional: false
			};
		}
	}

	return {
		name: normalizedLine,
		quantity: 'to taste',
		optional: false
	};
}

function normalizeIngredients(value: unknown): IngredientInput[] {
	if (!Array.isArray(value)) return [];

	const normalized: Array<IngredientInput | null> = value.map((entry): IngredientInput | null => {
		if (typeof entry === 'string') {
			const ingredientLine = entry.trim();
			if (!ingredientLine) return null;
			return parseIngredientLine(ingredientLine);
		}

		if (isRecord(entry) && typeof entry.text === 'string') {
			const ingredientLine = entry.text.trim();
			if (!ingredientLine) return null;
			return parseIngredientLine(ingredientLine);
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

			if (isRecord(entry) && Array.isArray(entry.itemListElement)) {
				return normalizeInstructions(entry.itemListElement);
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

function getTypeValues(typeValue: unknown): string[] {
	if (typeof typeValue === 'string') return [typeValue.toLowerCase()];
	if (!Array.isArray(typeValue)) return [];

	return typeValue
		.filter((entry): entry is string => typeof entry === 'string')
		.map((entry) => entry.toLowerCase());
}

function findRecipeSchemaFromHtml(html: string): Record<string, unknown> | undefined {
	const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
	const schemaNodes: Record<string, unknown>[] = [];

	let match: RegExpExecArray | null;
	while ((match = scriptRegex.exec(html)) !== null) {
		const rawContent = match[1]?.trim();
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

	return schemaNodes.find((node) => getTypeValues(node['@type']).includes('recipe'));
}

function getMetaContent(html: string, key: string): string | undefined {
	const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regexes = [
		new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
		new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
	];

	for (const regex of regexes) {
		const match = html.match(regex);
		if (match?.[1]) return toSingleLineText(match[1]);
	}

	return undefined;
}

function getHtmlTitle(html: string): string | undefined {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (!match?.[1]) return undefined;
	return toSingleLineText(match[1]);
}

function extractRecipeFromHtml(html: string, baseUrl: string): ExtractedRecipeData {
	const recipeSchema = findRecipeSchemaFromHtml(html);
	const titleFromMeta = getMetaContent(html, 'og:title') ?? getHtmlTitle(html);
	const descriptionFromMeta = toMultilineText(
		getMetaContent(html, 'description') ?? getMetaContent(html, 'og:description')
	);
	const imageFromMeta = toAbsoluteUrl(getMetaContent(html, 'og:image'), baseUrl);

	if (!recipeSchema) {
		return {
			name: titleFromMeta,
			description: descriptionFromMeta,
			imageUrl: imageFromMeta
		};
	}

	const imageValue = recipeSchema.image;
	const imageSource = Array.isArray(imageValue)
		? imageValue.find((entry) => typeof entry === 'string' || isRecord(entry))
		: imageValue;
	const image = toAbsoluteUrl(isRecord(imageSource) ? imageSource.url : imageSource, baseUrl);

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
		prepTimeMinutes:
			prepTime ?? (totalTime !== undefined && cookTime !== undefined ? totalTime - cookTime : undefined),
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

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url } = (await request.json()) as { url?: string };
		const normalizedUrl = url?.trim();

		if (!normalizedUrl) {
			return json({ error: 'Recipe URL is required.' }, { status: 400 });
		}

		let parsedUrl: URL;
		try {
			parsedUrl = new URL(normalizedUrl);
		} catch {
			return json({ error: 'Invalid URL.' }, { status: 400 });
		}

		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			return json({ error: 'Only HTTP(S) URLs are supported.' }, { status: 400 });
		}

		const response = await fetch(parsedUrl.toString(), {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; RecipesApp/1.0)',
				Accept: 'text/html,application/xhtml+xml'
			}
		});

		if (!response.ok) {
			return json({ error: 'Could not fetch recipe URL.' }, { status: 502 });
		}

		const html = await response.text();
		const recipe = extractRecipeFromHtml(html, parsedUrl.toString());

		const hasImportedData = Boolean(
			recipe.name ||
				recipe.description ||
				recipe.imageUrl ||
				(recipe.ingredients && recipe.ingredients.length > 0) ||
				(recipe.preparationSteps && recipe.preparationSteps.length > 0)
		);

		if (!hasImportedData) {
			return json({ error: 'Could not extract recipe details from this URL.' }, { status: 422 });
		}

		return json({ recipe });
	} catch {
		return json({ error: 'Failed to import recipe from URL.' }, { status: 500 });
	}
};
