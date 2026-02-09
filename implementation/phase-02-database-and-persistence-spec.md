# Phase 2 Implementation Spec: Database and Persistence

Phase reference: `roadmap/phase-02-database-and-persistence.md`

## Goal

Convert schema-only definitions into a reproducible, tested persistence layer used by backend code.

## Current State

- Tables are defined in `shared/db/schema.ts`.
- No migration files are committed in `migrations/`.
- No repository/service code exists for `projects`, `project_files`, `agent_states`.
- `server/` has no DB-driven endpoints yet.

## Target State

- Migrations committed and executable on a fresh local DB.
- Typed repository modules for projects/files/agent state.
- Persistence tests validating CRUD + key constraints.
- Clear schema decisions documented and encoded in Drizzle.

## Schema Baseline (Current)

Current business-domain tables in `shared/db/schema.ts`:

- `projects`
- `project_files`
- `agent_states` (named `agent_states` export in code)

## Schema Decisions for Phase 2

These are concrete changes to make in this phase.

1. `projects`
- Keep `id` as `text` (compatible with current schema and no API break).
- Keep `status` as `text` for now (enforce allowed values in service layer until enum migration phase).
- Keep index `projects_userId_idx`.

2. `project_files`
- Keep index `project_path_idx`.
- Add uniqueness for `(project_id, path)` to prevent duplicate path rows per project.

3. `agent_states`
- Enforce one row per project by making `project_id` unique.
- Add index on `current_state` if querying by state becomes frequent (optional in this phase).

4. Relationships
- Keep FK cascades from `projects` and `project_files`/`agent_states`.
- Use transactions for write paths touching multiple tables.

## Required Schema Edits (Drizzle)

In `shared/db/schema.ts`:

- Update `projectFiles` table definition callback to include unique constraint on `(projectId, path)`.
- Update `agent_states.projectId` to `.unique()`.

Expected effect:
- Prevent duplicate file paths per project.
- Guarantee deterministic upsert/load behavior for agent state.

## Migration Plan

1. Generate initial migrations:
```bash
bun run db:generate
```

2. Review generated SQL for:
- creation order
- FK references
- unique constraints on `project_files(project_id, path)` and `agent_states(project_id)`

3. Apply locally:
```bash
bun run db:migrate
```

4. Validate from clean DB:
```bash
docker compose down -v
docker compose up -d postgres
bun run db:migrate
```

## Repository Layer to Implement

Add files:

- `server/services/projects-repository.ts`
- `server/services/project-files-repository.ts`
- `server/services/agent-states-repository.ts`
- `server/services/types.ts` (shared DTO/type aliases)

### Method Contracts

`projects-repository.ts`
- `listByUserId(userId: string): Promise<Project[]>`
- `getByIdForUser(projectId: string, userId: string): Promise<Project | null>`
- `create(input: { id: string; userId: string; name: string; description?: string | null }): Promise<Project>`
- `updateForUser(projectId: string, userId: string, patch: Partial<Pick<Project, "name" | "description" | "status" | "previewUrl" | "sandboxId">>): Promise<Project | null>`
- `deleteForUser(projectId: string, userId: string): Promise<boolean>`

`project-files-repository.ts`
- `listByProjectForUser(projectId: string, userId: string): Promise<ProjectFile[]>`
- `upsertFile(input: { id: string; projectId: string; path: string; content: string; userId: string }): Promise<ProjectFile | null>`
- `upsertMany(input: Array<{ id: string; projectId: string; path: string; content: string; userId: string }>): Promise<number>`
- `deleteByPath(input: { projectId: string; path: string; userId: string }): Promise<boolean>`

`agent-states-repository.ts`
- `getByProjectForUser(projectId: string, userId: string): Promise<AgentState | null>`
- `upsertForProject(input: { id: string; projectId: string; userId: string; currentState: string; currentPhase: number | null; phases: Phase[]; sandboxId?: string | null; previewUrl?: string | null; generatedFiles: string[]; conversationHistory: Message[] }): Promise<AgentState | null>`
- `resetForProject(input: { projectId: string; userId: string }): Promise<boolean>`

## Ownership Rule

All repository methods must enforce ownership by joining through `projects.user_id = userId`.
Do not trust raw `projectId` without user scoping.

## Error Handling Rules

- Unique constraint collision on project file path should return a typed app-level error.
- Missing project under user scope should return `null`, not throw.
- DB connectivity or query syntax errors should throw and be handled by route layer.

## Tests to Add

Create:
- `test/persistence/projects-repository.test.ts`
- `test/persistence/project-files-repository.test.ts`
- `test/persistence/agent-states-repository.test.ts`

Test cases:

1. Projects
- create/list/update/delete for owner
- cannot read/update/delete by non-owner

2. Project files
- upsert same path updates existing row
- cannot write to project owned by another user

3. Agent state
- first write creates row
- second write updates same row (unique project_id)
- non-owner cannot read/write

## Developer Execution Checklist

- [x] Add schema constraint changes in `shared/db/schema.ts`.
- [x] Generate and commit migrations.
- [x] Implement three repositories under `server/services/`.
- [x] Add persistence tests.
- [x] Run validation commands.
- [x] Update `project-state/current-vs-target.md` with new persistence status.

## Validation Commands

```bash
bun run typecheck
bun run test
docker compose up -d postgres
bun run db:migrate
```

## Done Criteria

- Fresh DB migration works end-to-end.
- All repository tests pass.
- Data ownership and uniqueness constraints are enforced in code and DB.
