/**
 * Birth-place geocoding via Nominatim (OpenStreetMap) — free, no API key. Returns
 * several suggestions so a caller can pick the exact city, each already resolved
 * to an IANA timezone so transit/natal readings stay anchored to the birthplace
 * rather than the caller's current clock.
 *
 * Ported from the Alkhemia app. The only change for the MCP/Node runtime is an
 * explicit User-Agent header — Nominatim's usage policy requires an identifiable
 * agent string and rejects anonymous requests (browsers send one automatically).
 */
import { timezoneForCoordinates } from './timezone.js'

export interface GeoSuggestion {
  displayName: string
  latitude: number
  longitude: number
  timezone: string | null
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'astral-mcp (+https://github.com/davidmosiah/astral-mcp)'

function suggestionKey(suggestion: GeoSuggestion): string {
  return [
    suggestion.displayName.toLocaleLowerCase(),
    suggestion.latitude.toFixed(4),
    suggestion.longitude.toFixed(4),
  ].join('|')
}

export async function searchBirthLocations(
  query: string,
  language = 'en',
  signal?: AbortSignal,
): Promise<GeoSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '6',
    addressdetails: '0',
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'Accept-Language': language,
      'User-Agent': USER_AGENT,
    },
    signal,
  })
  if (!response.ok) return []

  const results: unknown = await response.json()
  if (!Array.isArray(results)) return []

  const suggestions = results
    .map((raw): GeoSuggestion => {
      const r = raw as { display_name?: string; lat?: string; lon?: string }
      return {
        displayName: r.display_name ?? '',
        latitude: Number.parseFloat(r.lat ?? ''),
        longitude: Number.parseFloat(r.lon ?? ''),
        timezone: null,
      }
    })
    .filter((s) => s.displayName && !Number.isNaN(s.latitude) && !Number.isNaN(s.longitude))
    .map((suggestion) => ({
      ...suggestion,
      timezone: timezoneForCoordinates(suggestion.latitude, suggestion.longitude),
    }))

  return Array.from(new Map(suggestions.map((suggestion) => [suggestionKey(suggestion), suggestion])).values())
}
