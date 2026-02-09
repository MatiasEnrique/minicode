# Local AI Code Generator - Project Guide

A comprehensive guide to building a local AI-powered code generator inspired by vibesdk architecture.

## Important Context

This `docs/` folder is primarily a target-architecture guide. Some features described here are not implemented yet.

Current implementation snapshot:
- `project-state/current-vs-target.md`
- `AGENTS.md`

## Overview

Target system capabilities described in this folder:
- **Bun** as runtime and package manager
- Local infrastructure (Docker, PostgreSQL)
- OpenRouter for LLM API access
- Real-time streaming code generation
- Live preview of generated applications

## Guide Structure

| File | Description |
|------|-------------|
| [01-architecture.md](./01-architecture.md) | System architecture and data flow |
| [02-technologies.md](./02-technologies.md) | Technology stack and dependencies |
| [03-agent-system.md](./03-agent-system.md) | Agent orchestration (replaces Cloudflare Agents) |
| [04-scof-parser.md](./04-scof-parser.md) | Streaming code output format parser |
| [05-docker-sandbox.md](./05-docker-sandbox.md) | Docker container management |
| [06-code-generator.md](./06-code-generator.md) | OpenRouter LLM integration |
| [07-elysia-backend.md](./07-elysia-backend.md) | Elysia REST API + WebSocket server |
| [08-tanstack-frontend.md](./08-tanstack-frontend.md) | TanStack Start frontend application |
| [09-database.md](./09-database.md) | PostgreSQL + Drizzle ORM setup |
| [10-authentication.md](./10-authentication.md) | Better Auth integration |
| [11-code-practices.md](./11-code-practices.md) | Patterns and best practices |
| [12-code-generation-workflow.md](./12-code-generation-workflow.md) | End-to-end phased generation workflow |
| [13-sandbox-local-runbook.md](./13-sandbox-local-runbook.md) | Current local sandbox Docker run instructions |
| [14-integration-contract.md](./14-integration-contract.md) | Frozen frontend/backend REST + WebSocket contract baseline |

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd minicode
bun install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Start Docker services (PostgreSQL)
docker compose up -d postgres

# 4. Apply schema
bun run db:push

# 5. Start development
bun run dev
```

## Current vs Target

- Current codebase: frontend/auth shell + minimal Elysia health/WebSocket server.
- Target codebase: full project CRUD, agent orchestration, SCOF streaming parser, and Docker sandbox preview runtime.

Sandbox note:
- You can run a sandbox container manually today using `docs/13-sandbox-local-runbook.md`.
- Backend-managed sandbox lifecycle is still planned work.
- Integration naming/payload conventions are frozen in `docs/14-integration-contract.md`.

## Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | TanStack Start app |
| Backend | 3001 | Elysia API + WebSocket |
| PostgreSQL | 5432 | Database |
| Sandbox | 5174 | Generated app preview |

## Project Structure

```
minicode/
├── src/                      # Frontend (TanStack Start)
│   ├── routes/               # File-based routing
│   │   ├── __root.tsx        # Root layout
│   │   ├── index.tsx         # Home page
│   │   ├── sign-in.tsx       # Login
│   │   ├── sign-up.tsx       # Registration
│   │   ├── _authed.tsx       # Auth guard layout
│   │   └── _authed/chat.tsx  # Main chat interface
│   ├── components/
│   │   ├── ui/               # Shadcn UI components
│   │   └── chat/             # Chat-specific components
│   ├── lib/
│   │   ├── db.ts             # Database instance
│   │   ├── auth.ts           # Better Auth setup
│   │   └── utils.ts          # Utilities
│   └── config/               # Environment configuration
│
├── server/                   # Backend (Elysia + Bun)
│   └── index.ts              # Main server with WebSocket
│
├── shared/                   # Shared code
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema
│   │   └── index.ts          # Database utilities
│   ├── auth/
│   │   └── index.ts          # Auth configuration
│   └── types/
│       └── index.ts          # Shared types
│
├── project-state/            # Current state vs target snapshot
├── roadmap/                  # Phase-by-phase build plan
├── implementation/           # Human-first implementation specs
├── migrations/               # Database migrations
├── docs/                     # This documentation
├── scripts/                  # Build utilities
├── test/                     # Test files
├── public/                   # Static assets
│
├── Dockerfile.sandbox        # Sandbox image definition
├── docker-compose.yml        # Local PostgreSQL service
├── package.json              # Single package (no workspaces)
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite build config
├── drizzle.config.ts         # Database config
├── biome.json                # Linter config
├── .env.example              # Environment template
└── .env                      # Environment variables (git-ignored)
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start frontend + server concurrently |
| `bun run dev:frontend` | Start frontend only (port 3000) |
| `bun run dev:server` | Start server only (port 3001) |
| `bun run build` | Build frontend and server |
| `bun run test` | Run tests |
| `bun run lint` | Check code with Biome |
| `bun run typecheck` | TypeScript type checking |
| `bun run db:generate` | Generate migrations |
| `bun run db:migrate` | Run migrations |
| `bun run db:push` | Push schema directly |
| `bun run db:studio` | Open Drizzle Studio |

## Import Aliases

```ts
// Frontend imports
import { Component } from "@/components/Component";  // → src/components

// Shared imports
import { getDb } from "@shared/db";                  // → shared/db
import { createAuthConfig } from "@shared/auth";    // → shared/auth
import type { AgentState } from "@shared/types";    // → shared/types
```
