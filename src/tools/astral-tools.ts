import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  NatalChartInputSchema,
  NatalChartOutputSchema,
  TransitsInputSchema,
  TransitsOutputSchema,
  SynastryInputSchema,
  SynastryOutputSchema,
  MoonPhaseInputSchema,
  MoonPhaseOutputSchema,
  SearchBirthplaceInputSchema,
  SearchBirthplaceOutputSchema,
  ResponseOnlyInputSchema,
  CapabilitiesOutputSchema,
  DataInventoryOutputSchema,
  AgentManifestOutputSchema,
  ConnectionStatusOutputSchema,
  DemoOutputSchema,
  type NatalChartInput,
  type TransitsInput,
  type SynastryInput,
  type MoonPhaseInput
} from "../schemas/common.js";
import { computeNatalChart, type BirthDataInput } from "../engine/natal-chart.js";
import { buildPrecisionAudit } from "../engine/precision-audit.js";
import { buildDailyTransitSnapshot, buildMoonPhaseSnapshot } from "../engine/transits.js";
import { buildSynastrySummary } from "../engine/synastry.js";
import { searchBirthLocations } from "../engine/geocoding.js";
import {
  makeResponse,
  makeError,
  bulletList,
  formatNatalChart,
  formatTransits,
  formatSynastry,
  formatMoonPhase,
  formatBirthplaces
} from "../services/format.js";
import { buildDemo } from "../services/demo.js";
import { buildCapabilities } from "../services/capabilities.js";
import { buildDataInventory } from "../services/inventory.js";
import { buildAgentManifest } from "../services/agent-manifest.js";
import { buildConnectionStatus } from "../services/connection-status.js";

const READ_DETERMINISTIC = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

const READ_TIME_OR_NETWORK = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
} as const;

function toBirthInput(p: {
  birth_date: string;
  birth_time?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}): BirthDataInput {
  return {
    birthDate: p.birth_date,
    birthTime: p.birth_time ?? null,
    latitude: p.latitude,
    longitude: p.longitude,
    timezone: p.timezone
  };
}

function localDateInTimezone(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(now);
  }
}

export function registerAstralTools(server: McpServer): void {
  // -- Core: natal chart -----------------------------------------------------
  server.registerTool(
    "astral_compute_natal_chart",
    {
      title: "Compute Natal Chart",
      description:
        "Compute a full natal (birth) chart from birth data: planet signs/degrees/houses, retrogrades, major aspects with orb and strength, the Ascendant/MC, and a derived signature (dominant element/modality, chart pattern, stelliums, angular planets). By default the chart is precision-audited by a second independent ephemeris. This is the primary tool. If you only have a city name, call astral_search_birthplace first to get latitude/longitude/timezone.",
      inputSchema: NatalChartInputSchema.shape,
      outputSchema: NatalChartOutputSchema.shape,
      annotations: READ_DETERMINISTIC
    },
    async (params: NatalChartInput) => {
      try {
        const birth = toBirthInput(params);
        const chart = computeNatalChart(birth, { houseSystem: params.house_system, zodiac: params.zodiac });
        let precision;
        if (params.verify_precision) {
          precision = buildPrecisionAudit({
            chartPlanets: chart.planets,
            birthDate: birth.birthDate,
            birthTime: birth.birthTime ?? "12:00",
            timezone: birth.timezone
          });
        }
        const output = { ...chart, precision };
        return makeResponse(output, params.response_format, formatNatalChart(chart, precision));
      } catch (error) {
        return makeError((error as Error).message);
      }
    }
  );

  // -- Core: transits --------------------------------------------------------
  server.registerTool(
    "astral_current_transits",
    {
      title: "Current Transits",
      description:
        "Read the current (or a chosen date's) planetary transits against a natal chart. Returns the active transit aspects to the natal planets and angles, upcoming activation windows over the next days, and the current moon phase. Supply the same birth data you would for a natal chart; pass on_date/on_time to read a specific moment. Useful for 'what's happening for me astrologically' questions.",
      inputSchema: TransitsInputSchema.shape,
      outputSchema: TransitsOutputSchema.shape,
      annotations: READ_TIME_OR_NETWORK
    },
    async (params: TransitsInput) => {
      try {
        const birth = toBirthInput(params);
        const natal = computeNatalChart(birth, { houseSystem: params.house_system, zodiac: params.zodiac });
        const snapshot = buildDailyTransitSnapshot({
          natalPlanets: natal.planets,
          birthContext: { latitude: birth.latitude, longitude: birth.longitude, timezone: birth.timezone },
          localDate: params.on_date ?? null,
          localTime: params.on_time ?? null,
          includeAngles: params.include_angles
        });
        return makeResponse(snapshot, params.response_format, formatTransits(snapshot));
      } catch (error) {
        return makeError((error as Error).message);
      }
    }
  );

  // -- Core: synastry --------------------------------------------------------
  server.registerTool(
    "astral_synastry",
    {
      title: "Synastry (Two-Chart Comparison)",
      description:
        "Compare two birth charts (synastry). Returns the inter-chart aspects between the two people's planets and angles, plus scored dimensions (harmony, chemistry, communication, growth) and an overall 0–100 score with a tone. Provide both people's birth data under 'person' and 'partner'. Resolve any city names with astral_search_birthplace first.",
      inputSchema: SynastryInputSchema.shape,
      outputSchema: SynastryOutputSchema.shape,
      annotations: READ_DETERMINISTIC
    },
    async (params: SynastryInput) => {
      try {
        const personChart = computeNatalChart(toBirthInput(params.person), { houseSystem: params.house_system, zodiac: params.zodiac });
        const partnerChart = computeNatalChart(toBirthInput(params.partner), { houseSystem: params.house_system, zodiac: params.zodiac });
        const summary = buildSynastrySummary({
          personPlanets: personChart.planets,
          partnerPlanets: partnerChart.planets
        });
        return makeResponse(summary, params.response_format, formatSynastry(summary));
      } catch (error) {
        return makeError((error as Error).message);
      }
    }
  );

  // -- Core: moon phase ------------------------------------------------------
  server.registerTool(
    "astral_moon_phase",
    {
      title: "Moon Phase",
      description:
        "Get the moon phase (new, waxing, full, waning, etc.), the moon's sign, illumination percentage and sun–moon angle for now or a chosen local date/time. Location-independent — no birth data needed. Good for ritual timing, journaling prompts, or 'what phase is the moon in' questions.",
      inputSchema: MoonPhaseInputSchema.shape,
      outputSchema: MoonPhaseOutputSchema.shape,
      annotations: READ_TIME_OR_NETWORK
    },
    async (params: MoonPhaseInput) => {
      try {
        const now = new Date();
        const date = params.on_date ?? localDateInTimezone(now, params.timezone);
        const time = params.on_time ?? "12:00";
        const sky = computeNatalChart({
          birthDate: date,
          birthTime: time,
          latitude: 0,
          longitude: 0,
          timezone: params.timezone
        });
        const snapshot = buildMoonPhaseSnapshot(sky.planets);
        if (!snapshot) return makeError("could_not_compute_moon_phase");
        const output = { ...snapshot, generatedAt: now.toISOString(), timezone: params.timezone };
        return makeResponse(output, params.response_format, formatMoonPhase(snapshot, output));
      } catch (error) {
        return makeError((error as Error).message);
      }
    }
  );

  // -- Geocoding -------------------------------------------------------------
  server.registerTool(
    "astral_search_birthplace",
    {
      title: "Search Birthplace",
      description:
        "Geocode a city or place name into latitude, longitude and IANA timezone using OpenStreetMap (free, no key). Call this FIRST whenever you only have a place name, then pass the chosen match's coordinates and timezone to the chart tools. Returns several matches; pick the one whose displayName matches the intended birthplace.",
      inputSchema: SearchBirthplaceInputSchema.shape,
      outputSchema: SearchBirthplaceOutputSchema.shape,
      annotations: READ_TIME_OR_NETWORK
    },
    async (params) => {
      try {
        const results = await searchBirthLocations(params.query, params.language);
        const output = { query: params.query, count: results.length, results };
        return makeResponse(output, params.response_format, formatBirthplaces(params.query, results));
      } catch (error) {
        return makeError((error as Error).message);
      }
    }
  );

  // -- Agent-first surfaces --------------------------------------------------
  server.registerTool(
    "astral_demo",
    {
      title: "Astral Demo",
      description:
        "Return a fully-worked example natal chart (Greenwich, noon, 2000-01-01) including a precision audit, so you can see the exact payload shape before sending real birth data. No input, no network, no auth.",
      inputSchema: ResponseOnlyInputSchema.shape,
      outputSchema: DemoOutputSchema.shape,
      annotations: READ_DETERMINISTIC
    },
    async ({ response_format }) => {
      const demo = buildDemo();
      return makeResponse(demo, response_format, formatNatalChart(demo.chart, demo.chart.precision));
    }
  );

  server.registerTool(
    "astral_capabilities",
    {
      title: "Astral Capabilities",
      description:
        "Explain what astral-mcp can compute: supported house systems, zodiacs, bodies, aspects and features, the dual-engine precision model, what is NOT included (nodes, Chiron, interpretations), and the recommended agent workflow. Read this first to plan a sequence of calls.",
      inputSchema: ResponseOnlyInputSchema.shape,
      outputSchema: CapabilitiesOutputSchema.shape,
      annotations: READ_DETERMINISTIC
    },
    async ({ response_format }) => {
      const capabilities = buildCapabilities();
      return makeResponse(capabilities, response_format, bulletList("Astral Capabilities", {
        engines: `${capabilities.engines.primary} + ${capabilities.engines.verifier} (cross-checked)`,
        house_systems: capabilities.supported.house_systems.join(", "),
        zodiacs: capabilities.supported.zodiacs.join(", "),
        features: capabilities.supported.features.join("; "),
        not_included: capabilities.not_included.join("; "),
        flow: capabilities.recommended_agent_flow.join(" → ")
      }));
    }
  );

  server.registerTool(
    "astral_data_inventory",
    {
      title: "Astral Data Inventory",
      description:
        "Inventory the data domains this server exposes (natal, transits, relationship, geocoding), which tools serve each, and the recommended first calls. Does not compute anything or take any input beyond response_format.",
      inputSchema: ResponseOnlyInputSchema.shape,
      outputSchema: DataInventoryOutputSchema.shape,
      annotations: READ_DETERMINISTIC
    },
    async ({ response_format }) => {
      const inventory = buildDataInventory(new Date().toISOString());
      return makeResponse(inventory, response_format, bulletList("Astral Data Inventory", {
        data_access_model: inventory.data_access_model,
        categories: inventory.categories.map((c) => c.name).join(", "),
        first_tools: inventory.first_tools.join(", ")
      }));
    }
  );

  server.registerTool(
    "astral_agent_manifest",
    {
      title: "Astral Agent Manifest",
      description:
        "Agent-oriented setup and usage guide: install command, recommended first calls, the full tool list, agent rules (resolve birthplace first, pass birthplace timezone, birth_time caveats) and troubleshooting. Call this to learn how to drive astral-mcp correctly.",
      inputSchema: ResponseOnlyInputSchema.shape,
      outputSchema: AgentManifestOutputSchema.shape,
      annotations: READ_DETERMINISTIC
    },
    async ({ response_format }) => {
      const manifest = buildAgentManifest();
      return makeResponse(manifest, response_format, bulletList("Astral Agent Manifest", {
        install: manifest.package.install_command,
        first_calls: manifest.recommended_first_calls.join(", "),
        rules: manifest.agent_rules.join(" | ")
      }));
    }
  );

  server.registerTool(
    "astral_connection_status",
    {
      title: "Astral Connection Status",
      description:
        "Health check. The server is stateless and local, so this verifies the Node version and proves both bundled ephemerides load and agree by computing a sample chart and running the dual-engine precision audit. Call this to confirm the install is working before computing real charts.",
      inputSchema: ResponseOnlyInputSchema.shape,
      outputSchema: ConnectionStatusOutputSchema.shape,
      annotations: READ_DETERMINISTIC
    },
    async ({ response_format }) => {
      const status = buildConnectionStatus();
      return makeResponse(status, response_format, bulletList("Astral Connection Status", {
        ready: status.ready,
        node: `${status.node.version} (supported: ${status.node.supported})`,
        primary_engine: `${status.engines.primary.name} (loaded: ${status.engines.primary.loaded})`,
        verifier_engine: `${status.engines.verifier.name} (loaded: ${status.engines.verifier.loaded})`,
        self_check: status.self_check ? `${status.self_check.sample_sun_sign}, precision ${status.self_check.precision_status} (max Δ ${status.self_check.max_delta_degrees}°)` : "n/a",
        next_steps: status.next_steps.join(" | ")
      }));
    }
  );
}
