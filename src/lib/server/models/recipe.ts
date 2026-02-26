import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

const ingredientSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		quantity: {
			type: String,
			required: true,
			trim: true
		},
		optional: {
			type: Boolean,
			default: false
		}
	},
	{ _id: false }
);

const recipeSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		description: {
			type: String,
			required: true,
			trim: true
		},
		ingredients: {
			type: [ingredientSchema],
			required: true,
			validate: [(value: unknown[]) => value.length > 0, 'At least one ingredient is required']
		},
		category: {
			type: Schema.Types.ObjectId,
			ref: 'Category',
			required: true
		},
		preparationSteps: {
			type: [String],
			required: true,
			validate: [(value: unknown[]) => value.length > 0, 'At least one step is required']
		},

		servings: Number,
		prepTimeMinutes: Number,
		cookTimeMinutes: Number,
		imageUrl: String,
		tips: [String],
		tags: [String],
		isAlcoholic: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true
	}
);

export type Recipe = InferSchemaType<typeof recipeSchema>;

export const RecipeModel = models.Recipe || model('Recipe', recipeSchema);
