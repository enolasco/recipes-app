import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { connectToDatabase } from '$lib/server/db/mongoose';
import { CategoryModel } from '$lib/server/models/category';
import { RecipeModel } from '$lib/server/models/recipe';
import mongoose from 'mongoose';

function isValidObjectId(value: string): boolean {
	return mongoose.Types.ObjectId.isValid(value);
}

export const GET: RequestHandler = async ({ params }) => {
	try {
		await connectToDatabase();

		if (!isValidObjectId(params.id)) {
			return json({ error: 'Recipe not found.' }, { status: 404 });
		}

		const recipe = await RecipeModel.findById(params.id).populate('category', 'name').lean();
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
		await connectToDatabase();

		if (!isValidObjectId(params.id)) {
			return json({ error: 'Recipe not found.' }, { status: 404 });
		}

		const payload = await request.json();

		if (!payload.category) {
			return json({ error: 'Category is required.' }, { status: 400 });
		}

		if (!isValidObjectId(payload.category)) {
			return json({ error: 'Invalid category.' }, { status: 400 });
		}

		const category = await CategoryModel.findById(payload.category);
		if (!category) {
			return json({ error: 'Invalid category.' }, { status: 400 });
		}

		const recipe = await RecipeModel.findByIdAndUpdate(params.id, payload, {
			new: true,
			runValidators: true
		})
			.populate('category', 'name')
			.lean();

		if (!recipe) {
			return json({ error: 'Recipe not found.' }, { status: 404 });
		}

		return json({ recipe });
	} catch (error) {
		if (error instanceof Error && error.name === 'ValidationError') {
			return json({ error: error.message }, { status: 400 });
		}

		return json({ error: 'Failed to update recipe' }, { status: 500 });
	}
};
