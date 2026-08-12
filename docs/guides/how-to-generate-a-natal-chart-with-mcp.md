# How to Generate a Natal Chart with MCP

Canonical: https://astral.delx.ai/guides/how-to-generate-a-natal-chart-with-mcp

Updated: 2026-08-11

## Direct answer

To generate a natal chart with MCP, connect Astral MCP to an MCP-compatible client, inspect `astral_capabilities`, resolve the birthplace with `astral_search_birthplace`, and pass the selected latitude, longitude and birthplace timezone to `astral_compute_natal_chart`. Keep `verify_precision` enabled, choose a `privacy_mode`, and inspect the returned precision status before asking the model to explain the structured chart.

Astral MCP performs the chart calculation locally and stores no reading history. The optional birthplace lookup is the only network step.

## 1. Connect the server

Astral MCP requires Node.js 20 or newer and no API key, OAuth flow or account.

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

Reload the client, then call `astral_connection_status` and `astral_demo`. The demo uses fixed Greenwich data, requires no network call and lets you inspect the payload before sharing real birth data.

## 2. Inspect the supported contract

Call `astral_capabilities` before building a workflow. It reports the supported house systems, tropical and sidereal zodiacs, included bodies and aspects, the dual-engine model and known exclusions.

Astral MCP returns structured computation, not a prewritten horoscope. The calling model is responsible for the explanation.

## 3. Resolve the birthplace

When you have a city rather than coordinates, call:

```json
{
  "query": "Fortaleza, Brazil",
  "language": "en",
  "response_format": "json"
}
```

Choose the result whose full display name matches the intended birthplace. Preserve all three returned fields together:

- `latitude`
- `longitude`
- `timezone` — the IANA timezone of the birthplace, not the caller's current timezone

`astral_search_birthplace` uses the public OpenStreetMap Nominatim service. Its [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) limits use to an absolute maximum of one request per second, requires an identifying User-Agent and attribution, and forbids autocomplete and systematic/bulk queries. Do not send personal or confidential material. Astral MCP identifies itself, but the caller remains responsible for using this optional lookup only for deliberate, user-triggered place searches and for reviewing the current policy.

If you already know the coordinates and historical IANA timezone, skip the network lookup.

## 4. Compute the natal chart

Pass the selected coordinates and birthplace timezone to the core tool:

```json
{
  "birth_date": "1989-02-23",
  "birth_time": "14:30",
  "latitude": -3.7319,
  "longitude": -38.5267,
  "timezone": "America/Fortaleza",
  "house_system": "placidus",
  "zodiac": "tropical",
  "verify_precision": true,
  "privacy_mode": "summary",
  "response_format": "json"
}
```

The default house system is `placidus`, the default zodiac is `tropical`, and `verify_precision` defaults to `true`. Keep those defaults unless the user asks for a different supported convention.

### If the birth time is unknown

Omit `birth_time` instead of inventing one. Noon is assumed internally. Planetary signs remain usable within the server's documented boundary, but the Ascendant and houses are not reliable and must be described that way. The output exposes `meta.birthTimeKnown` so an agent can preserve that disclosure.

## 5. Choose the smallest useful payload

`privacy_mode` controls how much structured chart data enters model context:

- `summary`: luminaries, Ascendant, chart signature, top aspects and precision status
- `structured`: full structure with redundant or derivable fields removed
- `full`: every placement, house, aspect and per-planet precision row

Start with `summary`. Request `structured` or `full` only when the question needs those fields. `response_format` is separate: use `json` for machine processing and `markdown` for a display-ready briefing.

## 6. Inspect the precision boundary

Astral MCP computes the chart with `circular-natal-horoscope-js` and independently re-derives planetary longitudes with [Astronomy Engine](https://github.com/cosinekitty/astronomy). A result is marked `verified` only when the checked placements agree within the project's tolerance and remain in the same sign; disagreement becomes `review` rather than being silently accepted.

That precision audit measures computational agreement between engines. It does not validate astrology, prove an interpretation or turn a reading into scientific or predictive fact.

## 7. Ask the model to explain, not recompute

A bounded prompt can say:

> Explain the structured natal-chart result in plain language. Do not recalculate placements. State whether the birth time was known, preserve any `review` precision status, distinguish computation from interpretation, and do not present the reading as scientific fact or advice.

Astral MCP is not financial, medical, legal or psychological advice. Do not use a chart as evidence for consequential decisions.

## Common mistakes

1. Passing the caller's timezone instead of the birthplace timezone.
2. Selecting the first geocoder match without checking its full display name.
3. Inventing an exact birth time when it is unknown.
4. Treating Ascendant and houses as reliable after a noon assumption.
5. Disabling `verify_precision` without disclosing that the cross-check was skipped.
6. Requesting `privacy_mode: "full"` when a summary answers the question.
7. Asking the language model to calculate placements instead of reading the tool result.
8. Using public Nominatim for autocomplete, bulk or confidential queries.

## Frequently asked questions

### Can an agent generate a birth chart without an astrology API key?

Yes. Astral MCP runs locally through an MCP client and requires no astrology API account. The optional public geocoder also requires no key, but its usage policy still applies.

### What happens when the birth time is missing?

Astral MCP assumes noon and exposes that the time was unknown. The Ascendant and houses must not be treated as reliable.

### Does `verified` mean the reading is scientifically validated?

No. It means the two computational paths agreed within the configured tolerance. It does not validate astrology or the model's interpretation.

### Is birth data stored?

No. The server is stateless and stores no reading history. Only an optional birthplace search sends the place-name string to OpenStreetMap.

## Primary and canonical sources

- [Astral MCP source](https://github.com/davidmosiah/astral-mcp)
- [Astral MCP machine-readable guide](https://astral.delx.ai/llms.txt)
- [What is an astrology MCP server?](https://astral.delx.ai/guides/what-is-an-astrology-mcp-server)
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Astronomy Engine](https://github.com/cosinekitty/astronomy)
- [Birth-data privacy workflow](https://astral.delx.ai/guides/how-to-protect-birth-data-in-astrology-agent-workflows)
