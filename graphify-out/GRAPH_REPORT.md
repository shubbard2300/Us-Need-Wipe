# Graph Report - Us-Need-Wipe  (2026-08-05)

## Corpus Check
- 24 files · ~736,366 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 179 nodes · 266 edges · 22 communities (17 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cc2e1026`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- game.js
- auth.js
- What You Must Do When Invoked
- moveBushes
- checkWin
- showToast
- package.json
- /graphify
- graphify reference: extra exports and benchmark
- handleRoll
- randInt
- graphify reference: query, path, explain
- noiseBurst
- getTint
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .claude/CLAUDE.md
- extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `handleRoll()` - 18 edges
2. `What You Must Do When Invoked` - 12 edges
3. `checkWin()` - 11 edges
4. `/graphify` - 10 edges
5. `randInt()` - 10 edges
6. `checkCatch()` - 10 edges
7. `graphify reference: extra exports and benchmark` - 8 edges
8. `moveBushes()` - 8 edges
9. `showToast()` - 7 edges
10. `updateHud()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `handleRoll()` --calls--> `randInt()`  [EXTRACTED]
  game.js → game.js  _Bridges community 10 → community 9_
- `moveBushes()` --calls--> `randInt()`  [EXTRACTED]
  game.js → game.js  _Bridges community 10 → community 3_
- `spawnConfetti()` --calls--> `randInt()`  [EXTRACTED]
  game.js → game.js  _Bridges community 10 → community 4_
- `spawnPoopCloud()` --calls--> `randInt()`  [EXTRACTED]
  game.js → game.js  _Bridges community 10 → community 5_
- `handleRoll()` --calls--> `sleep()`  [EXTRACTED]
  game.js → game.js  _Bridges community 3 → community 9_

## Import Cycles
- None detected.

## Communities (22 total, 5 thin omitted)

### Community 0 - "game.js"
Cohesion: 0.16
Nodes (5): buildBoard(), fetchMe(), pathIndexForCell(), TODO: set the real Spreadshop discount code here once available, e.g. 'WIPE25'., updateAuthUI()

### Community 1 - "auth.js"
Cohesion: 0.07
Nodes (24): auth, db, auth, db, auth, auth, auth, db (+16 more)

### Community 2 - "What You Must Do When Invoked"
Cohesion: 0.13
Nodes (15): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 0 - GitHub repos and multi-path merge (only if a URL or several paths), Step 1 - Ensure graphify is installed, Step 2.5 - Video and audio (only if video files detected), Step 2 - Detect files, Step 3 - Extract entities and relationships (+7 more)

### Community 3 - "moveBushes"
Cohesion: 0.28
Nodes (9): moveBushes(), positionToken(), screenShake(), showCaught(), sleep(), spawnLegionPop(), stepBackAnimation(), stepPlayerTo() (+1 more)

### Community 4 - "checkWin"
Cohesion: 0.21
Nodes (12): checkWin(), escapeHtml(), fetchGlobalLeaderboard(), getLeaderboard(), getWinCount(), incrementWinCount(), renderLeaderboard(), saveScoreToLeaderboard() (+4 more)

### Community 5 - "showToast"
Cohesion: 0.33
Nodes (7): announce(), showToast(), spawnAbilityCharacter(), spawnPoopCloud(), spawnSparkles(), useLegionAbility(), useReaperAbility()

### Community 6 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, pg, description, name, private, version, pg

### Community 7 - "/graphify"
Cohesion: 0.20
Nodes (9): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Usage (+1 more)

### Community 8 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 9 - "handleRoll"
Cohesion: 0.33
Nodes (9): checkCatch(), handleRoll(), nearestBushDistance(), pick(), scrollPlayerIntoView(), spawnCleanPop(), spawnFailPop(), startWipeQTE() (+1 more)

### Community 10 - "randInt"
Cohesion: 0.38
Nodes (7): applyTileClasses(), newState(), pickPoopTiles(), pickTurboTiles(), randInt(), repositionAll(), resetGame()

### Community 11 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 12 - "noiseBurst"
Cohesion: 0.40
Nodes (6): ensure(), getNoiseBuffer(), noiseBurst(), playMusicStep(), restartMusicTimer(), tone()

### Community 13 - "getTint"
Cohesion: 0.60
Nodes (5): getTint(), hexToRgb(), lerp(), lerpRgb(), updateTimeOfDay()

### Community 14 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 15 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 16 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **63 isolated node(s):** `graphify`, `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)`, `Step 1 - Ensure graphify is installed` (+58 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `What You Must Do When Invoked` connect `What You Must Do When Invoked` to `/graphify`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `/graphify` connect `/graphify` to `What You Must Do When Invoked`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `graphify`, `Usage`, `What graphify is for` to the rest of the system?**
  _63 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07207207207207207 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._