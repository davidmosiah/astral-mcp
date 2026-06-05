/**
 * Local natal chart engine.
 *
 * Computes a full natal chart (planets, houses, aspects, angular points and a
 * derived "context" with dominant element/modality and chart pattern) entirely
 * in-process using free JS libraries — no external astrology API, no cost.
 *
 * Ported from the Alkhemia app (which itself ported it from the Spira project),
 * with the house system and zodiac promoted from hardcoded values to parameters.
 */
import horoscopeEngine from 'circular-natal-horoscope-js/dist/index.js'
import {
  MAJOR_PLANETS,
  ZODIAC_SIGNS,
  type HouseSystem,
  type ZodiacSystem,
} from './astrology-constants.js'

// circular-natal-horoscope-js is CommonJS with no exports map; under Node's ESM
// loader its named members are only reachable through the default import.
const { Origin, Horoscope } = horoscopeEngine

export {
  MAJOR_PLANETS,
  ZODIAC_SIGNS,
  HOUSE_SYSTEMS,
  ZODIAC_SYSTEMS,
} from './astrology-constants.js'
export type { HouseSystem, ZodiacSystem } from './astrology-constants.js'

export type ElementKey = 'fire' | 'earth' | 'air' | 'water'
export type ModalityKey = 'cardinal' | 'fixed' | 'mutable'
export type AspectStrength = 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak'

export interface BirthDataInput {
  birthDate: string // YYYY-MM-DD
  birthTime?: string | null // HH:MM (optional — noon assumed when absent)
  latitude: number
  longitude: number
  timezone: string
}

export interface NatalChartOptions {
  houseSystem?: HouseSystem
  zodiac?: ZodiacSystem
}

export interface NatalPlanet {
  sign: string
  degree: number // 0–30 within the sign
  absoluteDegree: number // 0–360 ecliptic
  house: number
  retrograde: boolean
  element: ElementKey | 'unknown'
  modality: ModalityKey | 'unknown'
  label?: string
}

export interface NatalHouse {
  sign: string
  degree: number
  absoluteDegree: number
  ruler: string
}

export interface NatalAspect {
  planet1: string
  planet2: string
  aspect: string
  orb: number
  applying: boolean | null
  phaseKnown?: boolean
  strength: AspectStrength
}

export interface ChartStellium {
  type: 'sign' | 'house'
  location: string
  planets: string[]
}

export interface AngularPlanet {
  planet: string
  house: number
  sign: string
}

export interface ChartContext {
  dominantElement: ElementKey
  dominantModality: ModalityKey
  chartPattern: string
  elementCounts: Record<ElementKey, number>
  modalityCounts: Record<ModalityKey, number>
  keyAspects: NatalAspect[]
  stelliums: ChartStellium[]
  angularPlanets: AngularPlanet[]
}

export interface NatalChart {
  planets: Record<string, NatalPlanet>
  houses: Record<number, NatalHouse>
  aspects: NatalAspect[]
  context: ChartContext
  meta: {
    engine: string
    houseSystem: string
    zodiac: string
    generatedAt: string
    birthTimeKnown: boolean
  }
}

// ----------------------------------------------------------------------------
// Constants & lookups
// ----------------------------------------------------------------------------

const SIGN_ELEMENT: Record<string, ElementKey> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

const SIGN_MODALITY: Record<string, ModalityKey> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
}

const SIGN_RULER: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
}

const MAJOR_ASPECT_NAMES = new Set(['Conjunction', 'Opposition', 'Trine', 'Square', 'Sextile'])

// ----------------------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------------------

function mod360(value: number): number {
  return ((value % 360) + 360) % 360
}

function roundDegree(value: number): number {
  return Number(value.toFixed(4))
}

function degreeWithinSign(value: number): number {
  return roundDegree(mod360(value) % 30)
}

function signFromLongitude(value: number): string {
  return ZODIAC_SIGNS[Math.floor(mod360(value) / 30)] || 'Aries'
}

function capitalize(value?: string): string {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eclipticDegree(item: any): number {
  return Number(item?.ChartPosition?.Ecliptic?.DecimalDegrees || 0)
}

export function getSignElement(sign?: string): ElementKey | 'unknown' {
  return (sign && SIGN_ELEMENT[sign]) || 'unknown'
}

export function getSignModality(sign?: string): ModalityKey | 'unknown' {
  return (sign && SIGN_MODALITY[sign]) || 'unknown'
}

export function getSignRuler(sign?: string): string {
  return (sign && SIGN_RULER[sign]) || 'Unknown'
}

// ----------------------------------------------------------------------------
// Input parsing & validation
// ----------------------------------------------------------------------------

function formatDate(dateString: string): string {
  // Anchor to midday UTC so the calendar date can't slip across timezones.
  const date = new Date(`${dateString.slice(0, 10)}T12:00:00Z`)
  return date.toISOString().slice(0, 10)
}

function formatTime(timeString?: string | null): string {
  if (!timeString) return '12:00'
  const parts = timeString.split(':')
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
  }
  return '12:00'
}

export function validateBirthData(input: Partial<BirthDataInput>): string[] {
  const errors: string[] = []

  if (!input.birthDate || Number.isNaN(new Date(input.birthDate).getTime())) {
    errors.push('invalid_date')
  }
  if (input.birthTime && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(formatTime(input.birthTime))) {
    errors.push('invalid_time')
  }
  const lat = Number(input.latitude)
  const lon = Number(input.longitude)
  if (Number.isNaN(lat) || lat < -90 || lat > 90) errors.push('invalid_latitude')
  if (Number.isNaN(lon) || lon < -180 || lon > 180) errors.push('invalid_longitude')

  return errors
}

// ----------------------------------------------------------------------------
// Core computation
// ----------------------------------------------------------------------------

function makeAngularPoint(label: string, longitude: number, house: number): NatalPlanet {
  const absoluteDegree = roundDegree(mod360(longitude))
  const sign = signFromLongitude(absoluteDegree)
  return {
    label,
    sign,
    degree: degreeWithinSign(absoluteDegree),
    absoluteDegree,
    house,
    retrograde: false,
    element: getSignElement(sign),
    modality: getSignModality(sign),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlanets(horoscope: any): Record<string, NatalPlanet> {
  const bodies = horoscope.CelestialBodies || {}
  const planets: Record<string, NatalPlanet> = {}

  for (const key of MAJOR_PLANETS) {
    const body = bodies[key]
    if (!body) continue
    const absoluteDegree = roundDegree(eclipticDegree(body))
    const sign = body.Sign?.label || signFromLongitude(absoluteDegree)
    planets[key] = {
      sign,
      degree: degreeWithinSign(absoluteDegree),
      absoluteDegree,
      house: Number(body.House?.id || 0),
      retrograde: Boolean(body.isRetrograde),
      element: getSignElement(sign),
      modality: getSignModality(sign),
    }
  }

  const ascDegree = roundDegree(eclipticDegree(horoscope.Ascendant))
  const mcDegree = roundDegree(eclipticDegree(horoscope.Midheaven))
  planets.ascendant = makeAngularPoint('Ascendant', ascDegree, 1)
  planets.descendant = makeAngularPoint('Descendant', ascDegree + 180, 7)
  planets.mc = makeAngularPoint('Midheaven', mcDegree, 10)
  planets.ic = makeAngularPoint('IC', mcDegree + 180, 4)

  return planets
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHouses(horoscope: any): Record<number, NatalHouse> {
  const houses: Record<number, NatalHouse> = {}
  for (const house of horoscope.Houses || []) {
    const houseNumber = Number(house.id)
    const source = house?.ChartPosition?.StartPosition ? house.ChartPosition.StartPosition : house
    const absoluteDegree = roundDegree(eclipticDegree(source))
    const sign = house.Sign?.label || signFromLongitude(absoluteDegree)
    houses[houseNumber] = {
      sign,
      degree: degreeWithinSign(absoluteDegree),
      absoluteDegree,
      ruler: getSignRuler(sign),
    }
  }
  return houses
}

function aspectStrength(orb: number): AspectStrength {
  if (orb <= 1) return 'very_strong'
  if (orb <= 3) return 'strong'
  if (orb <= 6) return 'moderate'
  if (orb <= 8) return 'weak'
  return 'very_weak'
}

function aspectPhase(aspect: unknown): { applying: boolean | null; phaseKnown: boolean } {
  const source = aspect as Record<string, unknown> | null | undefined
  for (const key of ['applying', 'isApplying', 'isApplyingAspect']) {
    if (typeof source?.[key] === 'boolean') {
      return { applying: source[key] as boolean, phaseKnown: true }
    }
  }
  return { applying: null, phaseKnown: false }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAspects(horoscope: any): NatalAspect[] {
  const seen = new Set<string>()
  const majorPlanetSet = new Set<string>(MAJOR_PLANETS)

  return (horoscope.Aspects?.all || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((a: any) => {
      const p1 = String(a.point1Key || '').toLowerCase()
      const p2 = String(a.point2Key || '').toLowerCase()
      return majorPlanetSet.has(p1) && majorPlanetSet.has(p2)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((a: any) => {
      const pair = [a.point1Key, a.point2Key].map(String).sort().join('-')
      const key = `${pair}-${a.aspectKey}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any): NatalAspect => {
      const orb = roundDegree(Number(a.orb || 0))
      const phase = aspectPhase(a)
      return {
        planet1: String(a.point1Key || '').toLowerCase(),
        planet2: String(a.point2Key || '').toLowerCase(),
        aspect: a.label || capitalize(a.aspectKey),
        orb,
        applying: phase.applying,
        phaseKnown: phase.phaseKnown,
        strength: aspectStrength(orb),
      }
    })
}

function buildContext(
  planets: Record<string, NatalPlanet>,
  aspects: NatalAspect[],
): ChartContext {
  const elementCounts: Record<ElementKey, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  const modalityCounts: Record<ModalityKey, number> = { cardinal: 0, fixed: 0, mutable: 0 }

  // Only the ten classical planets weigh into dominance (skip angular points).
  for (const key of MAJOR_PLANETS) {
    const planet = planets[key]
    if (!planet) continue
    if (planet.element !== 'unknown') elementCounts[planet.element] += 1
    if (planet.modality !== 'unknown') modalityCounts[planet.modality] += 1
  }

  const dominantElement = (Object.keys(elementCounts) as ElementKey[]).reduce((a, b) =>
    elementCounts[a] >= elementCounts[b] ? a : b,
  )
  const dominantModality = (Object.keys(modalityCounts) as ModalityKey[]).reduce((a, b) =>
    modalityCounts[a] >= modalityCounts[b] ? a : b,
  )

  const keyAspects = aspects
    .filter((a) => MAJOR_ASPECT_NAMES.has(a.aspect) && a.orb <= 8)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 5)

  // Stelliums: 3+ classical planets sharing a sign or house.
  const bySign: Record<string, string[]> = {}
  const byHouse: Record<string, string[]> = {}
  for (const key of MAJOR_PLANETS) {
    const planet = planets[key]
    if (!planet) continue
    ;(bySign[planet.sign] ||= []).push(key)
    ;(byHouse[String(planet.house)] ||= []).push(key)
  }
  const stelliums: ChartStellium[] = []
  for (const [sign, members] of Object.entries(bySign)) {
    if (members.length >= 3) stelliums.push({ type: 'sign', location: sign, planets: members })
  }
  for (const [house, members] of Object.entries(byHouse)) {
    if (house !== '0' && members.length >= 3) {
      stelliums.push({ type: 'house', location: house, planets: members })
    }
  }

  const angularHouses = new Set([1, 4, 7, 10])
  const angularPlanets: AngularPlanet[] = []
  for (const key of MAJOR_PLANETS) {
    const planet = planets[key]
    if (planet && angularHouses.has(planet.house)) {
      angularPlanets.push({ planet: key, house: planet.house, sign: planet.sign })
    }
  }

  return {
    dominantElement,
    dominantModality,
    chartPattern: identifyChartPattern(planets),
    elementCounts,
    modalityCounts,
    keyAspects,
    stelliums,
    angularPlanets,
  }
}

function identifyChartPattern(planets: Record<string, NatalPlanet>): string {
  const positions = MAJOR_PLANETS.map((k) => planets[k]?.absoluteDegree)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b)

  if (positions.length < 2) return 'unknown'

  const spans: number[] = []
  for (let i = 0; i < positions.length - 1; i += 1) {
    spans.push(positions[i + 1] - positions[i])
  }
  spans.push(360 + positions[0] - positions[positions.length - 1])

  const maxSpan = Math.max(...spans)
  if (maxSpan > 240) return 'bowl'
  if (maxSpan > 120 && spans.filter((s) => s < 5).length >= 3) return 'bundle'
  if (spans.filter((s) => s > 20 && s < 40).length >= 3) return 'locomotive'
  if (spans.filter((s) => s < 10).length >= 4) return 'stellium'
  return 'splash'
}

/**
 * Compute a full natal chart from birth data. Pure and deterministic.
 * Throws if the input fails validation.
 */
export function computeNatalChart(input: BirthDataInput, options: NatalChartOptions = {}): NatalChart {
  const errors = validateBirthData(input)
  if (errors.length > 0) {
    throw new Error(`invalid_birth_data:${errors.join(',')}`)
  }

  const houseSystem: HouseSystem = options.houseSystem ?? 'placidus'
  const zodiac: ZodiacSystem = options.zodiac ?? 'tropical'

  const [year, month, date] = formatDate(input.birthDate).split('-').map(Number)
  const [hour, minute] = formatTime(input.birthTime).split(':').map(Number)

  const origin = new Origin({
    year,
    month: month - 1, // library expects 0-indexed month
    date,
    hour,
    minute,
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
  })

  const horoscope = new Horoscope({
    origin,
    houseSystem,
    zodiac,
    aspectPoints: ['bodies'],
    aspectWithPoints: ['bodies'],
    aspectTypes: ['major'],
    customOrbs: {},
    language: 'en',
  })

  const planets = mapPlanets(horoscope)
  const houses = mapHouses(horoscope)
  const aspects = mapAspects(horoscope)
  const context = buildContext(planets, aspects)

  return {
    planets,
    houses,
    aspects,
    context,
    meta: {
      engine: 'circular-natal-horoscope-js',
      houseSystem,
      zodiac,
      generatedAt: new Date().toISOString(),
      birthTimeKnown: Boolean(input.birthTime),
    },
  }
}
