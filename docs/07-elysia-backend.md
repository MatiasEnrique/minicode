# Elysia Backend + WebSocket

The backend uses Elysia for REST API and WebSocket real-time communication.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Elysia Server                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         Middleware                                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────────────┐ │   │
│  │  │ Logger  │  │  CORS   │  │  Auth   │  │  Error Handler       │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └──────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────┐    ┌────────────────────────────────┐  │
│  │       REST Routes           │    │      WebSocket Handler          │  │
│  │                             │    │                                 │  │
│  │  /api/auth/*                │    │  /ws/:projectId                 │  │
│  │  /api/projects              │    │                                 │  │
│  │  /api/projects/:id          │    │  - Connection management        │  │
│  │  /api/projects/:id/generate │    │  - Message routing              │  │
│  │  /api/projects/:id/stop     │    │  - Agent communication          │  │
│  │                             │    │                                 │  │
│  └─────────────────────────────┘    └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
          ┌─────────────────┐           ┌─────────────────────┐
          │    Database     │           │    Agent Manager    │
          │   (Drizzle)     │           │                     │
          └─────────────────┘           └─────────────────────┘
```

---

## Server Setup

```typescript
// server/index.ts

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { websocket } from '@elysiajs/websocket';

const app = new Elysia()
  .use(websocket())
  .use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }))
  .get('/', () => ({ message: 'Minicode Server', status: 'ok' }))
  .get('/health', () => ({ status: 'healthy' }))
  .ws('/ws', {
    open(ws) {
      console.log('Client connected');
    },
    message(ws, message) {
      // Handle messages
    },
    close(ws) {
      console.log('Client disconnected');
    },
  })
  .listen(3001);

console.log(`Server running at http://localhost:${app.server?.port}`);
```

---

## Project Structure

```
server/
└── index.ts              # Main server entry point
```

For a full implementation, you would expand to:

```
server/
├── index.ts              # Server entry point
├── routes/
│   ├── auth.ts           # Auth routes
│   └── projects.ts       # Project CRUD
├── websocket/
│   ├── index.ts          # WebSocket handler
│   └── types.ts          # Message types
├── middleware/
│   ├── auth.ts           # Auth middleware
│   └── error-handler.ts  # Error handling
└── agents/
    └── manager.ts        # Agent lifecycle
```

---

## WebSocket Message Types

```typescript
// shared/types/index.ts

// Client -> Server messages
export interface ClientMessage {
  type:
    | 'start_generation'
    | 'stop_generation'
    | 'user_message'
    | 'get_state'
    | 'get_preview_url';
  data?: unknown;
}

// Server -> Client messages
export interface ServerMessage {
  type:
    | 'agent_connected'
    | 'state_update'
    | 'file_start'
    | 'file_chunk'
    | 'file_end'
    | 'phase_start'
    | 'phase_end'
    | 'generation_complete'
    | 'generation_error'
    | 'preview_url'
    | 'sandbox_log'
    | 'error';
  data: unknown;
}
```

---

## Environment Variables

```bash
# .env
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/minicode
OPENROUTER_API_KEY=sk-or-v1-your-api-key
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters
```

---

## Running the Server

```bash
# Development with hot reload
bun run dev:server

# Build for production
bun run build

# Start production server
bun run start:server
```
