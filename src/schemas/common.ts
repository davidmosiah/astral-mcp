import { z } from "zod";
import { HOUSE_SYSTEMS, ZODIAC_SYSTEMS } from "../engine/astrology-constants.js";

// ---------------------------------------------------------------------------
// Shared field schemas — descriptions are written for the calling agent.
// ---------------------------------------------------------------------------

export const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown")
  .describe("Output shape. 'markdown' is a readable briefing for display; 'json' returns the full structured chart for further processing.");

export const PrivacyModeSchema = z.enum(["summary", "structured", "full"]).default("full")
  .describe("Payload verbosity — how much of the chart to return, independent of response_format (which only picks markdown vs json). 'full' (default) returns the complete payload: every planet, house and aspect plus the per-planet precision audit. 'structured' keeps the full structure but drops redundant/derivable fields (absolute longitudes, element/modality, the precision audit rows) for a leaner machine payload. 'summary' returns only the high-signal essentials (luminaries + Ascendant, dominant element/modality, chart pattern, top aspects, precision status) to save tokens. Request 'summary' for a quick read, 'full' when you need every placement.");

export const DateFieldSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use ISO calendar date YYYY-MM-DD")
  .describe("Birth date as YYYY-MM-DD, e.g. 1989-02-23. Years before 1900 and after 2100 are supported but less precise.");

export const TimeFieldSchema = z.string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use 24h HH:MM")
  .optional()
  .describe("Local birth time as 24h HH:MM, e.g. 14:30. Optional — if unknown, noon is assumed and house/ascendant accuracy drops (planets stay accurate).");

export const LatitudeSchema = z.number().min(-90).max(90)
  .describe("Birth latitude in decimal degrees, -90..90. Resolve from a city name with astral_search_birthplace if you don't have it.");

export const LongitudeSchema = z.number().min(-180).max(180)
  .describe("Birth longitude in decimal degrees, -180..180 (negative = West). Resolve with astral_search_birthplace if unknown.");

export const TimezoneSchema = z.string().min(1).max(80)
  .describe("IANA timezone of the BIRTHPLACE at birth, e.g. America/Fortaleza. Not the caller's timezone. astral_search_birthplace returns this for each match.");

export const HouseSystemSchema = z.enum(HOUSE_SYSTEMS).default("placidus")
  .describe("House system. 'placidus' is the modern default; 'whole-sign' is common in traditional/Hellenistic work; others: koch, campanus, regiomontanus, topocentric, equal-house.");

export const ZodiacSchema = z.enum(ZODIAC_SYSTEMS).default("tropical")
  .describe("Zodiac. 'tropical' (Western, season-anchored) or 'sidereal' (Vedic/constellation-anchored).");

const birthFields = {
  birth_date: DateFieldSchema,
  birth_time: TimeFieldSchema,
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  timezone: TimezoneSchema
};

export const PersonBirthSchema = z.object({ ...birthFields }).strict();

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

export const NatalChartInputSchema = z.object({
  ...birthFields,
  house_system: HouseSystemSchema,
  zodiac: ZodiacSchema,
  verify_precision: z.boolean().default(true)
    .describe("When true (default), independently re-derives every planet with a second ephemeris and attaches a precision audit. Set false to skip the cross-check."),
  privacy_mode: PrivacyModeSchema,
  response_format: ResponseFormatSchema
}).strict();

export const TransitsInputSchema = z.object({
  ...birthFields,
  on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional()
    .describe("Local date to read transits for as YYYY-MM-DD. Defaults to today."),
  on_time: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use 24h HH:MM").optional()
    .describe("Local time of the transit reading as 24h HH:MM. Defaults to noon."),
  include_angles: z.boolean().default(true)
    .describe("Include transits to the Ascendant and Midheaven. Requires an accurate birth_time to be meaningful."),
  house_system: HouseSystemSchema,
  zodiac: ZodiacSchema,
  privacy_mode: PrivacyModeSchema,
  response_format: ResponseFormatSchema
}).strict();

export const SynastryInputSchema = z.object({
  person: PersonBirthSchema.describe("First person's birth data."),
  partner: PersonBirthSchema.describe("Second person's birth data."),
  house_system: HouseSystemSchema,
  zodiac: ZodiacSchema,
  privacy_mode: PrivacyModeSchema,
  response_format: ResponseFormatSchema
}).strict();

export const MoonPhaseInputSchema = z.object({
  on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional()
    .describe("Local date as YYYY-MM-DD. Defaults to today."),
  on_time: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use 24h HH:MM").optional()
    .describe("Local time as 24h HH:MM. Defaults to noon."),
  timezone: z.string().min(1).max(80).default("UTC")
    .describe("IANA timezone for interpreting on_date/on_time, e.g. America/New_York. Defaults to UTC."),
  response_format: ResponseFormatSchema
}).strict();

export const SearchBirthplaceInputSchema = z.object({
  query: z.string().min(3).max(200)
    .describe("City or place name to geocode, e.g. 'Fortaleza, Brazil'. Minimum 3 characters. Call this first when you only have a place name, then pass the returned latitude/longitude/timezone to the chart tools."),
  language: z.string().min(2).max(8).default("en")
    .describe("Preferred language for returned place names (ISO code), e.g. en, pt, es."),
  response_format: ResponseFormatSchema
}).strict();

export const ResponseOnlyInputSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

// ---------------------------------------------------------------------------
// Tool output schemas — permissive on the rich nested astrology payloads so the
// SDK's structuredContent validation never rejects a valid chart.
//
// The SDK reconstructs each output schema from its `.shape`, which drops the
// top-level `.passthrough()`. So the privacy_mode markers attached by the
// verbosity reducer must be declared here as optional top-level fields (for the
// natal chart they live inside `meta`, whose own passthrough survives).
// ---------------------------------------------------------------------------

const PrivacyMarkerFields = {
  privacy_mode: z.enum(["summary", "structured", "full"]).optional(),
  abridged: z.boolean().optional(),
  note: z.string().optional()
};

export const NatalChartOutputSchema = z.object({
  planets: z.record(z.string(), z.unknown()),
  houses: z.record(z.string(), z.unknown()),
  aspects: z.array(z.unknown()),
  context: z.unknown(),
  meta: z.object({
    engine: z.string(),
    houseSystem: z.string(),
    zodiac: z.string(),
    generatedAt: z.string(),
    birthTimeKnown: z.boolean()
  }).passthrough(),
  precision: z.unknown().optional()
}).passthrough();

export const TransitsOutputSchema = z.object({
  generatedAt: z.string(),
  localDate: z.string(),
  localTime: z.string(),
  timezone: z.string(),
  currentPlanets: z.record(z.string(), z.unknown()),
  moon: z.unknown().nullable(),
  highlights: z.array(z.unknown()),
  upcoming: z.array(z.unknown()),
  ...PrivacyMarkerFields
}).passthrough();

export const SynastryOutputSchema = z.object({
  score: z.number(),
  tone: z.string(),
  dimensions: z.unknown(),
  aspects: z.array(z.unknown()),
  ...PrivacyMarkerFields
}).passthrough();

export const MoonPhaseOutputSchema = z.object({
  phase: z.string(),
  illumination: z.number(),
  angle: z.number(),
  moonSign: z.string(),
  generatedAt: z.string(),
  timezone: z.string()
}).passthrough();

export const SearchBirthplaceOutputSchema = z.object({
  query: z.string(),
  count: z.number().int().nonnegative(),
  results: z.array(z.object({
    displayName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string().nullable()
  }).strict())
}).strict();

export const CapabilitiesOutputSchema = z.object({
  project: z.string(),
  mcp_name: z.string(),
  creator: z.object({ name: z.string(), github: z.string() }).strict(),
  engines: z.object({
    primary: z.string(),
    verifier: z.string(),
    cross_check: z.string()
  }).strict(),
  supported: z.object({
    house_systems: z.array(z.string()),
    zodiacs: z.array(z.string()),
    bodies: z.array(z.string()),
    aspects: z.array(z.string()),
    features: z.array(z.string())
  }).strict(),
  not_included: z.array(z.string()),
  recommended_agent_flow: z.array(z.string()),
  links: z.record(z.string(), z.string())
}).passthrough();

export const DataInventoryOutputSchema = z.object({
  kind: z.literal("data_inventory"),
  mcp_name: z.string(),
  generated_at: z.string(),
  data_access_model: z.string(),
  categories: z.array(z.object({
    name: z.string(),
    examples: z.array(z.string()),
    tools: z.array(z.string())
  }).strict()),
  first_tools: z.array(z.string()),
  notes: z.array(z.string())
}).strict();

export const AgentManifestOutputSchema = z.object({
  project: z.string(),
  mcp_name: z.string(),
  package: z.object({
    name: z.string(),
    version: z.string(),
    install_command: z.string(),
    pinned_install_command: z.string(),
    binary: z.string()
  }).strict(),
  data_access_model: z.string(),
  recommended_first_calls: z.array(z.string()),
  standard_tools: z.array(z.string()),
  agent_rules: z.array(z.string()),
  troubleshooting: z.array(z.object({ symptom: z.string(), action: z.string() }).strict()),
  links: z.record(z.string(), z.string())
}).strict();

export const ConnectionStatusOutputSchema = z.object({
  ok: z.boolean(),
  ready: z.boolean(),
  node: z.object({ version: z.string(), supported: z.boolean() }).strict(),
  engines: z.object({
    primary: z.object({ name: z.string(), loaded: z.boolean() }).strict(),
    verifier: z.object({ name: z.string(), loaded: z.boolean() }).strict()
  }).strict(),
  self_check: z.object({
    sample_sun_sign: z.string(),
    precision_status: z.string(),
    max_delta_degrees: z.number()
  }).strict().optional(),
  notes: z.array(z.string()),
  next_steps: z.array(z.string())
}).strict();

export const DemoOutputSchema = z.object({
  kind: z.literal("demo"),
  note: z.string(),
  input: z.unknown(),
  chart: z.unknown()
}).passthrough();

export type NatalChartInput = z.infer<typeof NatalChartInputSchema>;
export type TransitsInput = z.infer<typeof TransitsInputSchema>;
export type SynastryInput = z.infer<typeof SynastryInputSchema>;
export type MoonPhaseInput = z.infer<typeof MoonPhaseInputSchema>;
export type SearchBirthplaceInput = z.infer<typeof SearchBirthplaceInputSchema>;
export type ResponseOnlyInput = z.infer<typeof ResponseOnlyInputSchema>;
