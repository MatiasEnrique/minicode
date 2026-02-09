# Phase 6 Implementation Spec: Generation and SCOF Parsing

Phase reference: `roadmap/phase-06-generation-streaming-parser.md`

## Goal

Implement generation pipeline for phase design + streamed implementation output parsed into file events.

## Dependencies

- Phase 5 agent orchestration in place.
- `OPENROUTER_API_KEY` available for local integration runs.

## Desired Files and Content

- `server/generator/types.ts`
  - Provider config, phase structures, generation callback interfaces.
- `server/generator/provider.ts`
  - Provider abstraction + factory.
- `server/generator/openrouter-provider.ts`
  - OpenRouter client implementation for JSON and streaming methods.
- `server/generator/prompts.ts`
  - Prompt builders for `designPhase` and `implementPhase`.
- `server/parser/types.ts`
  - Parser state and parse callback type definitions.
- `server/parser/scof.ts`
  - Stateful chunk parser that emits file start/chunk/end events.
- `server/agents/code-generator-agent.ts`
  - Integrate generator and parser callback flow.

## Implementation Notes

- `designPhase` output must be schema-validated before use.
- Parser must buffer partial lines between chunks.
- Emit chunk events in same order as stream to support live UI updates.
- Treat malformed SCOF output as recoverable where possible, fatal otherwise.

## Test Plan

- `test/parser/scof-chunking.test.ts`
  - split-line and multi-file chunk sequences.
- `test/parser/scof-error-recovery.test.ts`
  - malformed command handling and failure behavior.
- `test/generator/openrouter-provider.test.ts`
  - contract-level behavior (mocked provider responses where needed).

## Validation Commands

```bash
bun run typecheck
bun run test
```

## Done Criteria

- A request can design at least one phase and stream at least one file.
- Parsed files are complete and order-correct.
- Parser and provider tests cover key failure paths.
