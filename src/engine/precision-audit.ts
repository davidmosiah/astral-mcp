import { Body, Ecliptic, GeoVector, SunPosition } from 'astronomy-engine'
import { MAJOR_PLANETS, ZODIAC_SIGNS, type MajorPlanetKey, type ZodiacSign } from './astrology-constants.js'
import type { NatalPlanet } from './natal-chart.js'

const DEFAULT_THRESHOLD_DEGREES = 1.25

const ASTRONOMY_BODY: Record<MajorPlanetKey, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
}

export interface PrecisionAuditRow {
  planet: MajorPlanetKey
  savedLongitude: number
  verifierLongitude: number
  deltaDegrees: number
  signMatches: boolean
}

export interface PrecisionAuditResult {
  status: 'verified' | 'review'
  checkedAt: string
  verifier: 'astronomy-engine'
  verifierVersion: string
  utcDateTime: string
  thresholdDegrees: number
  maxDeltaDegrees: number
  rows: PrecisionAuditRow[]
}

export interface BuildPrecisionAuditInput {
  chartPlanets: Record<string, NatalPlanet>
  birthDate: string
  birthTime: string
  timezone: string
  thresholdDegrees?: number
}

function normalizeLongitude(value: number): number {
  return ((value % 360) + 360) % 360
}

function roundDegree(value: number): number {
  return Number(value.toFixed(4))
}

function angularDelta(a: number, b: number): number {
  return Math.abs(((normalizeLongitude(a - b + 180) + 360) % 360) - 180)
}

function signFromLongitude(value: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor(normalizeLongitude(value) / 30)] || 'Aries'
}

function canonicalSign(sign?: string): ZodiacSign | null {
  if (!sign) return null
  return ZODIAC_SIGNS.find((item) => item.toLowerCase() === sign.toLowerCase()) ?? null
}

function zonedParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, number> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  return parts as {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
  }
}

export function localBirthTimeToUtc(birthDate: string, birthTime: string, timezone: string): Date {
  const [year, month, day] = birthDate.slice(0, 10).split('-').map(Number)
  const [hour, minute] = birthTime.slice(0, 5).split(':').map(Number)
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('invalid_birth_datetime')
  }

  const desiredLocalAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utcMs = desiredLocalAsUtc

  for (let i = 0; i < 4; i += 1) {
    const parts = zonedParts(new Date(utcMs), timezone)
    const observedLocalAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second || 0,
    )
    utcMs += desiredLocalAsUtc - observedLocalAsUtc
  }

  return new Date(utcMs)
}

export function buildPrecisionAudit({
  chartPlanets,
  birthDate,
  birthTime,
  timezone,
  thresholdDegrees = DEFAULT_THRESHOLD_DEGREES,
}: BuildPrecisionAuditInput): PrecisionAuditResult {
  const utcDate = localBirthTimeToUtc(birthDate, birthTime, timezone)
  const rows = MAJOR_PLANETS.flatMap((planet): PrecisionAuditRow[] => {
    const placement = chartPlanets[planet]
    if (typeof placement?.absoluteDegree !== 'number') return []

    const verifierLongitude = roundDegree(normalizeLongitude(
      planet === 'sun'
        ? SunPosition(utcDate).elon
        : Ecliptic(GeoVector(ASTRONOMY_BODY[planet], utcDate, true)).elon,
    ))
    const savedLongitude = roundDegree(normalizeLongitude(placement.absoluteDegree))
    const deltaDegrees = roundDegree(angularDelta(savedLongitude, verifierLongitude))
    const signMatches = canonicalSign(placement.sign) === signFromLongitude(verifierLongitude)

    return [{
      planet,
      savedLongitude,
      verifierLongitude,
      deltaDegrees,
      signMatches,
    }]
  })

  if (rows.length === 0) {
    throw new Error('precision_audit_no_planets')
  }

  const maxDeltaDegrees = roundDegree(Math.max(...rows.map((row) => row.deltaDegrees)))
  return {
    status: rows.every((row) => row.deltaDegrees <= thresholdDegrees && row.signMatches) ? 'verified' : 'review',
    checkedAt: new Date().toISOString(),
    verifier: 'astronomy-engine',
    verifierVersion: '2.1.19',
    utcDateTime: utcDate.toISOString(),
    thresholdDegrees,
    maxDeltaDegrees,
    rows,
  }
}
