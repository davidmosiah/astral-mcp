# Astral MCP integration skill

Use this skill when an agent needs deterministic astrology data through the
Model Context Protocol. Astral MCP computes natal charts, current transits,
synastry and moon phases with no API key, OAuth flow, account or persistence.

## Safe first run

1. Install the package with `npx -y astral-mcp` or inspect the repository before
   running anything.
2. Call `astral_capabilities` and `astral_agent_manifest` to learn the current
   contract.
3. Call `astral_search_birthplace` for a place name when latitude, longitude or
   the birthplace timezone is unknown. This optional call sends only the place
   name to OpenStreetMap Nominatim; respect its usage policy and one-request-per-
   second limit.
4. Call `astral_compute_natal_chart` with the returned coordinates and timezone.
5. Inspect `precision_audit.status` and per-planet deltas. A `review` result is
   not silently verified.

## Boundaries

- Astral returns structured computational data; it does not write a reading or
  claim that astrology is scientifically validated.
- The server is stateless and does not persist birth data or credentials.
- If `birth_time` is omitted, noon is assumed; planet signs remain useful but
  the Ascendant and houses are unreliable.
- `privacy_mode` reduces output detail; it is not a privacy certification.
- Do not use Astral output as medical, psychological, legal or financial advice.
- Discovery never authorizes access to private data, interpretation, payment or
  an external action.

Canonical guides:

- Machine context: https://astral.delx.ai/llms.txt
- Delx platform map: https://delx.ai/platform
- https://astral.delx.ai/guides/what-is-an-astrology-mcp-server
- https://astral.delx.ai/guides/how-to-generate-a-natal-chart-with-mcp
- https://astral.delx.ai/guides/how-to-protect-birth-data-in-astrology-agent-workflows
