import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.ok(pkg.files.includes("skill"));
assert.equal(existsSync(join(root, "skill/SKILL.md")), true);
assert.doesNotMatch(readFileSync(join(root, "skill/SKILL.md"), "utf8"), /ALLOW_MUTATIONS\s*=\s*true/);
assert.match(readFileSync(join(root, "skill/SKILL.md"), "utf8"), /call astral_connection_status/);

const bin = join(root, "dist/index.js");
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], { env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
const result = await run(["call", "astral_connection_status", "--json", "{}"]);
assert.ok(result.stdout.trim().startsWith("{"), result.stdout + result.stderr);
JSON.parse(result.stdout);
const unknown = await run(["call", "not_a_real_tool_name"]);
assert.equal(unknown.code, 1);
console.log(JSON.stringify({ ok: true, suite: "skill-surface", version: pkg.version }, null, 2));
