# Polygon Canvas Manager

A small Bun monorepo app for drawing polygons on an image, naming them, saving them to SQLite, listing them, and deleting them.

The project has:

- `apps/web`: Next.js UI
- `apps/server`: Elysia API
- `packages/db`: SQLite + Drizzle setup
- `packages/polygons`: polygon validation, persistence, and service logic

## Requirements

- Bun `1.3.14` or newer `1.3.x`
- Docker or Podman, only if you want to run the production containers

## Environment

Create a local env file:

```bash
cp .env.example .env
```

The defaults are enough for normal local development.

Useful values:

```bash
NEXT_PUBLIC_POLYGON_TRANSPORT=server-action
POLYGON_API_ORIGIN=http://localhost:3001
POLYGON_CORS_ORIGINS=http://localhost:3000
SERVER_PORT=3001
SQLITE_DB_PATH=./data/polygons.sqlite
POLYGON_ACTION_DELAY_MS=5000
```

## Start With Bun

Install dependencies:

```bash
bun install
```

Run only the web app:

```bash
bun run dev
```

Open `http://localhost:3000`.

This uses the default `server-action` transport, so you do not need to start the API separately.

Run the full app with the web app and API server:

```bash
NEXT_PUBLIC_POLYGON_TRANSPORT=api bun run dev:full
```

Open:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- API health: `http://localhost:3001/healthz`

## Use The App

1. Click the image to add polygon points.
2. Add at least 3 points.
3. Enter a polygon name.
4. Click `Save polygon`.
5. Delete saved polygons from the list when needed.

Saved polygons are persisted in SQLite. By default the database file is created at `./data/polygons.sqlite`.

## Docker

Run the production setup:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

Docker runs:

- `web` on port `3000`
- `server` on port `3001`
- SQLite in a Docker volume named `sqlite_db`

Stop the containers:

```bash
docker compose down
```

Remove the Docker database volume too:

```bash
docker compose down -v
```

## Checks

Run the main verification commands:

```bash
bun run check-types
bun run lint
bun run test all
bun run build
bun audit
```

For coverage output:

```bash
bun run test:coverage
```
