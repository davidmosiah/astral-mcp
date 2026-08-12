# How to Protect Birth Data in Astrology Agent Workflows

Canonical: https://astral.delx.ai/guides/how-to-protect-birth-data-in-astrology-agent-workflows

Updated: 2026-08-12

## Direct answer

To protect birth data in an astrology agent workflow, minimize the payload, resolve the birthplace only when needed, compute locally, use `privacy_mode=summary` for follow-ups, and keep the model's interpretation separate from the raw input.

Astral MCP is stateless: **No birth data is persisted** and there is no account or reading history. An optional birthplace lookup sends only the place-name string to OpenStreetMap. This is an implementation boundary, not a privacy certification.

## Five bounded steps

1. **Minimize the payload.** Collect only the date, optional time and birthplace fields required for the question. Do not attach names, addresses, contact details or unrelated context.
2. **Resolve only the location.** If latitude, longitude and the historical IANA timezone are already known, skip `astral_search_birthplace`. Otherwise send a deliberate place-name string and retain only the selected location fields.
3. **Compute locally.** Call `astral_compute_natal_chart`, `astral_current_transits` or `astral_synastry` in the local stateless process. Astral does not persist birth data or reading history.
4. **Constrain the context.** Use `privacy_mode=summary` when the model needs only the high-signal result. Keep raw birth fields out of unrelated prompts, analytics events and debug logs.
5. **State the boundary.** Preserve the tool's precision status and tell the user what was sent over the network. Product behavior is not a privacy certification, legal opinion or security audit.

## What Astral MCP actually guarantees

- **Stateless computation:** the local MCP process computes the chart and does not persist birth data, accounts or reading history.
- **One optional egress:** `astral_search_birthplace` sends only the place-name string to public OpenStreetMap Nominatim. Skip it when coordinates and timezone are already known.
- **Payload control:** `privacy_mode` separates `full`, `structured` and `summary` verbosity. It limits the result sent to the model; it does not configure your application's logs.
- **Caller responsibility:** redact names and unrelated personal data, restrict telemetry, and set retention rules around the MCP client, model provider and observability stack.

The public Nominatim endpoint has its own [usage policy](https://operations.osmfoundation.org/policies/nominatim/). Do not use it for autocomplete, bulk or confidential queries.

## Smallest useful request

Pass only the fields the computation needs. A summary response reduces what the model must carry forward; it does not replace redaction in the surrounding application.

```json
{
  "birth_date": "1989-02-23",
  "birth_time": "14:30",
  "latitude": -3.7319,
  "longitude": -38.5267,
  "timezone": "America/Fortaleza",
  "verify_precision": true,
  "privacy_mode": "summary",
  "response_format": "json"
}
```

## Privacy review before production

1. **Map the fields:** list every birth-data field, derived field and identifier that enters the client, model, logs or analytics.
2. **Test egress:** confirm that only a deliberate place-name lookup can leave the local process and that policy and rate limits are respected.
3. **Check retention:** set retention and access rules for prompts, traces, crash reports and backups outside Astral MCP.
4. **Publish the disclosure:** tell users that Astral is stateless, name the optional OpenStreetMap lookup and avoid saying “certified” unless a separate audit supports it.

## Do not overclaim

“Stateless” describes Astral MCP's process and storage behavior. It does not certify the MCP client, model provider, proxy, logs, backups or downstream analytics.

A `verified` result means two computational paths agreed within tolerance. It does not validate astrology or make the output scientific, medical, legal or psychological advice.

This guide is **not a privacy certification**, legal opinion or substitute for a threat model and data-retention review of the complete deployment.

## Questions

### Is birth data stored by Astral MCP?

No. Astral MCP is stateless, computes locally and does not persist birth data or reading history. The MCP client, model provider and observability stack still need their own retention review.

### What leaves the local process during a birthplace lookup?

Only the place-name string is sent to OpenStreetMap's public Nominatim service. Skip the lookup when coordinates and the historical IANA timezone are already known.

### Does privacy_mode=summary delete the raw input?

No. It limits the returned chart payload. The calling agent remains responsible for redacting prompts, logs, traces and analytics events.

### Is this a privacy certification?

No. These are product and workflow boundaries, not a privacy certification, legal opinion or security audit.

## Related guides

- [What Is an Astrology MCP Server?](https://astral.delx.ai/guides/what-is-an-astrology-mcp-server) — protocol, computation and interpretation boundaries.
- [How to Generate a Natal Chart with MCP](https://astral.delx.ai/guides/how-to-generate-a-natal-chart-with-mcp) — birthplace, timezone, unknown birth-time and precision-audit workflow.
- [Delx platform map](https://delx.ai/platform) — Astral's boundary with the other Delx properties.

Astral MCP returns structured astrology data for agent workflows. It is not financial, medical, legal or psychological advice.
