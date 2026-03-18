import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getDataProvider } from '$lib/server/data/provider';
import { mapDataErrorToHttp } from '$lib/server/data/httpErrors';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const provider = getDataProvider();
		const { name } = (await request.json()) as { name?: string };
		const category = await provider.updateCategory(params.id, { name: name ?? '' });

		if (!category) {
			return json({ error: 'Category not found.' }, { status: 404 });
		}

		return json({ category });
	} catch (error) {
		const mapped = mapDataErrorToHttp(error, 'Failed to update category');
		return json({ error: mapped.error }, { status: mapped.status });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const provider = getDataProvider();
		const deleted = await provider.deleteCategory(params.id);
		if (!deleted) {
			return json({ error: 'Category not found.' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		const mapped = mapDataErrorToHttp(error, 'Failed to delete category');
		return json({ error: mapped.error }, { status: mapped.status });
	}
};
