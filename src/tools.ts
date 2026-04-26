import type { JsonValue, ToolCallResult } from "./protocol.js";
import { jsonTextResult } from "./protocol.js";
import type { VestigeClient } from "./vestige-client.js";
import { AHAGRAPH_VERSION } from "./version.js";

type Args = Record<string, JsonValue>;
type JsonObject = Record<string, JsonValue>;

const MAX_SHORT_TEXT = 240;
const MAX_MEDIUM_TEXT = 1_000;
const MAX_LONG_TEXT = 8_000;
const AHAGRAPH_CONTEXT = ["ahagraph"];
const AHAGRAPH_NODE_COLORS = {
  aha: "gold",
  confusion: "red",
  failure: "gray",
  learning: "blue"
} as const;

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
    name: "profile",
    description:
      "Build a learner profile from remembered aha moments, confusions, and failure guardrails.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Optional topic to focus the learner profile." },
        limit: { type: "integer", minimum: 1, maximum: 10, default: 5 }
      }
    }
  },
  {
    name: "synthesis",
    description:
      "Produce a teaching-ready synthesis: what clicked, what to avoid, what to test, and how to explain this next.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Current concept, library, language, or repo area." },
        task: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "What the developer is trying to do." },
        depth: { type: "string", enum: ["quick", "normal", "deep"], default: "normal" },
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
    name: "share_aha_card",
    description:
      "Draft a public-safe share card for an aha moment, ready for LinkedIn, X, docs, or a demo overlay.",
    inputSchema: {
      type: "object",
      properties: {
        concept: { type: "string", maxLength: MAX_SHORT_TEXT, description: "The concept the card should make memorable." },
        public_aha: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "Optional public-safe restatement to use instead of private memory text." },
        angle: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Optional hook or audience angle." },
        audience: { type: "string", enum: ["developers", "beginners", "teams", "public"], default: "developers" },
        format: { type: "string", enum: ["markdown", "html", "json"], default: "markdown" }
      },
      required: ["concept"]
    }
  },
  {
    name: "teach_differently",
    description:
      "Live mode for changing the teaching strategy when an explanation is not landing.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Concept being taught right now." },
        goal: { type: "string", maxLength: MAX_MEDIUM_TEXT, description: "What the developer needs to do with the concept." },
        current_explanation: { type: "string", maxLength: MAX_LONG_TEXT, description: "Explanation that just failed, partially worked, or clicked." },
        learner_signal: {
          type: "string",
          enum: ["still_confused", "too_abstract", "too_fast", "needs_example", "bored", "clicked", "wrong_level"],
          default: "still_confused"
        },
        remember_attempt: { type: "boolean", default: true },
        limit: { type: "integer", minimum: 1, maximum: 5, default: 3 }
      },
      required: ["topic"]
    }
  },
  {
    name: "learning_velocity",
    description:
      "Estimate learning velocity from aha, confusion, failure, review, and timeline signals in Vestige.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", maxLength: MAX_SHORT_TEXT, description: "Optional topic to measure." },
        window_days: { type: "integer", minimum: 1, maximum: 365, default: 30 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 }
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
      case "profile":
        return jsonTextResult(await profile(runtime, rawArgs));
      case "synthesis":
        return jsonTextResult(await synthesis(runtime, rawArgs));
      case "transfer":
        return jsonTextResult(await transfer(runtime, rawArgs));
      case "confusion_history":
        return jsonTextResult(await confusionHistory(runtime, rawArgs));
      case "due_for_review":
        return jsonTextResult(await dueForReview(runtime, rawArgs));
      case "graph":
        return jsonTextResult(await graph(runtime, rawArgs));
      case "share_aha_card":
        return jsonTextResult(await shareAhaCard(runtime, rawArgs));
      case "teach_differently":
        return jsonTextResult(await teachDifferently(runtime, rawArgs));
      case "learning_velocity":
        return jsonTextResult(await learningVelocity(runtime, rawArgs));
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
    query: safeSearchQuery(query),
    limit,
    detail_level: "summary",
    include_types: ["concept"],
    context_topics: safeContextTopics([...AHAGRAPH_CONTEXT, "aha", "analogy", "learning"]),
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
    search(runtime, baseQuery, limit, ["concept"], compact([...AHAGRAPH_CONTEXT, "aha", "analogy", topic])),
    search(runtime, `${baseQuery} confusion weak spot misunderstanding misconception`, limit, ["note", "concept"], compact([...AHAGRAPH_CONTEXT, "confusion", "weak-spot", topic])),
    search(runtime, `${baseQuery} bug failure mistake regression guardrail previous`, limit, ["fact", "pattern", "decision", "note"], compact([...AHAGRAPH_CONTEXT, "failure", "bug", "guardrail", topic]))
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

async function profile(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = optionalString(args, "topic", MAX_SHORT_TEXT);
  const limit = boundedLimit(args, 5, 10);
  const scope = topic ?? "developer learning";

  const [aha, confusions, failures, health] = await Promise.all([
    search(runtime, `${scope} aha analogy what clicked`, limit, ["concept"], compact([...AHAGRAPH_CONTEXT, "aha", topic])),
    search(
      runtime,
      `${scope} confusion weak spot misunderstanding misconception`,
      limit,
      ["note", "concept"],
      compact([...AHAGRAPH_CONTEXT, "confusion", "weak-spot", topic])
    ),
    search(
      runtime,
      `${scope} failure bug mistake guardrail repeated`,
      limit,
      ["pattern", "note", "decision", "fact"],
      compact([...AHAGRAPH_CONTEXT, "failure", "guardrail", topic])
    ),
    runtime.vestige.callTool("memory_health", {})
  ]);

  return {
    ok: true,
    ahagraphTool: "profile",
    delegatedTo: ["vestige.search", "vestige.memory_health"],
    topic: topic ?? null,
    learnerProfile: {
      headline: topic
        ? `How this developer learns ${topic}.`
        : "How this developer learns technical concepts.",
      teachingPreferences: [
        "Start from remembered aha moments before using a generic definition.",
        "Prefer concrete analogies and worked examples when prior memories show they helped.",
        "Use confusions as first-class requirements for the explanation, not as afterthoughts."
      ],
      riskModel: [
        "Repeated confusions indicate the explanation should change shape, not just repeat louder.",
        "Failure memories become pre-flight checks before code or architecture advice.",
        "Memory health and review signals should decide what to refresh before teaching something adjacent."
      ],
      assistantRules: [
        "Say which remembered aha you are using.",
        "Name the likely misconception before giving the fix.",
        "End with a teach-back question that tests the exact weak spot."
      ]
    },
    vestige: {
      aha,
      confusions,
      failures,
      health
    }
  };
}

async function synthesis(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = requireString(args, "topic", MAX_SHORT_TEXT);
  const task = requireString(args, "task", MAX_MEDIUM_TEXT);
  const depth = optionalEnum(args, "depth", ["quick", "normal", "deep"]) ?? "normal";
  const limit = boundedLimit(args, 3, 5);

  const [briefing, learnerProfile, review] = await Promise.all([
    brief(runtime, { topic, task, limit }),
    profile(runtime, { topic, limit }),
    dueForReview(runtime, { topic, limit })
  ]);

  return {
    ok: true,
    ahagraphTool: "synthesis",
    delegatedTo: ["ahagraph.brief", "ahagraph.profile", "ahagraph.due_for_review"],
    topic,
    task,
    depth,
    synthesis: {
      purpose:
        "Turn Vestige memory into a teaching plan that adapts to this developer instead of explaining from scratch.",
      beforeExplaining: [
        "Recall what has already clicked.",
        "Check recurring confusion and stale review candidates.",
        "Pick the smallest example that tests the weak spot."
      ],
      teachingPlan: synthesisSteps(depth),
      outputContract: {
        startWith: "A remembered mental model or analogy.",
        avoid: "Repeating an explanation that already failed.",
        proveItWorked: "Ask for a one-sentence teach-back or tiny implementation.",
        storeAfter: "Capture the new aha, confusion, or failure pattern."
      }
    },
    evidence: {
      briefing,
      learnerProfile,
      review
    }
  };
}

async function transfer(runtime: Runtime, args: Args): Promise<JsonValue> {
  const fromConcept = requireString(args, "from_concept", MAX_SHORT_TEXT);
  const toConcept = requireString(args, "to_concept", MAX_SHORT_TEXT);
  const limit = boundedLimit(args, 3, 5);

  const [fromMemories, toMemories, unlockedMemories] = await Promise.all([
    search(runtime, fromConcept, limit, ["concept", "note", "pattern"], compact([...AHAGRAPH_CONTEXT, "aha", fromConcept])),
    search(runtime, toConcept, limit, ["concept", "note", "pattern"], compact([...AHAGRAPH_CONTEXT, "learning", toConcept])),
    search(runtime, fromConcept, limit, ["concept"], compact([...AHAGRAPH_CONTEXT, "aha", `unlocks:${tagValue(toConcept)}`]))
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
      unlockedMemories,
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
      compact([...AHAGRAPH_CONTEXT, "confusion", "weak-spot", topic]),
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
      query: safeSearchQuery(query),
      limit,
      detail_level: "full",
      include_types: ["concept", "note", "pattern"],
      context_topics: safeContextTopics(compact([...AHAGRAPH_CONTEXT, "aha", "confusion", topic])),
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
  const resolvedCenterId = centerId ?? (query ? await resolveGraphCenterId(runtime, query) : undefined);

  const vestige = await runtime.vestige.callTool("memory_graph", {
    ...(resolvedCenterId ? { center_id: resolvedCenterId } : {}),
    depth,
    max_nodes: maxNodes
  });

  return {
    ok: true,
    ahagraphTool: "graph",
    delegatedTo: resolvedCenterId ? ["vestige.search", "vestige.memory_graph"] : "vestige.memory_graph",
    query: query ?? null,
    centerId: resolvedCenterId ?? null,
    dashboardUrl: dashboardUrl(),
    visualLegend: {
      aha: { color: "gold", meaning: "What made a concept click." },
      confusion: { color: "red", meaning: "A weak spot or misconception." },
      failure: { color: "gray", meaning: "A repeated bug, mistake, or guardrail." }
    },
    graph: annotateGraph(vestige)
  };
}

async function resolveGraphCenterId(runtime: Runtime, query: string): Promise<string | undefined> {
  const ahaResult = await runtime.vestige.callTool("search", {
    query: safeSearchQuery(`${query} aha analogy what clicked`),
    limit: 5,
    detail_level: "brief",
    include_types: ["concept"],
    context_topics: safeContextTopics([...AHAGRAPH_CONTEXT, "aha", "analogy", "learning"]),
    retrieval_mode: "balanced"
  });
  const ahaId = extractFirstMemoryIdWithTag(ahaResult, "aha") ?? extractFirstMemoryId(ahaResult);
  if (ahaId) return ahaId;

  const fallbackResult = await runtime.vestige.callTool("search", {
    query: safeSearchQuery(query),
    limit: 1,
    detail_level: "brief",
    include_types: ["concept", "note", "pattern"],
    context_topics: safeContextTopics([...AHAGRAPH_CONTEXT, "aha", "confusion", "failure", "learning"]),
    retrieval_mode: "balanced"
  });
  return extractFirstMemoryId(fallbackResult);
}

async function shareAhaCard(runtime: Runtime, args: Args): Promise<JsonValue> {
  const concept = requireString(args, "concept", MAX_SHORT_TEXT);
  const publicAha = optionalString(args, "public_aha", MAX_MEDIUM_TEXT);
  const angle = optionalString(args, "angle", MAX_SHORT_TEXT);
  const audience = optionalEnum(args, "audience", ["developers", "beginners", "teams", "public"]) ?? "developers";
  const format = optionalEnum(args, "format", ["markdown", "html", "json"]) ?? "markdown";

  const evidence = await search(
    runtime,
    `${concept} aha analogy what clicked`,
    3,
    ["concept"],
    compact([...AHAGRAPH_CONTEXT, "aha", concept]),
    "full"
  );
  const snippets = extractMemorySnippets(evidence, 3);
  const ahaLine =
    publicAha ??
    snippets[0] ??
    `The breakthrough was connecting ${concept} to a concrete mental model the developer already understood.`;
  const hook = angle ?? `The explanation that finally made ${concept} click.`;
  const title = `The ${concept} aha`;
  const markdown = [
    `## ${escapeMarkdown(title)}`,
    "",
    escapeMarkdown(hook),
    "",
    `**What clicked:** ${escapeMarkdown(ahaLine)}`,
    "",
    `**Why it matters:** AhaGraph remembers the explanation that worked, then Vestige makes it reusable across future coding sessions.`,
    "",
    "Powered by AhaGraph + Vestige."
  ].join("\n");
  const html = [
    `<article class="ahagraph-card" data-audience="${escapeHtml(audience)}">`,
    `  <p class="eyebrow">AhaGraph</p>`,
    `  <h1>${escapeHtml(title)}</h1>`,
    `  <p class="hook">${escapeHtml(hook)}</p>`,
    `  <p><strong>What clicked:</strong> ${escapeHtml(ahaLine)}</p>`,
    "  <p><strong>Why it matters:</strong> AhaGraph remembers the explanation that worked; Vestige makes it reusable.</p>",
    "  <footer>Powered by AhaGraph + Vestige</footer>",
    "</article>"
  ].join("\n");

  return {
    ok: true,
    ahagraphTool: "share_aha_card",
    delegatedTo: "vestige.search",
    concept,
    audience,
    preferredFormat: format,
    reviewRequired: publicAha === undefined,
    card: {
      title,
      hook,
      whatClicked: ahaLine,
      markdown,
      html,
      json: {
        product: "AhaGraph",
        concept,
        hook,
        whatClicked: ahaLine,
        poweredBy: "Vestige"
      }
    },
    privacy:
      "Review before posting. If public_aha was omitted, the draft may be based on private memory evidence.",
    evidenceSnippets: snippets
  };
}

async function teachDifferently(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = requireString(args, "topic", MAX_SHORT_TEXT);
  const goal = optionalString(args, "goal", MAX_MEDIUM_TEXT);
  const currentExplanation = optionalString(args, "current_explanation", MAX_LONG_TEXT);
  const learnerSignal =
    optionalEnum(args, "learner_signal", [
      "still_confused",
      "too_abstract",
      "too_fast",
      "needs_example",
      "bored",
      "clicked",
      "wrong_level"
    ]) ?? "still_confused";
  const rememberAttempt = optionalBoolean(args, "remember_attempt") ?? Boolean(currentExplanation);
  const limit = boundedLimit(args, 3, 5);

  const attemptMemoryPromise =
    rememberAttempt && currentExplanation
      ? runtime.vestige.callTool("smart_ingest", {
          content: compact([
            "AhaGraph live teaching attempt",
            `Topic: ${topic}`,
            goal ? `Goal: ${goal}` : undefined,
            `Learner signal: ${learnerSignal}`,
            `Explanation tried: ${currentExplanation}`
          ]).join("\n"),
          node_type: learnerSignal === "clicked" ? "concept" : "note",
          tags: compact([
            "ahagraph",
            "teach-differently",
            learnerSignal === "clicked" ? "aha" : "confusion",
            `topic:${tagValue(topic)}`,
            `signal:${learnerSignal}`
          ])
        })
      : Promise.resolve(null);

  const [aha, confusions, failures, attemptMemory] = await Promise.all([
    search(runtime, `${topic} aha analogy what clicked`, limit, ["concept"], compact([...AHAGRAPH_CONTEXT, "aha", topic])),
    search(
      runtime,
      `${topic} confusion weak spot misunderstanding misconception`,
      limit,
      ["note", "concept"],
      compact([...AHAGRAPH_CONTEXT, "confusion", "weak-spot", topic])
    ),
    search(
      runtime,
      `${topic} failure bug mistake guardrail`,
      limit,
      ["pattern", "note", "decision", "fact"],
      compact([...AHAGRAPH_CONTEXT, "failure", "guardrail", topic])
    ),
    attemptMemoryPromise
  ]);

  return {
    ok: true,
    ahagraphTool: "teach_differently",
    delegatedTo: ["vestige.search", "vestige.smart_ingest"],
    topic,
    goal: goal ?? null,
    learnerSignal,
    liveMode: {
      directive: "Do not explain the same way twice. Change the teaching move based on the learner signal.",
      nextMove: teachingMoveForSignal(learnerSignal),
      sequence: [
        "Anchor on one remembered aha or analogy if available.",
        "Name the specific confusion the new explanation is designed to avoid.",
        "Use a tiny concrete example before abstract language.",
        "Ask one teach-back question and store the result as aha, confusion, or failure."
      ]
    },
    evidence: {
      aha,
      confusions,
      failures,
      attemptMemory: attemptMemory ?? null
    }
  };
}

async function learningVelocity(runtime: Runtime, args: Args): Promise<JsonValue> {
  const topic = optionalString(args, "topic", MAX_SHORT_TEXT);
  const windowDays = Math.max(1, Math.min(365, Math.floor(optionalNumber(args, "window_days") ?? 30)));
  const limit = Math.max(1, Math.min(50, Math.floor(optionalNumber(args, "limit") ?? 20)));
  const scope = topic ?? "developer learning";

  const [aha, confusions, failures, review, timeline, health] = await Promise.all([
    search(runtime, `${scope} aha analogy what clicked`, limit, ["concept"], compact([...AHAGRAPH_CONTEXT, "aha", topic])),
    search(
      runtime,
      `${scope} confusion weak spot misunderstanding misconception`,
      limit,
      ["note", "concept"],
      compact([...AHAGRAPH_CONTEXT, "confusion", "weak-spot", topic])
    ),
    search(
      runtime,
      `${scope} failure bug mistake guardrail repeated`,
      limit,
      ["pattern", "note", "decision", "fact"],
      compact([...AHAGRAPH_CONTEXT, "failure", "guardrail", topic])
    ),
    dueForReview(runtime, topic ? { topic, limit: Math.min(10, limit) } : { limit: Math.min(10, limit) }),
    runtime.vestige.callTool("memory_timeline", {
      tags: ["ahagraph"],
      limit,
      detail_level: "summary"
    }),
    runtime.vestige.callTool("memory_health", {})
  ]);

  const counts = {
    aha: countResults(aha),
    confusions: countResults(confusions),
    failures: countResults(failures),
    timelineEvents: countResults(timeline),
    reviewCandidates: countResultsFromPath(review, ["vestige", "candidates"])
  };
  const totalLearningSignals = counts.aha + counts.confusions + counts.failures;
  const velocityScore = totalLearningSignals === 0
    ? 0
    : clampScore(Math.round(((counts.aha * 2 - counts.confusions - counts.failures) / totalLearningSignals) * 50 + 50));
  const momentum =
    velocityScore >= 75 ? "accelerating" : velocityScore >= 45 ? "active but uneven" : velocityScore > 0 ? "blocked" : "insufficient data";

  return {
    ok: true,
    ahagraphTool: "learning_velocity",
    delegatedTo: ["vestige.search", "vestige.memory_timeline", "vestige.memory_health", "ahagraph.due_for_review"],
    topic: topic ?? null,
    windowDays,
    metrics: {
      scope,
      sampledSignals: counts,
      velocityScore,
      momentum,
      ahaToConfusionRatio: ratio(counts.aha, counts.confusions),
      failurePressure: ratio(counts.failures, Math.max(1, totalLearningSignals)),
      interpretation:
        "This is a demo-ready estimate from retrieved AhaGraph memories, not a complete analytics warehouse count."
    },
    recommendations: [
      counts.confusions > counts.aha
        ? "Turn the most repeated confusion into a live teach_differently session."
        : "Convert the strongest aha into a share_aha_card while it is fresh.",
      counts.reviewCandidates > 0
        ? "Run due_for_review before teaching adjacent concepts."
        : "Capture more aha/confusion events to build a stronger retention curve.",
      counts.failures > 0
        ? "Promote repeated failures into guardrails inside brief and synthesis."
        : "Keep capturing failure patterns; they are high-leverage teaching constraints."
    ],
    evidence: {
      aha,
      confusions,
      failures,
      review,
      timeline,
      health
    }
  };
}

async function status(runtime: Runtime): Promise<JsonValue> {
  const vestige = await runtime.vestige.listTools();
  return {
    ok: true,
    ahagraph: {
      name: "ahagraph",
      version: AHAGRAPH_VERSION,
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
    query: safeSearchQuery(query),
    limit,
    detail_level: detailLevel,
    include_types: includeTypes,
    context_topics: safeContextTopics(contextTopics),
    retrieval_mode: "balanced",
    token_budget: 2_500
  });
}

function safeSearchQuery(value: string): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>{}\[\]()"`'$\\|;&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MEDIUM_TEXT);
  return cleaned || "ahagraph learning";
}

function safeContextTopics(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, MAX_SHORT_TEXT));
}

function dashboardUrl(): string {
  const rawPort = process.env.VESTIGE_DASHBOARD_PORT ?? "3937";
  const port = /^\d{1,5}$/.test(rawPort) ? rawPort : "3937";
  return `http://localhost:${port}/dashboard?colorMode=ahagraph`;
}

function extractFirstMemoryId(value: JsonValue): string | undefined {
  const payload = unwrapToolPayload(value);
  if (!isObject(payload)) return undefined;
  const results = payload.results;
  if (!Array.isArray(results)) return undefined;
  for (const item of results) {
    if (isObject(item) && typeof item.id === "string") {
      return item.id;
    }
  }
  return undefined;
}

function extractFirstMemoryIdWithTag(value: JsonValue, tag: string): string | undefined {
  const payload = unwrapToolPayload(value);
  if (!isObject(payload)) return undefined;
  const results = payload.results;
  if (!Array.isArray(results)) return undefined;
  for (const item of results) {
    if (!isObject(item) || typeof item.id !== "string") continue;
    if (stringArray(item.tags).includes(tag)) return item.id;
  }
  return undefined;
}

function annotateGraph(value: JsonValue): JsonValue {
  const payload = unwrapToolPayload(value);
  if (!isObject(payload) || !Array.isArray(payload.nodes)) return payload;
  return {
    ...payload,
    nodes: payload.nodes.map((node) => {
      if (!isObject(node)) return node;
      const kind = classifyNode(node);
      return {
        ...node,
        ahagraphKind: kind,
        ahagraphColor: AHAGRAPH_NODE_COLORS[kind]
      };
    })
  };
}

function unwrapToolPayload(value: JsonValue): JsonValue {
  if (!isObject(value) || !Array.isArray(value.content)) return value;
  const text = value.content
    .map((item) => (isObject(item) && typeof item.text === "string" ? item.text : ""))
    .join("\n")
    .trim();
  if (!text) return value;
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return text;
  }
}

function classifyNode(node: JsonObject): keyof typeof AHAGRAPH_NODE_COLORS {
  const tags = stringArray(node.tags).map((tag) => tag.toLowerCase());
  if (tags.includes("aha")) return "aha";
  if (tags.includes("confusion") || tags.includes("weak-spot")) return "confusion";
  if (tags.includes("failure") || tags.includes("guardrail")) return "failure";
  return "learning";
}

function synthesisSteps(depth: "quick" | "normal" | "deep"): string[] {
  if (depth === "quick") {
    return [
      "Use the strongest remembered analogy.",
      "Point at one likely confusion.",
      "Ask one check question."
    ];
  }
  if (depth === "deep") {
    return [
      "Start with the developer's prior aha and explain why it transfers.",
      "Map the new concept onto that model, then name exactly where the analogy breaks.",
      "Surface recurring confusions and repeated failure patterns before code.",
      "Give a minimal worked example, then a contrasting non-example.",
      "End with a teach-back and store the result as the next graph node."
    ];
  }
  return [
    "Start from a remembered aha or analogy.",
    "Address the most likely confusion directly.",
    "Give one concrete example and one small test.",
    "Capture what clicked or what stayed confusing."
  ];
}

function teachingMoveForSignal(signal: string): JsonObject {
  switch (signal) {
    case "too_abstract":
      return {
        move: "Drop the definition and use a tiny concrete example first.",
        avoid: "More terminology.",
        check: "Ask the developer to predict the next line of code."
      };
    case "too_fast":
      return {
        move: "Break the explanation into one concept per step.",
        avoid: "Combining syntax, runtime behavior, and mental model in one pass.",
        check: "Ask which exact step stopped making sense."
      };
    case "needs_example":
      return {
        move: "Use a worked example and a near-miss counterexample.",
        avoid: "Explaining only with principles.",
        check: "Ask the developer to modify the example."
      };
    case "bored":
      return {
        move: "Tie the concept to a real bug, performance win, or tool they are building.",
        avoid: "Intro-level material they already know.",
        check: "Ask what they would ship differently with this model."
      };
    case "clicked":
      return {
        move: "Capture the aha and immediately test transfer to a nearby concept.",
        avoid: "Moving on without storing the breakthrough.",
        check: "Ask for the one-sentence mental model."
      };
    case "wrong_level":
      return {
        move: "Ask one calibration question, then choose beginner, working, or expert depth.",
        avoid: "Guessing the developer's level from the topic name.",
        check: "Ask them to rate the explanation as too basic, right, or too advanced."
      };
    default:
      return {
        move: "Change the explanation shape: analogy first, code second, definition last.",
        avoid: "Repeating the same wording.",
        check: "Ask for a teach-back in the developer's own words."
      };
  }
}

function extractMemorySnippets(value: JsonValue, max: number): string[] {
  const snippets: string[] = [];
  const seen = new Set<string>();

  for (const item of searchResultItems(value)) {
    const snippet = snippetFromValue(item);
    if (snippet && !seen.has(snippet)) {
      seen.add(snippet);
      snippets.push(snippet);
      if (snippets.length >= max) return snippets;
    }
  }

  collectSnippets(value, snippets, seen, max);
  return snippets.slice(0, max);
}

function searchResultItems(value: JsonValue): JsonValue[] {
  if (!isObject(value)) return [];
  for (const key of ["results", "matches", "items", "memories"]) {
    const items = value[key];
    if (Array.isArray(items)) return items;
  }
  return [];
}

function snippetFromValue(value: JsonValue): string | undefined {
  if (typeof value === "string") return cleanSnippet(value);
  if (!isObject(value)) return undefined;

  for (const key of ["content", "summary", "text", "memory", "description", "title"]) {
    const item = value[key];
    if (typeof item === "string") return cleanSnippet(item);
  }

  return undefined;
}

function collectSnippets(value: JsonValue, out: string[], seen: Set<string>, max: number): void {
  if (out.length >= max) return;
  if (typeof value === "string") {
    const snippet = cleanSnippet(value);
    if (snippet && !seen.has(snippet)) {
      seen.add(snippet);
      out.push(snippet);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSnippets(item, out, seen, max);
      if (out.length >= max) return;
    }
    return;
  }
  if (!isObject(value)) return;
  for (const key of ["content", "summary", "text", "memory", "description", "title", "results", "matches"]) {
    if (key in value) {
      collectSnippets(value[key], out, seen, max);
      if (out.length >= max) return;
    }
  }
}

function cleanSnippet(value: string): string | undefined {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length < 20) return undefined;
  return cleaned.length > 360 ? `${cleaned.slice(0, 357)}...` : cleaned;
}

function countResults(value: JsonValue): number {
  if (Array.isArray(value)) return value.length;
  if (!isObject(value)) return 0;
  for (const key of ["results", "matches", "items", "memories", "nodes", "events"]) {
    const items = value[key];
    if (Array.isArray(items)) return items.length;
  }
  return 0;
}

function countResultsFromPath(value: JsonValue, path: string[]): number {
  let cursor: JsonValue = value;
  for (const key of path) {
    if (!isObject(cursor)) return 0;
    cursor = cursor[key] ?? null;
  }
  return countResults(cursor);
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return numerator;
  return Math.round((numerator / denominator) * 100) / 100;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+.!|<>-])/g, "\\$1");
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

function optionalBoolean(args: Args, field: string): boolean | undefined {
  const value = args[field];
  return typeof value === "boolean" ? value : undefined;
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

function stringArray(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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
