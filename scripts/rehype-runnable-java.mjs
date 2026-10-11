function classList(node) {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/\s+/);
  return [];
}

function isJavaLessonFile(file) {
  const fm = file?.data?.astro?.frontmatter || file?.data?.frontmatter || {};
  if (fm.group === 'version-control') return false;
  if (fm.section && fm.section !== 'java') return false;
  if (fm.section === 'java') return true;
  const normalized = String(file?.path || file?.history?.[0] || '').replace(/\\/g, '/');
  if (!normalized.includes('/content/java/')) return false;
  if (normalized.includes('/version-control/')) return false;
  return true;
}

function isJavaPre(node) {
  if (node?.type !== 'element' || node.tagName !== 'pre') return false;
  if (node.properties?.dataJavaNorun != null || node.properties?.['data-java-norun'] != null) {
    return false;
  }
  const lang = node.properties?.dataLanguage ?? node.properties?.['data-language'];
  if (lang === 'java') return true;
  return classList(node).includes('language-java');
}

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  const children = node.children || [];
  const lines = children.filter(
    (child) => child.type === 'element' && classList(child).includes('line'),
  );
  if (lines.length > 0) {
    return lines.map(textOf).join('\n');
  }
  return children.map(textOf).join('');
}

function extractPreCode(pre) {
  const code = (pre.children || []).find((child) => child.tagName === 'code') ?? pre;
  return textOf(code);
}

function looksLikeRunnableJava(source) {
  if (/runs forever/i.test(source)) return false;
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
  if (
    /while\s*\(\s*true\s*\)/.test(stripped) &&
    !/\bbreak\b/.test(stripped) &&
    !/\.(?:nextLine|nextInt|readLine)\s*\(/.test(stripped)
  ) {
    return false;
  }
  if (/<code>|&lt;code/.test(source)) return false;
  const body = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ').trim();
  if (!body) return false;
  if (/^\s*git\b/m.test(body) && !/\b(class|interface|enum)\s+[A-Za-z_]/.test(body)) {
    return false;
  }
  if (/\b(class|interface|enum)\s+[A-Za-z_]/.test(body)) return true;
  if (/\bSystem\.out\b/.test(body)) return true;
  if (!/;/.test(body)) return false;
  if (
    /\b(int|long|short|byte|double|float|boolean|char|void|String|var|if|for|while|do|switch|new|return|try|throw)\b/.test(
      body,
    )
  ) {
    return true;
  }
  return /\w+\s*\(.*\)\s*;/.test(body);
}

function walk(node, parent, index, visit) {
  visit(node, parent, index);
  const children = node.children || [];
  for (let i = 0; i < children.length; i += 1) {
    walk(children[i], node, i, visit);
  }
}

/**
 * Wrap highlighted Java example fences with a Run control (hydrated in the browser).
 * Snippets without a class/main are wrapped at run time by wrapExampleSource.
 */
export function rehypeRunnableJava() {
  return function transformer(tree, file) {
    if (!isJavaLessonFile(file)) return;

    // Every Java fence on the page, runnable or not, in document order. An example
    // may use a class that an earlier fence declared, so the runner gets the list
    // and splices in what it needs (see selectPageContext in exampleSource.ts).
    const fences = [];
    const targets = [];
    walk(tree, null, 0, (node, parent, index) => {
      if (!parent) return;
      const isNorun =
        node?.type === 'element' &&
        node.tagName === 'pre' &&
        (node.properties?.dataJavaNorun != null || node.properties?.['data-java-norun'] != null);
      if (!isJavaPre(node) && !isNorun) return;
      if (classList(parent).includes('jp-example')) return;
      const fenceIndex = fences.length;
      // A norun fence is often a deliberately broken illustration ("does not
      // compile"), so it keeps its slot but contributes nothing to the context.
      fences.push(isNorun ? '' : extractPreCode(node));
      if (!isNorun) targets.push({ node, parent, index, fenceIndex });
    });
    let wrappedAny = false;
    for (let i = targets.length - 1; i >= 0; i -= 1) {
      const { node, parent, index, fenceIndex } = targets[i];
      const code = fences[fenceIndex];
      if (!looksLikeRunnableJava(code)) continue;
      wrappedAny = true;
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['jp-example'],
          dataJpExample: '',
          dataJpSource: Buffer.from(code, 'utf8').toString('base64'),
          dataJpFence: String(fenceIndex),
        },
        children: [node],
      };
    }
    if (wrappedAny && fences.length > 1) {
      tree.children.push({
        type: 'element',
        tagName: 'script',
        properties: { type: 'application/json', dataJpFences: '', dataPagefindIgnore: '' },
        children: [{ type: 'text', value: JSON.stringify(fences).replace(/<\//g, '<\\/') }],
      });
    }
  };
}
