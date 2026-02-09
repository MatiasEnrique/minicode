# Minicode

A local AI-powered code generator inspired by [vibesdk](https://github.com/cloudflare/vibesdk).

## Status

Current implementation is an MVP shell:
- Frontend routes and auth flows are functional.
- Chat experience is mostly static UI state.
- Elysia backend currently provides health + WebSocket echo endpoints.

Target architecture (documented in `docs/`) includes agent orchestration, streaming generation, and Docker sandbox preview, but those parts are not implemented yet.

For the authoritative gap view, see `project-state/current-vs-target.md`.

## Project Structure

```
minicode/
├── src/           # Frontend (TanStack Start)
├── server/        # Backend (Elysia + Bun)
├── shared/        # Shared types, database schema, auth config
├── project-state/ # Current implementation snapshot vs target
├── roadmap/       # Phase-by-phase construction plan
├── implementation/ # Human-first implementation guides
├── migrations/    # Database migrations
├── docs/          # Documentation
├── scripts/       # Build and utility scripts
├── test/          # Test files
├── public/        # Static assets
├── Dockerfile.sandbox # Sandbox base image definition
└── docker-compose.yml # Local PostgreSQL service
```

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Docker (for local PostgreSQL via Compose)

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

3. Start PostgreSQL:
   ```bash
   docker compose up -d postgres
   ```

4. Initialize database schema:
   ```bash
   bun run db:push
   ```

## Full Local Run (Current Project State)

1. Start database:
   ```bash
   docker compose up -d postgres
   ```

2. Verify database health:
   ```bash
   docker compose ps
   ```

3. Apply schema:
   ```bash
   bun run db:push
   ```

4. Start frontend + backend:
   ```bash
   bun run dev
   ```

5. Confirm services:
   - Frontend: `http://localhost:3000`
   - Backend health: `http://localhost:3001/health`
   - Backend WebSocket: `ws://localhost:3001/ws`

6. Stop services:
   - Stop dev servers with `Ctrl+C`
   - Stop database when done:
     ```bash
     docker compose down
     ```

## Sandbox Local Run (Manual, Not Yet Integrated)

The sandbox is runnable in Docker for lifecycle testing, but it is not wired into backend generation flow yet.

1. Build image:
   ```bash
   docker build -t minicode-sandbox -f Dockerfile.sandbox .
   ```

2. Run container:
   ```bash
   docker run -d --name minicode-sandbox-dev -p 5174:5173 minicode-sandbox
   ```

3. Smoke test port exposure:
   ```bash
   docker exec -d minicode-sandbox-dev sh -lc "bun -e \"Bun.serve({hostname:'0.0.0.0',port:5173,fetch(){return new Response('sandbox ok')}})\""
   curl http://localhost:5174
   ```

4. Cleanup:
   ```bash
   docker stop minicode-sandbox-dev
   docker rm minicode-sandbox-dev
   ```

See `docs/13-sandbox-local-runbook.md` for details.

## Development

```bash
# Run both frontend and server
bun run dev

# Run individually
bun run dev:frontend    # Frontend on port 3000
bun run dev:server      # Backend on port 3001
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start frontend and server concurrently |
| `bun run dev:frontend` | Start frontend only |
| `bun run dev:server` | Start server only |
| `bun run build` | Build frontend and server |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run lint` | Check code with Biome |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run db:generate` | Generate database migrations |
| `bun run db:migrate` | Run database migrations |
| `bun run db:push` | Push schema directly (no migrations) |
| `bun run db:studio` | Open Drizzle Studio GUI |

## Architecture

### src/ (Frontend)

TanStack Start application with:
- File-based routing (`src/routes/`)
- Better Auth authentication
- Shadcn UI components (`src/components/ui/`)
- Tailwind CSS styling

### server/ (Backend)

Elysia server with:
- `GET /` and `GET /health`
- `WS /ws` echo/broadcast behavior for JSON payloads
- No project CRUD, agent orchestration, or OpenRouter integration yet

### shared/

Shared utilities:
- `db/` - Drizzle ORM schema and database utilities
- `auth/` - Better Auth base configuration
- `types/` - TypeScript types for WebSocket events

## Environment Variables

See `.env.example` for all required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth secret (32+ characters)
- `OPENROUTER_API_KEY` - AI provider API key

## Documentation

- `project-state/current-vs-target.md`: source-of-truth snapshot of implemented behavior vs target.
- `roadmap/`: execution phases for building from MVP shell to full system.
- `implementation/`: concrete human-first coding specs by phase.
- `docs/13-sandbox-local-runbook.md`: manual sandbox lifecycle and smoke-test steps.
- `docs/14-integration-contract.md`: frozen REST/WebSocket contract for frontend/backend integration.
- `docs/`: target architecture and design guides (some sections describe planned, not yet implemented, behavior).
