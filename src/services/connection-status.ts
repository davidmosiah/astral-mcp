import { PRIMARY_ENGINE, VERIFIER_ENGINE } from "../constants.js";
import { computeNatalChart } from "../engine/natal-chart.js";
import { buildPrecisionAudit } from "../engine/precision-audit.js";
import { DEMO_INPUT } from "./demo.js";

// There is no remote connection to verify (the server is stateless and local),
// so "connection status" instead proves the bundled ephemerides actually load
// and agree, by computing a sample chart and running the dual-engine audit.
export function buildConnectionStatus() {
  const major = Number(process.versions.node.split(".")[0]);
  const nodeSupported = major >= 20;

  const notes: string[] = [];
  const nextSteps: string[] = [];
  let primaryLoaded = false;
  let verifierLoaded = false;
  let selfCheck: { sample_sun_sign: string; precision_status: string; max_delta_degrees: number } | undefined;

  try {
    const chart = computeNatalChart(DEMO_INPUT);
    primaryLoaded = true;
    const audit = buildPrecisionAudit({
      chartPlanets: chart.planets,
      birthDate: DEMO_INPUT.birthDate,
      birthTime: DEMO_INPUT.birthTime ?? "12:00",
      timezone: DEMO_INPUT.timezone
    });
    verifierLoaded = true;
    selfCheck = {
      sample_sun_sign: chart.planets.sun?.sign ?? "unknown",
      precision_status: audit.status,
      max_delta_degrees: audit.maxDeltaDegrees
    };
    if (audit.status === "verified") {
      notes.push("Self-check passed: both ephemerides loaded and agree within tolerance.");
    } else {
      notes.push("Self-check ran but the sample chart fell outside tolerance — engine versions may have drifted.");
    }
  } catch (error) {
    notes.push(`Self-check failed: ${(error as Error).message}`);
    nextSteps.push("Reinstall dependencies (npm ci) so the ephemeris engines resolve.");
  }

  if (!nodeSupported) {
    nextSteps.push("Upgrade to Node.js 20 or newer.");
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Ready. Call astral_search_birthplace then astral_compute_natal_chart.");
  }

  const ready = nodeSupported && primaryLoaded && verifierLoaded;
  return {
    ok: ready,
    ready,
    node: { version: process.versions.node, supported: nodeSupported },
    engines: {
      primary: { name: PRIMARY_ENGINE, loaded: primaryLoaded },
      verifier: { name: VERIFIER_ENGINE, loaded: verifierLoaded }
    },
    self_check: selfCheck,
    notes,
    next_steps: nextSteps
  };
}
