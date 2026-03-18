# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" --install yarn recipes-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## MongoDB with Mongoose

Local MongoDB works by default with:

```sh
mongodb://127.0.0.1:27017
```

and database name:

```sh
recipes
```

You can still override with `.env`:

```sh
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority
MONGODB_DB=recipes
```

Use the connection helper from `src/lib/server/db/mongoose.ts` in server-only code:

```ts
import { connectToDatabase } from '$lib/server/db/mongoose';
import { RecipeModel } from '$lib/server/models/recipe';

await connectToDatabase();
const recipes = await RecipeModel.find();
```

## Database providers (MongoDB + SQLite)

This app supports two database providers selected by environment variable:

```sh
DB_PROVIDER=mongo
```

or

```sh
DB_PROVIDER=sqlite
```

### MongoDB provider

Defaults:

```sh
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=recipes
```

### SQLite provider (Drizzle + better-sqlite3)

Default SQLite file path:

```sh
SQLITE_DB_PATH=./data/recipes.sqlite
```

When `DB_PROVIDER=sqlite`, tables are created automatically on startup.

### Example `.env`

```sh
# switch between mongo and sqlite
DB_PROVIDER=sqlite

# sqlite file location (used when DB_PROVIDER=sqlite)
SQLITE_DB_PATH=./data/recipes.sqlite

# mongo settings (used when DB_PROVIDER=mongo)
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=recipes
```

### Minimal API route

- `GET /api/recipes` returns all recipes (newest first)
- `POST /api/recipes` creates a recipe
- `GET /api/categories` lists categories
- `POST /api/categories` creates a category
- `PUT /api/categories/:id` renames a category
- `DELETE /api/categories/:id` removes a category (only if no recipes use it)

Route file: `src/routes/api/recipes/+server.ts`

### Recipe structure

Required fields:

- `name`
- `description`
- `category` (ObjectId reference to `Category`)
- `ingredients`: list of objects with `quantity`, `name`, and optional `optional`
- `preparationSteps`: list of strings

Suggested additional fields (based on the mulled wine example):

- `servings`
- `prepTimeMinutes`
- `cookTimeMinutes`
- `tips` (list of serving/storage suggestions)
- `imageUrl`
- `tags` (e.g. `winter`, `drink`, `holiday`)
- `isAlcoholic`

The schema is defined in `src/lib/server/models/recipe.ts` and includes `createdAt`/`updatedAt` timestamps.
