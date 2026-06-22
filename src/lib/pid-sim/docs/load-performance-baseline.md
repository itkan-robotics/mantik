# PID Simulation — Load Performance Baseline

Recorded during load-performance work (Jun 2026). Gzip sizes from `npm run build` client output.

## Before (monolithic `PidSimApp`)

| Chunk | Gzip (approx) | When loaded |
|-------|---------------|-------------|
| `client.*.js` (React) | ~59 KB | First paint |
| `PidSimApp.*.js` | ~24 KB | First paint |
| `uPlot.*.js` | ~23 KB | Workspace (lazy in GraphPanel) |
| `elevatorSim` / `armSim` | ~1.5 KB each | After Start (dynamic) |

**Cold `/pid-simulation`:** Landing blocked on React + full PidSimApp (parsers, both guide sets, both references, workspace UI). Monaco pulled via workspace; physics copy said “Loading physics engine…” while waiting on much more than physics.

## After (split shell + lazy workspace)

| Chunk | Gzip | When loaded |
|-------|------|-------------|
| `react-vendor.*.js` | 60.5 KB | First paint / idle hydrate |
| `PidSimApp.*.js` (shell) | 2.1 KB | First paint |
| `client.*.js` (Astro island) | 1.0 KB | First paint |
| **Cold landing total** | **~63.6 KB** | Before Start |
| `PidSimWorkspace.*.js` | 9.7 KB | After Start (lazy) |
| Mechanism chunks (elevator or arm parsers + guides) | 3–11 KB | Session start |
| `pid-physics.*.js` | 5.3 KB | Idle preload + session |
| `pid-uplot.*.js` | 23.4 KB | Workspace graph mount |
| `pid-monaco.*.js` | 5.1 KB | Workspace editor mount |

**Cold `/pid-simulation`:** Landing interactive after ~62 KB gzip JS (React + thin shell). No Monaco/uPlot/parser network until Start.

**Start → workspace:** Mechanism bundle + physics on warm cache typically &lt;100 ms locally; full-page copy is “Loading simulation…” (not physics-only).

## Manual checks

1. Chrome DevTools → Network: filter JS on cold load — confirm `PidSimWorkspace` / `pid-monaco` / `pid-uplot` absent until Start.
2. Lighthouse on `/pid-simulation`: compare Total Blocking Time and JS execution vs pre-split (same machine/throttling).
3. `npm run build:analyze` → open `dist/stats.html` for treemap.

## Commands

```bash
npm run build
npm run build:analyze   # writes dist/stats.html
npm run test:physics
```
