import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getDataProvider } from '$lib/server/data/provider';
import { mapDataErrorToHttp } from '$lib/server/data/httpErrors';

export const GET: RequestHandler = async () => {
	try {
		const provider = getDataProvider();
		const categories = await provider.listCategories();

		return json({ categories });
	} catch {
		return json({ error: 'Failed to fetch categories' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const provider = getDataProvider();
		const { name } = (await request.json()) as { name?: string };
		const category = await provider.createCategory({ name: name ?? '' });
		return json({ category }, { status: 201 });
	} catch (error) {
		const mapped = mapDataErrorToHttp(error, 'Failed to create category');
		return json({ error: mapped.error }, { status: mapped.status });
	}
};
