import { MCP_NAME } from "../constants.js";

export function buildDataInventory(generatedAt: string) {
  return {
    kind: "data_inventory" as const,
    mcp_name: MCP_NAME,
    generated_at: generatedAt,
    data_access_model: "Stateless and local. The caller supplies birth data; the server computes from bundled ephemerides. No auth, no accounts, no external API except optional birthplace geocoding.",
    categories: [
      {
        name: "Natal",
        examples: ["planet signs/degrees/houses", "aspects with orb + strength", "chart pattern, stelliums, dominant element/modality", "precision audit"],
        tools: ["astral_compute_natal_chart", "astral_demo"]
      },
      {
        name: "Transits",
        examples: ["current transit aspects to the natal chart", "upcoming activation windows", "moon phase"],
        tools: ["astral_current_transits", "astral_moon_phase"]
      },
      {
        name: "Relationship",
        examples: ["synastry aspects between two charts", "scored harmony/chemistry/communication/growth"],
        tools: ["astral_synastry"]
      },
      {
        name: "Geocoding",
        examples: ["city name to latitude/longitude", "IANA timezone for a birthplace"],
        tools: ["astral_search_birthplace"]
      }
    ],
    first_tools: ["astral_capabilities", "astral_search_birthplace", "astral_compute_natal_chart"],
    notes: [
      "Resolve a place name to coordinates + timezone with astral_search_birthplace before computing a chart.",
      "Pass the birthplace timezone, not the caller's timezone.",
      "birth_time is optional but materially affects houses and the Ascendant."
    ]
  };
}
