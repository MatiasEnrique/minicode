# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minicode is a local AI-powered code generator inspired by [vibesdk](https://github.com/cloudflare/vibesdk). It uses a single-package architecture with these main directories:
- **src/**: TanStack Start frontend (port 3000)
- **server/**: Elysia backend with WebSocket support (port 3001)
- **shared/**: Database schema, auth config, and types

## Commands

```bash
# Development
bun install                    # Install all dependencies
bun run dev                    # Run both frontend and server
bun run dev:frontend           # Frontend only (port 3000)
bun run dev:server             # Backend only (port 3001)

# Build
bun run build                  # Build frontend and server

# Testing
bun run test                   # Run all tests
bun run test:watch             # Run tests in watch mode

# Database
bun run db:generate            # Generate migrations
bun run db:migrate             # Run migrations
bun run db:push                # Push schema directly
bun run db:studio              # Database GUI

# Linting
bun run lint                   # Check for issues
bun run lint:fix               # Auto-fix issues
bun run typecheck              # TypeScript type checking
```

## Architecture

```
src/                          # Frontend (TanStack Start)
├── routes/                   # File-based routing
│   ├── __root.tsx           # Root layout with devtools
│   ├── index.tsx            # Home page
│   ├── sign-in.tsx          # Login
│   ├── sign-up.tsx          # Registration
│   ├── _authed.tsx          # Auth guard layout
│   └── _authed/chat.tsx     # Main chat interface
├── components/
│   ├── ui/                  # Shadcn UI components
│   └── chat/                # Chat-specific components
├── lib/
│   ├── db.ts                # Database instance
│   ├── auth.ts              # Better Auth setup
│   └── utils.ts             # Utility functions
└── config/                  # Environment configuration

server/                       # Backend (Elysia + Bun)
└── index.ts                 # WebSocket server

shared/                       # Shared code
├── db/
│   ├── schema.ts            # Drizzle schema
│   └── index.ts             # Database utilities
├── auth/
│   └── index.ts             # Auth configuration
└── types/
    └── index.ts             # Shared types

migrations/                   # Database migrations
docs/                         # Architecture documentation
container/                    # Docker sandbox
scripts/                      # Build utilities
test/                         # Test files
public/                       # Static assets
```

## Import Aliases

```ts
import { Component } from "@/components/Component";  // → src/components
import { getDb } from "@shared/db";                  // → shared/db
import { createAuthConfig } from "@shared/auth";    // → shared/auth
import type { AgentState } from "@shared/types";    // → shared/types
```

## Environment Variables

Copy `.env.example` to `.env` at the project root. See `.env.example` for all required variables.

## Linting

Biome is configured at the root level (`biome.json`) and excludes:
- `src/components/ui/**` (shadcn components)
- `routeTree.gen.ts` (auto-generated)
- `migrations/**` (generated migrations)

## Reference Documentation

The `docs/` directory contains detailed architecture documentation covering agent systems, streaming code output format, Docker sandbox management, and more.
