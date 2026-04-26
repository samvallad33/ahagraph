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

From npm:

```bash
npm install -g ahagraph
ahagraph
```

Or run without installing:

```bash
npx -y ahagraph
```

From source:

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
claude mcp add ahagraph -- npx -y ahagraph
```

For a local checkout:

```bash
claude mcp add ahagraph -- node /absolute/path/to/ahagraph/dist/src/index.js
```

## Claude Desktop

```json
{
  "mcpServers": {
    "ahagraph": {
      "command": "npx",
      "args": ["-y", "ahagraph"],
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

### `profile`

Build the developer's learning profile from aha moments, confusions, and guardrails.

```json
{
  "topic": "React effects"
}
```

### `synthesis`

Produce a teaching-ready plan: what clicked, what to avoid, what to test, and how to explain next.

```json
{
  "topic": "Zig comptime",
  "task": "explain it using concepts that already clicked",
  "depth": "normal"
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

### `share_aha_card`

Draft a public-safe aha card for social posts, docs, or a demo overlay.

```json
{
  "concept": "Rust ownership",
  "public_aha": "Ownership clicked when I stopped thinking about variables and started thinking about who currently has the book.",
  "audience": "developers"
}
```

### `teach_differently`

Live mode for changing the explanation when the first attempt does not land.

```json
{
  "topic": "React effects",
  "learner_signal": "too_abstract",
  "goal": "fix stale interval callbacks"
}
```

### `learning_velocity`

Estimate momentum from aha, confusion, failure, review, and timeline signals.

```json
{
  "topic": "Rust ownership",
  "window_days": 30
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

The assistant should use `brief`, `profile`, `synthesis`, `transfer`, `confusion_history`, `due_for_review`, and `graph`.

Public demo hooks:

- Visual learning graph: `graph`
- Cross-domain transfer: `transfer`
- Proactive aha replay: `due_for_review`
- Confusion archaeology: `confusion_history`
- Public shareable aha cards: `share_aha_card`
- Live teach differently mode: `teach_differently`
- Learning velocity metrics: `learning_velocity`
- Pedagogical synthesis output: `synthesis`

## Verify

```bash
npm run typecheck
npm run build
VESTIGE_MCP_COMMAND=vestige-mcp npm run smoke
VESTIGE_MCP_COMMAND=vestige-mcp npm run e2e
```

`npm run e2e` builds the package, creates a fresh disposable Vestige database, calls every AhaGraph tool over MCP, verifies markdown/HTML escaping, checks for a gold aha node in `graph`, and confirms the Vestige dashboard serves AhaGraph color-mode assets.

## Powered By Vestige

AhaGraph is the learning-memory wedge. Vestige is the cognitive engine.
