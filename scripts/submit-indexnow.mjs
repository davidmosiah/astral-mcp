#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const site = "https://astral.delx.ai";
const key = "6ae1909c506740969d86bd8f617e8d62";
const endpoint = "https://api.indexnow.org/indexnow";
const keyLocation = `${site}/${key}.txt`;

export function parseSitemapUrls(xml) {
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((value) => {
      try {
        return new URL(value).origin === site;
      } catch {
        return false;
      }
    });

  return [...new Set(urls)];
}

export function buildIndexNowPayload({ urls, key: payloadKey }) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error("IndexNow payload requires at least one canonical URL");
  }
  if (urls.some((url) => new URL(url).origin !== site)) {
    throw new Error("IndexNow payload may contain only Astral URLs");
  }

  return {
    host: new URL(site).hostname,
    key: payloadKey,
    keyLocation: `${site}/${payloadKey}.txt`,
    urlList: [...new Set(urls)],
  };
}

export async function submitIndexNow({ payload, fetchImpl = fetch }) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const accepted = [200, 202].includes(response.status);

  if (!accepted) {
    const responseBody = await response.text();
    throw new Error(
      `IndexNow rejected submission: HTTP ${response.status}${responseBody ? ` — ${responseBody}` : ""}`,
    );
  }

  return {
    host: payload.host,
    submitted: payload.urlList.length,
    status: response.status,
    accepted,
    note: "Accepted by IndexNow. Acceptance does not guarantee indexing.",
  };
}

async function fetchCanonicalUrls(fetchImpl = fetch) {
  const response = await fetchImpl(`${site}/sitemap.xml`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to fetch Astral sitemap: HTTP ${response.status}`);

  const urls = parseSitemapUrls(await response.text());
  if (urls.length === 0) throw new Error("Astral sitemap did not contain canonical URLs");
  return urls;
}

async function verifyPublishedKey(fetchImpl = fetch) {
  const response = await fetchImpl(keyLocation, { cache: "no-store" });
  if (!response.ok) throw new Error(`Published IndexNow key is unavailable: HTTP ${response.status}`);
  if ((await response.text()).trim() !== key) throw new Error("Published IndexNow key does not match");
}

async function main() {
  const urls = await fetchCanonicalUrls();
  const payload = buildIndexNowPayload({ urls, key });

  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ ...payload, submitted: urls.length }, null, 2));
    return;
  }

  await verifyPublishedKey();
  console.log(JSON.stringify(await submitIndexNow({ payload }), null, 2));
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entrypoint) {
  await main();
}
