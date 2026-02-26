import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { connectToDatabase } from '$lib/server/db/mongoose';
import { CategoryModel } from '$lib/server/models/category';
import { RecipeModel } from '$lib/server/models/recipe';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		await connectToDatabase();
		const { name } = (await request.json()) as { name?: string };
		const normalizedName = name?.trim();

		if (!normalizedName) {
			return json({ error: 'Category name is required.' }, { status: 400 });
		}

		const category = await CategoryModel.findByIdAndUpdate(
			params.id,
			{ name: normalizedName },
			{ new: true, runValidators: true }
		);

		if (!category) {
			return json({ error: 'Category not found.' }, { status: 404 });
		}

		return json({ category });
	} catch (error) {
		if (error instanceof Error && error.name === 'ValidationError') {
			return json({ error: error.message }, { status: 400 });
		}

		if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 11000) {
			return json({ error: 'Category already exists.' }, { status: 400 });
		}

		return json({ error: 'Failed to update category' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await connectToDatabase();

		const recipesUsingCategory = await RecipeModel.exists({ category: params.id });
		if (recipesUsingCategory) {
			return json(
				{ error: 'Cannot delete category while recipes are assigned to it.' },
				{ status: 400 }
			);
		}

		const category = await CategoryModel.findByIdAndDelete(params.id);
		if (!category) {
			return json({ error: 'Category not found.' }, { status: 404 });
		}

		return json({ success: true });
	} catch {
		return json({ error: 'Failed to delete category' }, { status: 500 });
	}
};
