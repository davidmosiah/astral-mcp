# Astral Birth-Data Privacy Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish a citable Astral guide answering how agents should minimize, route, and explain birth data when using an astrology MCP server.

**Architecture:** Add one canonical HTML article and a Markdown mirror under the existing static `docs/guides` tree. Reuse the current CSS and schema conventions (`TechArticle`, `HowTo`, `BreadcrumbList`, `FAQPage`), then align the home page, both `llms.txt` surfaces, README, sitemap and Vercel route. The guide will state the actual stateless/local-first behavior and the one optional OpenStreetMap egress without implying a privacy certification.

**Tech Stack:** Static HTML/Markdown, existing Astral CSS and Vercel static deployment, Node.js test scripts, TypeScript MCP runtime gates.

---

### Task 1: Write the failing SEO contract

**Files:**
- Modify: `scripts/seo-content-test.mjs`

**Step 1:** Assert the new canonical HTML/Markdown files, schema types, direct answer, privacy facts, sitemap entry, Vercel route, and links from both machine feeds, home and README.

**Step 2:** Run `npm run test:seo` and confirm it fails because the guide is absent.

### Task 2: Implement the article

**Files:**
- Create: `docs/guides/how-to-protect-birth-data-in-astrology-agent-workflows.html`
- Create: `docs/guides/how-to-protect-birth-data-in-astrology-agent-workflows.md`
- Modify: `docs/index.html`
- Modify: `docs/llms.txt`
- Modify: `llms.txt`
- Modify: `README.md`
- Modify: `docs/sitemap.xml`
- Modify: `vercel.json`

**Step 1:** Add the article with direct answer, five-step HowTo, FAQ, precision/privacy boundary and links to the existing two guides.

**Step 2:** Re-run `npm run test:seo` and confirm the contract passes.

### Task 3: Verify and publish

**Step 1:** Run `npm test`, `npm run test:seo`, and `git diff --check` without installing dependencies.

**Step 2:** Push the reviewed SHA, deploy the production alias `https://astral.delx.ai`, verify HTML/Markdown/sitemap/llms URLs and canonical markers over HTTPS, then submit IndexNow.

**Step 3:** Close the efficiency cycle and record the evidence in the shared SEO/GEO note.
