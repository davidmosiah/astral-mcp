# Agent Development Notes

## Scope

This repo is `astral-mcp` — a local-first, precision-audited MCP server that
computes natal charts, transits, synastry and moon phases for AI agents. It is
stateless: no auth, no accounts, no persistence. The astrology engine is ported
from the Alkhemia app and kept framework-free.

## Layout

- `src/engine/` — pure computation, ported verbatim from Alkhemia (no MCP, no
  network except `geocoding.ts`). Treat as a vendored core; keep it portable.
- `src/schemas/common.ts` — zod input/output schemas. Input descriptions are the
  agent-facing contract; write them for an LLM.
- `src/services/` — formatting + the agent-first metadata surfaces.
- `src/tools/astral-tools.ts` — tool registration.
- `src/server.ts` / `src/index.ts` — server factory and stdio/http entry.
- `scripts/` — node test scripts (smoke, accuracy, metadata).

## Commands

- Install: `npm ci`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Accuracy gate: `npm run test:accuracy`
- Full gate: `npm test`

## Rules

- Keep every tool read-only and stateless. No tokens, no disk writes, no birth
  data persistence.
- A natal chart must stay precision-audited by default. Don't regress the
  dual-engine cross-check — it's the project's reason to exist.
- When adding an output field, also add it to the matching output schema:
  `registerTool` rebuilds `z.object(shape)` and validates `structuredContent`
  strictly, so any undeclared top-level key fails at runtime.
- Tool descriptions are written for agents: say when to call the tool, what to
  pass, and what comes back.
- The engine in `src/engine/` mirrors Alkhemia. Fix bugs upstream too when they
  apply to both.
