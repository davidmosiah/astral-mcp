/**
 * The worked example returned by `astral_demo`.
 *
 * The stated purpose of the tool is that an agent sees the contract *before*
 * sending real birth data. That only holds if the example matches what the real
 * tools accept and return — an example whose `input` the server would reject, or
 * whose `chart` omits a field the server emits, teaches the agent a contract
 * that does not exist.
 *
 * So this file shows the WIRE shapes, not the engine's internal ones:
 *   - `input` is the exact argument object `astral_compute_natal_chart` takes
 *     (snake_case, as declared in NatalChartInputSchema) — copy-pasteable.
 *   - `chart` is run through the same `applyNatalPrivacy` reducer the real tool
 *     uses, so it carries the same markers (`meta.privacy_mode`).
 *
 * `scripts/demo-contract-test.mjs` drives the real MCP server, feeds this
 * `input` to `astral_compute_natal_chart`, and fails the build when the key sets
 * diverge in either direction. If you change a tool's shape, that gate fails and
 * points here. Update this file — do not weaken the gate.
 */
import { computeNatalChart, type BirthDataInput } from "../engine/natal-chart.js";
import { buildPrecisionAudit } from "../engine/precision-audit.js";
import { applyNatalPrivacy, type NatalChartPayload } from "./verbosity.js";

// Royal Observatory, Greenwich at noon Y2K — a public landmark and a fixed,
// recognizable moment. Never a real person's birth data.
//
// Written in the shape an agent actually sends over the wire, so `demo.input`
// can be copied straight into astral_compute_natal_chart.
export const DEMO_TOOL_INPUT = {
  birth_date: "2000-01-01",
  birth_time: "12:00",
  latitude: 51.4779,
  longitude: -0.0015,
  timezone: "Europe/London"
} as const;

// The same moment in the engine's internal shape. Derived from the wire input
// rather than restated, so the two can never drift apart.
export const DEMO_INPUT: BirthDataInput = {
  birthDate: DEMO_TOOL_INPUT.birth_date,
  birthTime: DEMO_TOOL_INPUT.birth_time,
  latitude: DEMO_TOOL_INPUT.latitude,
  longitude: DEMO_TOOL_INPUT.longitude,
  timezone: DEMO_TOOL_INPUT.timezone
};

/** The demo chart as the engine produces it, before the verbosity reducer. */
export function buildDemoChart(): NatalChartPayload {
  const chart = computeNatalChart(DEMO_INPUT);
  const precision = buildPrecisionAudit({
    chartPlanets: chart.planets,
    birthDate: DEMO_INPUT.birthDate,
    birthTime: DEMO_INPUT.birthTime ?? "12:00",
    timezone: DEMO_INPUT.timezone
  });
  return { ...chart, precision };
}

export function buildDemo(source: NatalChartPayload = buildDemoChart()) {
  return {
    kind: "demo" as const,
    note:
      "Illustrative chart for the Royal Observatory, Greenwich at noon on 2000-01-01. " +
      "`input` is exactly the argument object astral_compute_natal_chart accepts — copy it and " +
      "swap in real birth data. `chart` is exactly what that call returns at the default " +
      "privacy_mode=full (request 'structured' or 'summary' for a smaller payload). " +
      "No auth or network needed.",
    input: { ...DEMO_TOOL_INPUT },
    // Same reducer the real tool applies, so the example carries the same
    // meta.privacy_mode marker an agent will actually receive.
    chart: applyNatalPrivacy(source, "full")
  };
}
