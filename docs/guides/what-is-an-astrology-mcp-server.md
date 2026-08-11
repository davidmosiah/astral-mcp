# What Is an Astrology MCP Server?

Canonical: https://astral.delx.ai/guides/what-is-an-astrology-mcp-server
Updated: 2026-08-11

## Direct answer

An astrology MCP server connects an AI agent to deterministic astrology tools through the Model Context Protocol. Instead of asking a language model to guess planetary positions, the agent calls named tools that compute a natal chart, transits, synastry or a moon phase and return structured data for the model to explain.

Astral MCP is an open-source, local-first implementation. It runs without an API key or account, does not persist birth data and returns structured astrology data only. The calling model writes any interpretation.

## What the server does

Astral MCP exposes ten read-only tools. The main workflow is:

1. `astral_capabilities` describes supported bodies, aspects, zodiacs, house systems and limits.
2. `astral_search_birthplace` resolves a city to latitude, longitude and the birthplace timezone.
3. `astral_compute_natal_chart` computes planets, houses, aspects and a chart signature.
4. `astral_current_transits`, `astral_synastry` and `astral_moon_phase` support follow-up questions.
5. The calling agent writes the interpretation from the returned structured fields.

The server also exposes a worked demo, a data inventory, an agent manifest and a connection-status check.

## Why use MCP instead of asking the model directly?

A language model is useful for explanation but should not be treated as an ephemeris. MCP separates the jobs:

- the astrology engine performs deterministic computation;
- the tool schema makes inputs and outputs explicit;
- the agent chooses the right tool and explains the result;
- the user can inspect the open-source implementation and rerun its accuracy gate.

## Precision boundary

Every Astral MCP natal chart is computed by `circular-natal-horoscope-js`. Planetary longitudes are then independently re-derived with `astronomy-engine`. A chart is marked `verified` only when every checked planet agrees within tolerance and remains in the same sign. A disagreement is flagged for review instead of silently accepted.

This audit reduces silent calculation errors; it does not make an astrological interpretation scientific, clinical or predictive fact.

## Privacy boundary

- Birth data is not persisted: the server is stateless and writes no reading history.
- No API key, OAuth flow or user account exists.
- Natal charts, transits, synastry and moon phases run locally.
- Only `astral_search_birthplace` uses an optional network call, sending the place-name string to OpenStreetMap.
- Use `privacy_mode=summary` when an agent only needs a compact result.

## Birth time and timezone

Use the timezone of the birthplace at the time of birth, not the caller's current timezone. If birth time is unknown, Astral MCP assumes noon; planetary signs remain usable, but the Ascendant and houses are unreliable. An agent should disclose that limit instead of presenting those fields as precise.

## Install

```bash
npx -y astral-mcp
```

Generic MCP client configuration:

```json
{
  "mcpServers": {
    "astral": {
      "command": "npx",
      "args": ["-y", "astral-mcp"]
    }
  }
}
```

After reloading the client, call `astral_connection_status`, then `astral_demo` before sending real birth data.

## When it is a good fit

Use an astrology MCP server when an agent needs reproducible chart computation, explicit tool contracts, local execution and structured outputs it can interpret in its own voice.

Do not use it as evidence for medical, financial, legal or psychological decisions. Astral MCP is not financial, medical, legal or psychological advice, and it is not a substitute for professional judgment.

## Frequently asked questions

### Is an astrology MCP server the same as an astrology API?

Not exactly. Both can expose computed astrology data, but an MCP server publishes tool schemas and results in a protocol designed for AI clients. Astral MCP can run locally over stdio or on loopback HTTP without an API account.

### Does Astral MCP generate horoscope prose?

No. It returns structured astrology data only. The calling model writes the explanation, reading or narrative.

### Can it calculate a chart without an exact birth time?

Yes, with a disclosed limit. Noon is assumed when birth time is missing, so the Ascendant and houses must not be treated as reliable.

### Is birth data uploaded or stored?

No reading history is stored. Only an optional birthplace lookup sends the place-name string to OpenStreetMap; chart computation remains local.

## Canonical sources

- Astral MCP: https://astral.delx.ai/
- Source: https://github.com/davidmosiah/astral-mcp
- npm: https://www.npmjs.com/package/astral-mcp
- Machine-readable project guide: https://astral.delx.ai/llms.txt
