import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

const categorySchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			unique: true
		}
	},
	{
		timestamps: true
	}
);

export type Category = InferSchemaType<typeof categorySchema>;

export const CategoryModel = models.Category || model('Category', categorySchema);
