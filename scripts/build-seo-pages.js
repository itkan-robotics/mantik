/**
 * Build script: generate static HTML for each lesson from JSON (SEO).
 * Outputs to out/<sectionPath>/<lessonId>/index.html and sitemap.xml.
 * Run from repo root: node scripts/build-seo-pages.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://mantik.netlify.app';
const SITE_NAME = 'Mantik';
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_DIR = path.join(DATA_DIR, 'config');
const OUT_DIR = path.join(ROOT, 'out');

const SECTION_TO_PATH = {
    'java-training': 'java',
    'ftc-specific': 'ftc',
    'frc-specific': 'frc',
    'competitive-training': 'comp'
};

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeHtmlContent(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getDescription(data) {
    if (data.description) return data.description.substring(0, 160);
    if (data.sections && data.sections.length > 0) {
        const first = data.sections.find(s => s.type === 'text' && s.content);
        if (first && first.content) {
            const text = first.content.replace(/<[^>]*>/g, '');
            return text.substring(0, 160);
        }
    }
    return 'Programming lesson - Mantik';
}

function renderSection(sectionData, sectionPath) {
    const type = sectionData.type || 'text';
    const title = sectionData.title;

    const h3 = title ? `<h3>${escapeHtml(title)}</h3>` : '';

    switch (type) {
        case 'text': {
            const content = sectionData.content || '';
            return h3 + `<div class="content-section">${content}</div>`;
        }
        case 'list': {
            const items = Array.isArray(sectionData.items) ? sectionData.items : (Array.isArray(sectionData.content) ? sectionData.content : []);
            const lis = items.map(item => `<li>${item}</li>`).join('');
            return h3 + `<ul>${lis}</ul>`;
        }
        case 'code': {
            const code = sectionData.code || sectionData.content || '';
            const lang = sectionData.language || 'java';
            const desc = sectionData.description ? `<p>${sectionData.description}</p>` : '';
            return h3 + desc + `<div class="code-block"><pre><code class="language-${escapeHtml(lang)}">${escapeHtmlContent(code)}</code></pre></div>`;
        }
        case 'code-tabs': {
            const tabs = sectionData.tabs || [];
            const desc = sectionData.description ? `<p>${sectionData.description}</p>` : '';
            const contentHtml = sectionData.content ? `<div>${sectionData.content}</div>` : '';
            const firstTab = tabs[0];
            const code = firstTab ? (firstTab.code || firstTab.content || '') : '';
            const lang = firstTab && firstTab.language ? firstTab.language : 'java';
            return h3 + desc + contentHtml + (code ? `<div class="code-block"><pre><code class="language-${escapeHtml(lang)}">${escapeHtmlContent(code)}</code></pre></div>` : '');
        }
        case 'rules-box':
        case 'emphasis-box': {
            let body = '';
            if (sectionData.subtitle) body += `<h4>${escapeHtml(sectionData.subtitle)}</h4>`;
            if (sectionData.goodPractices && Array.isArray(sectionData.goodPractices)) {
                body += '<h5>Good Practices:</h5><ul>' + sectionData.goodPractices.map(i => `<li>${i}</li>`).join('') + '</ul>';
            }
            if (sectionData.avoid && Array.isArray(sectionData.avoid)) {
                body += '<h5>Avoid:</h5><ul>' + sectionData.avoid.map(i => `<li>${i}</li>`).join('') + '</ul>';
            }
            if (sectionData.items && Array.isArray(sectionData.items)) {
                body += '<ul>' + sectionData.items.map(i => `<li>${i}</li>`).join('') + '</ul>';
            }
            if (sectionData.content) body += `<div>${sectionData.content}</div>`;
            return `<div class="rules-box">${h3}${body}</div>`;
        }
        case 'steps-box': {
            let stepsBody = '';
            if (sectionData.subtitle) stepsBody += `<h4>${escapeHtml(sectionData.subtitle)}</h4>`;
            if (sectionData.items && Array.isArray(sectionData.items)) {
                const lis = sectionData.items.map(item => {
                    if (typeof item === 'string') return `<li>${item}</li>`;
                    if (typeof item === 'object' && item.text) {
                        const sub = item.subitems && Array.isArray(item.subitems)
                            ? '<ul>' + item.subitems.map(s => `<li>${s}</li>`).join('') + '</ul>'
                            : '';
                        return `<li>${item.text}${sub}</li>`;
                    }
                    return '<li></li>';
                });
                stepsBody += '<ol>' + lis.join('') + '</ol>';
            }
            if (sectionData.content) stepsBody += `<div>${sectionData.content}</div>`;
            return `<div class="rules-box">${h3}${stepsBody}</div>`;
        }
        case 'exercise-box': {
            let exBody = '';
            if (sectionData.subtitle) exBody += `<h4>${escapeHtml(sectionData.subtitle)}</h4>`;
            if (sectionData.description) exBody += `<p>${sectionData.description}</p>`;
            if (sectionData.tasks && Array.isArray(sectionData.tasks)) {
                exBody += '<ul>' + sectionData.tasks.map(t => `<li>${t}</li>`).join('') + '</ul>';
            }
            const code = sectionData.code || sectionData.content;
            if (code && typeof code === 'string' && code.trim()) {
                exBody += `<div class="code-block"><pre><code>${escapeHtmlContent(code)}</code></pre></div>`;
            }
            return `<div class="exercise-box">${h3}${exBody}</div>`;
        }
        case 'link-grid': {
            const links = sectionData.links || sectionData.items || sectionData.content || [];
            if (!Array.isArray(links)) break;
            const linkItems = links.map(link => {
                if (typeof link === 'string') return `<div class="link-grid-button">${link}</div>`;
                const label = escapeHtml(link.label || link.title || '');
                if (link.url) {
                    const target = link.url.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
                    return `<a class="link-grid-button" href="${escapeHtml(link.url)}"${target}>${label}</a>`;
                }
                if (link.id) {
                    return `<a class="link-grid-button" href="/${sectionPath}/${link.id}">${label}</a>`;
                }
                return `<div class="link-grid-button">${label}</div>`;
            });
            return h3 + `<div class="link-grid">${linkItems.join('')}</div>`;
        }
        case 'section': {
            const content = sectionData.content || '';
            return h3 + `<div>${content}</div>`;
        }
        case 'table': {
            const headers = sectionData.headers || [];
            const rows = sectionData.rows || [];
            const ths = headers.map(h => `<th>${h}</th>`).join('');
            const trs = rows.map(row => '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>').join('');
            return h3 + `<div class="table-container"><table class="content-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
        }
        case 'data-types-grid': {
            const types = sectionData.types || [];
            const boxes = types.map(t => {
                const name = escapeHtml(t.name || '');
                const desc = escapeHtml(t.description || '');
                const ex = t.example ? `<code>${escapeHtml(t.example)}</code>` : '';
                return `<div class="data-type"><h4>${name}</h4><p>${desc}</p>${ex}</div>`;
            });
            return h3 + `<div class="data-types-grid">${boxes.join('')}</div>`;
        }
        case 'logical-operators': {
            let opBody = '';
            if (sectionData.subtitle) opBody += `<h4>${escapeHtml(sectionData.subtitle)}</h4>`;
            if (sectionData.operators && Array.isArray(sectionData.operators)) {
                opBody += '<ul>' + sectionData.operators.map(o => `<li>${o}</li>`).join('') + '</ul>';
            }
            if (sectionData.examples) {
                opBody += `<div class="logical-operators-examples"><h4>Examples:</h4><div class="code-block"><pre><code>${escapeHtmlContent(sectionData.examples)}</code></pre></div></div>`;
            }
            return `<div class="logical-operators-box">${h3}${opBody}</div>`;
        }
        default:
            return h3 + (sectionData.content ? `<div>${sectionData.content}</div>` : '');
    }
}

function collectLessons(config, sectionId) {
    const sectionPath = SECTION_TO_PATH[sectionId];
    if (!sectionPath) return [];

    const lessons = [];
    function walk(items) {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
            if (item.id && item.file) lessons.push({ id: item.id, file: item.file, sectionPath });
            if (item.items) walk(item.items);
            if (item.children) walk(item.children);
            if (item.groups) walk(item.groups);
        });
    }
    if (config.groups) walk(config.groups);
    if (config.children) walk(config.children);
    if (config.items) walk(config.items);
    if (config.tiers) {
        config.tiers.forEach(tier => {
            if (Array.isArray(tier.lessons)) {
                tier.lessons.forEach(lessonPath => {
                    const id = lessonPath.replace(/^.*\/([^/]+)\.json$/, '$1');
                    lessons.push({ id, file: lessonPath, sectionPath });
                });
            }
        });
    }
    return lessons;
}

function getLessonList() {
    const mainConfigPath = path.join(CONFIG_DIR, 'config.json');
    const mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf8'));
    const sections = mainConfig.sections || {};
    const allLessons = [];

    for (const [sectionId, sectionMeta] of Object.entries(sections)) {
        if (sectionId === 'homepage') continue;
        const configPath = sectionMeta.file ? path.join(ROOT, sectionMeta.file) : path.join(CONFIG_DIR, `${sectionId.replace('-specific', '-specific-config')}.json`);
        if (!fs.existsSync(configPath)) continue;
        const sectionConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const lessons = collectLessons(sectionConfig, sectionId);
        allLessons.push(...lessons);
    }
    return allLessons;
}

function buildLessonHtml(lessonPath, lessonId, sectionPath, data) {
    const title = data.title || lessonId;
    const sectionNames = { java: 'Java Training', frc: 'FRC Training', ftc: 'FTC Training', comp: 'Competitive Programming' };
    const pageTitle = `${escapeHtml(title)} - ${sectionNames[sectionPath] || sectionPath} - ${SITE_NAME}`;
    const description = getDescription(data);
    const canonical = `${BASE_URL}/${sectionPath}/${lessonId}`;

    const sections = data.sections || data.content || [];
    const contentHtml = sections.map(s => renderSection(s, sectionPath)).join('\n');

    const sectionName = sectionNames[sectionPath] || sectionPath;
    const ogImage = `${BASE_URL}/media/FRCCodeLab.png`;
    const breadcrumb = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ul>
        <li><a href="${BASE_URL}/">Home</a></li>
        <li><a href="${BASE_URL}/${sectionPath}">${escapeHtml(sectionName)}</a></li>
        <li aria-current="page">${escapeHtml(title)}</li>
      </ul>
    </nav>`;

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL + '/' },
            { '@type': 'ListItem', position: 2, name: sectionName, item: `${BASE_URL}/${sectionPath}` },
            { '@type': 'ListItem', position: 3, name: title, item: canonical }
        ]
    };
    const learningResourceSchema = {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: title,
        description: description,
        url: canonical,
        provider: { '@type': 'Organization', name: SITE_NAME, url: BASE_URL },
        educationalLevel: data.difficulty || 'Beginner to Advanced',
        learningResourceType: 'Tutorial',
        inLanguage: 'en',
        isAccessibleForFree: true,
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'FIRST Robotics students, FTC teams, FRC teams' }
    };
    if (data.duration) {
        learningResourceSchema.timeRequired = 'PT' + String(data.duration).replace(/\s*min\s*/i, 'M').replace(/\s*hour\s*/i, 'H');
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${pageTitle}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Mantik - FIRST Programming Documentation">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="twitter:image:alt" content="Mantik - FIRST Programming Documentation">
  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="/media/FRCCodeLabDark.svg" type="image/svg+xml">
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(learningResourceSchema)}</script>
</head>
<body class="page">
  <header class="mobile-header">
    <div class="header-center">
      <nav class="header-navigation">
        <a href="/">Home</a>
        <a href="/java">Java</a>
        <a href="/ftc">FTC</a>
        <a href="/frc">FRC</a>
        <a href="/comp">Competitive</a>
      </nav>
    </div>
  </header>
  <div class="main">
    <div class="content">
      <article role="main">
        ${breadcrumb}
        <h1>${escapeHtml(title)}</h1>
        <div class="content-section">
          ${contentHtml}
        </div>
        <p><a href="/">Open full interactive app</a></p>
      </article>
    </div>
  </div>
</body>
</html>`;
}

function buildSitemap(lessonsWithMtime) {
    const now = new Date();
    const isoDate = now.toISOString().slice(0, 10);

    const urlEntry = (loc, priority, changefreq, lastmodDate) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmodDate || isoDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

    let urls = urlEntry(`${BASE_URL}/`, '1.0', 'weekly');
    urls += urlEntry(`${BASE_URL}/java`, '0.9', 'weekly');
    urls += urlEntry(`${BASE_URL}/frc`, '0.9', 'weekly');
    urls += urlEntry(`${BASE_URL}/ftc`, '0.9', 'weekly');
    urls += urlEntry(`${BASE_URL}/comp`, '0.9', 'weekly');

    lessonsWithMtime.forEach(({ sectionPath, id, lastmod }) => {
        urls += urlEntry(`${BASE_URL}/${sectionPath}/${id}`, '0.8', 'monthly', lastmod);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function main() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const lessons = getLessonList();
    const lessonsWithMtime = [];

    lessons.forEach(({ id, file, sectionPath }) => {
        const absPath = path.join(ROOT, file);
        if (!fs.existsSync(absPath)) {
            console.warn('Skip (missing file):', file);
            return;
        }
        const stat = fs.statSync(absPath);
        let data;
        try {
            data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        } catch (e) {
            console.warn('Skip (invalid JSON):', file, e.message);
            return;
        }

        const dir = path.join(OUT_DIR, sectionPath, id);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const html = buildLessonHtml(file, id, sectionPath, data);
        fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');

        const lastmod = stat.mtime.toISOString().slice(0, 10);
        lessonsWithMtime.push({ sectionPath, id, lastmod });
    });

    const sitemap = buildSitemap(lessonsWithMtime);
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

    copyOutToRoot();
    console.log(`Generated ${lessonsWithMtime.length} lesson pages, sitemap.xml, and copied to publish root.`);
}

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(name => copyRecursive(path.join(src, name), path.join(dest, name)));
    } else {
        fs.copyFileSync(src, dest);
    }
}

function copyOutToRoot() {
    const sections = ['java', 'ftc', 'frc', 'comp'];
    sections.forEach(section => {
        const srcDir = path.join(OUT_DIR, section);
        const destDir = path.join(ROOT, section);
        if (fs.existsSync(srcDir)) {
            if (fs.existsSync(destDir)) {
                fs.rmSync(destDir, { recursive: true });
            }
            copyRecursive(srcDir, destDir);
        }
    });
}

main();
