import type { JsonValue, ToolCallResult } from "./protocol.js";
import { jsonTextResult } from "./protocol.js";
import type { VestigeClient } from "./vestige-client.js";

type Args = Record<string, JsonValue>;
type JsonObject = Record<string, JsonValue>;

const MAX_SHORT_TEXT = 240;
const MAX_MEDIUM_TEXT = 1_000;
const MAX_LONG_TEXT = 8_000;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonValue;
}

export interface Runtime {
  vestige: VestigeClient;
}

export const tools: ToolDefinition[] = [
  {
    name: "aha",
    description:
      "Capture the exact explanation, analogy, or reframing that made a code concept click.",
    inputSchema: {
      type: "object",
      properties: {
        concept: { type: "string", maxLength: MAX_SHORT_TEXT, description: "The concept that clicked." },
        what_clicked: { type: "string", maxLength: MAX_LONG_TEXT, description: "The explanation or mental model that worked." },
        analogy_used: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Optional named analogy, metaphor, or example." },
        unlocked: {
          type: "array",
          items: { type: "string", maxLength: MAX_SHORT_TEXT },
          maxItems: 8,
          description: "Optional concepts this aha now helps unlock."
        },
        source: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "Optional source, URL, repo, chat, or lesson." }
      },
      required: ["concept", "what_clicked"]
    }
  },
  {
    name: "recall",
    description:
      "Recall prior aha moments, analogies, and explanations that worked before.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "Concept, analogy, language, or learning problem to recall." },
        limit: { type: "integer", minimum: 1, maximum: 10, default: 5 }
      },
      required: ["query"]
    }
  },
  {
    name: "confusion",
    description:
      "Capture a weak spot or unresolved confusion as a first-class learning memory.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", maxLength: MAX_LONG_TEXT, description: "What is confusing or not yet understood." },
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Optional topic label." },
        why: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "Optional reason this is confusing." },
        source: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "Optional source, URL, repo, chat, or lesson." }
      },
      required: ["text"]
    }
  },
  {
    name: "failure",
    description:
      "Capture a repeated bug, mistake, or guardrail so the assistant can catch it before it happens again.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Area where the failure happens." },
        mistake: { type: "string", maxLength: MAX_LONG_TEXT, description: "The repeated mistake or failure pattern." },
        guardrail: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "What should be checked next time." },
        severity: { type: "string", enum: ["low", "medium", "high"], default: "medium" },
        source: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "Optional source, URL, repo, chat, or incident." }
      },
      required: ["topic", "mistake"]
    }
  },
  {
    name: "brief",
    description:
      "Prepare an AI assistant before it helps by recalling relevant aha moments, confusions, and prior failure patterns.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Current topic, library, language, repo area, or concept." },
        task: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "What the developer wants help with right now." },
        limit: { type: "integer", minimum: 1, maximum: 5, default: 3 }
      },
      required: ["topic", "task"]
    }
  },
  {
    name: "transfer",
    description:
      "Find analogical bridges from one concept/domain to another using Vestige search plus graph associations.",
    inputSchema: {
      type: "object",
      properties: {
        from_concept: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Concept or domain the developer already understands." },
        to_concept: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Concept or domain the developer is learning now." },
        limit: { type: "integer", minimum: 1, maximum: 5, default: 3 }
      },
      required: ["from_concept", "to_concept"]
    }
  },
  {
    name: "confusion_history",
    description:
      "Surface recurring confusion around a topic with semantic evidence and a chronological trail.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Topic to inspect for repeated confusion." },
        limit: { type: "integer", minimum: 1, maximum: 10, default: 8 }
      },
      required: ["topic"]
    }
  },
  {
    name: "due_for_review",
    description:
      "Find learning memories that should be replayed or tested soon, focused on AhaGraph aha/confusion memories.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Optional topic to review." },
        limit: { type: "integer", minimum: 1, maximum: 10, default: 5 }
      }
    }
  },
  {
    name: "graph",
    description:
      "Export the AhaGraph visualization data: aha, confusion, and failure memories with Vestige force-layout positions when available.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "Optional query to center the graph." },
        center_id: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Optional Vestige memory id to center the graph." },
        depth: { type: "integer", minimum: 1, maximum: 3, default: 2 },
        max_nodes: { type: "integer", minimum: 1, maximum: 200, default: 50 }
      }
    }
  },
  {
    name: "status",
    description: "Check whether AhaGraph can reach Vestige and list the backing memory tools.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

export async function callAhaGraphTool(
  runtime: Runtime,
  name: string,
  rawArgs: Args = {}
): Promise<ToolCallResult> {
  try {
    switch (name) {
      case "aha":
        return jsonTextResult(await captureAha(runtime, rawArgs));
      case "recall":
        return jsonTextResult(await recall(runtime, rawArgs));
      case "confusion":
        return jsonTextResult(await captureConfusion(runtime, rawArgs));
      case "failure":
        return jsonTextResult(await captureFailure(runtime, rawArgs));
      case "brief":
        return jsonTextResult(await brief(runtime, rawArgs));
      case "transfer":
        return jsonTextResult(await transfer(runtime, rawArgs));
      case "confusion_history":
        return jsonTextResult(await confusionHistory(runtime, rawArgs));
      case "due_for_review":
        return jsonTextResult(await dueForReview(runtime, rawArgs));
      case "graph":
        return jsonTextResult(await graph(runtime, rawArgs));
      case "status":
        return jsonTextResult(await status(runtime));
      default:
        return jsonTextResult({ ok: false, error: `Unknown AhaGraph tool: ${name}` }, true);
    }
  } catch (error) {
    return jsonTextResult(
      {
        ok: false,
        ahagraphTool: name,
        error: error instanceof Error ? error.message : String(error)
      },
      true
    );
  }
}

async function captureAha(runtime: Runtime, args: Args): Promise<JsonValue> {
  const concept = requireString(args, "concept", MAX_SHORT_TEXT);
  const whatClicked = requireString(args, "what_clicked", MAX_LONG_TEXT);
  const analogyUsed = optionalString(args, "analogy_used", MAX_SHORT_TEXT);
  const unlocked = optionalStringArray(args, "unlocked", MAX_SHORT_TEXT, 8);
  const source = optionalString(args, "source", MAX_MEDIUM_TEXT);

  const tags = compact([
    "ahagraph",
    "aha",
    "learning",
    "analogy",
    `concept:${tagValue(concept)}`,
    analogyUsed ? `analogy:${tagValue(analogyUsed)}` : undefined,
    ...unlocked.map((item) => `unlocks:${tagValue(item)}`)
  ]);

  const content = compact([
    "AhaGraph aha moment",
    `Concept: ${concept}`,
    `What clicked: ${whatClicked}`,
    analogyUsed ? `Analogy used: ${analogyUsed}` : undefined,
    unlocked.length ? `Unlocks: ${unlocked.join(", ")}` : undefined
  ]).join("\n");

  const vestige = await runtime.vestige.callTool("smart_ingest", {
    content,
    node_type: "concept",
    tags,
    source
  });

  return {
    ok: true,
    ahagraphTool: "aha",
    delegatedTo: "vestige.smart_ingest",
    tags,
    vestige
  };
}

async function recall(runtime: Runtime, args: Args): Promise<JsonValue> {
  const query = requireString(args, "query", MAX_MEDIUM_TEXT);
  const limit = boundedLimit(args, 5, 10);

  const vestige = await runtime.vestige.callTool("search", {
    query,
    limit,
    detail_level: "summary",
    include_types: ["concept"],
    context_topics: ["ahagraph", "pathfinder", "aha", "analogy", "learning"],
    retrieval_mode: "balanced"
  });

  return {
    ok: true,
    ahagraphTool: "recall",
    delegatedTo: "vestige.search",
    query,
    limit,
    vestige
  };
}

async function captureConfusion(runtime: Runtime, args: Args): Promise<JsonValue> {
  const text = requireString(args, "text", MAX_LONG_TEXT);
  const topic = optionalString(args, "topic", MAX_SHORT_TEXT);
  const why = optionalString(args, "why", MAX_MEDIUM_TEXT);
  const source = optionalString(args, "source", MAX_MEDIUM_TEXT);

  const tags = compact([
    "ahagraph",
    "confusion",
    "weak-spot",
    topic ? `topic:${tagValue(topic)}` : undefined
  ]);

  const content = compact([
    "AhaGraph confusion flag",
    topic ? `Topic: ${topic}` : undefined,
    `Confusion: ${text}`,
    why ? `Why: ${why}` : undefined
  ]).join("\n");

  const vestige = await runtime.vestige.callTool("smart_ingest", {
    content,
    node_type: "note",
    tags,
    source
  });

  return {
    ok: true,
    ahagraphTool: "confusion",
    delegatedTo: "vestige.smart_ingest",
    tags,
    vestige
  };
}

async function captureFailure(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = requireString(args, "topic", MAX_SHORT_TEXT);
  const mistake = requireString(args, "mistake", MAX_LONG_TEXT);
  const guardrail = optionalString(args, "guardrail", MAX_MEDIUM_TEXT);
  const severity = optionalEnum(args, "severity", ["low", "medium", "high"]) ?? "medium";
  const source = optionalString(args, "source", MAX_MEDIUM_TEXT);

  const tags = compact([
    "ahagraph",
    "failure",
    "guardrail",
    `topic:${tagValue(topic)}`,
    `severity:${severity}`
  ]);

  const content = compact([
    "AhaGraph failure pattern",
    `Topic: ${topic}`,
    `Mistake: ${mistake}`,
    guardrail ? `Guardrail: ${guardrail}` : undefined,
    `Severity: ${severity}`
  ]).join("\n");

  const vestige = await runtime.vestige.callTool("smart_ingest", {
    content,
    node_type: "pattern",
    tags,
    source
  });

  return {
    ok: true,
    ahagraphTool: "failure",
    delegatedTo: "vestige.smart_ingest",
    tags,
    vestige
  };
}

async function brief(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = requireString(args, "topic", MAX_SHORT_TEXT);
  const task = requireString(args, "task", MAX_MEDIUM_TEXT);
  const limit = boundedLimit(args, 3, 5);
  const baseQuery = `${topic} ${task}`;

  const [aha, confusions, failures] = await Promise.all([
    search(runtime, baseQuery, limit, ["concept"], ["ahagraph", "pathfinder", "aha", "analogy", topic]),
    search(runtime, `${baseQuery} confusion weak spot misunderstanding misconception`, limit, ["note", "concept"], ["ahagraph", "pathfinder", "confusion", "weak-spot", topic]),
    search(runtime, `${baseQuery} bug failure mistake regression guardrail previous`, limit, ["fact", "pattern", "decision", "note"], ["ahagraph", "pathfinder", "failure", "bug", "guardrail", topic])
  ]);

  return {
    ok: true,
    ahagraphTool: "brief",
    delegatedTo: "vestige.search",
    topic,
    task,
    briefing: {
      headline: `AhaGraph starts from this developer's learning graph for ${topic}.`,
      relevantAhaMoments: "Use these first if they fit; do not start with a generic explanation when a prior mental model worked.",
      knownConfusions: "Check these weak spots directly before assuming the developer has the prerequisite model.",
      previousFailurePatterns: "Call these out before offering code or a debugging path.",
      howToHelp: [
        "Start from the recalled mental model or analogy, then map it to the current task.",
        "Name remembered misconceptions explicitly and test them with a small concrete example.",
        "Turn repeated failures into a pre-flight checklist before implementation."
      ]
    },
    vestige: {
      aha,
      confusions,
      failures
    }
  };
}

async function transfer(runtime: Runtime, args: Args): Promise<JsonValue> {
  const fromConcept = requireString(args, "from_concept", MAX_SHORT_TEXT);
  const toConcept = requireString(args, "to_concept", MAX_SHORT_TEXT);
  const limit = boundedLimit(args, 3, 5);

  const [fromMemories, toMemories] = await Promise.all([
    search(runtime, fromConcept, limit, ["concept", "note", "pattern"], ["ahagraph", "pathfinder", "aha", fromConcept]),
    search(runtime, toConcept, limit, ["concept", "note", "pattern"], ["ahagraph", "pathfinder", "learning", toConcept])
  ]);

  const fromId = extractFirstMemoryId(fromMemories);
  const toId = extractFirstMemoryId(toMemories);
  const [associations, bridges] = await Promise.all([
    fromId
      ? runtime.vestige.callTool("explore_connections", { action: "associations", from: fromId, limit })
      : Promise.resolve(null),
    fromId && toId
      ? runtime.vestige.callTool("explore_connections", { action: "bridges", from: fromId, to: toId, limit })
      : Promise.resolve(null)
  ]);

  return {
    ok: true,
    ahagraphTool: "transfer",
    delegatedTo: ["vestige.search", "vestige.explore_connections"],
    fromConcept,
    toConcept,
    transferPrompt:
      `Use the remembered ${fromConcept} aha moments as analogies for ${toConcept}. ` +
      "Preserve the useful shape, then explicitly name where the analogy breaks.",
    evidence: {
      fromMemories,
      toMemories,
      associations,
      bridges
    }
  };
}

async function confusionHistory(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = requireString(args, "topic", MAX_SHORT_TEXT);
  const limit = boundedLimit(args, 8, 10);

  const [matches, timeline] = await Promise.all([
    search(
      runtime,
      `${topic} confusion weak spot misunderstanding misconception keeps getting wrong`,
      limit,
      ["note", "concept"],
      ["ahagraph", "pathfinder", "confusion", "weak-spot", topic],
      "full"
    ),
    runtime.vestige.callTool("memory_timeline", {
      tags: ["ahagraph", "confusion"],
      limit,
      detail_level: "summary"
    })
  ]);

  return {
    ok: true,
    ahagraphTool: "confusion_history",
    delegatedTo: ["vestige.search", "vestige.memory_timeline"],
    topic,
    archaeologyPrompt:
      `Look for the repeated shape in this ${topic} confusion history: what keeps failing, ` +
      "what almost clicked, and what explanation should be tried next.",
    vestige: {
      matches,
      timeline
    }
  };
}

async function dueForReview(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = optionalString(args, "topic", MAX_SHORT_TEXT);
  const limit = boundedLimit(args, 5, 10);
  const query = topic
    ? `${topic} aha analogy confusion weak spot learning`
    : "aha analogy confusion weak spot learning";

  const [candidates, health] = await Promise.all([
    runtime.vestige.callTool("search", {
      query,
      limit,
      detail_level: "full",
      include_types: ["concept", "note", "pattern"],
      context_topics: compact(["ahagraph", "pathfinder", "aha", "confusion", topic]),
      retrieval_mode: "balanced",
      token_budget: 4_000
    }),
    runtime.vestige.callTool("memory_health", {})
  ]);

  return {
    ok: true,
    ahagraphTool: "due_for_review",
    delegatedTo: ["vestige.search", "vestige.memory_health"],
    topic: topic ?? null,
    reviewPrompt:
      "Turn each candidate into an applied recall check: ask the developer to explain it back, compare against the stored aha, then repair drift.",
    vestige: {
      candidates,
      health
    }
  };
}

async function graph(runtime: Runtime, args: Args): Promise<JsonValue> {
  const query = optionalString(args, "query", MAX_MEDIUM_TEXT);
  const centerId = optionalString(args, "center_id", MAX_SHORT_TEXT);
  const depth = Math.max(1, Math.min(3, Math.floor(optionalNumber(args, "depth") ?? 2)));
  const maxNodes = Math.max(1, Math.min(200, Math.floor(optionalNumber(args, "max_nodes") ?? 50)));

  const vestige = await runtime.vestige.callTool("memory_graph", {
    ...(centerId ? { center_id: centerId } : { query: query ?? "ahagraph aha confusion failure learning" }),
    depth,
    max_nodes: maxNodes
  });

  return {
    ok: true,
    ahagraphTool: "graph",
    delegatedTo: "vestige.memory_graph",
    dashboardUrl: "http://localhost:3937/dashboard",
    visualLegend: {
      aha: { color: "gold", meaning: "What made a concept click." },
      confusion: { color: "red", meaning: "A weak spot or misconception." },
      failure: { color: "gray", meaning: "A repeated bug, mistake, or guardrail." }
    },
    graph: annotateGraph(vestige)
  };
}

async function status(runtime: Runtime): Promise<JsonValue> {
  const vestige = await runtime.vestige.listTools();
  return {
    ok: true,
    ahagraph: {
      name: "ahagraph",
      version: "0.1.0",
      tools: tools.map((tool) => tool.name)
    },
    vestige
  };
}

function search(
  runtime: Runtime,
  query: string,
  limit: number,
  includeTypes: string[],
  contextTopics: string[],
  detailLevel: "brief" | "summary" | "full" = "summary"
): Promise<JsonValue> {
  return runtime.vestige.callTool("search", {
    query,
    limit,
    detail_level: detailLevel,
    include_types: includeTypes,
    context_topics: contextTopics,
    retrieval_mode: "balanced",
    token_budget: 2_500
  });
}

function extractFirstMemoryId(value: JsonValue): string | undefined {
  if (!isObject(value)) return undefined;
  const results = value.results;
  if (!Array.isArray(results)) return undefined;
  for (const item of results) {
    if (isObject(item) && typeof item.id === "string") {
      return item.id;
    }
  }
  return undefined;
}

function annotateGraph(value: JsonValue): JsonValue {
  if (!isObject(value) || !Array.isArray(value.nodes)) return value;
  return {
    ...value,
    nodes: value.nodes.map((node) => {
      if (!isObject(node)) return node;
      const kind = classifyNode(node);
      return {
        ...node,
        ahagraphKind: kind,
        ahagraphColor: kind === "aha" ? "gold" : kind === "confusion" ? "red" : kind === "failure" ? "gray" : "blue"
      };
    })
  };
}

function classifyNode(node: JsonObject): string {
  const haystack = JSON.stringify(node).toLowerCase();
  if (haystack.includes("confusion") || haystack.includes("weak-spot")) return "confusion";
  if (haystack.includes("failure") || haystack.includes("guardrail") || haystack.includes("mistake")) return "failure";
  if (haystack.includes("aha") || haystack.includes("what clicked") || haystack.includes("analogy")) return "aha";
  return "learning";
}

function requireString(args: Args, field: string, maxLength: number): string {
  const value = args[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required string argument: ${field}`);
  }
  return validateLength(field, value.trim(), maxLength);
}

function optionalString(args: Args, field: string, maxLength: number): string | undefined {
  const value = args[field];
  return typeof value === "string" && value.trim().length > 0
    ? validateLength(field, value.trim(), maxLength)
    : undefined;
}

function optionalStringArray(args: Args, field: string, maxLength: number, maxItems: number): string[] {
  const value = args[field];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => validateLength(field, item.trim(), maxLength));
}

function optionalNumber(args: Args, field: string): number | undefined {
  const value = args[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalEnum<T extends string>(args: Args, field: string, allowed: readonly T[]): T | undefined {
  const value = optionalString(args, field, MAX_SHORT_TEXT);
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${field}: ${value}. Expected one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function boundedLimit(args: Args, fallback: number, max: number): number {
  const limit = optionalNumber(args, "limit") ?? fallback;
  return Math.max(1, Math.min(max, Math.floor(limit)));
}

function validateLength(field: string, value: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new Error(`${field} exceeds maximum length of ${maxLength} characters`);
  }
  return value;
}

function compact(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function tagValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function isObject(value: JsonValue): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
