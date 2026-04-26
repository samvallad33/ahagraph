# Day 1 Demo Script

Title: **I am teaching Claude to remember what made code click.**

## Recording Flow

1. Show the repo and run:

   ```bash
   npm run build
   VESTIGE_MCP_ARGS="--data-dir /tmp/ahagraph-day1" npm run smoke
   ```

2. In Claude/Cursor/VS Code, ask:

   > Use AhaGraph to remember that Rust ownership clicked for me with the library-checkout analogy.

3. Show the `aha` tool call.

4. Ask:

   > I am learning Zig comptime. Search my learning memory for analogies that may help.

5. Show `recall` or `transfer` returning the Rust ownership aha from Vestige.

6. Ask:

   > Show my AhaGraph for Rust ownership and Zig comptime.

7. Show `graph` returning the visual nodes and the Vestige dashboard URL.

8. Ask:

   > Use AhaGraph to brief yourself before teaching me Zig comptime.

9. Show `brief` and `synthesis` pulling the developer's remembered aha moments, confusions, review candidates, and failure guardrails into a teaching plan.

10. Ask:

   > Use AhaGraph to transfer my Rust ownership aha into Zig comptime, then open the graph.

11. End on the dashboard URL:

   ```text
   http://localhost:3937/dashboard?colorMode=ahagraph
   ```

   The Tuesday demo should show aha memories as gold, confusions as red, and failures as gray when the Vestige dashboard is running with AhaGraph color mode.

## Hook

I forgot how Rust ownership worked. Again.

The problem was not that no AI could explain it.

The problem was that no AI remembered the explanation that worked for me.

So I am building AhaGraph: a developer-learning graph powered by Vestige.
