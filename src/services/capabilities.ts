import { MCP_NAME, CREATOR, LINKS, PRIMARY_ENGINE, VERIFIER_ENGINE } from "../constants.js";
import { HOUSE_SYSTEMS, ZODIAC_SYSTEMS, MAJOR_PLANETS } from "../engine/astrology-constants.js";

export function buildCapabilities() {
  return {
    project: "astral-mcp",
    mcp_name: MCP_NAME,
    creator: CREATOR,
    engines: {
      primary: PRIMARY_ENGINE,
      verifier: VERIFIER_ENGINE,
      cross_check: "Every natal chart is independently re-derived by the verifier engine and shipped with a precision audit (per-planet delta + verified/review status)."
    },
    supported: {
      house_systems: [...HOUSE_SYSTEMS],
      zodiacs: [...ZODIAC_SYSTEMS],
      bodies: [...MAJOR_PLANETS, "ascendant", "descendant", "mc", "ic"],
      aspects: ["Conjunction", "Opposition", "Trine", "Square", "Sextile"],
      features: [
        "natal chart (planets, houses, aspects with orb + strength)",
        "chart signature (dominant element/modality, pattern, stelliums, angular planets)",
        "precision audit (dual-engine cross-check)",
        "current + upcoming transits to the natal chart",
        "moon phase",
        "synastry (two-chart comparison with scored dimensions)",
        "birthplace geocoding with timezone resolution"
      ]
    },
    not_included: [
      "lunar nodes, Chiron, asteroids, fixed stars (planned)",
      "minor aspects (semisextile, quincunx, etc.)",
      "interpretation text — astral-mcp returns structured data; let the calling model write the reading"
    ],
    recommended_agent_flow: [
      "astral_capabilities — learn what this server can do",
      "astral_search_birthplace — turn a city into latitude/longitude/timezone",
      "astral_compute_natal_chart — the core reading (verified by default)",
      "astral_current_transits / astral_synastry — go deeper"
    ],
    links: LINKS
  };
}
