import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getDataProvider } from '$lib/server/data/provider';
import { mapDataErrorToHttp } from '$lib/server/data/httpErrors';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const provider = getDataProvider();
		const recipe = await provider.getRecipe(params.id);
		if (!recipe) {
			return json({ error: 'Recipe not found.' }, { status: 404 });
		}

		return json({ recipe });
	} catch {
		return json({ error: 'Failed to fetch recipe' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const provider = getDataProvider();
		const payload = await request.json();
		const recipe = await provider.updateRecipe(params.id, payload);

		if (!recipe) {
			return json({ error: 'Recipe not found.' }, { status: 404 });
		}

		return json({ recipe });
	} catch (error) {
		const mapped = mapDataErrorToHttp(error, 'Failed to update recipe');
		return json({ error: mapped.error }, { status: mapped.status });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const provider = getDataProvider();
		const deleted = await provider.deleteRecipe(params.id);
		if (!deleted) {
			return json({ error: 'Recipe not found.' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		const mapped = mapDataErrorToHttp(error, 'Failed to delete recipe');
		return json({ error: mapped.error }, { status: mapped.status });
	}
};
