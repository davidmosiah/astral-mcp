import { MCP_NAME, NPM_PACKAGE_NAME, PINNED_NPM_PACKAGE, SERVER_VERSION, LINKS } from "../constants.js";

export function buildAgentManifest() {
  return {
    project: "astral-mcp",
    mcp_name: MCP_NAME,
    package: {
      name: NPM_PACKAGE_NAME,
      version: SERVER_VERSION,
      install_command: `npx -y ${NPM_PACKAGE_NAME}`,
      pinned_install_command: `npx -y ${PINNED_NPM_PACKAGE}`,
      binary: "astral-mcp-server"
    },
    data_access_model: "Stateless local computation. No API keys, no OAuth, no accounts. Safe to call immediately.",
    recommended_first_calls: [
      "astral_capabilities",
      "astral_demo",
      "astral_search_birthplace",
      "astral_compute_natal_chart"
    ],
    standard_tools: [
      "astral_compute_natal_chart",
      "astral_current_transits",
      "astral_synastry",
      "astral_moon_phase",
      "astral_search_birthplace",
      "astral_demo",
      "astral_capabilities",
      "astral_data_inventory",
      "astral_agent_manifest",
      "astral_connection_status"
    ],
    agent_rules: [
      "If you only have a city name, call astral_search_birthplace first and pass the returned latitude/longitude/timezone.",
      "Always pass the BIRTHPLACE timezone, not the user's current timezone.",
      "birth_time is optional; without it noon is assumed and the Ascendant/houses are unreliable, though planet signs stay accurate.",
      "astral-mcp returns structured astrology data only — write any interpretation yourself from that data.",
      "Charts are precision-audited by default; if status is 'review', surface that the placement is near a sign boundary or outside tolerance."
    ],
    troubleshooting: [
      { symptom: "invalid_birth_data error", action: "Check birth_date is YYYY-MM-DD, latitude in -90..90, longitude in -180..180." },
      { symptom: "Empty birthplace results", action: "Add the country to the query, e.g. 'Springfield, USA', and keep at least 3 characters." },
      { symptom: "precision status 'review'", action: "Usually a planet sitting on a sign cusp; report the exact degree rather than just the sign." }
    ],
    links: LINKS
  };
}
