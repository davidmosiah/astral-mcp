# Security Policy

## Reporting a vulnerability

Email **support@delx.ai** with details and reproduction steps. Please do not
open public issues for security reports. You'll get an acknowledgement within a
few business days.

## Security posture

astral-mcp is intentionally small and stateless:

- **No accounts, no API keys, no OAuth, no tokens.** There are no secrets to
  store or leak. The server computes charts in-process from inputs the caller
  provides.
- **No persistence.** Nothing is written to disk; no birth data is stored.
- **One outbound network call, optional.** Only `astral_search_birthplace`
  reaches the public OpenStreetMap Nominatim API. Every other tool is fully
  local. If you never call it, the server makes no network requests.
- **Read-only.** All tools are computational reads; none mutate state. Tool
  annotations mark them `readOnlyHint: true`, `destructiveHint: false`.

## Scope

Birth data (date, time, coordinates) is personal information. astral-mcp does
not transmit it anywhere except the optional geocoding query, which sends only
the free-text place name you pass — never the rest of the birth data.
