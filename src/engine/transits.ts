import {
  computeNatalChart,
  type BirthDataInput,
  type NatalPlanet,
  type AspectStrength,
} from './natal-chart.js'

export interface TransitBirthContext {
  latitude: number
  longitude: number
  timezone?: string | null
}

export interface TransitAspect {
  transitPlanet: string
  natalPlanet: string
  aspect: string
  orb: number
  transitSign: string
  natalSign: string
  strength: AspectStrength
  theme: 'activation' | 'flow' | 'friction' | 'integration'
}

export type MoonPhaseKey =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent'

export interface MoonPhaseSnapshot {
  phase: MoonPhaseKey
  illumination: number
  angle: number
  moonSign: string
}

export interface DailyTransitSnapshot {
  generatedAt: string
  localDate: string
  localTime: string
  timezone: string
  currentPlanets: Record<string, NatalPlanet>
  moon: MoonPhaseSnapshot | null
  highlights: TransitAspect[]
  upcoming: TransitActivationWindow[]
}

export interface TransitActivationWindow {
  localDate: string
  localTime: string
  timezone: string
  highlight: TransitAspect
}

export interface TransitPromptContext {
  date: string
  timezone: string
  moon: MoonPhaseSnapshot | null
  highlights: Array<{
    transitPlanet: string
    natalPlanet: string
    aspect: string
    orb: number
    transitSign: string
    natalSign: string
  }>
  upcoming: Array<{
    date: string
    transitPlanet: string
    natalPlanet: string
    aspect: string
    orb: number
    transitSign: string
    natalSign: string
  }>
}

const TRANSIT_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
const NATAL_TARGETS = ['sun', 'moon', 'ascendant', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'mc']
const ANGLE_TARGETS = new Set(['ascendant', 'mc'])

const MAJOR_TRANSIT_ASPECTS = [
  { name: 'Conjunction', degree: 0, theme: 'activation' as const },
  { name: 'Opposition', degree: 180, theme: 'integration' as const },
  { name: 'Trine', degree: 120, theme: 'flow' as const },
  { name: 'Square', degree: 90, theme: 'friction' as const },
  { name: 'Sextile', degree: 60, theme: 'flow' as const },
]

const TRANSIT_ORB: Record<string, number> = {
  sun: 2.5,
  moon: 3,
  mercury: 2,
  venus: 2,
  mars: 2,
  jupiter: 1.5,
  saturn: 1.5,
  uranus: 1,
  neptune: 1,
  pluto: 1,
}

const PLANET_PRIORITY: Record<string, number> = {
  sun: 0.7,
  moon: 0.75,
  mercury: 0.45,
  venus: 0.5,
  mars: 0.55,
  jupiter: 0.35,
  saturn: 0.4,
  uranus: 0.3,
  neptune: 0.25,
  pluto: 0.25,
}

function mod360(value: number): number {
  return ((value % 360) + 360) % 360
}

function angleDistance(a: number, b: number): number {
  const diff = Math.abs(mod360(a) - mod360(b))
  return diff > 180 ? 360 - diff : diff
}

function roundOrb(value: number): number {
  return Number(value.toFixed(2))
}

function strengthForOrb(orb: number): AspectStrength {
  if (orb <= 0.5) return 'very_strong'
  if (orb <= 1.25) return 'strong'
  if (orb <= 2.5) return 'moderate'
  if (orb <= 4) return 'weak'
  return 'very_weak'
}

function moonPhaseForAngle(angle: number): MoonPhaseKey {
  if (angle < 22.5 || angle >= 337.5) return 'new_moon'
  if (angle < 67.5) return 'waxing_crescent'
  if (angle < 112.5) return 'first_quarter'
  if (angle < 157.5) return 'waxing_gibbous'
  if (angle < 202.5) return 'full_moon'
  if (angle < 247.5) return 'waning_gibbous'
  if (angle < 292.5) return 'last_quarter'
  return 'waning_crescent'
}

export function buildMoonPhaseSnapshot(currentPlanets: Record<string, NatalPlanet>): MoonPhaseSnapshot | null {
  const sun = currentPlanets.sun
  const moon = currentPlanets.moon
  if (!sun || !moon || typeof sun.absoluteDegree !== 'number' || typeof moon.absoluteDegree !== 'number') return null

  const angle = roundOrb(mod360(moon.absoluteDegree - sun.absoluteDegree))
  const illumination = Math.round(((1 - Math.cos((angle * Math.PI) / 180)) / 2) * 100)
  return {
    phase: moonPhaseForAngle(angle),
    illumination,
    angle,
    moonSign: moon.sign,
  }
}

function safeTimezone(timezone?: string | null): string {
  const candidate = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return 'UTC'
  }
}

function zonedDateTimeParts(now: Date, timezone?: string | null): { date: string; time: string; timezone: string } {
  const zone = safeTimezone(timezone)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour') || '12'
  const minute = get('minute') || '00'

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    timezone: zone,
  }
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function normalizeLocalDate(value?: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return value
}

function normalizeLocalTime(value?: string | null): string {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return '12:00'
  return value
}

function dateFromLocalDateTime(localDate: string, localTime = '12:00'): Date {
  const [year, month, day] = localDate.split('-').map(Number)
  const [hour, minute] = normalizeLocalTime(localTime).split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour, minute))
}

function transitSignature(aspect: TransitAspect): string {
  return `${aspect.transitPlanet}:${aspect.aspect}:${aspect.natalPlanet}`
}

export function findTransitAspects(args: {
  currentPlanets: Record<string, NatalPlanet>
  natalPlanets: Record<string, NatalPlanet>
  includeAngles?: boolean
  maxHighlights?: number
}): TransitAspect[] {
  const includeAngles = args.includeAngles ?? true
  const maxHighlights = args.maxHighlights ?? 5
  const aspects: TransitAspect[] = []

  for (const transitPlanetKey of TRANSIT_PLANETS) {
    const transitPlanet = args.currentPlanets[transitPlanetKey]
    if (!transitPlanet?.sign) continue

    for (const natalPlanetKey of NATAL_TARGETS) {
      if (!includeAngles && ANGLE_TARGETS.has(natalPlanetKey)) continue
      const natalPlanet = args.natalPlanets[natalPlanetKey]
      if (!natalPlanet?.sign) continue

      const distance = angleDistance(transitPlanet.absoluteDegree, natalPlanet.absoluteDegree)
      for (const aspect of MAJOR_TRANSIT_ASPECTS) {
        const orb = roundOrb(Math.abs(distance - aspect.degree))
        const maxOrb = TRANSIT_ORB[transitPlanetKey] ?? 1.5
        if (orb > maxOrb) continue

        aspects.push({
          transitPlanet: transitPlanetKey,
          natalPlanet: natalPlanetKey,
          aspect: aspect.name,
          orb,
          transitSign: transitPlanet.sign,
          natalSign: natalPlanet.sign,
          strength: strengthForOrb(orb),
          theme: aspect.theme,
        })
      }
    }
  }

  return aspects
    .sort((a, b) => {
      const aScore = a.orb - (PLANET_PRIORITY[a.transitPlanet] ?? 0)
      const bScore = b.orb - (PLANET_PRIORITY[b.transitPlanet] ?? 0)
      return aScore - bScore
    })
    .slice(0, maxHighlights)
}

export function buildDailyTransitSnapshot(args: {
  natalPlanets: Record<string, NatalPlanet>
  birthContext: TransitBirthContext
  now?: Date
  localDate?: string | null
  localTime?: string | null
  includeAngles?: boolean
}): DailyTransitSnapshot {
  const explicitLocalDate = normalizeLocalDate(args.localDate)
  const explicitLocalTime = explicitLocalDate ? normalizeLocalTime(args.localTime) : null
  const now = args.now ?? (explicitLocalDate ? dateFromLocalDateTime(explicitLocalDate, explicitLocalTime ?? '12:00') : new Date())
  const zoned = explicitLocalDate
    ? {
        date: explicitLocalDate,
        time: explicitLocalTime ?? '12:00',
        timezone: safeTimezone(args.birthContext.timezone),
      }
    : zonedDateTimeParts(now, args.birthContext.timezone)
  const currentSkyInput: BirthDataInput = {
    birthDate: zoned.date,
    birthTime: zoned.time,
    latitude: args.birthContext.latitude,
    longitude: args.birthContext.longitude,
    timezone: zoned.timezone,
  }
  const currentSky = computeNatalChart(currentSkyInput)

  return {
    generatedAt: now.toISOString(),
    localDate: zoned.date,
    localTime: zoned.time,
    timezone: zoned.timezone,
    currentPlanets: currentSky.planets,
    moon: buildMoonPhaseSnapshot(currentSky.planets),
    highlights: findTransitAspects({
      currentPlanets: currentSky.planets,
      natalPlanets: args.natalPlanets,
      includeAngles: args.includeAngles,
    }),
    upcoming: buildUpcomingTransitWindows({
      natalPlanets: args.natalPlanets,
      birthContext: args.birthContext,
      now: explicitLocalDate ? dateFromLocalDateTime(zoned.date, zoned.time) : now,
      includeAngles: args.includeAngles,
    }),
  }
}

export function buildUpcomingTransitWindows(args: {
  natalPlanets: Record<string, NatalPlanet>
  birthContext: TransitBirthContext
  now?: Date
  includeAngles?: boolean
  days?: number
  maxWindows?: number
}): TransitActivationWindow[] {
  const now = args.now ?? new Date()
  const days = args.days ?? 7
  const maxWindows = args.maxWindows ?? 5
  const windowsBySignature = new Map<string, TransitActivationWindow>()
  const seenDates = new Set<string>()
  let offset = 1

  while (seenDates.size < days && offset <= days + 3) {
    const candidate = addUtcDays(now, offset)
    const zoned = zonedDateTimeParts(candidate, args.birthContext.timezone)
    offset += 1
    if (seenDates.has(zoned.date)) continue
    seenDates.add(zoned.date)

    const currentSky = computeNatalChart({
      birthDate: zoned.date,
      birthTime: '12:00',
      latitude: args.birthContext.latitude,
      longitude: args.birthContext.longitude,
      timezone: zoned.timezone,
    })
    const highlights = findTransitAspects({
      currentPlanets: currentSky.planets,
      natalPlanets: args.natalPlanets,
      includeAngles: args.includeAngles,
      maxHighlights: 3,
    })

    for (const highlight of highlights) {
      const key = transitSignature(highlight)
      const existing = windowsBySignature.get(key)
      if (existing && existing.highlight.orb <= highlight.orb) continue
      windowsBySignature.set(key, {
        localDate: zoned.date,
        localTime: '12:00',
        timezone: zoned.timezone,
        highlight,
      })
    }
  }

  return Array.from(windowsBySignature.values())
    .sort((a, b) => {
      const dateCompare = a.localDate.localeCompare(b.localDate)
      if (dateCompare !== 0) return dateCompare
      return a.highlight.orb - b.highlight.orb
    })
    .slice(0, maxWindows)
}

export function buildTransitPromptContext(snapshot: DailyTransitSnapshot | null): TransitPromptContext | null {
  if (!snapshot) return null
  return {
    date: `${snapshot.localDate} ${snapshot.localTime}`,
    timezone: snapshot.timezone,
    moon: snapshot.moon,
    highlights: snapshot.highlights.slice(0, 4).map((aspect) => ({
      transitPlanet: aspect.transitPlanet,
      natalPlanet: aspect.natalPlanet,
      aspect: aspect.aspect,
      orb: aspect.orb,
      transitSign: aspect.transitSign,
      natalSign: aspect.natalSign,
    })),
    upcoming: snapshot.upcoming.slice(0, 3).map((window) => ({
      date: `${window.localDate} ${window.localTime}`,
      transitPlanet: window.highlight.transitPlanet,
      natalPlanet: window.highlight.natalPlanet,
      aspect: window.highlight.aspect,
      orb: window.highlight.orb,
      transitSign: window.highlight.transitSign,
      natalSign: window.highlight.natalSign,
    })),
  }
}
