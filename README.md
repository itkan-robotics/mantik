# Mantik

Web-based programming and robotics learning platform for FIRST Robotics teams (Java, FTC, FRC, competitive coding).

Built with **Astro 5 + MDX + TypeScript**, deployed as a static site on Netlify.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

**Search in dev:** Pagefind indexes are created at build time. Run `npm run build` once (or use `npm run dev:search`), then restart `npm run dev` so `/pagefind/*` assets are available locally.

## Build & Preview

```bash
npm run build    # Astro build + Pagefind search index
npm run preview  # Preview production build locally
```

## Offline learning

### ZIP packs (recommended for schools)

Open **Aa → Offline lessons** and download the **ZIP** for Java, FTC, FRC, or Competitive (one track per file). Build output also lives at `dist/offline/downloads/mantik-{track}.zip` after `npm run build`.

1. Unzip on a mentor or teacher laptop (Windows, Mac, or Linux).
2. In the folder that contains the track directory (`java`, `ftc`, etc.), start a local server, for example:
   - `python -m http.server 8080 --bind 0.0.0.0`
   - or `npx --yes serve -l 8080`
3. On student **Chromebooks** on the same Wi‑Fi (or a classroom hotspot), open Chrome to `http://<laptop-ip>:8080/java` (or `/ftc`, `/frc`, `/comp`).

Do not open lesson HTML by double-clicking — browsers block that. Student Chromebooks do not need extensions; they only visit the mentor laptop’s address.

Full steps are in `README-OFFLINE.txt` inside each ZIP.

### Save in Chrome (PWA)

Mantik can be **installed** from Chrome/Edge (Install app / Add to Home Screen). In **Offline lessons**, **Download** saves a track into the browser cache when your school allows service workers.

- Use the **lesson sidebar** and **prev/next** offline — search is not required.
- **PID Simulation**, **Resources**, and **in-browser Java Run** still need a network connection.
- After a site update, use **Update** in Offline lessons when shown.

Test cache mode: `npm run build && npm run preview`, then DevTools → Application → Cache storage (`mantik-java`, etc.) and Offline mode.

ZIP links in `npm run dev` are served from `dist/offline/downloads/` after a build (same as offline manifests). Use `npm run preview` to test the full production layout.

## Java Playground

Java Training and Competitive (`/java/*`, `/comp/*`) lessons compile and run **in the browser** (CheerpJ + ECJ, Java 17). Most ` ```java ` fences get a **Run** control automatically; opt out with ` ```java norun ` ``.

`predev` / `prebuild` download ECJ into `public/java-playground/` (gitignored) and build the launcher JAR (committed; rebuild when `scripts/java/*.java` changes). First run in a tab can take ~30s while the runtime warms up.

```bash
npm run test:java-examples   # compile-check lesson fences for the browser runtime
```

**CheerpJ preload map (optional, faster first compile):** After a warm run on a Java lesson, open the browser console and run `await __jpDumpResources()`, then paste the JSON into [`src/lib/java-playground/cheerpjPreload.json`](src/lib/java-playground/cheerpjPreload.json). Paths must be for Java **17** (`/lt/17/...`), not Java 8. Commit the file once generated.

Lesson-to-lesson navigation uses Astro View Transitions (`transition:animate="none"`) so the Java worker stays warm without a visible SPA animation.

Reader preferences (theme, text size, spacing, contrast, motion) live in the header **Aa** drawer (`src/lib/prefs.ts`).

## Project Structure

```
src/
├── content/          # MDX lessons (java, ftc, frc, comp, homepage)
├── components/       # Layout + MDX block components
├── layouts/          # BaseLayout, LessonLayout
├── pages/            # Astro routes
└── styles/global.css # SWYFT design system

public/
├── admin/            # Decap CMS
└── media/            # Static assets

legacy/               # Pre-Astro JSON SPA (archived)
scripts/                # migrate-json-to-mdx.mjs
```

## Adding or Editing Content

### Option 1: Decap CMS (visual editor)

1. Deploy the site to Netlify and enable [Netlify Identity + Git Gateway](https://decapcms.org/docs/git-gateway-backend/)
2. Visit `/admin` on your deployed site
3. Edit lessons in the visual editor — changes commit to Git as MDX

### Option 2: Edit MDX directly

Lesson files live in `src/content/{section}/`. Each file has frontmatter and a readable MDX body — **no component imports needed**.

See **[docs/content-authoring.md](docs/content-authoring.md)** for the full guide.

```mdx
---
title: Branching and Merging
lessonId: branching-merging
section: java
group: version-control
groupLabel: "Version Control with Git & GitHub"
groupOrder: 5
order: 4
difficulty: intermediate
duration: 35 min
---

### Working with Branches

Plain markdown paragraphs and lists work as expected.

```java
git branch feature-name
git checkout -b new-branch
```

<RulesBox title="Tips">

- Use feature branches for isolated work
- Keep `main` competition-ready

</RulesBox>

<ExerciseBox title="Practice">

1. Create a branch
2. Merge it back to main

</ExerciseBox>
```

### MDX Block Components

Registered in `src/mdx-components.ts` — use directly in lesson MDX without imports. Prefer markdown + fenced code over legacy prop-only usage.

| Component | Purpose |
|-----------|---------|
| `RulesBox` | Highlighted rules, tips, good practices (markdown slot) |
| `StepsBox` | Numbered steps |
| `ExerciseBox` | Practice tasks with optional answers |
| `LinkGrid` | Navigation link cards |
| `CodeBlock` | Legacy single code wrapper; prefer fenced code |
| `CodeTabs` / `CodeTab` | Tabbed code (Talon FX / SPARK MAX, etc.); use fenced code inside `CodeTab` slots |
| `TextBlock` | Legacy HTML strings only when markdown is not enough |
| `ContentTable` | Data tables |
| `DataTypesGrid` | Data type comparison cards |
| `LogicalOperators` | Operator reference |

## Migrating from Legacy JSON

The original JSON content is archived in `legacy/data/`. To re-run migration:

```bash
npm run migrate
```

**Warning:** This regenerates all of `src/content/` from JSON and **overwrites hand-edited MDX**. Commit or back up first. See [docs/content-authoring.md](docs/content-authoring.md).

## Deployment

Configured for **Netlify** via `netlify.toml`:

- Build: `npm run build`
- Publish: `dist/`
- Sitemap: auto-generated by `@astrojs/sitemap`
- Search: [Pagefind](https://pagefind.app) (built at deploy time)

## License

Mantik uses a **split license** so teams can reuse lessons and code clearly.

| Material | License | File |
|----------|---------|------|
| Software (site, PID sim, scripts, components) | [BSD-3-Clause](LICENSE) | `LICENSE` |
| Lesson text and MDX in `src/content/` | [CC BY 4.0](LICENSE-CONTENT) | `LICENSE-CONTENT` |
| Third-party ports (WPILib controls examples) | Attribution | `NOTICE` |

**Forks** (for example team deployments) may keep customizing and hosting the
site if they retain the BSD-3 copyright and license notice for Mantik code,
follow CC BY 4.0 when redistributing lesson prose, and keep `NOTICE` for
WPILib-derived physics. Team-specific additions are yours; document your
copyright in your README.

Copyright © 2026 Itkan Robotics (project: Mantik).
