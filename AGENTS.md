# AGENTS.md

## Cursor Cloud specific instructions

### Overview

iPodfolio CMS — a full-stack TypeScript monolith for managing an iPod-themed portfolio website. Single `package.json`, single Express process serving both API and React frontend.

### Architecture

- **Backend:** Express 5 + Drizzle ORM on Node.js (port 5000)
- **Frontend:** React 18 SPA via Vite (served in middleware mode by Express in dev)
- **Database:** PostgreSQL on Supabase (hardcoded fallback connection string in `server/db.ts`)

### Running the dev server

```
npm run dev
```

Starts Express on port 5000 with Vite HMR. Both API (`/api/*`) and frontend are served from this single process.

### Available commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (port 5000) |
| `npm run build` | Production build (Vite client + esbuild server → `dist/`) |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type-checking (`tsc`) |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |

### Gotchas

- **No ESLint configured** — the only lint-like check is `npm run check` (TypeScript).
- **No automated test framework** — there are no unit/integration tests in this repo.
- **Pre-existing TS error** — `npm run check` reports one error in `client/src/components/content-tree.tsx` (TS2802: `Set<string>` iteration). This does not block dev server or build.
- **Database connection** — the app always uses `DatabaseStorage` (PostgreSQL). A hardcoded Supabase connection string is the fallback in `server/db.ts`. Set `DATABASE_URL` env var to override.
- **Tables auto-created** — `storage.ensureTables()` runs on startup, creating tables and seeding data if the database is empty.
