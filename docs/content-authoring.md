# Content Authoring Guide

How to add and edit lessons in Mantik after the Astro + MDX migration.

## Where content lives

| Location | Purpose |
|----------|---------|
| `src/content/java/` | Java training lessons |
| `src/content/ftc/` | FTC robotics lessons |
| `src/content/frc/` | FRC robotics lessons |
| `src/content/comp/` | Competitive programming lessons |
| `src/content/homepage/` | Homepage copy |

Each lesson is one `.mdx` file. Sidebar navigation is built from frontmatter — no separate nav config file per lesson.

## Frontmatter reference

```yaml
---
title: Branching and Merging          # Display title
lessonId: branching-merging           # URL slug: /java/branching-merging
section: java                         # java | ftc | frc | comp
group: version-control                # Sidebar group id (lessons with same group nest together)
groupLabel: "Version Control with Git & GitHub"  # Sidebar group label
groupOrder: 5                         # Sidebar group sort order
order: 4                              # Lesson order within group
difficulty: intermediate              # beginner | intermediate | advanced (optional)
duration: 35 min                      # Optional
description: ""                       # Optional SEO / meta description
draft: false                          # Optional; draft lessons are hidden
isOverview: false                     # true for section overview pages only
---
```

Homepage entries use a simpler schema:

```yaml
---
title: Mantik
description: Programming and robotics learning for FIRST teams
---
```

## Writing readable MDX

**Do not add component imports.** All block components are registered in `src/mdx-components.ts` and passed via `<Content components={components} />` in page layouts.

### Headings and prose

Use plain markdown:

```mdx
### Working with Branches

Branches allow you to work on different features without affecting main.
```

### Code

Use fenced code blocks, not `<CodeBlock />`:

````mdx
```java
git branch feature-name
git checkout -b new-branch
```
````

### RulesBox / StepsBox / ExerciseBox

Use component tags with **markdown inside** (slot content):

```mdx
<RulesBox title="Robotics Branching Examples">

For robotics teams, you might create:

- `autonomous-improvements` branch for auto code
- `teleop-enhancements` for driver controls
- Keep `main` for competition-ready code

</RulesBox>
```

```mdx
<ExerciseBox title="Practice" description="Try these on your own machine:">

1. Create a branch named `my-feature`
2. Make a commit and switch back to main
3. Merge your branch

```java
// starter code if needed
System.out.println("Hello");
```

</ExerciseBox>
```

Legacy prop style still works (`items={[]}`, `tasks={[]}`) but prefer slots for new content.

### LinkGrid

For internal lesson links:

```mdx
<LinkGrid
  title="Quick Navigation"
  section="java"
  links={[
    { "label": "Introduction to Java", "id": "java-intro" },
    { "label": "Variables", "id": "java-variables" }
  ]}
/>
```

For external URLs, use `url` instead of `id`:

```mdx
<LinkGrid
  title="Further Reading"
  section="java"
  links={[
    { "label": "Git Branching", "url": "https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell" }
  ]}
/>
```

### CodeTabs

For vendor-specific or multi-variant code (e.g. Talon FX vs SPARK MAX), wrap fenced blocks in `CodeTab` slots:

```mdx
<CodeTabs>
<CodeTab label="Talon FX">

```java
motor.setControl(new PositionVoltage(targetRotations));
```

</CodeTab>
<CodeTab label="SPARK MAX">

```java
controller.setReference(target, ControlType.kPosition);
```

</CodeTab>
</CodeTabs>
```

Use normal markdown fences inside each tab — no JSON `tabs={[]}` prop. Legacy `tabs={[]}` still works in older lessons until migrated.

### When to use TextBlock

Prefer markdown. Use `<TextBlock content={"..."} />` only for legacy HTML that cannot be converted cleanly.

## Adding a new lesson

1. Create `src/content/{section}/{lessonId}.mdx`
2. Set frontmatter (`lessonId`, `section`, `group`, `groupLabel`, `groupOrder`, `order`)
3. Write the body in markdown + components as above
4. Run `npm run dev` and open `http://localhost:4321/{section}/{lessonId}`

The lesson appears in the sidebar automatically when `group` / `groupOrder` / `order` match existing conventions.

## Adding a new sidebar module

Use the same `group` and `groupLabel` on all lessons in the module. Set `groupOrder` to position the module relative to others in that section.

## Adding a new curriculum section

Requires code changes in several places:

- `src/content.config.ts` — new collection
- `src/config/navigation.ts` — section registry
- `src/lib/content.ts` — sidebar helpers if needed
- `public/admin/config.yml` — Decap CMS collection
- Homepage / LinkGrid links

## Decap CMS

On a deployed Netlify site with Identity + Git Gateway enabled, edit at `/admin`. CMS writes MDX files to the repo.

## Migration script warning

```bash
npm run migrate
```

**Destructive:** re-reads `legacy/data/` JSON and **regenerates all of `src/content/`**, wiping hand-edited MDX. Only run when intentionally re-importing from legacy JSON. Back up or commit first.

## Local verification

```bash
npm install
npm run dev       # dev server at :4321
npm run build     # production build + Pagefind index
npm run preview   # serve dist/ (search works here)
```

## Programming Resources catalog

Curated external and internal links live in `src/data/resources.json` (validated at build time with Zod in `src/lib/resources/schema.ts`).

| Task | How |
|------|-----|
| Bulk import from MDX LinkGrids | `npm run seed:resources` (reads FRC hub + FTC setup pages) |
| Add one approved link | Edit `src/data/resources.json` after reviewing a submission issue |
| Browse UI | `/resources` — React island in `src/components/resources/` |

### Resource submission (Netlify)

Public submissions POST to `/.netlify/functions/submit-resource`, which verifies Cloudflare Turnstile and opens a GitHub Issue for review. Set these in **Netlify → Site settings → Environment variables** (never commit secrets):

| Variable | Purpose |
|----------|---------|
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (exposed to browser; set in build env) |
| `TURNSTILE_SECRET_KEY` | Turnstile server verification |
| `GITHUB_TOKEN` | PAT or GitHub App token with `issues: write` on the repo |
| `GITHUB_REPO` | Optional; defaults to `itkan-robotics/mantik` |

Turnstile test keys (local/preview only): site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

Create GitHub labels `resource-submission` and `needs-review` on the repo, or the function retries without labels.

After approval, add an entry to `resources.json` with a unique `id` slug, then run `npm run build` to validate.
