import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { connectToDatabase } from '$lib/server/db/mongoose';
import { CategoryModel } from '$lib/server/models/category';
import { RecipeModel } from '$lib/server/models/recipe';

export const GET: RequestHandler = async () => {
	try {
		await connectToDatabase();
		const recipes = await RecipeModel.find()
			.populate('category', 'name')
			.sort({ createdAt: -1 })
			.lean();

		return json({ recipes });
	} catch {
		return json({ error: 'Failed to fetch recipes' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		await connectToDatabase();
		const payload = await request.json();

		if (!payload.category) {
			return json({ error: 'Category is required.' }, { status: 400 });
		}

		const category = await CategoryModel.findById(payload.category);
		if (!category) {
			return json({ error: 'Invalid category.' }, { status: 400 });
		}

		const recipe = await RecipeModel.create(payload);
		await recipe.populate('category', 'name');

		return json({ recipe }, { status: 201 });
	} catch (error) {
		if (error instanceof Error && error.name === 'ValidationError') {
			return json({ error: error.message }, { status: 400 });
		}

		return json({ error: 'Failed to create recipe' }, { status: 500 });
	}
};
