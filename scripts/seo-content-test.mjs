import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const slug = "guides/what-is-an-astrology-mcp-server";
const canonical = `https://astral.delx.ai/${slug}`;
assert.ok(existsSync(join(root, `docs/${slug}.html`)), "HTML guide must exist");
assert.ok(existsSync(join(root, `docs/${slug}.md`)), "Markdown guide must exist");
const html = read(`docs/${slug}.html`);
const markdown = read(`docs/${slug}.md`);
const home = read("docs/index.html");
const sitemap = read("docs/sitemap.xml");
const docsLlms = read("docs/llms.txt");
const packageLlms = read("llms.txt");
const vercel = read("vercel.json");
const readme = read("README.md");

assert.match(html, /<title>What Is an Astrology MCP Server\?/);
assert.match(html, new RegExp(`<link rel="canonical" href="${canonical}">`));
assert.match(html, /rel="alternate" type="text\/markdown"/);
assert.match(html, /"@type": "TechArticle"/);
assert.match(html, /"@type": "HowTo"/);
assert.match(html, /"@type": "BreadcrumbList"/);
assert.match(html, /"@type": "FAQPage"/);
assert.match(html, /class="direct-answer"[^>]*>\s*An astrology MCP server connects/);
assert.match(html, /structured astrology data only/i);
assert.match(html, /birth data is not persisted/i);
assert.match(html, /not financial, medical, legal or psychological advice/i);
assert.match(html, /flagged for review instead of silently accepted/i);

assert.match(markdown, /^# What Is an Astrology MCP Server\?/m);
assert.match(markdown, /Canonical: https:\/\/astral\.delx\.ai\/guides\/what-is-an-astrology-mcp-server/);
assert.match(markdown, /## Direct answer/);
assert.match(markdown, /npx -y astral-mcp/);

for (const surface of [home, sitemap, docsLlms, packageLlms, readme]) {
  assert.ok(surface.includes(canonical), "machine and editorial surfaces must cite the canonical guide");
}
assert.ok(vercel.includes('"/guides/what-is-an-astrology-mcp-server"'), "clean canonical route must resolve to the HTML guide");

console.log("✓ astrology MCP guide aligns HTML, Markdown and discovery surfaces");
