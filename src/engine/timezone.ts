import tzLookup from 'tz-lookup'

export function timezoneForCoordinates(latitude: number, longitude: number): string | null {
  try {
    return tzLookup(latitude, longitude)
  } catch {
    return null
  }
}
