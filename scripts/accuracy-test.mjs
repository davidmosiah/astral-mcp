// Accuracy gate: the differentiator. For a spread of dates across decades and
// locations, compute the chart with the primary engine and independently
// re-derive every planet with the verifier engine. Every chart must pass the
// dual-engine audit (status "verified", max delta within tolerance). This is
// what lets the README claim "precision-audited", not just "computed".
import assert from "node:assert/strict";
import { computeNatalChart } from "../dist/engine/natal-chart.js";
import { buildPrecisionAudit } from "../dist/engine/precision-audit.js";

const CASES = [
  { label: "Greenwich Y2K", birthDate: "2000-01-01", birthTime: "12:00", latitude: 51.4779, longitude: -0.0015, timezone: "Europe/London" },
  { label: "Fortaleza 1989", birthDate: "1989-02-23", birthTime: "14:30", latitude: -3.7327, longitude: -38.527, timezone: "America/Fortaleza" },
  { label: "Tokyo 1975", birthDate: "1975-08-09", birthTime: "06:15", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { label: "NYC 1960", birthDate: "1960-11-20", birthTime: "23:45", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { label: "Sydney 2010", birthDate: "2010-03-14", birthTime: "08:00", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
  { label: "Reykjavik 1945", birthDate: "1945-06-30", birthTime: "03:30", latitude: 64.1466, longitude: -21.9426, timezone: "Atlantic/Reykjavik" }
];

let worstDelta = 0;
for (const c of CASES) {
  const chart = computeNatalChart(c);
  const audit = buildPrecisionAudit({
    chartPlanets: chart.planets,
    birthDate: c.birthDate,
    birthTime: c.birthTime,
    timezone: c.timezone
  });
  worstDelta = Math.max(worstDelta, audit.maxDeltaDegrees);
  assert.equal(audit.status, "verified", `${c.label}: precision ${audit.status}, max Δ ${audit.maxDeltaDegrees}° — planets disagree across engines`);
  // Every classical planet must be present and land in a real sign.
  for (const key of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]) {
    assert.ok(chart.planets[key]?.sign, `${c.label}: missing ${key}`);
  }
  console.log(`✓ ${c.label}: ${audit.status}, max Δ ${audit.maxDeltaDegrees}° across ${audit.rows.length} planets`);
}

console.log(`\nACCURACY OK — worst cross-engine delta ${worstDelta.toFixed(4)}° over ${CASES.length} charts`);
