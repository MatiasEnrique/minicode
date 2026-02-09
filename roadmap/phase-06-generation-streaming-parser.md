# Phase 6: Generation, Streaming, and SCOF Parsing

## Objective

Implement design-phase and implementation-phase generation, parse streamed SCOF output, and emit file events safely.

## Current State

- No `server/generator` module exists.
- No parser implementation in `server/parser`.
- No runtime mapping from streamed tokens to files.

## Target State

- Generator provider abstraction with OpenRouter implementation.
- Streaming SCOF parser with chunk-safe line handling.
- Agent integration for `file_start`, `file_chunk`, `file_end` events.

## Inputs

- Phase 5 orchestration and websocket eventing complete.

## Concrete Work Items

1. Generator provider
- Add provider interface and OpenRouter implementation.
- Implement `designPhase()` and `implementPhase()` methods.

2. Parser
- Implement stateful chunk parser.
- Handle partial lines and malformed command edge cases.

3. Agent wiring
- Feed streamed chunks into parser.
- Update in-memory file map and emit incremental websocket events.

4. Failure behavior
- Add retry policy for transient provider failures.
- Emit typed generation errors and return to stable state.

5. Tests
- Parser edge-case tests.
- Integration test from streaming chunks to emitted file events.

## Files Expected To Change

- `server/generator/*`
- `server/parser/*`
- `server/agents/code-generator-agent.ts`
- `test/parser/*`
- `test/generator/*`

## Validation Commands

```bash
bun run typecheck
bun run test
```

## Exit Criteria

- At least one phase can be designed and streamed into concrete files.
- File events are emitted in correct order with complete content.
- Parser handles chunk boundaries and malformed outputs safely.
