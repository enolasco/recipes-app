import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getDataProvider } from '$lib/server/data/provider';
import { mapDataErrorToHttp } from '$lib/server/data/httpErrors';

export const GET: RequestHandler = async () => {
	try {
		const provider = getDataProvider();
		const recipes = await provider.listRecipes();

		return json({ recipes });
	} catch {
		return json({ error: 'Failed to fetch recipes' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const provider = getDataProvider();
		const payload = await request.json();
		const recipe = await provider.createRecipe(payload);

		return json({ recipe }, { status: 201 });
	} catch (error) {
		const mapped = mapDataErrorToHttp(error, 'Failed to create recipe');
		return json({ error: mapped.error }, { status: mapped.status });
	}
};
