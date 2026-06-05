// Smoke test: connect an in-memory MCP client to the server and exercise every
// tool the way an agent would. Runs against the built dist. No network required
// except the birthplace search, whose failure is tolerated (offline CI).
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

const EXPECTED_TOOLS = [
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
];

const server = createServer();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const client = new Client({ name: "astral-smoke", version: "0.0.0" });
await client.connect(clientTransport);

async function call(name, args) {
  const result = await client.callTool({ name, arguments: { response_format: "json", ...args } });
  assert.ok(!result.isError, `${name} returned an error: ${JSON.stringify(result.content)}`);
  return result.structuredContent;
}

// 1. Tool surface
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
for (const expected of EXPECTED_TOOLS) {
  assert.ok(names.includes(expected), `missing tool: ${expected}`);
}
assert.equal(tools.length, EXPECTED_TOOLS.length, `expected ${EXPECTED_TOOLS.length} tools, got ${tools.length}`);
console.log(`✓ ${tools.length} tools registered`);

// 2. Connection status self-check
const status = await call("astral_connection_status");
assert.equal(status.ready, true, "server not ready");
assert.equal(status.self_check.precision_status, "verified", "self-check precision not verified");
console.log(`✓ connection_status ready, self-check ${status.self_check.precision_status} (Δ ${status.self_check.max_delta_degrees}°)`);

// 3. Natal chart with a known sun sign
const chart = await call("astral_compute_natal_chart", {
  birth_date: "2000-01-01",
  birth_time: "12:00",
  latitude: 51.4779,
  longitude: -0.0015,
  timezone: "Europe/London"
});
assert.equal(chart.planets.sun.sign, "Capricorn", `expected Capricorn sun, got ${chart.planets.sun.sign}`);
assert.equal(chart.precision.status, "verified", "natal precision not verified");
assert.ok(Array.isArray(chart.aspects), "aspects missing");
console.log(`✓ natal chart: sun ${chart.planets.sun.sign}, ${chart.aspects.length} aspects, precision ${chart.precision.status}`);

// 4. Demo, capabilities, inventory, manifest
const demo = await call("astral_demo");
assert.equal(demo.kind, "demo");
const caps = await call("astral_capabilities");
assert.ok(caps.supported.house_systems.includes("whole-sign"), "whole-sign not advertised");
const inv = await call("astral_data_inventory");
assert.equal(inv.kind, "data_inventory");
const manifest = await call("astral_agent_manifest");
assert.equal(manifest.package.name, "astral-mcp");
console.log("✓ demo / capabilities / data_inventory / agent_manifest ok");

// 5. Transits
const transits = await call("astral_current_transits", {
  birth_date: "1989-02-23",
  birth_time: "12:00",
  latitude: -3.7327,
  longitude: -38.527,
  timezone: "America/Fortaleza",
  on_date: "2026-06-05"
});
assert.ok(Array.isArray(transits.highlights), "transit highlights missing");
console.log(`✓ transits: ${transits.highlights.length} active, moon ${transits.moon ? transits.moon.phase : "n/a"}`);

// 6. Moon phase
const moon = await call("astral_moon_phase", { on_date: "2026-06-05", timezone: "UTC" });
assert.ok(typeof moon.illumination === "number", "moon illumination missing");
console.log(`✓ moon phase: ${moon.phase} in ${moon.moonSign}, ${moon.illumination}%`);

// 7. Synastry
const syn = await call("astral_synastry", {
  person: { birth_date: "1989-02-23", birth_time: "12:00", latitude: -3.7327, longitude: -38.527, timezone: "America/Fortaleza" },
  partner: { birth_date: "1991-07-15", birth_time: "09:00", latitude: -23.5505, longitude: -46.6333, timezone: "America/Sao_Paulo" }
});
assert.ok(typeof syn.score === "number" && syn.score >= 0 && syn.score <= 100, "synastry score out of range");
console.log(`✓ synastry: ${syn.score}/100 (${syn.tone}), ${syn.aspects.length} aspects`);

await client.close();
await server.close();
console.log("\nSMOKE OK");
