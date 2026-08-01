/**
 * Contract gate for `astral_demo`.
 *
 * The demo tool exists so agents can see the payload shape before sending real
 * birth data. A hand-written example nobody compares against reality drifts
 * silently, and an agent that trusts it writes a parser — or a call — for a
 * contract that does not exist.
 *
 * This gate drives the REAL MCP server in memory. It takes `astral_demo`'s own
 * `input` block, sends it verbatim to `astral_compute_natal_chart`, and compares
 * the demo's advertised `chart` against what that call actually returned,
 * failing in both directions:
 *
 *   - a key in the demo that the real tool never emits  -> invented contract
 *   - a key the real tool emits that the demo omits     -> incomplete contract
 *
 * The input half is checked against the tool's own published JSON Schema (what a
 * client sees in tools/list), also in both directions: an argument the demo
 * invents, and a required argument it omits. Then the call itself is the proof —
 * the schema is `.strict()`, so a demo input the server would reject cannot pass
 * this gate.
 *
 * Arrays are compared as the union of their elements' key paths, because a chart
 * carries both fully-populated and sparse rows and either alone under-describes
 * the shape.
 */
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

/**
 * Keys the real tool only emits under conditions the demo cannot reproduce.
 * Each entry needs a reason.
 *
 * This is deliberately narrow. Adding a key here to silence the gate defeats the
 * gate — only list fields that are genuinely conditional.
 */
const OPTIONAL_IN_REAL = new Map([
  // No allowances needed today: the demo exercises every field of a default
  // (privacy_mode=full, verify_precision=true) natal chart. Kept as the explicit,
  // reviewable place to record one if that ever changes.
]);

function keyPaths(value, prefix = "", out = new Set()) {
  if (Array.isArray(value)) {
    // Union across elements: rows differ in how populated they are.
    for (const item of value) keyPaths(item, `${prefix}[]`, out);
    return out;
  }
  if (value === null || typeof value !== "object") return out;
  for (const key of Object.keys(value)) {
    const p = prefix ? `${prefix}.${key}` : key;
    out.add(p);
    keyPaths(value[key], p, out);
  }
  return out;
}

function diff(demoSet, realSet) {
  const invented = [...demoSet].filter((k) => !realSet.has(k)).sort();
  const missing = [...realSet].filter((k) => !demoSet.has(k) && !OPTIONAL_IN_REAL.has(k)).sort();
  return { invented, missing };
}

function report(name, invented, missing) {
  const lines = [];
  if (invented.length > 0) {
    lines.push(
      `\n  ${name}: ${invented.length} key(s) in the demo that the real tool NEVER returns.`,
      "  An agent trusting these writes a parser for data that never arrives:",
      ...invented.map((k) => `    - ${k}`)
    );
  }
  if (missing.length > 0) {
    lines.push(
      `\n  ${name}: ${missing.length} key(s) the real tool returns but the demo omits.`,
      "  Agents reading the demo will not know these exist:",
      ...missing.map((k) => `    + ${k}`)
    );
  }
  return lines.join("\n");
}

const server = createServer();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const client = new Client({ name: "astral-demo-contract", version: "0.0.0" });
await client.connect(clientTransport);

const failures = [];

// ---------------------------------------------------------------------------
// 1. The demo's `input` must be a valid, complete call to the tool it examples.
// ---------------------------------------------------------------------------
const demoResult = await client.callTool({ name: "astral_demo", arguments: { response_format: "json" } });
assert.ok(!demoResult.isError, `astral_demo returned an error: ${JSON.stringify(demoResult.content)}`);
const demo = demoResult.structuredContent;
assert.equal(demo.kind, "demo", "demo payload must be tagged kind=demo");
assert.ok(typeof demo.note === "string" && demo.note.length > 0, "demo payload must carry an explanatory note");
assert.ok(demo.input && typeof demo.input === "object", "demo payload must carry an input example");
assert.ok(demo.chart && typeof demo.chart === "object", "demo payload must carry a chart example");

const { tools } = await client.listTools();
const natalTool = tools.find((t) => t.name === "astral_compute_natal_chart");
assert.ok(natalTool, "astral_compute_natal_chart is not registered");

// The published JSON Schema is what an agent reads. Compare the demo's example
// arguments against it in both directions.
const props = Object.keys(natalTool.inputSchema.properties ?? {});
const required = natalTool.inputSchema.required ?? [];
const demoArgs = Object.keys(demo.input);

const inventedArgs = demoArgs.filter((k) => !props.includes(k)).sort();
const missingArgs = required.filter((k) => !demoArgs.includes(k)).sort();

if (inventedArgs.length > 0 || missingArgs.length > 0) {
  const lines = [];
  if (inventedArgs.length > 0) {
    lines.push(
      `\n  demo.input: ${inventedArgs.length} argument(s) astral_compute_natal_chart does NOT accept.`,
      "  An agent copying this example gets a validation error, not a chart:",
      ...inventedArgs.map((k) => `    - ${k}`)
    );
  }
  if (missingArgs.length > 0) {
    lines.push(
      `\n  demo.input: ${missingArgs.length} REQUIRED argument(s) the example omits.`,
      "  An agent copying this example gets a validation error, not a chart:",
      ...missingArgs.map((k) => `    + ${k}`)
    );
  }
  failures.push(lines.join("\n"));
} else {
  console.log(`PASS demo.input — ${demoArgs.length} arguments, all accepted, all required present`);
}

// ---------------------------------------------------------------------------
// 2. Send that exact input to the real tool. This is the proof, not a proxy:
//    the input schema is strict, so a rejected example fails here.
// ---------------------------------------------------------------------------
const realResult = await client.callTool({
  name: "astral_compute_natal_chart",
  arguments: { ...demo.input, response_format: "json" }
});

if (realResult.isError) {
  failures.push(
    "\n  demo.input was REJECTED by astral_compute_natal_chart — the example is not a callable request:" +
      `\n    ${JSON.stringify(realResult.content)}`
  );
} else {
  console.log("PASS demo.input is accepted verbatim by astral_compute_natal_chart");
}

const real = realResult.structuredContent;
let checked = 0;

if (real) {
  const demoSet = keyPaths(demo.chart);
  const realSet = keyPaths(real);
  const { invented, missing } = diff(demoSet, realSet);
  checked = demoSet.size;
  if (invented.length > 0 || missing.length > 0) {
    failures.push(report("demo.chart", invented, missing));
  } else {
    console.log(`PASS demo.chart — ${demoSet.size} key paths match the real tool response`);
  }

  // Shape parity is not enough: the demo must show the same default markers the
  // agent will actually receive.
  if (demo.chart?.meta?.privacy_mode !== real.meta?.privacy_mode) {
    failures.push(
      `\n  demo.chart.meta.privacy_mode is ${JSON.stringify(demo.chart?.meta?.privacy_mode)} but the real` +
        ` default response carries ${JSON.stringify(real.meta?.privacy_mode)}.`
    );
  } else {
    console.log(`PASS demo.chart reflects the default privacy_mode=${real.meta?.privacy_mode}`);
  }
}

// ---------------------------------------------------------------------------
// 3. The example must stay synthetic: a public landmark, never birth data.
//    Reported, not asserted, so a drifted input still shows the drift findings
//    above rather than dying on the first mismatch.
// ---------------------------------------------------------------------------
const isGreenwichY2K =
  demo.input.birth_date === "2000-01-01" &&
  Math.abs(demo.input.latitude - 51.4779) < 0.01 &&
  Math.abs(demo.input.longitude + 0.0015) < 0.01;

if (!isGreenwichY2K) {
  failures.push(
    "\n  demo.input is no longer the documented synthetic Greenwich/Y2K example." +
      "\n  The demo must never carry a real person's birth data:" +
      `\n    ${JSON.stringify(demo.input)}`
  );
} else {
  console.log("PASS demo input is the documented synthetic Greenwich example");
}

await client.close();
await server.close();

if (failures.length > 0) {
  console.error("\nFAIL demo contract drifted from the real tools:");
  console.error(failures.join("\n"));
  console.error(
    "\nFix src/services/demo.ts so the example matches what the tools accept and return." +
      "\nDo not widen OPTIONAL_IN_REAL to silence this — that is how the drift got here.\n"
  );
  process.exit(1);
}

console.log(`\ndemo-contract: ${checked} key paths verified against the real tool response`);
console.log(JSON.stringify({ ok: true, suite: "demo-contract", key_paths: checked }));
