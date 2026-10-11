function walk(node, visit) {
  visit(node);
  const children = node.children || [];
  for (const child of children) walk(child, visit);
}

/** Fence meta "java norun" keeps an example static (no Run control). */
export function remarkJavaNorun() {
  return function transformer(tree) {
    walk(tree, (node) => {
      if (node.type !== 'code' || node.lang !== 'java') return;
      const meta = node.meta || '';
      if (!/\bnorun\b/i.test(meta)) return;
      if (!node.data) node.data = {};
      node.data.hProperties = {
        ...(node.data.hProperties || {}),
        dataJavaNorun: '',
      };
    });
  };
}
