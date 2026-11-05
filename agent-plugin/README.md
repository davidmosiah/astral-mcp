# Astral — Agent Plugins package

Portable [Agent Plugins](https://agent-plugins.org/) v1 package for
[Hermes Agent](https://github.com/NousResearch/hermes-agent) and other Agent Plugins clients:
the `astral` MCP server (`astral-mcp@0.3.2` over stdio) plus the `astral-mcp` workflow skill.

## Install (Hermes Agent)

```bash
hermes plugins install davidmosiah/astral-mcp/agent-plugin --no-enable
hermes plugins enable astral-mcp
```

Requires Node.js 20+ (`npx` on PATH). The skill loads as `astral-mcp:astral-mcp`.

## Disclosure

Runs the `astral-mcp@0.3.2` npm package locally over stdio through `npx` (Node.js 20+ required); the package is downloaded from npm on first start. Data source: local ephemeris computation (circular-natal-horoscope-js cross-checked with astronomy-engine); astral_search_birthplace looks up place names to coordinates. Present astrology as symbolic and reflective, not as prediction or advice for health, money or legal decisions. Birth date, time and place identify a person: use them only for the chart the user asked for. The tool set comes from the pinned npm version, not from this repository's source tree.
