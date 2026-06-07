export type ResponseFormat = "markdown" | "json";

// Payload verbosity — a separate axis from ResponseFormat. ResponseFormat picks
// the wire shape (markdown text vs JSON text); PrivacyMode picks how much of the
// chart is returned, so an agent can trade completeness for token economy.
export type PrivacyMode = "summary" | "structured" | "full";

export interface ToolResponse extends Record<string, unknown> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}
