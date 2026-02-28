import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const response = await fetch(`/api/recipes/${params.id}`);
	const payload = (await response.json().catch(() => ({}))) as { recipe?: unknown; error?: string };

	if (!response.ok || !payload.recipe) {
		throw error(response.status || 500, payload.error ?? 'Recipe not found.');
	}

	return {
		recipe: payload.recipe
	};
};
