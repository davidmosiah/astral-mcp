import type { AspectStrength, NatalPlanet } from './natal-chart.js'

export type SynastryTheme = 'harmony' | 'chemistry' | 'growth' | 'friction'
export type SynastryTone = 'flowing' | 'dynamic' | 'growth_edge'

export interface SynastryAspect {
  personPlanet: string
  partnerPlanet: string
  aspect: string
  orb: number
  strength: AspectStrength
  theme: SynastryTheme
}

export interface SynastryDimensionScores {
  harmony: number
  chemistry: number
  communication: number
  growth: number
}

export interface SynastrySummary {
  score: number
  tone: SynastryTone
  dimensions: SynastryDimensionScores
  aspects: SynastryAspect[]
}

const PLANET_TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'ascendant', 'descendant']
const ANGLE_TARGETS = new Set(['ascendant', 'descendant'])

const SYNASTRY_ASPECTS = [
  { name: 'Conjunction', degree: 0 },
  { name: 'Opposition', degree: 180 },
  { name: 'Trine', degree: 120 },
  { name: 'Square', degree: 90 },
  { name: 'Sextile', degree: 60 },
]

const ASPECT_WEIGHT: Record<string, number> = {
  Conjunction: 9,
  Trine: 8,
  Sextile: 5,
  Opposition: -3,
  Square: -6,
}

const IMPORTANT_PAIRS = new Set([
  'sun:moon',
  'moon:sun',
  'moon:moon',
  'venus:mars',
  'mars:venus',
  'venus:venus',
  'mercury:mercury',
  'sun:ascendant',
  'ascendant:sun',
  'moon:ascendant',
  'ascendant:moon',
  'venus:descendant',
  'descendant:venus',
])

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

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function strengthForOrb(orb: number): AspectStrength {
  if (orb <= 1) return 'very_strong'
  if (orb <= 2.5) return 'strong'
  if (orb <= 4.5) return 'moderate'
  if (orb <= 6) return 'weak'
  return 'very_weak'
}

function themeForAspect(aspect: string, personPlanet: string, partnerPlanet: string): SynastryTheme {
  const pair = `${personPlanet}:${partnerPlanet}`
  if ((personPlanet === 'venus' && partnerPlanet === 'mars') || (personPlanet === 'mars' && partnerPlanet === 'venus')) {
    return aspect === 'Square' || aspect === 'Opposition' ? 'friction' : 'chemistry'
  }
  if (aspect === 'Trine' || aspect === 'Sextile') return 'harmony'
  if (aspect === 'Conjunction') return IMPORTANT_PAIRS.has(pair) ? 'chemistry' : 'growth'
  if (personPlanet === 'saturn' || partnerPlanet === 'saturn') return 'growth'
  return 'friction'
}

function aspectScore(aspect: SynastryAspect): number {
  const base = ASPECT_WEIGHT[aspect.aspect] ?? 0
  const importance = IMPORTANT_PAIRS.has(`${aspect.personPlanet}:${aspect.partnerPlanet}`) ? 1.4 : 1
  const tightness = Math.max(0.25, 1 - aspect.orb / 7)
  return base * importance * tightness
}

export function findSynastryAspects(args: {
  personPlanets: Record<string, NatalPlanet>
  partnerPlanets: Record<string, NatalPlanet>
  includePersonAngles?: boolean
  includePartnerAngles?: boolean
  maxAspects?: number
}): SynastryAspect[] {
  const includePersonAngles = args.includePersonAngles ?? true
  const includePartnerAngles = args.includePartnerAngles ?? true
  const maxAspects = args.maxAspects ?? 10
  const aspects: SynastryAspect[] = []

  for (const personPlanetKey of PLANET_TARGETS) {
    if (!includePersonAngles && ANGLE_TARGETS.has(personPlanetKey)) continue
    const personPlanet = args.personPlanets[personPlanetKey]
    if (!personPlanet?.sign) continue

    for (const partnerPlanetKey of PLANET_TARGETS) {
      if (!includePartnerAngles && ANGLE_TARGETS.has(partnerPlanetKey)) continue
      const partnerPlanet = args.partnerPlanets[partnerPlanetKey]
      if (!partnerPlanet?.sign) continue

      const distance = angleDistance(personPlanet.absoluteDegree, partnerPlanet.absoluteDegree)
      for (const aspect of SYNASTRY_ASPECTS) {
        const orb = roundOrb(Math.abs(distance - aspect.degree))
        if (orb > 6) continue
        aspects.push({
          personPlanet: personPlanetKey,
          partnerPlanet: partnerPlanetKey,
          aspect: aspect.name,
          orb,
          strength: strengthForOrb(orb),
          theme: themeForAspect(aspect.name, personPlanetKey, partnerPlanetKey),
        })
      }
    }
  }

  return aspects
    .sort((a, b) => {
      const scoreDelta = Math.abs(aspectScore(b)) - Math.abs(aspectScore(a))
      if (scoreDelta !== 0) return scoreDelta
      return a.orb - b.orb
    })
    .slice(0, maxAspects)
}

export function buildSynastrySummary(args: {
  personPlanets: Record<string, NatalPlanet>
  partnerPlanets: Record<string, NatalPlanet>
  includePersonAngles?: boolean
  includePartnerAngles?: boolean
}): SynastrySummary {
  const aspects = findSynastryAspects({
    personPlanets: args.personPlanets,
    partnerPlanets: args.partnerPlanets,
    includePersonAngles: args.includePersonAngles,
    includePartnerAngles: args.includePartnerAngles,
    maxAspects: 12,
  })

  const harmonyRaw = 50 + aspects.filter((aspect) => aspect.theme === 'harmony').reduce((sum, aspect) => sum + Math.abs(aspectScore(aspect)), 0)
    - aspects.filter((aspect) => aspect.theme === 'friction').reduce((sum, aspect) => sum + Math.abs(aspectScore(aspect)) * 0.75, 0)
  const chemistryRaw = 45 + aspects.filter((aspect) => aspect.theme === 'chemistry').reduce((sum, aspect) => sum + Math.abs(aspectScore(aspect)) * 1.15, 0)
  const communicationRaw = 45 + aspects
    .filter((aspect) => aspect.personPlanet === 'mercury' || aspect.partnerPlanet === 'mercury')
    .reduce((sum, aspect) => sum + aspectScore(aspect), 0)
  const growthRaw = 45 + aspects
    .filter((aspect) => aspect.theme === 'growth' || aspect.personPlanet === 'saturn' || aspect.partnerPlanet === 'saturn')
    .reduce((sum, aspect) => sum + Math.abs(aspectScore(aspect)), 0)

  const dimensions = {
    harmony: clamp(harmonyRaw),
    chemistry: clamp(chemistryRaw),
    communication: clamp(communicationRaw),
    growth: clamp(growthRaw),
  }
  const score = clamp(
    dimensions.harmony * 0.34 +
      dimensions.chemistry * 0.26 +
      dimensions.communication * 0.18 +
      dimensions.growth * 0.22,
  )
  const frictionCount = aspects.filter((aspect) => aspect.theme === 'friction').length
  const flowCount = aspects.filter((aspect) => aspect.theme === 'harmony' || aspect.theme === 'chemistry').length
  const tone: SynastryTone = score >= 72 && flowCount >= frictionCount
    ? 'flowing'
    : frictionCount > flowCount
      ? 'growth_edge'
      : 'dynamic'

  return { score, tone, dimensions, aspects }
}
