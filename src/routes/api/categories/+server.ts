import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { connectToDatabase } from '$lib/server/db/mongoose';
import { CategoryModel } from '$lib/server/models/category';

export const GET: RequestHandler = async () => {
	try {
		await connectToDatabase();
		const categories = await CategoryModel.find().sort({ name: 1 }).lean();

		return json({ categories });
	} catch {
		return json({ error: 'Failed to fetch categories' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		await connectToDatabase();
		const { name } = (await request.json()) as { name?: string };
		const normalizedName = name?.trim();

		if (!normalizedName) {
			return json({ error: 'Category name is required.' }, { status: 400 });
		}

		const category = await CategoryModel.create({ name: normalizedName });
		return json({ category }, { status: 201 });
	} catch (error) {
		if (error instanceof Error && error.name === 'ValidationError') {
			return json({ error: error.message }, { status: 400 });
		}

		if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 11000) {
			return json({ error: 'Category already exists.' }, { status: 400 });
		}

		return json({ error: 'Failed to create category' }, { status: 500 });
	}
};
