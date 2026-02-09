# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOCAL MACHINE                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         TanStack Start App                              │ │
│  │                         localhost:3000                                  │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │   Routes        │  │   Better Auth   │  │   TanStack Query        │ │ │
│  │  │   - /           │  │   - Session     │  │   - Data fetching       │ │ │
│  │  │   - /dashboard  │  │   - Login/Out   │  │   - Cache management    │ │ │
│  │  │   - /project/*  │  │   - Register    │  │   - WebSocket state     │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      │ HTTP + WebSocket                      │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          Elysia Backend Server                          │ │
│  │                          localhost:3001                                 │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │   REST API      │  │   WebSocket     │  │   Agent Manager         │ │ │
│  │  │   - /api/auth   │  │   - /ws/:projectId │  │   - Session agents      │ │ │
│  │  │   - /api/proj   │  │   - Events      │  │   - State persistence   │ │ │
│  │  │   - /api/project-files │  │   - Broadcast   │  │   - Lifecycle mgmt      │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  └───────────────┬────────────────────────────────────────┬───────────────┘ │
│                  │                                        │                  │
│                  ▼                                        ▼                  │
│  ┌───────────────────────────────┐      ┌───────────────────────────────┐  │
│  │         PostgreSQL            │      │       Docker Sandbox          │  │
│  │         localhost:5432        │      │       localhost:5174          │  │
│  │                               │      │                               │  │
│  │  ┌─────────────────────────┐  │      │  ┌─────────────────────────┐  │  │
│  │  │  Tables:                │  │      │  │  Generated React App    │  │  │
│  │  │  - users                │  │      │  │  - Vite dev server      │  │  │
│  │  │  - sessions             │  │      │  │  - Hot reload           │  │  │
│  │  │  - projects             │  │      │  │  - TypeScript           │  │  │
│  │  │  - agent_states         │  │      │  │  - Tailwind CSS         │  │  │
│  │  │  - generated_files      │  │      │  └─────────────────────────┘  │  │
│  │  │  - messages             │  │      │                               │  │
│  │  └─────────────────────────┘  │      └───────────────────────────────┘  │
│  └───────────────────────────────┘                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTPS (only external call)
                                       ▼
                           ┌───────────────────────────┐
                           │      OpenRouter API       │
                           │   (Claude/GPT/Gemini)     │
                           │                           │
                           │  - Phase design           │
                           │  - Code generation        │
                           │  - Streaming responses    │
                           └───────────────────────────┘
```

---

## Data Flow

### 1. Project Creation Flow

```
User                    Frontend              Backend                Database
  │                        │                     │                       │
  │  Create Project        │                     │                       │
  │───────────────────────►│                     │                       │
  │                        │  POST /api/projects │                       │
  │                        │────────────────────►│                       │
  │                        │                     │  INSERT projects      │
  │                        │                     │──────────────────────►│
  │                        │                     │◄──────────────────────│
  │                        │◄────────────────────│                       │
  │  Redirect to project   │                     │                       │
  │◄───────────────────────│                     │                       │
```

### 2. Code Generation Flow

```
Frontend           WebSocket           Agent              Sandbox         OpenRouter
   │                   │                  │                   │                │
   │  Connect WS       │                  │                   │                │
   │──────────────────►│                  │                   │                │
   │                   │  Get/Create Agent│                   │                │
   │                   │─────────────────►│                   │                │
   │                   │                  │  Load State       │                │
   │                   │                  │──────────────────►│                │
   │                   │◄─────────────────│                   │                │
   │  state_change     │                  │                   │                │
   │◄──────────────────│                  │                   │                │
   │                   │                  │                   │                │
   │  generate         │                  │                   │                │
   │──────────────────►│                  │                   │                │
   │                   │─────────────────►│                   │                │
   │                   │                  │                   │                │
   │                   │                  │  Design Phase     │                │
   │                   │                  │────────────────────────────────────►
   │                   │                  │◄────────────────────────────────────
   │  phase_designed   │◄─────────────────│                   │                │
   │◄──────────────────│                  │                   │                │
   │                   │                  │                   │                │
   │                   │                  │  Implement Phase (streaming)       │
   │                   │                  │────────────────────────────────────►
   │                   │                  │         chunk     │                │
   │  file_chunk       │◄─────────────────│◄────────────────────────────────────
   │◄──────────────────│                  │         chunk     │                │
   │  file_chunk       │◄─────────────────│◄────────────────────────────────────
   │◄──────────────────│                  │                   │                │
   │  file_end         │◄─────────────────│                   │                │
   │◄──────────────────│                  │                   │                │
   │                   │                  │                   │                │
   │                   │                  │  Write Files      │                │
   │                   │                  │──────────────────►│                │
   │                   │                  │◄──────────────────│                │
   │                   │                  │                   │                │
   │                   │                  │  Start Server     │                │
   │                   │                  │──────────────────►│                │
   │  server_started   │◄─────────────────│◄──────────────────│                │
   │◄──────────────────│                  │                   │                │
```

---

## Component Responsibilities

### Frontend (TanStack Start)

| Component | Responsibility |
|-----------|----------------|
| Routes | Page navigation and layouts |
| Auth Client | Session management, login/logout |
| WebSocket Client | Real-time communication with backend |
| Query Client | Data fetching, caching, mutations |
| UI Components | Code editor, file tree, preview iframe |

### Backend (Elysia)

| Component | Responsibility |
|-----------|----------------|
| REST API | CRUD operations for projects, files |
| WebSocket Server | Bi-directional real-time communication |
| Auth Middleware | Session validation, route protection |
| Agent Manager | Lifecycle management of agent instances |

### Agent System

| Component | Responsibility |
|-----------|----------------|
| BaseAgent | Abstract base with state management |
| CodeGeneratorAgent | Code generation orchestration |
| AgentManager | Instance creation, caching, cleanup |
| Generator | LLM API calls (OpenRouter) |
| Parser | SCOF format streaming parser |

### Sandbox (Docker)

| Component | Responsibility |
|-----------|----------------|
| DockerSandbox | Container lifecycle management |
| File Operations | Write generated files to container |
| Command Execution | Run bun install, dev server |
| Port Exposure | Preview URL for generated app |

### Database (PostgreSQL)

| Table | Purpose |
|-------|---------|
| users | User accounts (Better Auth) |
| sessions | Active sessions (Better Auth) |
| accounts | OAuth accounts (Better Auth) |
| projects | User projects metadata |
| agent_states | Persisted agent state per project |
| generated_files | Generated code files |
| conversation_messages | Chat history |

---

## State Machine

The agent follows a deterministic state machine:

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    ▼                                             │
              ┌──────────┐                                        │
              │   IDLE   │◄───────────────────────────────────────┤
              └────┬─────┘                                        │
                   │ generate()                                   │
                   ▼                                              │
        ┌─────────────────────┐                                   │
        │  DESIGNING_PHASE    │                                   │
        │  (LLM designs next  │                                   │
        │   phase structure)  │                                   │
        └──────────┬──────────┘                                   │
                   │                                              │
                   ▼                                              │
        ┌─────────────────────┐                                   │
        │ IMPLEMENTING_PHASE  │                                   │
        │  (LLM generates     │                                   │
        │   code, streaming)  │                                   │
        └──────────┬──────────┘                                   │
                   │                                              │
                   ▼                                              │
        ┌─────────────────────┐         ┌──────────────────┐      │
        │  INSTALLING_DEPS    │────────►│  STARTING_SERVER │      │
        │  (bun install)      │         │  (bun run dev)   │      │
        └─────────────────────┘         └────────┬─────────┘      │
                                                 │                │
                   ┌─────────────────────────────┘                │
                   │                                              │
                   ▼                                              │
              More phases?                                        │
                   │                                              │
           ┌──────┴──────┐                                        │
           │             │                                        │
          Yes           No                                        │
           │             │                                        │
           │             ▼                                        │
           │      ┌──────────┐                                    │
           │      │ COMPLETE │────────────────────────────────────┘
           │      └──────────┘
           │
           └──────────────────────────────────────┐
                                                  │
                                                  ▼
                                        Back to DESIGNING_PHASE
```

---

## Event System

### WebSocket Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `state_change` | `{ state: AgentState }` | Agent state transition |
| `phase_designing` | `{ phaseNumber: number }` | Phase design started |
| `phase_designed` | `{ phase: Phase }` | Phase design complete |
| `file_start` | `{ path: string }` | File generation started |
| `file_chunk` | `{ path: string, chunk: string }` | Streaming file content |
| `file_end` | `{ path: string, content: string }` | File generation complete |
| `files_written` | `{ count: number }` | Files written to sandbox |
| `deps_installed` | `{}` | bun install complete |
| `server_started` | `{ url: string }` | Dev server ready |
| `generation_complete` | `{ files: string[], phases: number }` | All phases complete |
| `error` | `{ message: string }` | Error occurred |

### WebSocket Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `generate` | `{ description: string }` | Start code generation |
| `cancel` | `{}` | Cancel current generation |
| `get_state` | `{}` | Request current agent state |

---

## Security Model

### Authentication Flow

```
1. User logs in via Better Auth
2. Session token stored in HTTP-only cookie
3. REST API validates session via cookie
4. WebSocket authenticates via token in query param
5. Agent validates project ownership before operations
```

### Authorization Rules

| Resource | Rule |
|----------|------|
| Projects | User can only access own projects |
| Agent | Only project owner can connect/control |
| Files | Scoped to project, no cross-project access |
| Sandbox | Isolated container per project |
