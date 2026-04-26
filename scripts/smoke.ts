import assert from "node:assert/strict";
import { callAhaGraphTool } from "../src/tools.js";
import { VestigeClient } from "../src/vestige-client.js";

const vestige = new VestigeClient();

try {
  const runtime = { vestige };

  const aha = await callAhaGraphTool(runtime, "aha", {
    concept: "Rust ownership",
    what_clicked:
      "Ownership works like a library checkout: one borrower has the book unless it is explicitly returned or lent by reference.",
    analogy_used: "library checkout",
    unlocked: ["Zig comptime"],
    source: "AhaGraph smoke"
  });

  assert.equal(aha.isError, undefined, extractText(aha));

  const confusion = await callAhaGraphTool(runtime, "confusion", {
    topic: "Rust ownership",
    text: "Borrowing gets confusing when a value is lent by reference but the original owner still exists.",
    why: "The library-checkout analogy helps, but references need their own guardrail.",
    source: "AhaGraph smoke"
  });

  assert.equal(confusion.isError, undefined, extractText(confusion));

  const failure = await callAhaGraphTool(runtime, "failure", {
    topic: "React intervals",
    mistake: "Forgetting that interval callbacks can close over stale state.",
    guardrail: "Check callback freshness and cleanup before suggesting an interval fix.",
    severity: "medium",
    source: "AhaGraph smoke"
  });

  assert.equal(failure.isError, undefined, extractText(failure));

  const recall = await callAhaGraphTool(runtime, "recall", {
    query: "library checkout Rust ownership",
    limit: 5
  });

  assert.equal(recall.isError, undefined, extractText(recall));
  assert.match(extractText(recall), /library checkout|Rust ownership/i);

  const brief = await callAhaGraphTool(runtime, "brief", {
    topic: "Zig comptime",
    task: "explain it using concepts that already clicked",
    limit: 3
  });

  assert.equal(brief.isError, undefined, extractText(brief));
  assert.match(extractText(brief), /AhaGraph|brief|Rust ownership|library checkout/i);

  const transfer = await callAhaGraphTool(runtime, "transfer", {
    from_concept: "Rust ownership",
    to_concept: "Zig comptime",
    limit: 3
  });

  assert.equal(transfer.isError, undefined, extractText(transfer));
  assert.match(extractText(transfer), /transfer|Rust ownership|Zig comptime/i);

  const graph = await callAhaGraphTool(runtime, "graph", {
    query: "Rust ownership Zig comptime",
    depth: 2,
    max_nodes: 25
  });

  assert.equal(graph.isError, undefined, extractText(graph));
  assert.match(extractText(graph), /visualLegend|memory_graph|ahagraphTool/i);

  const review = await callAhaGraphTool(runtime, "due_for_review", {
    topic: "Rust ownership",
    limit: 3
  });

  assert.equal(review.isError, undefined, extractText(review));
  assert.match(extractText(review), /due_for_review|reviewPrompt/i);

  console.log("AhaGraph smoke test passed: captured aha/confusion/failure, recalled, transferred, graphed, and found review candidates.");
} finally {
  await vestige.close();
}

function extractText(result: { content: Array<{ text: string }> }): string {
  return result.content.map((item) => item.text).join("\n");
}
