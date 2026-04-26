# AhaGraph

**See your understanding as a graph.**

AhaGraph is a developer-learning MCP server powered by [Vestige](https://github.com/samvallad33/vestige). It captures the explanations that made code concepts click, the confusions that keep coming back, and the failure patterns you should not repeat.

Every AI can explain a concept. AhaGraph remembers the explanation that finally worked.

## Why This Exists

Vestige owns the cognitive memory engine: local storage, embeddings, FSRS-6 retention, prediction-error gating, graph traversal, and the 3D dashboard.

AhaGraph owns the developer-learning layer:

- Aha moments: what made a concept click.
- Confusions: what keeps failing to make sense.
- Failures: bugs and mistakes you keep repeating.
- Transfers: analogies from what you know into what you are learning.
- Graphs: a visible map of how your understanding evolves.

## Architecture

```text
Claude / Cursor / VS Code / any MCP host
  -> AhaGraph MCP server
    -> Vestige MCP server
      -> SQLite + embeddings + FSRS-6 + memory graph + dashboard
```

## Install

Prerequisites:

- Node.js 20+
- `vestige-mcp` installed and available on `PATH`

```bash
git clone https://github.com/samvallad33/ahagraph.git
cd ahagraph
npm install
npm run build
```

Run locally:

```bash
VESTIGE_MCP_COMMAND=vestige-mcp npm start
```

For an isolated demo database:

```bash
VESTIGE_MCP_ARGS="--data-dir /tmp/ahagraph-demo" npm start
```

## Claude Code

```bash
claude mcp add ahagraph -- node /absolute/path/to/ahagraph/dist/src/index.js
```

## Claude Desktop

```json
{
  "mcpServers": {
    "ahagraph": {
      "command": "node",
      "args": ["/absolute/path/to/ahagraph/dist/src/index.js"],
      "env": {
        "VESTIGE_MCP_COMMAND": "vestige-mcp"
      }
    }
  }
}
```

## Tools

Because the MCP server is named `ahagraph`, hosts display these as AhaGraph tools.

### `aha`

Capture what made a concept click.

```json
{
  "concept": "Rust ownership",
  "what_clicked": "Ownership works like a library checkout.",
  "analogy_used": "library checkout",
  "unlocked": ["Zig comptime"]
}
```

### `recall`

Recall prior aha moments and analogies.

```json
{
  "query": "Rust ownership library checkout"
}
```

### `confusion`

Capture a weak spot.

```json
{
  "topic": "React effects",
  "text": "I keep mixing dependency arrays with re-render timing.",
  "why": "The examples make cleanup and stale closures look unrelated."
}
```

### `failure`

Capture a repeated mistake or guardrail.

```json
{
  "topic": "React intervals",
  "mistake": "Forgetting that interval callbacks can close over stale state.",
  "guardrail": "Check callback freshness and cleanup before suggesting a fix."
}
```

### `brief`

Brief the assistant before it helps.

```json
{
  "topic": "Zig comptime",
  "task": "explain it using concepts that already clicked"
}
```

### `transfer`

Find analogical bridges between concepts.

```json
{
  "from_concept": "Rust ownership",
  "to_concept": "Zig comptime"
}
```

### `confusion_history`

Surface recurring confusion with semantic evidence and timeline context.

```json
{
  "topic": "React effects"
}
```

### `due_for_review`

Find aha/confusion memories to replay and test.

```json
{
  "topic": "Rust ownership"
}
```

### `graph`

Export AhaGraph visualization data from Vestige's memory graph.

```json
{
  "query": "Rust ownership Zig comptime",
  "depth": 2,
  "max_nodes": 50
}
```

### `status`

Verify that AhaGraph can reach Vestige.

## Demo

Day 1:

> Use AhaGraph to remember that Rust ownership clicked for me with the library-checkout analogy.

Then:

> I am learning Zig comptime. Search my learning memory for analogies that may help.

Day 2:

> Use AhaGraph to brief yourself before helping me with Zig comptime.

The assistant should use `brief`, `transfer`, `confusion_history`, `due_for_review`, and `graph`.

## Verify

```bash
npm run typecheck
npm run build
VESTIGE_MCP_ARGS="--data-dir /tmp/ahagraph-smoke" npm run smoke
```

## Powered By Vestige

AhaGraph is the learning-memory wedge. Vestige is the cognitive engine.
