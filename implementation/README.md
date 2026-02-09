# Implementation Guides (Human-First)

This folder is the execution layer for developers implementing Minicode with minimal AI support.

## Why This Exists

- `docs/` explains target architecture.
- `roadmap/` explains phase order.
- `implementation/` explains exactly what to build, where to build it, and how to verify it.

## Reading Order

1. `project-state/current-vs-target.md`
2. `roadmap/README.md`
3. `implementation/current-to-target-matrix.md`
4. `implementation/implementation-file-map.md`
5. Phase-specific implementation spec

## Rules of Execution

- Implement one phase at a time.
- Do not defer migrations/tests to "later" phases.
- If docs and code diverge, update `project-state/current-vs-target.md` in the same PR.
- Keep API and WebSocket naming aligned with `docs/14-integration-contract.md`.

## Master File Map

- `implementation/implementation-file-map.md`

## Phase Specs

- `implementation/phase-01-foundation-alignment-spec.md`
- `implementation/phase-02-database-and-persistence-spec.md`
- `implementation/phase-03-backend-api-spec.md`
- `implementation/phase-04-frontend-data-integration-spec.md`
- `implementation/phase-05-agent-orchestration-spec.md`
- `implementation/phase-06-generation-streaming-parser-spec.md`
- `implementation/phase-07-sandbox-preview-runtime-spec.md`
- `implementation/phase-08-quality-operations-release-spec.md`

## Pull Request Minimum Checklist

- [ ] Scope maps to one roadmap phase.
- [ ] All phase exit criteria are satisfied.
- [ ] Phase validation commands were run.
- [ ] `project-state/current-vs-target.md` updated if implementation status changed.
- [ ] No contradiction introduced in `README.md`, `AGENTS.md`, `docs/00-README.md`.
