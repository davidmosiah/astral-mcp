export const SERVER_NAME = "astral-mcp-server";
export const SERVER_VERSION = "0.1.0";
export const NPM_PACKAGE_NAME = "astral-mcp";
export const PINNED_NPM_PACKAGE = `${NPM_PACKAGE_NAME}@${SERVER_VERSION}`;
export const MCP_NAME = "io.github.davidmosiah/astral-mcp";

export const CREATOR = {
  name: "David Mosiah",
  github: "https://github.com/davidmosiah"
};

export const LINKS: Record<string, string> = {
  repo: "https://github.com/davidmosiah/astral-mcp",
  issues: "https://github.com/davidmosiah/astral-mcp/issues",
  npm: "https://www.npmjs.com/package/astral-mcp",
  creator: "https://github.com/davidmosiah"
};

// Ephemeris engines. The primary computes the chart; the verifier independently
// re-derives every planet position so each chart ships precision-audited.
export const PRIMARY_ENGINE = "circular-natal-horoscope-js";
export const PRIMARY_ENGINE_VERSION = "1.1.0";
export const VERIFIER_ENGINE = "astronomy-engine";
export const VERIFIER_ENGINE_VERSION = "2.1.19";

// Default tolerance (degrees) for the precision audit. A chart is "verified"
// only when every planet agrees with the verifier within this band and lands in
// the same sign.
export const DEFAULT_PRECISION_THRESHOLD = 1.25;
