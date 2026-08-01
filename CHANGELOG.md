# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-08-01

### Fixed
- **`astral_demo` advertised an input the server would have rejected.** The demo
  exists so an agent sees the contract before sending real birth data, but its
  `input` block was the engine's internal camelCase shape (`birthDate`,
  `birthTime`) instead of the wire contract `astral_compute_natal_chart`
  actually accepts (`birth_date`, `birth_time`). The input schema is strict, so
  an agent that copied the example — the single most likely thing to do with a
  worked example — got `Invalid arguments ... unrecognized keys birthDate,
  birthTime` and never reached a chart. `demo.input` is now the exact,
  copy-pasteable argument object.
- `astral_demo`'s `chart` omitted `meta.privacy_mode`, which every real
  `astral_compute_natal_chart` response carries. The demo now runs through the
  same verbosity reducer as the real tool, so the example carries the markers an
  agent will actually receive.

### Added
- `npm run test:demo-contract`, wired into `npm test`. It drives the real MCP
  server in memory, sends `astral_demo`'s own `input` to
  `astral_compute_natal_chart`, and fails in both directions: keys the demo
  invents, and contract keys it omits. Arguments are checked against the tool's
  published JSON Schema — an invented or missing argument fails before the call
  does. 236 key paths verified.

### Notes
- A worked example nobody compares against reality is not documentation, it is a
  second, unmaintained contract. This gate makes divergence a build failure.

## [0.2.0] - 2026-06-07

### Added
- `privacy_mode` parameter (`summary` | `structured` | `full`, default `full`) on
  `astral_compute_natal_chart`, `astral_current_transits` and `astral_synastry`.
  This is a payload-verbosity axis independent of `response_format`: an agent can
  request a compact `summary` (luminaries + Ascendant, chart signature, top
  aspects) instead of the full chart and cut the response by ~80%. `structured`
  keeps the full structure but drops redundant/derivable fields. The default
  stays `full`, so existing calls are unchanged.

### Notes
- Token economy, not just metadata: a full Greenwich natal payload is ~6.9 KB,
  `structured` ~3.7 KB, `summary` ~1.2 KB.

## [0.1.0] - 2026-06-05

Initial release.

### Added
- `astral_compute_natal_chart` — full natal chart (planets, houses, aspects with
  orb + strength, Ascendant/MC, chart signature) with a dual-engine precision
  audit on by default.
- `astral_current_transits` — current and upcoming transits to a natal chart,
  plus the current moon phase.
- `astral_synastry` — two-chart comparison scored across harmony, chemistry,
  communication and growth.
- `astral_moon_phase` — moon phase, sign and illumination for any date.
- `astral_search_birthplace` — geocode a place name to latitude/longitude/IANA
  timezone via OpenStreetMap.
- Agent-first surfaces: `astral_demo`, `astral_capabilities`,
  `astral_data_inventory`, `astral_agent_manifest`, `astral_connection_status`.
- stdio (default) and optional streamable HTTP transport.
- Parameterized house system (placidus, koch, campanus, regiomontanus,
  topocentric, equal-house, whole-sign) and zodiac (tropical, sidereal).

### Notes
- Astrology engine ported from the Alkhemia app (originally from Spira).
- Not included yet: lunar nodes, Chiron, asteroids, fixed stars, minor aspects.
