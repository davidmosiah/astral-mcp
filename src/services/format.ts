import type { PrivacyMode, ResponseFormat, ToolResponse } from "../types.js";
import type { NatalChart } from "../engine/natal-chart.js";
import type { PrecisionAuditResult } from "../engine/precision-audit.js";
import type { DailyTransitSnapshot, MoonPhaseSnapshot } from "../engine/transits.js";
import type { SynastrySummary } from "../engine/synastry.js";
import type { GeoSuggestion } from "../engine/geocoding.js";

export function makeResponse(data: unknown, format: ResponseFormat, markdown: string): ToolResponse {
  return {
    content: [{ type: "text", text: format === "json" ? JSON.stringify(data, null, 2) : markdown }],
    structuredContent: data as Record<string, unknown>
  };
}

export function makeError(message: string): ToolResponse {
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${message}` }],
    structuredContent: { error: message }
  };
}

export function bulletList(title: string, fields: Record<string, unknown>): string {
  const lines = [`# ${title}`, ""];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    lines.push(`- **${key}**: ${formatScalar(value)}`);
  }
  return lines.join("\n");
}

function formatScalar(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => formatScalar(item)).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function degree(value: number): string {
  return `${value.toFixed(2)}°`;
}

const PLANET_ORDER = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ascendant", "mc"];

export function formatNatalChart(chart: NatalChart, precision?: PrecisionAuditResult, mode: PrivacyMode = "full"): string {
  if (mode === "summary") return formatNatalSummary(chart, precision);
  const lines: string[] = ["# Natal chart", ""];
  lines.push(`- **engine**: ${chart.meta.engine} (${chart.meta.houseSystem}, ${chart.meta.zodiac})`);
  lines.push(`- **birth time known**: ${chart.meta.birthTimeKnown}`);
  if (precision) {
    lines.push(`- **precision**: ${precision.status} (max Δ ${degree(precision.maxDeltaDegrees)} vs ${precision.verifier}, threshold ${degree(precision.thresholdDegrees)})`);
  }
  lines.push("");
  lines.push("## Placements");
  for (const key of PLANET_ORDER) {
    const planet = chart.planets[key];
    if (!planet) continue;
    const retro = planet.retrograde ? " ℞" : "";
    const house = planet.house ? ` · house ${planet.house}` : "";
    lines.push(`- **${cap(key)}**: ${planet.sign} ${degree(planet.degree)}${house}${retro}`);
  }
  lines.push("");
  lines.push("## Signature");
  lines.push(`- **dominant element**: ${chart.context.dominantElement}`);
  lines.push(`- **dominant modality**: ${chart.context.dominantModality}`);
  lines.push(`- **chart pattern**: ${chart.context.chartPattern}`);
  if (chart.context.stelliums.length) {
    lines.push(`- **stelliums**: ${chart.context.stelliums.map((s) => `${s.planets.join("/")} in ${s.location}`).join("; ")}`);
  }
  if (chart.context.keyAspects.length) {
    lines.push("");
    lines.push("## Key aspects");
    for (const aspect of chart.context.keyAspects) {
      lines.push(`- ${cap(aspect.planet1)} ${aspect.aspect} ${cap(aspect.planet2)} (orb ${degree(aspect.orb)}, ${aspect.strength})`);
    }
  }
  return lines.join("\n");
}

function formatNatalSummary(chart: NatalChart, precision?: PrecisionAuditResult): string {
  const lines: string[] = ["# Natal chart (summary)", ""];
  for (const key of ["sun", "moon", "ascendant"]) {
    const planet = chart.planets[key];
    if (!planet) continue;
    const house = planet.house ? ` · house ${planet.house}` : "";
    lines.push(`- **${cap(key)}**: ${planet.sign} ${degree(planet.degree)}${house}`);
  }
  lines.push(`- **dominant element**: ${chart.context.dominantElement}`);
  lines.push(`- **dominant modality**: ${chart.context.dominantModality}`);
  lines.push(`- **chart pattern**: ${chart.context.chartPattern}`);
  if (chart.context.keyAspects.length) {
    lines.push("");
    lines.push("## Key aspects");
    for (const aspect of chart.context.keyAspects.slice(0, 3)) {
      lines.push(`- ${cap(aspect.planet1)} ${aspect.aspect} ${cap(aspect.planet2)} (orb ${degree(aspect.orb)}, ${aspect.strength})`);
    }
  }
  if (precision) {
    lines.push("");
    lines.push(`- **precision**: ${precision.status} (max Δ ${degree(precision.maxDeltaDegrees)})`);
  }
  lines.push("");
  lines.push("_Abridged (privacy_mode=summary). Call with privacy_mode=full for every placement, all twelve houses, the complete aspect list and the per-planet precision audit._");
  return lines.join("\n");
}

export function formatTransits(snapshot: DailyTransitSnapshot): string {
  const lines: string[] = ["# Current transits", ""];
  lines.push(`- **reading for**: ${snapshot.localDate} ${snapshot.localTime} (${snapshot.timezone})`);
  if (snapshot.moon) {
    lines.push(`- **moon**: ${moonLabel(snapshot.moon.phase)} in ${snapshot.moon.moonSign}, ${snapshot.moon.illumination}% illuminated`);
  }
  lines.push("");
  lines.push("## Active aspects");
  if (!snapshot.highlights.length) lines.push("- (none within orb right now)");
  for (const aspect of snapshot.highlights) {
    lines.push(`- transit ${cap(aspect.transitPlanet)} ${aspect.aspect} natal ${cap(aspect.natalPlanet)} (orb ${degree(aspect.orb)}, ${aspect.theme})`);
  }
  if (snapshot.upcoming.length) {
    lines.push("");
    lines.push("## Upcoming windows");
    for (const window of snapshot.upcoming) {
      lines.push(`- ${window.localDate}: ${cap(window.highlight.transitPlanet)} ${window.highlight.aspect} ${cap(window.highlight.natalPlanet)}`);
    }
  }
  return lines.join("\n");
}

export function formatSynastry(summary: SynastrySummary): string {
  const lines: string[] = ["# Synastry", ""];
  lines.push(`- **overall**: ${summary.score}/100 (${summary.tone.replace("_", " ")})`);
  lines.push(`- **harmony**: ${summary.dimensions.harmony} · **chemistry**: ${summary.dimensions.chemistry} · **communication**: ${summary.dimensions.communication} · **growth**: ${summary.dimensions.growth}`);
  lines.push("");
  lines.push("## Top aspects");
  for (const aspect of summary.aspects.slice(0, 8)) {
    lines.push(`- ${cap(aspect.personPlanet)} ${aspect.aspect} ${cap(aspect.partnerPlanet)} (orb ${degree(aspect.orb)}, ${aspect.theme})`);
  }
  return lines.join("\n");
}

export function formatMoonPhase(snapshot: MoonPhaseSnapshot, meta: { generatedAt: string; timezone: string }): string {
  return [
    "# Moon phase",
    "",
    `- **phase**: ${moonLabel(snapshot.phase)}`,
    `- **sign**: ${snapshot.moonSign}`,
    `- **illumination**: ${snapshot.illumination}%`,
    `- **sun–moon angle**: ${degree(snapshot.angle)}`,
    `- **as of**: ${meta.generatedAt} (${meta.timezone})`
  ].join("\n");
}

export function formatBirthplaces(query: string, results: GeoSuggestion[]): string {
  const lines: string[] = [`# Birthplace matches for "${query}"`, ""];
  if (!results.length) {
    lines.push("- No matches. Try a more specific query, e.g. add the country.");
    return lines.join("\n");
  }
  for (const place of results) {
    lines.push(`## ${place.displayName}`);
    lines.push(`- **latitude**: ${place.latitude}`);
    lines.push(`- **longitude**: ${place.longitude}`);
    lines.push(`- **timezone**: ${place.timezone ?? "unknown"}`);
    lines.push("");
  }
  return lines.join("\n");
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function moonLabel(phase: string): string {
  return phase.split("_").map(cap).join(" ");
}
