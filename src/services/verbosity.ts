/**
 * Payload verbosity (privacy_mode) — a token-economy axis separate from
 * response_format.
 *
 * A full natal chart is a large object (every planet with absolute longitudes,
 * twelve house cusps, the complete aspect list, and a ten-row precision audit).
 * Most agent questions only need a fraction of that. These helpers shrink the
 * structuredContent an agent receives without changing the maths:
 *
 *   full       — the complete payload, unchanged (default; backward compatible)
 *   structured — same shape, redundant/derivable fields dropped (absolute
 *                longitudes, element/modality, audit rows)
 *   summary    — only the high-signal essentials, for a quick read
 *
 * Every reducer keeps the keys the output schema requires, so structuredContent
 * stays valid in all modes; it carries a `privacy_mode` marker (and an
 * `abridged`/`note` pair in summary) so the agent knows what it got.
 */
import type { PrivacyMode } from "../types.js";
import type { NatalChart, NatalPlanet, NatalAspect } from "../engine/natal-chart.js";
import type { PrecisionAuditResult } from "../engine/precision-audit.js";
import type { DailyTransitSnapshot, TransitAspect } from "../engine/transits.js";
import type { SynastrySummary, SynastryAspect } from "../engine/synastry.js";

export type NatalChartPayload = NatalChart & { precision?: PrecisionAuditResult };

// Luminaries + rising are the placements almost every quick read needs.
const SUMMARY_PLANETS = ["sun", "moon", "ascendant"] as const;

function trimPlanet(p: NatalPlanet) {
  return { sign: p.sign, degree: p.degree, house: p.house, retrograde: p.retrograde };
}

function trimNatalAspect(a: NatalAspect) {
  return { planet1: a.planet1, planet2: a.planet2, aspect: a.aspect, orb: a.orb, strength: a.strength };
}

function compactPrecision(p: PrecisionAuditResult) {
  return {
    status: p.status,
    verifier: p.verifier,
    verifierVersion: p.verifierVersion,
    maxDeltaDegrees: p.maxDeltaDegrees,
    thresholdDegrees: p.thresholdDegrees,
  };
}

// ---------------------------------------------------------------------------
// Natal chart
// ---------------------------------------------------------------------------

export function applyNatalPrivacy(payload: NatalChartPayload, mode: PrivacyMode): Record<string, unknown> {
  const { planets, houses, aspects, context, meta, precision } = payload;

  if (mode === "full") {
    return { ...payload, meta: { ...meta, privacy_mode: "full" } };
  }

  if (mode === "structured") {
    return {
      planets: Object.fromEntries(Object.entries(planets).map(([k, p]) => [k, trimPlanet(p)])),
      houses: Object.fromEntries(Object.entries(houses).map(([k, h]) => [k, { sign: h.sign, degree: h.degree }])),
      aspects: aspects.map(trimNatalAspect),
      context: {
        dominantElement: context.dominantElement,
        dominantModality: context.dominantModality,
        chartPattern: context.chartPattern,
        keyAspects: context.keyAspects.map(trimNatalAspect),
        stelliums: context.stelliums,
        angularPlanets: context.angularPlanets,
      },
      meta: { ...meta, privacy_mode: "structured" },
      ...(precision ? { precision: compactPrecision(precision) } : {}),
    };
  }

  // summary
  const summaryPlanets = Object.fromEntries(
    SUMMARY_PLANETS.filter((k) => planets[k]).map((k) => [k, trimPlanet(planets[k])]),
  );
  return {
    planets: summaryPlanets,
    houses: {},
    aspects: context.keyAspects.slice(0, 3).map(trimNatalAspect),
    context: {
      dominantElement: context.dominantElement,
      dominantModality: context.dominantModality,
      chartPattern: context.chartPattern,
      stelliums: context.stelliums,
    },
    meta: {
      ...meta,
      privacy_mode: "summary",
      abridged: true,
      note: "Summary payload: luminaries + Ascendant and the chart signature only. Houses, the full planet set, the complete aspect list and the per-planet precision rows are omitted — request privacy_mode=structured or full for them.",
    },
    ...(precision ? { precision: { status: precision.status, maxDeltaDegrees: precision.maxDeltaDegrees } } : {}),
  };
}

// ---------------------------------------------------------------------------
// Transits
// ---------------------------------------------------------------------------

function trimTransitAspect(a: TransitAspect) {
  return {
    transitPlanet: a.transitPlanet,
    natalPlanet: a.natalPlanet,
    aspect: a.aspect,
    orb: a.orb,
    transitSign: a.transitSign,
    natalSign: a.natalSign,
    theme: a.theme,
  };
}

export function applyTransitsPrivacy(snapshot: DailyTransitSnapshot, mode: PrivacyMode): Record<string, unknown> {
  if (mode === "full") {
    return { ...snapshot, privacy_mode: "full" };
  }

  const head = {
    generatedAt: snapshot.generatedAt,
    localDate: snapshot.localDate,
    localTime: snapshot.localTime,
    timezone: snapshot.timezone,
    moon: snapshot.moon,
  };

  if (mode === "structured") {
    return {
      ...head,
      currentPlanets: Object.fromEntries(
        Object.entries(snapshot.currentPlanets).map(([k, p]) => [k, { sign: p.sign, degree: p.degree, retrograde: p.retrograde }]),
      ),
      highlights: snapshot.highlights.map(trimTransitAspect),
      upcoming: snapshot.upcoming,
      privacy_mode: "structured",
    };
  }

  // summary — drop the full current-sky planet map; keep the active read.
  return {
    ...head,
    currentPlanets: {},
    highlights: snapshot.highlights.slice(0, 3).map(trimTransitAspect),
    upcoming: snapshot.upcoming.slice(0, 3).map((w) => ({ localDate: w.localDate, highlight: trimTransitAspect(w.highlight) })),
    privacy_mode: "summary",
    abridged: true,
    note: "Summary payload: top active transit aspects, the moon phase and the nearest upcoming windows. The full current-sky planet map is omitted — request privacy_mode=structured or full for it.",
  };
}

// ---------------------------------------------------------------------------
// Synastry
// ---------------------------------------------------------------------------

function trimSynastryAspect(a: SynastryAspect) {
  return { personPlanet: a.personPlanet, partnerPlanet: a.partnerPlanet, aspect: a.aspect, orb: a.orb, theme: a.theme };
}

export function applySynastryPrivacy(summary: SynastrySummary, mode: PrivacyMode): Record<string, unknown> {
  if (mode === "full") {
    return { ...summary, privacy_mode: "full" };
  }

  const head = { score: summary.score, tone: summary.tone, dimensions: summary.dimensions };

  if (mode === "structured") {
    return { ...head, aspects: summary.aspects.map(trimSynastryAspect), privacy_mode: "structured" };
  }

  // summary — score + tone + dimensions and the strongest few aspects.
  return {
    ...head,
    aspects: summary.aspects.slice(0, 5).map(trimSynastryAspect),
    privacy_mode: "summary",
    abridged: true,
    note: "Summary payload: score, tone, dimension scores and the 5 strongest inter-chart aspects. Request privacy_mode=structured or full for the complete aspect list.",
  };
}
