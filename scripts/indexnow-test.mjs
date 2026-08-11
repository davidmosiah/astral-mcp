import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const key = "6ae1909c506740969d86bd8f617e8d62";

test("publishes an Astral-specific IndexNow key and canonical payload", async () => {
  await assert.doesNotReject(
    access(new URL(`docs/${key}.txt`, root)),
    "Astral must publish its own IndexNow key at the domain root",
  );
  await assert.doesNotReject(
    access(new URL("scripts/submit-indexnow.mjs", root)),
    "Astral must provide an IndexNow submission command",
  );

  const [{ buildIndexNowPayload, parseSitemapUrls }, keyFile, pkg] = await Promise.all([
    import(new URL("scripts/submit-indexnow.mjs", root)),
    readFile(new URL(`docs/${key}.txt`, root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  const urls = parseSitemapUrls(`
    <urlset>
      <url><loc>https://astral.delx.ai/</loc></url>
      <url><loc>https://astral.delx.ai/guides/what-is-an-astrology-mcp-server</loc></url>
      <url><loc>https://astral.delx.ai/guides/what-is-an-astrology-mcp-server</loc></url>
      <url><loc>https://example.com/not-astral</loc></url>
    </urlset>
  `);

  assert.equal(keyFile.trim(), key);
  assert.deepEqual(urls, [
    "https://astral.delx.ai/",
    "https://astral.delx.ai/guides/what-is-an-astrology-mcp-server",
  ]);
  assert.deepEqual(buildIndexNowPayload({ urls, key }), {
    host: "astral.delx.ai",
    key,
    keyLocation: `https://astral.delx.ai/${key}.txt`,
    urlList: urls,
  });
  assert.match(pkg, /"discovery:indexnow": "node scripts\/submit-indexnow\.mjs"/);
});

test("reports accepted Astral notifications without claiming indexing", async () => {
  await assert.doesNotReject(
    access(new URL("scripts/submit-indexnow.mjs", root)),
    "Astral must provide an IndexNow submission command",
  );
  const { submitIndexNow } = await import(new URL("scripts/submit-indexnow.mjs", root));
  const payload = {
    host: "astral.delx.ai",
    key,
    keyLocation: `https://astral.delx.ai/${key}.txt`,
    urlList: ["https://astral.delx.ai/"],
  };
  const requests = [];

  const receipt = await submitIndexNow({
    payload,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return new Response("", { status: 200 });
    },
  });

  assert.equal(requests[0].url, "https://api.indexnow.org/indexnow");
  assert.deepEqual(JSON.parse(requests[0].options.body), payload);
  assert.deepEqual(receipt, {
    host: "astral.delx.ai",
    submitted: 1,
    status: 200,
    accepted: true,
    note: "Accepted by IndexNow. Acceptance does not guarantee indexing.",
  });
});
