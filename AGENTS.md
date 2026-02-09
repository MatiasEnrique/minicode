# AGENTS.md

**Snapshot**
- Date: 2026-02-09.
- Repo is a single-package Bun + TanStack Start app with a separate Bun/Elysia server.
- Frontend is functional for landing/auth/basic chat shell, but data is mostly static.
- Backend is a minimal WebSocket echo server; most documented agent/sandbox features are not implemented in code.
- Database schema exists for users/projects/agent state, but there are no migrations and no code paths using the project/agent tables yet.

**Top-Level Layout**
- `src/`: TanStack Start frontend, routes, UI, auth client/server handlers.
- `server/`: Elysia server with basic WebSocket handling.
- `shared/`: Drizzle schema, Better Auth config, shared types.
- `docs/`: Detailed architecture docs for a fuller system (agent orchestration, sandbox, streaming, etc.).
- `docs/14-integration-contract.md`: Frozen REST/WebSocket integration naming + payload baseline.
- `project-state/`: Current implementation snapshot vs target architecture.
- `roadmap/`: Phase-based execution plan for building the missing architecture.
- `implementation/`: Human-first implementation guides with concrete coding checklists.
- `migrations/`: Empty.
- `Dockerfile.sandbox`: Sandbox Docker image definition for manual local runs.
- `scripts/`: Placeholder directory (`.gitkeep` only).
- `test/`: Placeholder directory (`.gitkeep` only).
- `public/`: Placeholder directory (`.gitkeep` only).

**Runtime + Tooling**
- Bun runtime + package manager (`package.json`).
- Vite + TanStack Start (`vite.config.ts`).
- TypeScript strict mode with path aliases `@/*` and `@shared/*` (`tsconfig.json`).
- Biome configured for TS/JS/JSON with exclusions for generated + shadcn UI (`biome.json`).
- Tailwind v4 via PostCSS plugin, with CSS variables defined in `src/styles.css`.
- Drizzle config points to `shared/db/schema.ts`, outputs to `migrations/` (`drizzle.config.ts`).
- Root `docker-compose.yml` provides local PostgreSQL (`postgres:16-alpine`, port `5432`).

**Frontend (TanStack Start)**
- Routing uses file-based routes in `src/routes/` with a generated route tree (`src/routeTree.gen.ts`).
- `src/routes/__root.tsx` sets document shell and includes TanStack devtools.
- Landing page at `/` with simple marketing content (`src/routes/index.tsx`).
- Auth flows:
  - Sign in (`src/routes/sign-in.tsx`) and sign up (`src/routes/sign-up.tsx`) use Better Auth client functions.
  - Protected layout at `/_authed` uses a server function to load session and redirects to `/sign-up` if missing.
- Chat UI:
  - `/_authed/chat` renders a sidebar file explorer + Monaco editor.
  - `FileExplorer` uses a static hard-coded file tree with sample content (no backend integration).
  - `ProjectSelector` uses a static project list (no backend integration).

**Backend (Elysia)**
- `server/index.ts` exposes:
  - `GET /` and `GET /health` health endpoints.
  - `WS /ws` that assigns a UUID per connection, echoes JSON payloads, and supports optional broadcast to other clients.
- No integration with database, auth, agent system, or OpenRouter in current server code.
- No REST API for projects/files; auth is served by TanStack Start routes, not by Elysia.

**Shared Packages**
- `shared/db/schema.ts` defines tables for:
  - Better Auth (`user`, `session`, `account`, `verification`).
  - Project metadata (`projects`), project files (`project_files`).
  - Agent state (`agent_states`) including phases, generated files, conversation history.
- `shared/auth/index.ts` wires Better Auth with a Drizzle adapter.
- `shared/types/index.ts` defines message/phase/event types intended for agent streaming.

**Environment Configuration**
- `.env.example` declares required variables:
  - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `NODE_ENV`, `VITE_APP_NAME`, `VITE_APP_URL`, `OPENROUTER_API_KEY`.
- `src/config/env.ts` validates server env with `zod`.
- `src/config/env.client.ts` validates client env with `zod`.

**Docs vs Implementation (Notable Gaps)**
- Docs describe a full agent system, OpenRouter integration, Docker sandbox, and streaming code output.
- Current codebase does not include:
  - Agent orchestration, SCOF parser, or code generation pipeline.
  - Docker sandbox management or preview server wiring.
  - REST endpoints for projects/files/agent state.
  - Any OpenRouter client usage (despite `.env.example`).
- `migrations/` has no generated migrations yet.
- `scripts/`, `test/`, and `public/` are placeholder-only.
- `Dockerfile.sandbox` exists at repo root, but no backend integration code exists yet.

**Quality + Testing**
- No tests present in `test/`.
- Linting via Biome is configured but not run here.

**Current UX State**
- UI looks like a working shell for an editor-based product.
- Auth flows are wired to Better Auth, assuming the database is configured.
- The “chat” experience is purely local state with static content; no backend data or WebSocket usage on the client side yet.

**Potential Risk Areas**
- Divergence between docs and code may confuse contributors and slow onboarding.
- Two-server architecture (TanStack Start at `:3000`, Elysia at `:3001`) depends on a documented contract that is not yet implemented in routes/handlers.
- Database schema includes project/agent tables without any code paths to create or query them.

**Immediate Next Steps (If Building Toward Docs)**
- Decide the source of truth: update docs to match the minimal MVP or implement the missing pieces.
- Implement project CRUD endpoints and connect the UI to real data.
- Introduce agent state machine and streaming via WebSocket events.
- Add Docker sandbox management and preview URL flow.
- Add migrations and initial tests to validate auth + data access.
