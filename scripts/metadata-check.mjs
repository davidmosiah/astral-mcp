// Metadata gate: keep package.json, server.json and constants in lockstep so a
// release can't ship mismatched versions, names or binaries.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SERVER_VERSION, MCP_NAME, NPM_PACKAGE_NAME } from "../dist/constants.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));

assert.equal(pkg.name, NPM_PACKAGE_NAME, "package.json name vs constants NPM_PACKAGE_NAME");
assert.equal(pkg.version, SERVER_VERSION, "package.json version vs constants SERVER_VERSION");
assert.equal(pkg.mcpName, MCP_NAME, "package.json mcpName vs constants MCP_NAME");
assert.equal(server.name, MCP_NAME, "server.json name vs constants MCP_NAME");
assert.equal(server.version, pkg.version, "server.json version vs package.json version");

const npmPkg = server.packages.find((p) => p.registryType === "npm");
assert.ok(npmPkg, "server.json missing npm package entry");
assert.equal(npmPkg.identifier, pkg.name, "server.json npm identifier vs package.json name");
assert.equal(npmPkg.version, pkg.version, "server.json npm package version vs package.json version");

assert.ok(pkg.bin["astral-mcp-server"], "package.json missing astral-mcp-server bin");
assert.ok(pkg.bin["astral-mcp"], "package.json missing astral-mcp bin");
assert.equal(pkg.license, "MIT", "license must be MIT");

console.log(`✓ metadata consistent — ${pkg.name}@${pkg.version} (${pkg.mcpName})`);
