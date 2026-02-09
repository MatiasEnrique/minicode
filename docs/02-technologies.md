# Technology Stack

## Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Bun | Fast JavaScript runtime & package manager |
| **Frontend** | TanStack Start | Full-stack React framework with SSR |
| **Backend** | Elysia | Lightweight, fast web framework |
| **Database** | PostgreSQL | Relational database |
| **ORM** | Drizzle | Type-safe SQL query builder |
| **Auth** | Better Auth | Authentication library |
| **Real-time** | WebSocket (Elysia) | Bi-directional communication |
| **Container** | Docker + Dockerode | Sandbox isolation |
| **LLM** | OpenRouter | Multi-model API gateway |

---

## Frontend Stack

### TanStack Start

A full-stack React framework built on TanStack Router and Vinxi.

**Why TanStack Start:**
- File-based routing with type safety
- Server functions (like tRPC but simpler)
- SSR/SSG support out of the box
- First-class TypeScript support
- Integrates well with TanStack Query

**Installation:**
```bash
bunx create-start@latest my-app --template basic
```

**Key Dependencies:**
```json
{
  "@tanstack/react-router": "^1.x",
  "@tanstack/start": "^1.x",
  "@tanstack/react-query": "^5.x",
  "vinxi": "^0.x"
}
```

### TanStack Query

Server state management with caching, background updates, and stale-while-revalidate.

**Usage Pattern:**
```typescript
// Fetching data
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: () => fetch('/api/projects').then(r => r.json())
});

// Mutations
const mutation = useMutation({
  mutationFn: (data) => fetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
});
```

### Tailwind CSS

Utility-first CSS framework.

**Configuration:**
```javascript
// tailwind.config.js
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#0a0a0a',
          900: '#171717',
          800: '#262626',
        }
      }
    }
  }
};
```

---

## Backend Stack

### Elysia

Ultrafast, lightweight web framework that runs anywhere.

**Why Elysia:**
- Extremely fast (Cloudflare Workers origin)
- Works natively with Bun (also Node.js, Deno)
- Built-in middleware (CORS, logger, etc.)
- WebSocket support via adapters
- TypeScript-first design

**Installation:**
```bash
bun add elysia
```

**Basic Setup:**
```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { logger } from '@elysiajs/logger';
import { websocket } from '@elysiajs/websocket';

const app = new Elysia();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use('*', logger());
app.use('*', cors({ origin: 'http://localhost:3000', credentials: true }));

// REST routes
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// WebSocket route
app.get('/ws', upgradeWebSocket((c) => ({
  onMessage(evt, ws) { /* handle message */ },
  onClose() { /* cleanup */ }
})));

const server = serve({ fetch: app.fetch, port: 3001 });
injectWebSocket(server);
```

---

## Database Stack

### PostgreSQL

Robust relational database with excellent JSON support.

**Docker Setup:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: codegen
      POSTGRES_PASSWORD: codegen_secret
      POSTGRES_DB: codegen
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Drizzle ORM

Type-safe SQL query builder with excellent DX.

**Why Drizzle:**
- SQL-like syntax (not magic strings)
- Full TypeScript inference
- Lightweight (no heavy runtime)
- Great migration system
- Works with PostgreSQL, MySQL, SQLite

**Installation:**
```bash
bun add drizzle-orm postgres
bun add -d drizzle-kit
```

**Schema Definition:**
```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  status: text('status').default('idle'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Query Examples:**
```typescript
// Select
const userProjects = await db
  .select()
  .from(projects)
  .where(eq(projects.userId, userId));

// Insert
const [project] = await db
  .insert(projects)
  .values({ userId, name, description })
  .returning();

// Update
await db
  .update(projects)
  .set({ status: 'complete' })
  .where(eq(projects.id, projectId));

// Upsert
await db
  .insert(agentStates)
  .values({ projectId, currentState })
  .onConflictDoUpdate({
    target: agentStates.projectId,
    set: { currentState, updatedAt: new Date() }
  });
```

---

## Authentication

### Better Auth

Modern authentication library with excellent TypeScript support.

**Why Better Auth:**
- Simple setup (single file config)
- Built-in email/password + OAuth
- Session management included
- Works with any database via adapters
- React hooks for client-side

**Installation:**
```bash
bun add better-auth
```

**Server Setup:**
```typescript
// auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
```

**Client Setup:**
```typescript
// auth-client.ts
import { createAuthClient } from 'better-auth/react';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: 'http://localhost:3001',
});
```

---

## Container Runtime

### Docker + Dockerode

Programmatic Docker control from Bun/Node.js.

**Why Docker:**
- Complete isolation for generated apps
- Consistent environment across runs
- Easy port mapping for preview
- Volume support for persistence

**Installation:**
```bash
bun add dockerode
bun add -d @types/dockerode
```

**Basic Usage:**
```typescript
import Docker from 'dockerode';

const docker = new Docker();

// Create container
const container = await docker.createContainer({
  Image: 'oven/bun:1',
  name: 'my-container',
  ExposedPorts: { '5173/tcp': {} },
  HostConfig: {
    PortBindings: { '5173/tcp': [{ HostPort: '5174' }] }
  }
});

await container.start();

// Execute command
const exec = await container.exec({
  Cmd: ['bun', 'install'],
  AttachStdout: true,
  AttachStderr: true
});
```

### tar-stream

Create tar archives for copying files to containers.

```typescript
import * as tar from 'tar-stream';

const pack = tar.pack();
pack.entry({ name: 'src/App.tsx' }, fileContent);
pack.finalize();

await container.putArchive(pack, { path: '/app' });
```

---

## LLM Integration

### OpenRouter

Multi-model API gateway supporting Claude, GPT, Gemini, and more.

**Why OpenRouter:**
- Single API for multiple providers
- Pay-per-use pricing
- Automatic fallbacks
- Streaming support
- No vendor lock-in

**API Usage:**
```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:3000',
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: 'You are a code generator.' },
      { role: 'user', content: 'Create a React component...' }
    ],
    stream: true,
    max_tokens: 16000
  })
});

// Stream handling
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process chunks...
}
```

**Available Models:**

| Model | ID | Best For |
|-------|-----|----------|
| Claude 3.5 Sonnet | `anthropic/claude-3.5-sonnet` | Code generation |
| Claude 3 Haiku | `anthropic/claude-3-haiku` | Fast, cheap tasks |
| GPT-4 Turbo | `openai/gpt-4-turbo` | Complex reasoning |
| Gemini Pro 1.5 | `google/gemini-pro-1.5` | Long context |

---

## Development Tools

### TypeScript

Strict type checking across the entire codebase.

**Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Bun Workspaces

Monorepo package management.

```json
// package.json
{
  "workspaces": [
    "apps/*",
    "shared/*"
  ]
}
```

### Concurrently

Run multiple dev servers in parallel.

```json
{
  "scripts": {
    "dev": "concurrently \"bun run dev:server\" \"bun run dev:web\""
  }
}
```

---

## Dependency Summary

```json
{
  "dependencies": {
    // Frontend
    "@tanstack/react-router": "^1.x",
    "@tanstack/start": "^1.x",
    "@tanstack/react-query": "^5.x",

    // Backend
    "elysia": "^1.x",
    "@elysiajs/cors": "^1.x",
    "@elysiajs/websocket": "^1.x",

    // Database
    "drizzle-orm": "^0.30.x",
    "postgres": "^3.x",

    // Auth
    "better-auth": "^0.x",

    // Docker
    "dockerode": "^4.x",
    "tar-stream": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "drizzle-kit": "^0.20.x",
    "@types/node": "^20.x",
    "@types/dockerode": "^3.x",
    "tailwindcss": "^3.x",
    "concurrently": "^8.x"
  }
}
```
