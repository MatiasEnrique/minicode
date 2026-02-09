# Database (Drizzle + PostgreSQL)

The database layer uses Drizzle ORM with PostgreSQL for type-safe queries.

## Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Database Layer                                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         Drizzle ORM                                  │ │
│  │                                                                      │ │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │ │
│  │   │   Schema     │   │   Queries    │   │    Migrations        │   │ │
│  │   │              │   │              │   │                      │   │ │
│  │   │  - users     │   │  - select    │   │  - drizzle-kit       │   │ │
│  │   │  - sessions  │   │  - insert    │   │  - push/generate     │   │ │
│  │   │  - projects  │   │  - update    │   │  - migrate           │   │ │
│  │   │  - files     │   │  - delete    │   │                      │   │ │
│  │   │  - states    │   │  - relations │   │                      │   │ │
│  │   └──────────────┘   └──────────────┘   └──────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                      │
│                                    ▼                                      │
│                          ┌─────────────────┐                              │
│                          │   PostgreSQL    │                              │
│                          │   (Docker)      │                              │
│                          └─────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Docker Setup

### docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: codegen-postgres
    environment:
      POSTGRES_USER: codegen
      POSTGRES_PASSWORD: codegen_secret
      POSTGRES_DB: codegen
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U codegen"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Start Database

```bash
docker-compose up -d postgres
```

---

## Drizzle Configuration

```typescript
// drizzle.config.ts

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://codegen:codegen_secret@localhost:5432/codegen',
  },
  verbose: true,
  strict: true,
});
```

---

## Schema Definition

### Users & Sessions (Better Auth)

```typescript
// shared/db/schema.ts

import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Projects

```typescript
// shared/db/schema.ts (continued)

import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('idle'),
  previewUrl: text('preview_url'),
  sandboxId: text('sandbox_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

### Project Files

```typescript
// shared/db/schema.ts (continued)

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const projectFiles = pgTable('project_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  projectPathIdx: index('project_path_idx').on(table.projectId, table.path),
}));

export type ProjectFile = typeof projectFiles.$inferSelect;
export type NewProjectFile = typeof projectFiles.$inferInsert;
```

### Agent States

```typescript
// shared/db/schema.ts (continued)

import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const agentStates = pgTable('agent_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' })
    .unique(),
  currentState: text('current_state').notNull().default('idle'),
  currentPhase: integer('current_phase'),
  phases: jsonb('phases').$type<PhaseData[]>().default([]),
  sandboxId: text('sandbox_id'),
  previewUrl: text('preview_url'),
  generatedFiles: jsonb('generated_files').$type<string[]>().default([]),
  conversationHistory: jsonb('conversation_history').$type<Message[]>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type definitions
export interface PhaseData {
  name: string;
  description: string;
  files: Array<{ path: string; purpose: string }>;
  isLastPhase: boolean;
  completed: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export type AgentState = typeof agentStates.$inferSelect;
export type NewAgentState = typeof agentStates.$inferInsert;
```

### Schema Index

```typescript
// shared/db/index.ts

export * from './auth';
export * from './projects';
export * from './files';
export * from './agent-states';
```

---

## Database Connection

```typescript
// shared/db/index.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL ||
  'postgresql://codegen:codegen_secret@localhost:5432/codegen';

// Create postgres client
const client = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

export type Database = typeof db;
```

---

## Database Services

### Project Service

```typescript
// server/services/project-service.ts

import { eq, desc, and } from 'drizzle-orm';
import { db } from '../index';
import { projects, projectFiles, agentStates } from '../schema';
import type { Project, NewProject, ProjectFile, NewProjectFile } from '../schema';

export class ProjectService {
  /**
   * Get all projects for a user
   */
  async getByUserId(userId: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project || null;
  }

  /**
   * Get project with files
   */
  async getWithFiles(id: string): Promise<{ project: Project; files: ProjectFile[] } | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!project) return null;

    const files = await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, id));

    return { project, files };
  }

  /**
   * Create a new project
   */
  async create(data: NewProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(data)
      .returning();
    return project;
  }

  /**
   * Update project
   */
  async update(id: string, data: Partial<NewProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  /**
   * Delete project (cascades to files and agent state)
   */
  async delete(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  /**
   * Update project status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    await db
      .update(projects)
      .set({ status, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  /**
   * Update preview URL
   */
  async updatePreviewUrl(id: string, previewUrl: string): Promise<void> {
    await db
      .update(projects)
      .set({ previewUrl, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }
}

export const projectService = new ProjectService();
```

### File Service

```typescript
// server/services/file-service.ts

import { eq, and } from 'drizzle-orm';
import { db } from '../index';
import { projectFiles } from '../schema';
import type { ProjectFile, NewProjectFile } from '../schema';

export class FileService {
  /**
   * Get all files for a project
   */
  async getByProjectId(projectId: string): Promise<ProjectFile[]> {
    return db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));
  }

  /**
   * Get single file
   */
  async getByPath(projectId: string, path: string): Promise<ProjectFile | null> {
    const [file] = await db
      .select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.projectId, projectId),
          eq(projectFiles.path, path)
        )
      );
    return file || null;
  }

  /**
   * Upsert file (insert or update)
   */
  async upsert(projectId: string, path: string, content: string): Promise<ProjectFile> {
    const [file] = await db
      .insert(projectFiles)
      .values({ projectId, path, content })
      .onConflictDoUpdate({
        target: [projectFiles.projectId, projectFiles.path],
        set: { content, updatedAt: new Date() },
      })
      .returning();
    return file;
  }

  /**
   * Bulk upsert files
   */
  async bulkUpsert(projectId: string, files: Map<string, string>): Promise<void> {
    const values = Array.from(files.entries()).map(([path, content]) => ({
      projectId,
      path,
      content,
    }));

    // Use transaction for bulk operations
    await db.transaction(async (tx) => {
      for (const value of values) {
        await tx
          .insert(projectFiles)
          .values(value)
          .onConflictDoUpdate({
            target: [projectFiles.projectId, projectFiles.path],
            set: { content: value.content, updatedAt: new Date() },
          });
      }
    });
  }

  /**
   * Delete file
   */
  async delete(projectId: string, path: string): Promise<void> {
    await db
      .delete(projectFiles)
      .where(
        and(
          eq(projectFiles.projectId, projectId),
          eq(projectFiles.path, path)
        )
      );
  }

  /**
   * Delete all files for a project
   */
  async deleteByProjectId(projectId: string): Promise<void> {
    await db
      .delete(projectFiles)
      .where(eq(projectFiles.projectId, projectId));
  }
}

export const fileService = new FileService();
```

### Agent State Service

```typescript
// server/services/agent-state-service.ts

import { eq } from 'drizzle-orm';
import { db } from '../index';
import { agentStates } from '../schema';
import type { AgentState, NewAgentState, PhaseData, Message } from '../schema';

export class AgentStateService {
  /**
   * Get agent state for a project
   */
  async getByProjectId(projectId: string): Promise<AgentState | null> {
    const [state] = await db
      .select()
      .from(agentStates)
      .where(eq(agentStates.projectId, projectId));
    return state || null;
  }

  /**
   * Create or update agent state
   */
  async upsert(projectId: string, data: Partial<Omit<NewAgentState, 'projectId'>>): Promise<AgentState> {
    const [state] = await db
      .insert(agentStates)
      .values({ projectId, ...data })
      .onConflictDoUpdate({
        target: agentStates.projectId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return state;
  }

  /**
   * Update current state
   */
  async updateState(projectId: string, currentState: string): Promise<void> {
    await db
      .update(agentStates)
      .set({ currentState, updatedAt: new Date() })
      .where(eq(agentStates.projectId, projectId));
  }

  /**
   * Add phase
   */
  async addPhase(projectId: string, phase: PhaseData): Promise<void> {
    const state = await this.getByProjectId(projectId);
    const phases = state?.phases || [];

    await db
      .update(agentStates)
      .set({
        phases: [...phases, phase],
        currentPhase: phases.length,
        updatedAt: new Date(),
      })
      .where(eq(agentStates.projectId, projectId));
  }

  /**
   * Mark phase completed
   */
  async completePhase(projectId: string, phaseIndex: number): Promise<void> {
    const state = await this.getByProjectId(projectId);
    if (!state?.phases) return;

    const phases = [...state.phases];
    if (phases[phaseIndex]) {
      phases[phaseIndex] = { ...phases[phaseIndex], completed: true };
    }

    await db
      .update(agentStates)
      .set({ phases, updatedAt: new Date() })
      .where(eq(agentStates.projectId, projectId));
  }

  /**
   * Add generated file to list
   */
  async addGeneratedFile(projectId: string, filePath: string): Promise<void> {
    const state = await this.getByProjectId(projectId);
    const files = state?.generatedFiles || [];

    if (!files.includes(filePath)) {
      await db
        .update(agentStates)
        .set({
          generatedFiles: [...files, filePath],
          updatedAt: new Date(),
        })
        .where(eq(agentStates.projectId, projectId));
    }
  }

  /**
   * Add message to conversation history
   */
  async addMessage(projectId: string, message: Message): Promise<void> {
    const state = await this.getByProjectId(projectId);
    const history = state?.conversationHistory || [];

    await db
      .update(agentStates)
      .set({
        conversationHistory: [...history, message],
        updatedAt: new Date(),
      })
      .where(eq(agentStates.projectId, projectId));
  }

  /**
   * Update sandbox info
   */
  async updateSandbox(projectId: string, sandboxId: string, previewUrl: string): Promise<void> {
    await db
      .update(agentStates)
      .set({ sandboxId, previewUrl, updatedAt: new Date() })
      .where(eq(agentStates.projectId, projectId));
  }

  /**
   * Reset agent state
   */
  async reset(projectId: string): Promise<void> {
    await db
      .update(agentStates)
      .set({
        currentState: 'idle',
        currentPhase: null,
        phases: [],
        generatedFiles: [],
        updatedAt: new Date(),
      })
      .where(eq(agentStates.projectId, projectId));
  }

  /**
   * Delete agent state
   */
  async delete(projectId: string): Promise<void> {
    await db
      .delete(agentStates)
      .where(eq(agentStates.projectId, projectId));
  }
}

export const agentStateService = new AgentStateService();
```

---

## Migrations

### Generate Migrations

```bash
# Generate migration from schema changes
bunx drizzle-kit generate

# Push schema directly (development)
bunx drizzle-kit push

# Run migrations
bunx drizzle-kit migrate
```

### Migration Scripts

```typescript
// scripts/migrate.ts

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index';

async function runMigrations() {
  console.log('Running migrations...');

  await migrate(db, {
    migrationsFolder: './drizzle',
  });

  console.log('Migrations complete');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "db:generate": "bunx drizzle-kit generate",
    "db:push": "bunx drizzle-kit push",
    "db:migrate": "bun run src/db/migrate.ts",
    "db:studio": "bunx drizzle-kit studio"
  }
}
```

---

## Query Patterns

### Common Queries

```typescript
// Select with conditions
const activeProjects = await db
  .select()
  .from(projects)
  .where(and(
    eq(projects.userId, userId),
    eq(projects.status, 'generating')
  ));

// Select with join
const projectsWithFiles = await db
  .select({
    project: projects,
    fileCount: sql<number>`count(${projectFiles.id})`,
  })
  .from(projects)
  .leftJoin(projectFiles, eq(projects.id, projectFiles.projectId))
  .where(eq(projects.userId, userId))
  .groupBy(projects.id);

// Update with returning
const [updated] = await db
  .update(projects)
  .set({ status: 'complete' })
  .where(eq(projects.id, projectId))
  .returning();

// Delete with cascade (handled by foreign key)
await db.delete(projects).where(eq(projects.id, projectId));

// Transaction
await db.transaction(async (tx) => {
  const [project] = await tx
    .insert(projects)
    .values({ userId, name, description })
    .returning();

  await tx
    .insert(agentStates)
    .values({ projectId: project.id });

  return project;
});
```

### JSONB Operations

```typescript
// Update JSONB field
await db
  .update(agentStates)
  .set({
    phases: sql`${agentStates.phases} || ${JSON.stringify([newPhase])}::jsonb`,
  })
  .where(eq(agentStates.projectId, projectId));

// Query JSONB
const withCompletedPhases = await db
  .select()
  .from(agentStates)
  .where(
    sql`${agentStates.phases}->-1->>'completed' = 'true'`
  );
```

---

## Environment Variables

```bash
# .env
DATABASE_URL=postgresql://codegen:codegen_secret@localhost:5432/codegen
```

---

## Type Safety

Drizzle provides full type inference:

```typescript
import { projects } from './schema';

// Inferred types
type Project = typeof projects.$inferSelect;
type NewProject = typeof projects.$inferInsert;

// Usage
async function createProject(data: NewProject): Promise<Project> {
  const [project] = await db.insert(projects).values(data).returning();
  return project;
}

// TypeScript will catch errors
createProject({
  // Error: missing required fields
  name: 'Test',
});

createProject({
  userId: 'user-1',
  name: 'Test',
  description: 'A test project',
  // status is optional, has default
});
```
