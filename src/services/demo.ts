import { computeNatalChart, type BirthDataInput } from "../engine/natal-chart.js";
import { buildPrecisionAudit } from "../engine/precision-audit.js";

// A fixed, recognizable example (Royal Observatory, Greenwich, noon Y2K) so an
// agent can see the exact shape of a chart payload before sending real birth
// data. No network and no user data required.
export const DEMO_INPUT: BirthDataInput = {
  birthDate: "2000-01-01",
  birthTime: "12:00",
  latitude: 51.4779,
  longitude: -0.0015,
  timezone: "Europe/London"
};

export function buildDemo() {
  const chart = computeNatalChart(DEMO_INPUT);
  const precision = buildPrecisionAudit({
    chartPlanets: chart.planets,
    birthDate: DEMO_INPUT.birthDate,
    birthTime: DEMO_INPUT.birthTime ?? "12:00",
    timezone: DEMO_INPUT.timezone
  });
  return {
    kind: "demo" as const,
    note: "Illustrative chart for Greenwich at noon on 2000-01-01. Replace with real birth data via astral_compute_natal_chart. No auth or network needed.",
    input: DEMO_INPUT,
    chart: { ...chart, precision }
  };
}
