# Implementation File Map (All Milestones)

This document defines the desired files for all roadmap milestones and the required content of each file.

## How to Use

- Use this map before starting a phase.
- Treat each file entry as a required implementation artifact, not a suggestion.
- If a file is intentionally skipped, record rationale in PR notes and update this map.

## Phase 1: Foundation Alignment (Completed)

Implementation docs:
- `implementation/README.md`
  - Should contain execution model, reading order, and PR checklist.
- `implementation/current-to-target-matrix.md`
  - Should contain area-by-area current vs target mapping and immediate next step.

Project state docs:
- `project-state/current-vs-target.md`
  - Should contain implementation truth and source-of-truth priority.
- `docs/14-integration-contract.md`
  - Should freeze REST/WS contract naming and payload baseline.

Infra files:
- `docker-compose.yml`
  - Should define local PostgreSQL service with healthcheck and persistent volume.
- `Dockerfile.sandbox`
  - Should define base sandbox runtime image.

## Phase 2: Database and Persistence

Implementation docs:
- `implementation/phase-02-database-and-persistence-spec.md`
  - Should define schema decisions, migration process, repository contracts, test plan.

Schema and migrations:
- `shared/db/schema.ts`
  - Should encode unique constraints and ownership-safe relation model.
- `migrations/*`
  - Should contain generated SQL snapshots and metadata for reproducible setup.

Data access layer:
- `server/services/types.ts`
  - Should define repository input/output types and domain errors.
- `server/services/projects-repository.ts`
  - Should contain owner-scoped CRUD for `projects`.
- `server/services/project-files-repository.ts`
  - Should contain owner-scoped list/upsert/delete for `project_files`.
- `server/services/agent-states-repository.ts`
  - Should contain owner-scoped get/upsert/reset for `agent_states`.

Tests:
- `test/persistence/projects-repository.test.ts`
  - Should verify owner CRUD and non-owner denial.
- `test/persistence/project-files-repository.test.ts`
  - Should verify path uniqueness/upsert semantics and ownership.
- `test/persistence/agent-states-repository.test.ts`
  - Should verify one-state-per-project semantics and ownership.

## Phase 3: Backend API and WebSocket Contract Implementation

Implementation docs:
- `implementation/phase-03-backend-api-spec.md`
  - Should define route modules, middleware, ws validation, and security rules.

Backend composition:
- `server/index.ts`
  - Should compose modular routes, middleware, websocket handler, and health endpoints.
- `server/middleware/auth.ts`
  - Should resolve session and inject authenticated user context.
- `server/middleware/errors.ts`
  - Should map domain and validation errors to status codes with plain message responses.

REST routes:
- `server/routes/projects.ts`
  - Should implement `/api/projects` CRUD endpoints with raw data success responses.
- `server/routes/project-files.ts`
  - Should implement `/api/project-files/:projectId` read/write endpoints.

WebSocket:
- `server/websocket/types.ts`
  - Should define strongly typed inbound/outbound message structures.
- `server/websocket/validators.ts`
  - Should validate incoming websocket payloads against allowed message types.
- `server/websocket/handler.ts`
  - Should implement connect/message/close routing by project and user.

Tests:
- `test/api/projects-routes.test.ts`
  - Should verify auth, ownership, validation, and status/message error handling.
- `test/api/project-files-routes.test.ts`
  - Should verify file endpoint behavior and owner scoping.
- `test/websocket/ws-contract.test.ts`
  - Should verify accepted/rejected message types and error events.

## Phase 4: Frontend Data Integration

Implementation docs:
- `implementation/phase-04-frontend-data-integration-spec.md`
  - Should define API client behavior, query keys, UI states, and ws integration.

Frontend API layer:
- `src/lib/api-client.ts`
  - Should contain shared fetch wrapper, status-based error parsing, and typed errors.
- `src/lib/api/projects.ts`
  - Should contain project CRUD client methods.
- `src/lib/api/project-files.ts`
  - Should contain project file list/upsert methods.
- `src/lib/ws-client.ts`
  - Should manage websocket connect/reconnect/subscription lifecycle.

Frontend hooks:
- `src/hooks/use-projects.ts`
  - Should expose project queries/mutations with invalidation rules.
- `src/hooks/use-project-files.ts`
  - Should expose project file queries/mutations.
- `src/hooks/use-project-websocket.ts`
  - Should expose ws state and typed event subscriptions.

UI integration:
- `src/components/chat/project-selector.tsx`
  - Should render project list from live API data.
- `src/components/chat/file-explorer.tsx`
  - Should render files from backend and drive editor selection.
- `src/routes/_authed/chat.tsx`
  - Should orchestrate project/file/ws state and handle error/loading UI.

Tests:
- `test/frontend/projects-data-flow.test.tsx`
  - Should verify API-backed project rendering and mutations.
- `test/frontend/project-files-data-flow.test.tsx`
  - Should verify file load/update flow.
- `test/frontend/ws-reconnect.test.tsx`
  - Should verify reconnect and no duplicate subscription behavior.

## Phase 5: Agent Orchestration Core

Implementation docs:
- `implementation/phase-05-agent-orchestration-spec.md`
  - Should define state machine rules, lifecycle, cancellation, and persistence boundaries.

Agent core:
- `server/agents/types.ts`
  - Should define agent state enums, events, and persisted shape.
- `server/agents/state-machine.ts`
  - Should define allowed transitions and guard helpers.
- `server/agents/base-agent.ts`
  - Should contain connection management and typed broadcasting.
- `server/agents/code-generator-agent.ts`
  - Should contain generation lifecycle orchestration and state persistence.
- `server/agents/manager.ts`
  - Should contain get/create/remove agent behavior and cleanup policy.

Integration:
- `server/websocket/handler.ts`
  - Should route websocket command messages to agent manager/agent methods.

Tests:
- `test/agents/state-machine.test.ts`
  - Should verify allowed/blocked transitions.
- `test/agents/manager-lifecycle.test.ts`
  - Should verify creation/cache/cleanup behavior.
- `test/agents/recovery.test.ts`
  - Should verify resume from persisted state.

## Phase 6: Generation and SCOF Parsing

Implementation docs:
- `implementation/phase-06-generation-streaming-parser-spec.md`
  - Should define provider abstraction, prompt boundaries, parser behavior, and failure policy.

Generator modules:
- `server/generator/types.ts`
  - Should define provider contracts and generation payload types.
- `server/generator/provider.ts`
  - Should expose provider interface and factory.
- `server/generator/openrouter-provider.ts`
  - Should implement streaming and JSON generation with OpenRouter.
- `server/generator/prompts.ts`
  - Should contain system prompts and prompt builders for design/implementation.

Parser modules:
- `server/parser/types.ts`
  - Should define parser state and callback interfaces.
- `server/parser/scof.ts`
  - Should parse streamed SCOF chunks into file events safely.

Agent integration:
- `server/agents/code-generator-agent.ts`
  - Should call generator methods and feed parser events to clients and state.

Tests:
- `test/parser/scof-chunking.test.ts`
  - Should verify chunk-boundary correctness.
- `test/parser/scof-error-recovery.test.ts`
  - Should verify malformed output guardrails.
- `test/generator/openrouter-provider.test.ts`
  - Should verify streaming and typed JSON parse behavior.

## Phase 7: Sandbox Preview Runtime

Implementation docs:
- `implementation/phase-07-sandbox-preview-runtime-spec.md`
  - Should define container lifecycle, file materialization strategy, and cleanup policy.

Sandbox service:
- `server/sandbox/types.ts`
  - Should define sandbox config, status, command results.
- `server/sandbox/docker-sandbox.ts`
  - Should implement container start/stop/remove/exec/write behavior.
- `server/sandbox/port-manager.ts`
  - Should allocate/release host ports safely for concurrent projects.

Integration:
- `server/agents/code-generator-agent.ts`
  - Should call sandbox service after generation phases.
- `server/services/projects-repository.ts`
  - Should persist preview URL and sandbox id updates.

Tests:
- `test/sandbox/lifecycle.test.ts`
  - Should verify start/stop/remove paths.
- `test/sandbox/port-manager.test.ts`
  - Should verify deterministic port allocation and conflict handling.
- `test/sandbox/failure-paths.test.ts`
  - Should verify cleanup after startup failures.

## Phase 8: Quality, Operations, and Release

Implementation docs:
- `implementation/phase-08-quality-operations-release-spec.md`
  - Should define CI gates, coverage expectations, observability, and runbooks.

Quality and CI:
- `.github/workflows/ci.yml` (or equivalent CI config)
  - Should run lint, typecheck, test, and migration verification.
- `scripts/ci-verify.sh`
  - Should execute local equivalent of CI checks.

Observability and runtime policy:
- `server/lib/logger.ts`
  - Should provide structured logging with request/project/agent correlation IDs.
- `server/middleware/request-context.ts`
  - Should attach correlation context to requests.
- `server/middleware/rate-limit.ts`
  - Should implement lightweight rate-limiting for expensive endpoints.

Operations docs:
- `docs/15-incident-runbook.md`
  - Should define production issue triage and rollback decisions.
- `docs/16-backup-recovery.md`
  - Should define database backup and restore procedure.
- `docs/17-deployment-runbook.md`
  - Should define deploy and rollback workflow.

Tests and E2E:
- `test/integration/e2e-core-flow.test.ts`
  - Should validate auth -> project -> generate -> preview.

## Cross-Phase Tracking Files

- `project-state/current-vs-target.md`
  - Must be updated when implementation reality changes.
- `roadmap/phase-0X-*.md`
  - Must be updated when phase status/criteria change.
- `implementation/README.md`
  - Must list all existing phase spec docs.
