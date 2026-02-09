# Current to Target Matrix

Date: 2026-02-09

This matrix translates current implementation reality into actionable next implementation steps.

| Area | Current State | Target State | Gap | Next Coding Step |
|---|---|---|---|---|
| Frontend data | Static project and file data in chat UI | Live data from backend APIs | No runtime project/file integration | Implement Phase 4 API client hooks and replace hardcoded state |
| Backend API | Only `GET /`, `GET /health`, `WS /ws` echo | Authenticated project/file CRUD + project WS routing | No routes/controllers/services | Implement Phase 3 route modules and ownership checks |
| Database migrations | Schema exists in Drizzle, no committed migrations | Versioned migration history in repo | Reproducibility missing | Implement Phase 2 migration generation + validation commands |
| Project persistence | No code paths using `projects`/`project_files` | Repository/service layer used by API and agents | Missing data access layer | Implement Phase 2 repositories with typed method contracts |
| Agent persistence | `agent_states` schema exists, no read/write usage | Deterministic load/save and resume support | Missing upsert/load logic | Add Phase 2 agent-state repository + tests |
| WebSocket contract | Echo-style message behavior | Typed events and payload contracts | Contract not implemented in server handlers | Implement Phase 3 WS message validator and router |
| Sandbox runtime | Manual Dockerfile only | Backend-managed container lifecycle and preview URL | No server sandbox code | Implement Phase 7 sandbox service and integration |
| Generation pipeline | Not implemented | LLM design + SCOF streaming + parser | No generator/parser modules | Implement Phase 6 generator + parser |
| Tests | Placeholder directories only | API + DB + parser + agent tests in CI | Reliability risk | Start in Phase 2 with persistence tests |

## Immediate Focus

The correct next execution step is Phase 2. It unblocks API, agent, and frontend integration by creating reproducible persistence.
