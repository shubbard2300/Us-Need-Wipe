# Graph Report - .  (2026-08-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 114 nodes · 212 edges · 7 communities
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bcd295df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- game.js
- auth.js
- db.js
- handleRoll
- checkWin
- randInt
- package.json

## God Nodes (most connected - your core abstractions)
1. `handleRoll()` - 18 edges
2. `checkWin()` - 11 edges
3. `randInt()` - 10 edges
4. `checkCatch()` - 10 edges
5. `moveBushes()` - 8 edges
6. `showToast()` - 7 edges
7. `updateHud()` - 7 edges
8. `sleep()` - 6 edges
9. `positionToken()` - 6 edges
10. `newState()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `handleRoll()` --calls--> `randInt()`  [EXTRACTED]
  game.js → game.js  _Bridges community 5 → community 3_
- `spawnConfetti()` --calls--> `randInt()`  [EXTRACTED]
  game.js → game.js  _Bridges community 5 → community 4_
- `resetGame()` --calls--> `newState()`  [EXTRACTED]
  game.js → game.js  _Bridges community 5 → community 0_
- `repositionAll()` --calls--> `positionToken()`  [EXTRACTED]
  game.js → game.js  _Bridges community 3 → community 0_
- `handleRoll()` --calls--> `nearestBushDistance()`  [EXTRACTED]
  game.js → game.js  _Bridges community 4 → community 3_

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "game.js"
Cohesion: 0.11
Nodes (19): applyTileClasses(), buildBoard(), ensure(), fetchMe(), getNoiseBuffer(), getTint(), hexToRgb(), lerp() (+11 more)

### Community 1 - "auth.js"
Cohesion: 0.13
Nodes (11): auth, db, auth, auth, crypto, db, getCurrentUser(), getSecret() (+3 more)

### Community 2 - "db.js"
Cohesion: 0.14
Nodes (13): auth, db, auth, db, db, CONNECTION_STRING_KEYS, ensureSchema(), getConnectionString() (+5 more)

### Community 3 - "handleRoll"
Cohesion: 0.19
Nodes (18): announce(), checkCatch(), handleRoll(), moveBushes(), pick(), positionToken(), screenShake(), scrollPlayerIntoView() (+10 more)

### Community 4 - "checkWin"
Cohesion: 0.19
Nodes (14): checkWin(), escapeHtml(), fetchGlobalLeaderboard(), getLeaderboard(), getWinCount(), incrementWinCount(), nearestBushDistance(), renderLeaderboard() (+6 more)

### Community 5 - "randInt"
Cohesion: 0.31
Nodes (9): newState(), pickPoopTiles(), pickTurboTiles(), randInt(), spawnAbilityCharacter(), spawnPoopCloud(), spawnSparkles(), useLegionAbility() (+1 more)

### Community 6 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, pg, description, name, private, version, pg

## Knowledge Gaps
- **20 isolated node(s):** `crypto`, `db`, `{ Pool }`, `CONNECTION_STRING_KEYS`, `db` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleRoll()` connect `handleRoll` to `game.js`, `checkWin`, `randInt`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `checkWin()` connect `checkWin` to `game.js`, `handleRoll`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `randInt()` connect `randInt` to `game.js`, `handleRoll`, `checkWin`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `crypto`, `db`, `{ Pool }` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `game.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11375661375661375 - nodes in this community are weakly interconnected._
- **Should `auth.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._