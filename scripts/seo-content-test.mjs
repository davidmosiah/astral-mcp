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
const agents = read("docs/agents.txt");
const skill = read("docs/skill.md");
const answers = read("docs/answers.txt");
const docsServer = read("docs/server.json");
const packageServer = read("server.json");
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
for (const surface of [agents, skill, answers]) {
  assert.match(surface, /https:\/\/astral\.delx\.ai\/llms\.txt/);
  assert.match(surface, /https:\/\/delx\.ai\/platform/);
  assert.doesNotMatch(surface, /private key|seed phrase|wallet secret/i);
}
assert.match(agents, /https:\/\/astral\.delx\.ai\/skill\.md/);
assert.match(agents, /Discovery does not authorize interpretation, payment/);
assert.match(skill, /astral_capabilities/);
assert.match(skill, /precision_audit\.status/);
assert.match(skill, /not a privacy certification/);
assert.match(answers, /Q: Does Astral MCP store birth data\?/);
assert.match(answers, /Q: What does the precision audit prove\?/);
assert.deepEqual(JSON.parse(docsServer), JSON.parse(packageServer), "hosted server manifest must match the package manifest");
assert.match(agents, /https:\/\/astral\.delx\.ai\/server\.json/);
assert.match(sitemap, /https:\/\/astral\.delx\.ai\/server\.json/);
for (const alias of ["agents.txt", "skill.md", "answers.txt"]) {
  assert.ok(sitemap.includes(`https://astral.delx.ai/${alias}`), `${alias} must be in the sitemap`);
}

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

const privacySlug = "guides/how-to-protect-birth-data-in-astrology-agent-workflows";
const privacyCanonical = `https://astral.delx.ai/${privacySlug}`;
assert.ok(existsSync(join(root, `docs/${privacySlug}.html`)), "privacy-workflow HTML guide must exist");
assert.ok(existsSync(join(root, `docs/${privacySlug}.md`)), "privacy-workflow Markdown guide must exist");
const privacyHtml = read(`docs/${privacySlug}.html`);
const privacyMarkdown = read(`docs/${privacySlug}.md`);

assert.match(privacyHtml, /<title>How to Protect Birth Data in Astrology Agent Workflows/);
assert.match(privacyHtml, new RegExp(`<link rel="canonical" href="${privacyCanonical}">`));
assert.match(privacyHtml, /rel="alternate" type="text\/markdown"/);
const privacyDescription = privacyHtml.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? "";
assert.ok(privacyDescription.length >= 120 && privacyDescription.length <= 160, "privacy guide description must stay within 120–160 characters");
for (const schemaType of ["TechArticle", "HowTo", "BreadcrumbList", "FAQPage"]) {
  assert.ok(privacyHtml.includes(`"@type": "${schemaType}"`), `privacy guide must publish ${schemaType} schema`);
}
assert.match(privacyHtml, /class="direct-answer"[^>]*>\s*To protect birth data in an astrology agent workflow/);
assert.match(privacyHtml, /stateless/i);
assert.match(privacyHtml, /No birth data is persisted/i);
assert.match(privacyHtml, /privacy_mode=summary/);
assert.match(privacyHtml, /OpenStreetMap|place-name/i);
assert.match(privacyHtml, /not a privacy certification/i);
assert.match(privacyHtml, /minimiz|redact|raw birth data/i);

assert.match(privacyMarkdown, /^# How to Protect Birth Data in Astrology Agent Workflows/m);
assert.match(privacyMarkdown, new RegExp(`Canonical: ${privacyCanonical}`));
assert.match(privacyMarkdown, /## Direct answer/);
assert.match(privacyMarkdown, /No birth data is persisted/i);
assert.match(privacyMarkdown, /privacy_mode.*summary/i);
assert.match(privacyMarkdown, /not a privacy certification/i);

for (const surface of [home, sitemap, docsLlms, packageLlms, readme]) {
  assert.ok(surface.includes(privacyCanonical), "machine and editorial surfaces must cite the privacy-workflow guide");
}
assert.ok(vercel.includes(`"/${privacySlug}"`), "clean privacy-guide route must resolve to HTML");
assert.ok(privacyHtml.includes(natalCanonical), "the privacy guide must link to the practical natal-chart guide");
assert.ok(natalHtml.includes(privacyCanonical), "the practical natal guide must link to the privacy guide");

console.log("✓ Astral guides align HTML, Markdown and discovery surfaces");
