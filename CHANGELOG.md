# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

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
