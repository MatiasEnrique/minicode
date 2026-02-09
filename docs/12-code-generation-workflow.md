# Code Generation Workflow Guide

This document explains how the end-to-end code generation workflow is intended to work in this repository, and how it maps to Cloudflare's VibeSDK (the primary inspiration for the phased execution model). It also calls out the current implementation gaps so you can align expectations when building or extending the system.

## Why a Phased Workflow

VibeSDK frames code generation as a sequence of well-scoped phases (planning, foundation, core features, styling, integration, optimization), and it also includes a dedicated quality assurance step in its workflow. This reduces model drift, keeps context small, and provides natural checkpoints for validation before proceeding to the next chunk of work. The phases also make streaming, UI updates, and state persistence straightforward because each phase is a meaningful unit of progress. VibeSDK explicitly calls out phase-wise development with intelligent error correction, which validates this approach for real-world use.

## Core Concepts (Repo Terminology)

- **Agent**: A stateful orchestrator that manages the generation lifecycle for one project. See `docs/03-agent-system.md`.
- **Phase**: A structured unit of work that defines a small set of files to add or modify.
- **Generator**: The LLM client used to design phases and generate code (see `docs/06-code-generator.md`).
- **Parser**: A streaming parser that converts LLM output into files (see `docs/04-scof-parser.md`).
- **Sandbox**: A container that hosts the generated project, installs dependencies, and runs a dev server (see `docs/05-docker-sandbox.md`).

## High-Level Workflow (Happy Path)

1. **Client request**: User submits a project description from the UI.
2. **WebSocket connect**: Client connects to the backend with `projectId`.
3. **Agent selection**: `AgentManager` returns an existing agent for the project or creates a new one.
4. **Design phase**: LLM proposes a Phase (name, description, files, isLastPhase).
5. **Implement phase**: LLM streams file content; parser emits file start/chunk/end events.
6. **Persist + deploy**: Files are written to the sandbox, dependencies installed, dev server started.
7. **Review + next phase**: System evaluates results, then either continues to next phase or completes.

These steps are described in `docs/01-architecture.md`, `docs/03-agent-system.md`, `docs/04-scof-parser.md`, and `docs/06-code-generator.md`.

## VibeSDK Reference Workflow (from README)

The VibeSDK README describes the following workflow for their platform:

1. **AI Analysis**: Models interpret the user prompt.
2. **Blueprint Creation**: System architecture and file structure are planned.
3. **Phase Generation**: Code is generated incrementally with dependency management.
4. **Quality Assurance**: Automated linting, type checking, and error correction.
5. **Live Preview**: App execution in isolated containers.
6. **Real-time Iteration**: A chat interface enables continuous refinements.
7. **One-Click Deploy**: Generated apps deploy to Workers for Platforms.

This mirrors the phased loop described in this repo and gives a concrete template for when to switch states and what to emit to the client.

## Phase Definition (Structure)

In this repo's design, a phase is a JSON object with:

- `name`: Human-friendly label ("Foundation", "Auth", "Dashboard UI", etc).
- `description`: Short explanation of what changes are expected.
- `files`: List of file paths and their purpose.
- `isLastPhase`: Boolean that ends the loop when true.

This is the unit that the agent stores, broadcasts to clients, and uses to trigger generation for each phase.

## Phase Selection (How a Phase is Chosen)

The **design step** takes:

- The user project description.
- The list of files already generated.
- The prior phases and any explicit goals or constraints.

The output is a Phase object. The agent then:

- Appends the phase to its persisted state.
- Broadcasts `phase_designed` to clients.
- Switches state to `IMPLEMENTING_PHASE` and begins streaming code.

This separation keeps "what to do" (design) distinct from "how to do it" (implementation).

## The Phase Loop (Agent-Orchestrated)

Below is the intended control flow as described in `docs/03-agent-system.md`:

```text
while phaseCount < maxPhases:
  if cancelled: stop

  DESIGN:
    - set state = DESIGNING_PHASE
    - call designPhase(...)
    - persist phase metadata

  IMPLEMENT:
    - set state = IMPLEMENTING_PHASE
    - stream content via parser
    - update generatedFiles map
    - write files to sandbox

  POST-PHASE:
    - on first phase: install deps, start dev server
    - persist state to DB
    - if phase.isLastPhase: break

finish:
  - set state = COMPLETE
  - broadcast generation_complete
```

This loop is intentionally deterministic and serialized. It makes it easy to pause, resume, cancel, or replay generation from any saved phase boundary.

## Review and Validation Loop (Recommended)

VibeSDK includes a "quality assurance" phase in its phased execution model. In this repo, that maps naturally to a review loop that runs after each phase (or after the final phase), before continuing:

- **Static checks**: typecheck, lint, format.
- **Runtime checks**: start dev server, run basic health or smoke tests.
- **LLM review pass**: prompt the model to assess generated diffs against requirements.

If any step fails, the agent can add a corrective phase ("Fix build errors", "Resolve type errors", "Improve UX copy"). This keeps the system robust and reduces the risk of compounding errors across phases.

## Mapping to VibeSDK Phases

VibeSDK's public docs describe a multi-phase execution flow. In practice, you can map those phases to specific generation objectives:

- **Planning**: Define scope, user flows, data model, and tech choices.
- **Foundation**: Project scaffolding, base config, routing, layout.
- **Core**: Primary domain features and data flows.
- **Styling**: Visual system, component polish, responsive layout.
- **Integration**: Wiring APIs, auth, persistence, third-party services.
- **Optimization**: Performance, accessibility, build size.
- **Quality assurance**: Fix issues, tests, and final QA (called out as a workflow step).

Treat these as templates, not hard rules. For small projects, some phases can be merged. For complex apps, you may split a phase into several smaller sub-phases (e.g., "Core: Projects CRUD", then "Core: Realtime Updates").

## How the System Chooses Which Agent to Run

### Current Design (Single Agent)

The planned architecture uses **one agent per project**, created and cached by an `AgentManager`:

- `getOrCreateAgent(projectId)` returns a `CodeGeneratorAgent`.
- The WebSocket handler routes all messages for the project to that agent.
- The agent manages all phases, streaming, and persistence.

This mirrors VibeSDK's model where **stateful AI agents** keep project context and manage phased execution, backed by durable storage.

In VibeSDK, this is implemented with Cloudflare Durable Objects. The README describes a `CodeGeneratorAgent` Durable Object that maintains persistent state across WebSocket connections and drives phase-wise generation with streaming progress updates. That design directly matches the single-agent-per-project approach documented in this repo.

### Extending to Multiple Agents (Optional)

If you want specialized agents (planner, coder, reviewer), introduce an **agent router** keyed by message type or generation stage:

- `PlannerAgent`: builds a high-level plan and phase list.
- `ImplementationAgent`: handles file generation + streaming.
- `ReviewAgent`: runs quality checks and fixes.

In that setup, the "main" `CodeGeneratorAgent` can become an orchestrator that delegates tasks to sub-agents (or switches prompts/roles dynamically). The routing decision is typically based on state (`currentState`) and message type (`start_generation`, `review`, `fix_errors`).

## Streaming File Generation (How Code is Produced)

The intended flow is:

1. `implementPhase()` sends prompts to the LLM with the current Phase and existing files.
2. LLM responds in SCOF format (shell-like `cat > file << 'EOF'` blocks).
3. The parser (`docs/04-scof-parser.md`) reads the stream and emits:
   - `file_start` when a new file is detected.
   - `file_chunk` for real-time incremental UI display.
   - `file_end` when EOF is reached.
4. The agent updates its in-memory `generatedFiles` map and persists updates at phase boundaries.

This design supports live UI updates while the model streams output and ensures files can be safely written to disk once complete.

## Persistence and Recovery

The intended design persists state after each phase:

- Agent state (current phase, current state, preview URL).
- Phase list and generated files.
- Project metadata (status, updatedAt).

This allows the system to recover if the server restarts mid-generation and to resume from the last successful phase.

## What Is Implemented Today (Important)

As of this snapshot, the actual codebase only includes:

- A minimal Elysia WebSocket server (`server/index.ts`).
- Frontend shell and auth flows (TanStack Start).
- Shared schema + auth config.

The agent system, generator, parser, and sandbox described above are **documented designs**, not implemented code. If you are building toward the full workflow, treat the docs as the target architecture, not the current behavior.

## Implementation Checklist (If You Want the Full Workflow)

1. **Create agent classes**: Implement `BaseAgent`, `CodeGeneratorAgent`, and `AgentManager` as described in `docs/03-agent-system.md`.
2. **Implement generator**: Add `designPhase()` and `implementPhase()` using OpenRouter or another provider (`docs/06-code-generator.md`).
3. **Add parser**: Implement SCOF streaming parse and connect to generator callbacks (`docs/04-scof-parser.md`).
4. **Add sandbox**: Build Docker sandbox lifecycle and file writing (`docs/05-docker-sandbox.md`).
5. **Wire WebSocket**: Connect `/ws/:projectId` messages to agent actions (`docs/07-elysia-backend.md`).
6. **Persist state**: Use Drizzle schema to store phases, files, and agent state (`shared/db/schema.ts`).
7. **Add review loop**: Introduce lint/test/LLM review steps between phases.

## Sources and Inspiration

- Cloudflare VibeSDK (phased execution, stateful agents, durable state)
- Local docs in this repo (architecture, agent system, parser, generator, backend)
