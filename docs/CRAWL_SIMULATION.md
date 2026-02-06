# Googlebot crawl simulation – Mantik

This document simulates how Googlebot discovers and crawls the site and lists indexing blockers and duplication issues (and fixes).

---

## 1. Crawl discovery (how Googlebot finds URLs)

### 1.1 Entry points

| Source | URL | Notes |
|--------|-----|--------|
| **robots.txt** | `Sitemap: https://mantik.netlify.app/sitemap.xml` | Primary discovery. |
| **Direct** | `https://mantik.netlify.app/` | Homepage; canonical domain (HTTPS, non-www). |
| **External** | Backlinks, Search Console, etc. | Any URL can be requested. |

### 1.2 robots.txt rules (Googlebot)

- **User-agent: \***  
  - `Disallow`: `/data/`, `/_wpilibTemplates/`, `/_curatedWpilibExamples/`, `/out/`, `/404.html`  
  - `Allow: /`
- **User-agent: Googlebot**  
  - `Allow: /`
- **Sitemap**: `https://mantik.netlify.app/sitemap.xml`

So Googlebot is **not** blocked from any indexable path. Only low-value paths are disallowed.

### 1.3 Sitemap (URL list)

- Home: `https://mantik.netlify.app/`
- Section roots: `/java`, `/frc`, `/ftc`, `/comp`
- Lesson URLs: `/java/java-intro`, `/java/java-printing`, … (one `<loc>` per lesson, no trailing slash)

All indexable URLs are in the sitemap. No indexing blocker from sitemap.

---

## 2. Request flow (what Googlebot gets per URL)

Netlify evaluates **redirects first**, then **static files**. So:

- If a redirect matches → that rule is used (rewrite or redirect).
- If no redirect matches → Netlify tries to serve a static file (e.g. `java/java-intro/index.html` for `/java/java-intro` or `/java/java-intro/`).

### 2.1 Before fix (problem)

- Redirects included: `/java/*` → `/index.html` (200), and same for `/frc/*`, `/ftc/*`, `/comp/*`.
- So for a lesson URL like `https://mantik.netlify.app/java/java-intro`:
  1. Redirect `/java/*` matches.
  2. Googlebot receives **index.html (SPA shell)** with status 200.
  3. Correct title/canonical/content for that lesson exist only **after JavaScript** (SEO manager + content manager).
- **Issue**: Lesson URLs never served the **static** lesson HTML. Crawl depended entirely on JS for metadata and content; static HTML from the build was unused.

### 2.2 After fix (intended behavior)

- Section **roots** only: `/java`, `/frc`, `/ftc`, `/comp` → `/index.html` (200). No wildcards for section subpaths.
- So for `https://mantik.netlify.app/java/java-intro`:
  1. No redirect matches (no `/java/*` rule).
  2. Netlify serves static file `java/java-intro/index.html` (200).
  3. Googlebot gets **static HTML** with correct title, meta description, canonical, and body content.
- For section landing: `https://mantik.netlify.app/java` still matches `/java` → `/index.html` (SPA). Correct.

---

## 3. Per-URL behavior (simulated)

| URL | Redirect match? | Served | Status | Indexing |
|-----|------------------|--------|--------|----------|
| `https://mantik.netlify.app/` | `/*` → index.html | index.html | 200 | index, follow; canonical `/` |
| `https://mantik.netlify.app/index.html` | (file) | index.html | 200 | Same content; canonical `/` avoids duplicate. |
| `https://mantik.netlify.app/java` | `/java` → index.html | index.html (SPA) | 200 | index, follow; canonical `/java` (set by JS). |
| `https://mantik.netlify.app/java/java-intro` | **(none after fix)** | **java/java-intro/index.html** | 200 | index, follow; canonical `/java/java-intro` in HTML. |
| `https://mantik.netlify.app/java/java-intro/` | **301** to `/java/java-intro` | (redirect) | 301 | No duplicate; canonical URL is no-trailing-slash. |
| `https://mantik.netlify.app/sitemap.xml` | (explicit 200 to self) | sitemap.xml | 200 | Not indexed (sitemap). |
| `https://mantik.netlify.app/robots.txt` | (explicit 200 to self) | robots.txt | 200 | Not indexed. |
| `https://mantik.netlify.app/data/...` | (none) | (file or 404) | 200/404 | **Blocked** by robots.txt `Disallow: /data/`. |
| `https://mantik.netlify.app/404.html` | (literal path) | 404.html | 200 | **Blocked** by robots.txt; page has `noindex, follow`. |
| Random path (e.g. `/foo`) | `/*` → index.html | index.html | 200 | SPA shell; canonical `/`; thin content, but no duplicate lesson URLs. |

---

## 4. Indexing blockers

| Item | Status | Notes |
|------|--------|--------|
| **robots meta (index.html)** | OK | `index, follow`; no noindex. |
| **robots meta (404.html)** | OK | `noindex, follow`; correct for error page. |
| **robots meta (static lesson HTML)** | OK | `index, follow` in build. |
| **X-Robots-Tag** | OK | Not set; no global blocking. |
| **robots.txt** | OK | Only blocks `/data/`, `/_wpilibTemplates/`, `/_curatedWpilibExamples/`, `/out/`, `/404.html`. |
| **Canonical (home)** | OK | `https://mantik.netlify.app/`. |
| **Canonical (lesson pages)** | OK | One canonical per lesson (no trailing slash). |

No unintended indexing blockers identified.

---

## 5. Duplication

| Risk | Mitigation |
|------|------------|
| **Trailing slash** (`/java/java-intro` vs `/java/java-intro/`) | Canonical in static HTML is no-trailing-slash; section roots 301 from trailing to non-trailing. |
| **www vs non-www** | 301 to `https://mantik.netlify.app`. |
| **HTTP vs HTTPS** | 301 to HTTPS. |
| **Section root vs SPA** | `/java` is one URL, SPA; canonical set by JS to `/java`. No duplicate with lesson URLs. |
| **Same lesson, SPA vs static** | After fix: lesson URLs **only** serve static HTML (no redirect). So no “same content at SPA URL and static URL.” |
| **Homepage** | Single canonical `/`; `/index.html` same content, canonical points to `/`. |

Duplication is controlled by canonicals and redirects; no critical duplicate-content issue once lesson redirects are fixed.

---

## 6. Summary

- **Discovery**: Sitemap + robots.txt; no sitemap-based blocker.
- **Blocking**: Only intended paths (e.g. `/data/`, `/404.html`) blocked; no accidental noindex.
- **Main fix**: Remove section wildcard redirects (`/java/*`, `/frc/*`, `/ftc/*`, `/comp/*`) so lesson URLs are served **static HTML** instead of the SPA shell. Section roots (`/java`, `/frc`, `/ftc`, `/comp`) keep rewriting to index.html for the SPA.
- **Result**: Googlebot gets static, indexable HTML for every lesson URL in the sitemap; section landings stay SPA with JS-set canonicals; no new indexing blockers or duplication introduced.
