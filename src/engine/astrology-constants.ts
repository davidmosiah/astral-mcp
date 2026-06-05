export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

export const MAJOR_PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
] as const

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]
export type MajorPlanetKey = (typeof MAJOR_PLANETS)[number]

export const HOUSE_SYSTEMS = [
  'placidus', 'koch', 'campanus', 'regiomontanus', 'topocentric', 'equal-house', 'whole-sign',
] as const

export const ZODIAC_SYSTEMS = ['tropical', 'sidereal'] as const

export type HouseSystem = (typeof HOUSE_SYSTEMS)[number]
export type ZodiacSystem = (typeof ZODIAC_SYSTEMS)[number]
