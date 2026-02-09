# Code Practices & Patterns

Best practices and patterns extracted from the vibesdk codebase.

## Overview

This guide documents code practices, architectural patterns, and conventions for building a clean, maintainable code generator application.

---

## Type Safety

### Never Use `any`

```typescript
// Bad
function processData(data: any): any {
  return data.value;
}

// Good
interface DataInput {
  value: string;
}

interface DataOutput {
  processed: string;
}

function processData(data: DataInput): DataOutput {
  return { processed: data.value };
}
```

### Single Source of Truth for Types

Keep all shared types in a dedicated location:

```
src/
├── types/
│   ├── index.ts        # Re-exports all types
│   ├── api.ts          # API request/response types
│   ├── project.ts      # Domain types
│   └── websocket.ts    # WebSocket message types
```

```typescript
// src/types/api.ts
export interface CreateProjectRequest {
  name: string;
  description: string;
}

export interface CreateProjectResponse {
  project: Project;
}

// Import from single location
import type { CreateProjectRequest } from '@/types';
```

### Infer Types from Schema

Let Drizzle infer types from the schema definition:

```typescript
// Schema defines the shape
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  // ...
});

// Types are inferred
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

---

## API Design

### Centralized API Client

All API calls go through a single client:

```typescript
// src/lib/api-client.ts

const API_URL = import.meta.env.VITE_API_URL;

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(error.message || 'Request failed', response.status);
  }

  return response.json();
}

// Export typed methods
export const api = {
  projects: {
    list: () => fetchApi<ProjectListResponse>('/api/projects'),
    get: (id: string) => fetchApi<ProjectResponse>(`/api/projects/${id}`),
    create: (data: CreateProjectRequest) =>
      fetchApi<ProjectResponse>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
```

### Controller Pattern

Separate route handlers into controllers:

```typescript
// worker/api/controllers/project-controller.ts

export class ProjectController {
  constructor(private projectService: ProjectService) {}

  async list(c: Context): Promise<Response> {
    const userId = c.get('userId');
    const projects = await this.projectService.getByUserId(userId);
    return c.json({ projects });
  }

  async create(c: Context): Promise<Response> {
    const userId = c.get('userId');
    const body = await c.req.json();

    const validated = createProjectSchema.parse(body);
    const project = await this.projectService.create({
      ...validated,
      userId,
    });

    return c.json({ project }, 201);
  }
}
```

### Service Layer

Business logic lives in services:

```typescript
// worker/services/project-service.ts

export class ProjectService {
  constructor(private db: Database) {}

  async create(data: NewProject): Promise<Project> {
    // Business logic here
    const [project] = await this.db
      .insert(projects)
      .values(data)
      .returning();

    // Could trigger side effects
    await this.notifyCreation(project);

    return project;
  }

  private async notifyCreation(project: Project): Promise<void> {
    // Side effects isolated
  }
}
```

---

## State Management

### Agent State Machine

Use explicit states with clear transitions:

```typescript
// Defined states
type AgentState =
  | 'idle'
  | 'designing_phase'
  | 'implementing_phase'
  | 'installing_deps'
  | 'starting_server'
  | 'complete'
  | 'error';

// Valid transitions
const STATE_TRANSITIONS: Record<AgentState, AgentState[]> = {
  idle: ['designing_phase'],
  designing_phase: ['implementing_phase', 'error'],
  implementing_phase: ['installing_deps', 'designing_phase', 'error'],
  installing_deps: ['starting_server', 'error'],
  starting_server: ['complete', 'error'],
  complete: ['idle'],
  error: ['idle'],
};

// Enforce transitions
function transitionTo(current: AgentState, next: AgentState): void {
  const allowed = STATE_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new Error(`Invalid transition from ${current} to ${next}`);
  }
}
```

### Abort Controller Pattern

Handle cancellation properly:

```typescript
class Agent {
  private abortController: AbortController | null = null;

  async startGeneration(): Promise<void> {
    // Abort any existing operation
    this.abort();

    // Create new controller
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      await this.generate(signal);
    } finally {
      this.abortController = null;
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private async generate(signal: AbortSignal): Promise<void> {
    // Check signal before long operations
    if (signal.aborted) return;

    // Pass signal to fetch
    const response = await fetch(url, { signal });

    // Check signal after operations
    if (signal.aborted) return;

    // Continue processing...
  }
}
```

---

## WebSocket Communication

### Message Type Safety

Define all message types explicitly:

```typescript
// Discriminated union for messages
type ServerMessage =
  | { type: 'agent_connected'; data: AgentState }
  | { type: 'file_start'; data: { path: string } }
  | { type: 'file_chunk'; data: { path: string; chunk: string } }
  | { type: 'file_end'; data: { path: string; content: string } }
  | { type: 'error'; data: { message: string } };

// Type-safe handler
function handleMessage(message: ServerMessage): void {
  switch (message.type) {
    case 'file_start':
      // TypeScript knows data.path exists
      handleFileStart(message.data.path);
      break;
    case 'file_chunk':
      // TypeScript knows data.path and data.chunk exist
      handleFileChunk(message.data.path, message.data.chunk);
      break;
    // ... exhaustive handling
  }
}
```

### Connection Management

Track connections properly:

```typescript
class ConnectionManager {
  private connections = new Map<string, Set<WebSocket>>();

  add(projectId: string, ws: WebSocket): void {
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Set());
    }
    this.connections.get(projectId)!.add(ws);
  }

  remove(projectId: string, ws: WebSocket): void {
    const projectConnections = this.connections.get(projectId);
    if (projectConnections) {
      projectConnections.delete(ws);
      if (projectConnections.size === 0) {
        this.connections.delete(projectId);
      }
    }
  }

  broadcast(projectId: string, message: ServerMessage): void {
    const projectConnections = this.connections.get(projectId);
    if (!projectConnections) return;

    const payload = JSON.stringify(message);
    for (const ws of projectConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
```

---

## Error Handling

### Custom Error Classes

```typescript
// errors/base.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}
```

### Error Middleware

```typescript
// middleware/error-handler.ts
export function errorHandler() {
  return createMiddleware(async (c, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(
          { error: error.message, code: error.code },
          error.statusCode
        );
      }

      // Log unexpected errors
      console.error('Unexpected error:', error);

      return c.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        500
      );
    }
  });
}
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase.tsx | `ProjectCard.tsx` |
| Hooks | camelCase.ts | `useWebSocket.ts` |
| Utilities | kebab-case.ts | `api-client.ts` |
| Types | kebab-case.ts | `api-types.ts` |
| Services | PascalCase.ts | `ProjectService.ts` |
| Constants | SCREAMING_SNAKE | `API_URL` |

---

## Component Patterns

### Props Interface Above Component

```typescript
// Good
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  // ...
}
```

### Hooks at Top

```typescript
function ProjectWorkspace() {
  // 1. Router hooks
  const { id } = Route.useParams();
  const navigate = useNavigate();

  // 2. State hooks
  const [isLoading, setIsLoading] = useState(false);

  // 3. Query hooks
  const { data } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id),
  });

  // 4. Custom hooks
  const { isConnected, send } = useWebSocket(id);

  // 5. Effects
  useEffect(() => {
    // ...
  }, []);

  // 6. Event handlers
  const handleStart = () => {
    // ...
  };

  // 7. Render
  return (
    // ...
  );
}
```

---

## Streaming Patterns

### Chunk Handling

Handle streaming data that can split at arbitrary boundaries:

```typescript
class StreamParser {
  private buffer = '';

  process(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];

    // Process complete lines only
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      lines.push(line);
    }

    return lines;
  }

  flush(): string {
    const remaining = this.buffer;
    this.buffer = '';
    return remaining;
  }
}
```

### SSE Parsing

```typescript
function parseSSE(chunk: string): Array<{ event?: string; data: string }> {
  const events: Array<{ event?: string; data: string }> = [];

  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data !== '[DONE]') {
        events.push({ data });
      }
    }
  }

  return events;
}
```

---

## Testing Patterns

### Service Tests

```typescript
describe('ProjectService', () => {
  let service: ProjectService;
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
    service = new ProjectService(db);
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('creates a project', async () => {
    const project = await service.create({
      userId: 'user-1',
      name: 'Test Project',
      description: 'A test project',
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test Project');
  });
});
```

### Mock Patterns

```typescript
// Mock WebSocket
class MockWebSocket {
  sent: string[] = [];
  readyState = WebSocket.OPEN;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
  }
}

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

it('handles API error', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' }),
  });

  await expect(api.projects.get('invalid')).rejects.toThrow();
});
```

---

## Comments Guidelines

### Do Write Comments For

- Complex business logic
- Non-obvious workarounds
- Public API documentation

```typescript
/**
 * Calculates the next available port for sandbox preview.
 * Starts from base port and increments until finding an available one.
 */
async function getAvailablePort(base: number): Promise<number> {
  // ...
}

// Workaround for Docker socket timeout on macOS
// See: https://github.com/apocas/dockerode/issues/XXX
const timeout = process.platform === 'darwin' ? 5000 : 1000;
```

### Don't Write Comments For

- Obvious code
- Narrating what code does
- Explaining language features

```typescript
// Bad
// Loop through the array
for (const item of items) {
  // Check if item is valid
  if (item.valid) {
    // Add to results
    results.push(item);
  }
}

// Good
const validItems = items.filter(item => item.valid);
```

---

## Avoid Over-Engineering

### Keep It Simple

```typescript
// Over-engineered
class ProjectNameValidator {
  private rules: ValidationRule[] = [];

  addRule(rule: ValidationRule): this {
    this.rules.push(rule);
    return this;
  }

  validate(name: string): ValidationResult {
    // Complex validation logic...
  }
}

// Simple and sufficient
function validateProjectName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Name is required';
  }
  if (name.length > 100) {
    return 'Name must be 100 characters or less';
  }
  return null; // Valid
}
```

### Don't Add Features Until Needed

```typescript
// Over-engineered: adding configurability that isn't needed
interface FileTreeOptions {
  showHidden: boolean;
  sortOrder: 'asc' | 'desc' | 'type';
  icons: Record<string, string>;
  onContextMenu: (path: string) => void;
  // ... 10 more options
}

// Simple: just what's needed now
interface FileTreeProps {
  files: string[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
}
```

---

## Environment Configuration

### Validate Required Variables

```typescript
// config.ts
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  databaseUrl: getRequiredEnv('DATABASE_URL'),
  openRouterApiKey: getRequiredEnv('OPENROUTER_API_KEY'),
  authSecret: getRequiredEnv('BETTER_AUTH_SECRET'),
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
```

### Type-Safe Config

```typescript
const config = {
  database: {
    url: getRequiredEnv('DATABASE_URL'),
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  },
  openRouter: {
    apiKey: getRequiredEnv('OPENROUTER_API_KEY'),
    defaultModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
} as const;

export type Config = typeof config;
export { config };
```

---

## DRY Principle

### Extract Reusable Utilities

```typescript
// Before: duplicated logic
async function getProject(id: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) throw new NotFoundError('Project', id);
  return project;
}

async function getUser(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new NotFoundError('User', id);
  return user;
}

// After: extracted utility
async function findOneOrThrow<T>(
  table: PgTable,
  idColumn: PgColumn,
  id: string,
  resourceName: string
): Promise<T> {
  const [record] = await db.select().from(table).where(eq(idColumn, id));
  if (!record) throw new NotFoundError(resourceName, id);
  return record as T;
}

const project = await findOneOrThrow(projects, projects.id, id, 'Project');
```

### Search Before Creating

Always search the codebase before:
- Creating new types
- Adding utility functions
- Implementing patterns

```bash
# Search for existing implementations
grep -r "parseSSE" src/
grep -r "interface.*Props" src/components/
```
