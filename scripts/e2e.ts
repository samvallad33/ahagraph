#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AHAGRAPH_VERSION } from "../src/version.js";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface PendingRequest {
  method: string;
  resolve: (value: JsonValue) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

const expectedTools = [
  "aha",
  "brief",
  "confusion",
  "confusion_history",
  "due_for_review",
  "failure",
  "graph",
  "learning_velocity",
  "profile",
  "recall",
  "share_aha_card",
  "status",
  "synthesis",
  "teach_differently",
  "transfer"
].sort();

const tempRoot = mkdtempSync(path.join(tmpdir(), "ahagraph-e2e-"));
const dataPath = path.join(tempRoot, "vestige.sqlite");
const dashboardPort = 54000 + (process.pid % 1000);
const httpPort = dashboardPort + 1;
const serverPath = fileURLToPath(new URL("../src/index.js", import.meta.url));
const keepDb = process.env.AHAGRAPH_E2E_KEEP_DB === "1";

assert.equal(existsSync(serverPath), true, `Compiled server not found at ${serverPath}. Run npm run build first.`);

async function runE2e(): Promise<void> {
  const client = new McpClient(serverPath, {
    ...process.env,
    VESTIGE_MCP_COMMAND: process.env.VESTIGE_MCP_COMMAND ?? "vestige-mcp",
    VESTIGE_MCP_ARGS: `--data-dir ${dataPath}`,
    VESTIGE_DASHBOARD_ENABLED: "true",
    VESTIGE_DASHBOARD_HOST: "127.0.0.1",
    VESTIGE_DASHBOARD_PORT: String(dashboardPort),
    VESTIGE_HTTP_ENABLED: "true",
    VESTIGE_HTTP_HOST: "127.0.0.1",
    VESTIGE_HTTP_PORT: String(httpPort),
    AHAGRAPH_CALL_TIMEOUT_MS: "30000"
  });

  try {
  const initialized = asObject(
    await client.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "ahagraph-e2e", version: "1.0.0" }
    })
  );
  const serverInfo = asObject(initialized.serverInfo);
  assert.equal(serverInfo.name, "ahagraph");
  assert.equal(serverInfo.version, AHAGRAPH_VERSION);

  const listed = asObject(await client.request("tools/list", {}));
  const toolNames = asArray(listed.tools).map((tool) => String(asObject(tool).name)).sort();
  assert.deepEqual(toolNames, expectedTools);

  const aha = await client.callTool("aha", {
    concept: "Rust ownership",
    what_clicked:
      "Ownership clicked when I treated each value like a library book with one borrower at a time.",
    analogy_used: "library checkout card",
    unlocked: ["Zig comptime", "Swift ARC"],
    source: "AhaGraph E2E fresh database"
  });
  assert.equal(aha.ok, true);
  assert.deepEqual(asArray(aha.tags).includes("aha"), true);
  assert.deepEqual(asArray(aha.tags).includes("unlocks:zig-comptime"), true);

  const confusion = await client.callTool("confusion", {
    topic: "React effects",
    text: "I keep mixing dependency arrays with render timing and stale closures.",
    why: "The re-render timeline feels invisible during debugging.",
    source: "AhaGraph E2E fresh database"
  });
  assert.equal(confusion.ok, true);
  assert.deepEqual(asArray(confusion.tags).includes("confusion"), true);

  const failure = await client.callTool("failure", {
    topic: "React intervals",
    mistake: "I rebuilt the interval on every render and created overlapping timers.",
    guardrail: "Treat effect cleanup as ownership transfer for side effects.",
    severity: "high",
    source: "AhaGraph E2E fresh database"
  });
  assert.equal(failure.ok, true);
  assert.deepEqual(asArray(failure.tags).includes("failure"), true);

  const recall = await client.callTool("recall", {
    query: "Rust ownership library checkout Zig comptime",
    limit: 5
  });
  assert.equal(recall.ok, true);
  assert.match(JSON.stringify(recall), /library book|ownership|Rust/i);

  const brief = await client.callTool("brief", {
    topic: "Zig comptime",
    task: "Teach this developer by starting from the Rust ownership aha",
    limit: 3
  });
  assert.equal(brief.ok, true);
  assert.equal(brief.topic, "Zig comptime");
  assert.match(JSON.stringify(brief), /Rust ownership|Zig comptime|AhaGraph/i);

  const profile = await client.callTool("profile", {
    topic: "systems programming",
    limit: 5
  });
  assert.equal(profile.ok, true);
  assert.ok(asObject(profile.learnerProfile).assistantRules);

  const synthesis = await client.callTool("synthesis", {
    topic: "Zig comptime",
    task: "Create a teaching plan from remembered aha moments",
    depth: "deep",
    limit: 3
  });
  assert.equal(synthesis.ok, true);
  assert.ok(asObject(synthesis.synthesis).outputContract);

  const transfer = await client.callTool("transfer", {
    from_concept: "Rust ownership",
    to_concept: "Zig comptime",
    limit: 3
  });
  assert.equal(transfer.ok, true);
  assert.match(String(transfer.transferPrompt), /Rust ownership.*Zig comptime/i);

  const confusionHistory = await client.callTool("confusion_history", {
    topic: "React effects",
    limit: 5
  });
  assert.equal(confusionHistory.ok, true);
  assert.match(JSON.stringify(confusionHistory), /React effects|dependency|closure/i);

  const review = await client.callTool("due_for_review", {
    topic: "Rust ownership",
    limit: 5
  });
  assert.equal(review.ok, true);
  assert.match(String(review.reviewPrompt), /applied recall/i);

  const shareMarkdown = await client.callTool("share_aha_card", {
    concept: "Rust ownership",
    public_aha: "Ownership clicked as x](https://evil.example/login)[click and then became useful for comptime.",
    format: "markdown"
  });
  assert.equal(shareMarkdown.ok, true);
  const markdown = String(asObject(shareMarkdown.card).markdown);
  assert.equal(markdown.includes("x](https://evil.example/login)[click"), false);
  assert.equal(markdown.includes("x\\]\\("), true);
  assert.equal(markdown.includes("login\\)\\[click"), true);

  const shareHtml = await client.callTool("share_aha_card", {
    concept: "React effects",
    public_aha: "<script>alert('x')</script> Effects clicked when cleanup felt like ownership.",
    format: "html"
  });
  assert.equal(shareHtml.ok, true);
  const htmlCard = String(asObject(shareHtml.card).html);
  assert.equal(htmlCard.includes("<script>"), false);
  assert.equal(htmlCard.includes("&lt;script&gt;"), true);

  const teachDifferently = await client.callTool("teach_differently", {
    topic: "React effects",
    goal: "Make stale closure timing click.",
    current_explanation: "Effects are lifecycle callbacks.",
    learner_signal: "still_confused",
    remember_attempt: true,
    limit: 3
  });
  assert.equal(teachDifferently.ok, true);
  assert.ok(asObject(teachDifferently.liveMode).nextMove);

  const velocity = await client.callTool("learning_velocity", {
    topic: "Rust ownership",
    window_days: 30,
    limit: 20
  });
  assert.equal(velocity.ok, true);
  assert.ok(asObject(velocity.metrics).velocityScore !== undefined);

  const graph = await client.callTool("graph", {
    query: "Rust ownership Zig comptime React effects React intervals",
    depth: 2,
    max_nodes: 30
  });
  assert.equal(graph.ok, true);
  assert.equal(graph.dashboardUrl, `http://localhost:${dashboardPort}/dashboard?colorMode=ahagraph`);
  assert.equal(graph.centerId !== null, true);
  const graphPayload = asObject(graph.graph);
  const graphNodes = asArray(graphPayload.nodes);
  assert.equal(graphNodes.length > 0, true);
  assert.equal(
    graphNodes.some((node) => {
      const item = asObject(node);
      return item.ahagraphKind === "aha" && item.ahagraphColor === "gold";
    }),
    true,
    "Expected at least one gold aha node in graph output"
  );

  const status = await client.callTool("status", {});
  assert.equal(status.ok, true);
  assert.equal(asObject(status.ahagraph).version, AHAGRAPH_VERSION);

  const invalid = await client.rawToolResult("confusion", { topic: "Missing text should fail" });
  assert.equal(invalid.isError, true);
  assert.match(toolText(invalid), /Missing required string argument: text/);

  const dashboardUrl = `http://127.0.0.1:${dashboardPort}/dashboard?colorMode=ahagraph`;
  await assertDashboardServedWithAhaGraphAssets(dashboardUrl);

  console.log(
    JSON.stringify(
      {
        ok: true,
        version: AHAGRAPH_VERSION,
        toolsExercised: expectedTools.length,
        database: dataPath,
        dashboardUrl,
        graphNodes: graphNodes.length,
        graphCenterId: graph.centerId
      },
      null,
      2
    )
  );
  } catch (error) {
    console.error(error instanceof Error ? error.stack : String(error));
    console.error(`Fresh E2E database kept for debugging: ${dataPath}`);
    process.exitCode = 1;
  } finally {
    await client.close();
    if (process.exitCode === undefined && !keepDb) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

class McpClient {
  private child: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private stdoutBuffer = "";
  private stderrBuffer = "";
  private stderrLines: string[] = [];
  private pending = new Map<number, PendingRequest>();

  constructor(serverPath: string, env: NodeJS.ProcessEnv) {
    this.child = spawn(process.execPath, [serverPath], {
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    this.child.stdout.on("data", (chunk: Buffer) => this.handleStdout(chunk.toString()));
    this.child.stderr.on("data", (chunk: Buffer) => this.handleStderr(chunk.toString()));
    this.child.on("exit", (code, signal) => {
      const error = new Error(
        `AhaGraph exited code=${code ?? "null"} signal=${signal ?? "null"}\n${this.stderrLines.join("\n")}`
      );
      this.rejectPending(error);
    });
  }

  request(method: string, params: JsonValue): Promise<JsonValue> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out\nRecent stderr:\n${this.stderrLines.join("\n")}`));
      }, 45_000);
      this.pending.set(id, { method, resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  async callTool(name: string, args: JsonValue): Promise<Record<string, JsonValue>> {
    const result = await this.rawToolResult(name, args);
    assert.equal(result.isError, undefined, `${name} failed: ${toolText(result)}`);
    return JSON.parse(toolText(result)) as Record<string, JsonValue>;
  }

  async rawToolResult(name: string, args: JsonValue): Promise<ToolResult> {
    const result = await this.request("tools/call", { name, arguments: args });
    return asToolResult(result);
  }

  async close(): Promise<void> {
    this.rejectPending(new Error("AhaGraph E2E client closed"));
    if (!this.child.killed) {
      this.child.stdin.end();
      this.child.kill("SIGTERM");
    }
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    let newlineIndex: number;
    while ((newlineIndex = this.stdoutBuffer.indexOf("\n")) >= 0) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) continue;

      let message: Record<string, JsonValue>;
      try {
        message = JSON.parse(line) as Record<string, JsonValue>;
      } catch {
        continue;
      }

      const id = typeof message.id === "number" ? message.id : undefined;
      if (id === undefined || !this.pending.has(id)) continue;

      const pending = this.pending.get(id)!;
      this.pending.delete(id);
      clearTimeout(pending.timer);

      if (message.error) {
        pending.reject(new Error(`${pending.method} failed: ${JSON.stringify(message.error)}`));
      } else {
        pending.resolve(message.result ?? null);
      }
    }
  }

  private handleStderr(chunk: string): void {
    this.stderrBuffer += chunk;
    let newlineIndex: number;
    while ((newlineIndex = this.stderrBuffer.indexOf("\n")) >= 0) {
      const line = this.stderrBuffer.slice(0, newlineIndex).trimEnd();
      this.stderrBuffer = this.stderrBuffer.slice(newlineIndex + 1);
      if (line) {
        this.stderrLines.push(line);
        if (this.stderrLines.length > 80) this.stderrLines.shift();
      }
    }
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

async function assertDashboardServedWithAhaGraphAssets(dashboardUrl: string): Promise<void> {
  const response = await fetch(dashboardUrl);
  assert.equal(response.ok, true, `Dashboard failed: ${response.status} ${response.statusText}`);
  const html = await response.text();
  assert.match(html, /_app\/immutable/);

  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)]
    .map((match) => match[1])
    .filter((value, index, list) => list.indexOf(value) === index);
  assert.equal(assetPaths.length > 0, true, "No dashboard JavaScript assets found");

  const assetTexts = await fetchJavaScriptAssetGraph(dashboardUrl, assetPaths);
  const bundle = assetTexts.join("\n");
  assert.match(bundle, /AhaGraph/);
  assert.match(bundle, /colorMode/);
  assert.match(bundle, /#FFD700|FFD700/);
  assert.match(bundle, /#EF4444|EF4444/);
  assert.match(bundle, /#9CA3AF|9CA3AF/);
}

async function fetchJavaScriptAssetGraph(baseUrl: string, initialPaths: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const queue = initialPaths.map((assetPath) => new URL(assetPath, baseUrl).toString());
  const texts: string[] = [];

  while (queue.length > 0) {
    const assetUrl = queue.shift()!;
    if (seen.has(assetUrl)) continue;
    seen.add(assetUrl);
    assert.equal(seen.size <= 200, true, "Dashboard JavaScript import graph exceeded 200 assets");

    const assetResponse = await fetch(assetUrl);
    assert.equal(assetResponse.ok, true, `Dashboard asset failed: ${assetUrl}`);
    const text = await assetResponse.text();
    texts.push(text);

    for (const match of text.matchAll(/(?:from\s*|import\()\s*["']([^"']+\.js)["']/g)) {
      queue.push(new URL(match[1], assetUrl).toString());
    }
  }

  return texts;
}

function asToolResult(value: JsonValue): ToolResult {
  const object = asObject(value);
  return {
    content: asArray(object.content).map((item) => {
      const content = asObject(item);
      return {
        type: String(content.type),
        text: String(content.text)
      };
    }),
    ...(object.isError === true ? { isError: true } : {})
  };
}

function toolText(result: ToolResult): string {
  return result.content.map((item) => item.text).join("\n");
}

function asObject(value: JsonValue | undefined): Record<string, JsonValue> {
  assert.equal(Boolean(value) && typeof value === "object" && !Array.isArray(value), true);
  return value as Record<string, JsonValue>;
}

function asArray(value: JsonValue | undefined): JsonValue[] {
  assert.equal(Array.isArray(value), true);
  return value as JsonValue[];
}

await runE2e();
