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
const siteCss = read("docs/assets/site.css");

assert.match(home, /"@type": "Organization"/);
assert.match(home, /"@id": "https:\/\/delx\.ai\/#studio"/);
assert.match(home, /"publisher": \{ "@id": "https:\/\/delx\.ai\/#studio" \}/);
assert.match(home, /"softwareVersion": "0\.3\.1"/);
assert.match(home, /How does Astral MCP relate to Delx\?/);
assert.match(home, /https:\/\/delx\.ai\/platform/);
assert.match(docsLlms, /Publisher: Delx — https:\/\/delx\.ai\//);
assert.match(packageLlms, /Publisher: Delx — https:\/\/delx\.ai\//);
assert.match(docsLlms, /Delx platform map: https:\/\/delx\.ai\/platform/);
assert.match(packageLlms, /Delx platform map: https:\/\/delx\.ai\/platform/);
assert.match(readme, /\[Delx platform map\]\(https:\/\/delx\.ai\/platform\)/);

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

const natalSlug = "guides/how-to-generate-a-natal-chart-with-mcp";
const natalCanonical = `https://astral.delx.ai/${natalSlug}`;
assert.ok(existsSync(join(root, `docs/${natalSlug}.html`)), "natal-chart HTML guide must exist");
assert.ok(existsSync(join(root, `docs/${natalSlug}.md`)), "natal-chart Markdown guide must exist");
const natalHtml = read(`docs/${natalSlug}.html`);
const natalMarkdown = read(`docs/${natalSlug}.md`);

assert.match(natalHtml, /<title>How to Generate a Natal Chart with MCP/);
assert.match(natalHtml, new RegExp(`<link rel="canonical" href="${natalCanonical}">`));
assert.match(natalHtml, /rel="alternate" type="text\/markdown"/);
const natalDescription = natalHtml.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? "";
assert.ok(natalDescription.length >= 120 && natalDescription.length <= 160, "natal guide description must stay within 120–160 characters");
for (const schemaType of ["TechArticle", "HowTo", "BreadcrumbList", "FAQPage"]) {
  assert.ok(natalHtml.includes(`"@type": "${schemaType}"`), `natal guide must publish ${schemaType} schema`);
}
assert.match(natalHtml, /class="direct-answer"[^>]*>\s*To generate a natal chart with MCP/);
assert.match(natalHtml, /astral_capabilities/);
assert.match(natalHtml, /astral_search_birthplace/);
assert.match(natalHtml, /astral_compute_natal_chart/);
assert.match(natalHtml, /birthplace timezone/i);
assert.match(natalHtml, /noon is assumed/i);
assert.match(natalHtml, /Ascendant and houses[^<]*not[^<]*reliable/i);
assert.match(natalHtml, /verify_precision/);
assert.match(natalHtml, /privacy_mode/);
assert.match(natalHtml, /computational agreement/i);
assert.match(natalHtml, /does not validate astrology/i);
assert.match(natalHtml, /operations\.osmfoundation\.org\/policies\/nominatim/);
assert.match(natalHtml, /one request per second/i);
assert.match(natalHtml, /not financial, medical, legal or psychological advice/i);
assert.match(natalHtml, /modelcontextprotocol\.io\/specification\/2025-06-18\/server\/tools/);
assert.match(natalHtml, /github\.com\/cosinekitty\/astronomy/);

assert.match(natalMarkdown, /^# How to Generate a Natal Chart with MCP/m);
assert.match(natalMarkdown, new RegExp(`Canonical: ${natalCanonical}`));
assert.match(natalMarkdown, /## Direct answer/);
assert.match(natalMarkdown, /"verify_precision": true/);
assert.match(natalMarkdown, /"privacy_mode": "summary"/);
assert.match(natalMarkdown, /Nominatim Usage Policy/);

for (const surface of [home, sitemap, docsLlms, packageLlms, readme]) {
  assert.ok(surface.includes(natalCanonical), "machine and editorial surfaces must cite the natal-chart guide");
}
assert.ok(vercel.includes('"/guides/how-to-generate-a-natal-chart-with-mcp"'), "clean natal-guide route must resolve to HTML");
assert.ok(html.includes(natalCanonical), "the conceptual guide must link to the practical natal-chart guide");
assert.ok(natalHtml.includes(canonical), "the practical guide must link back to the conceptual guide");
assert.match(siteCss, /\.community-section \.community-card \+ \.community-card\s*{[^}]*margin-top:/s, "stacked guide cards must have visible separation");

console.log("✓ Astral guides align HTML, Markdown and discovery surfaces");
