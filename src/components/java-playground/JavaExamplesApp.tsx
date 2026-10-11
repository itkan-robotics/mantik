import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import RunnableJavaExample from '@/components/java-playground/RunnableJavaExample';
import { looksLikeRunnableJava, type PageContext } from '@/lib/java-playground/exampleSource';
import { preloadJavaRuntimeSoon } from '@/lib/java-playground/preloadJavaRuntime';

interface ExampleItem {
  id: string;
  root: HTMLElement;
  mount: HTMLElement;
  original: string;
  /** The page's Java fences and this example's place among them, for shared classes. */
  context: PageContext;
  inExercise: boolean;
}

const originals = new Map<string, string>();
const contextById = new Map<string, PageContext>();

let pageFencesCache: string[] | null = null;
function pageFences(): string[] {
  if (pageFencesCache) return pageFencesCache;
  const script = document.querySelector<HTMLScriptElement>('script[data-jp-fences]');
  try {
    const parsed = script ? (JSON.parse(script.textContent ?? '[]') as unknown) : [];
    pageFencesCache = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    pageFencesCache = [];
  }
  return pageFencesCache;
}

function decodeSource(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function scanExamples(): ExampleItem[] {
  const items: ExampleItem[] = [];
  const seen = new Set<string>();

  document.querySelectorAll<HTMLElement>('[data-jp-example]').forEach((root, index) => {
    if (root.dataset.jpHydrated === 'true') {
      const mount = root.querySelector<HTMLElement>('.jp-example-react');
      const id = root.dataset.jpId;
      const original = id ? originals.get(id) : undefined;
      if (mount && id && original != null) {
        seen.add(id);
        items.push({
          id,
          root,
          mount,
          original,
          context: contextById.get(id) ?? { fences: [], index: 0 },
          inExercise: root.classList.contains('jp-example-in-exercise'),
        });
      }
      return;
    }

    const encoded = root.dataset.jpSource;
    if (!encoded) return;
    let original: string;
    try {
      original = decodeSource(encoded);
    } catch {
      return;
    }
    if (!looksLikeRunnableJava(original)) {
      const pre = root.querySelector('pre');
      if (pre) root.replaceWith(pre);
      return;
    }

    const id = `jp-ex-${index}-${Math.random().toString(36).slice(2, 8)}`;
    const inExercise = Boolean(root.closest('.exercise-box'));
    root.dataset.jpHydrated = 'true';
    root.dataset.jpId = id;
    if (inExercise) root.classList.add('jp-example-in-exercise');

    const mount = document.createElement('div');
    mount.className = 'jp-example-react';
    root.append(mount);
    originals.set(id, original);
    const fenceIndex = Number(root.dataset.jpFence);
    const context: PageContext = Number.isFinite(fenceIndex)
      ? { fences: pageFences(), index: fenceIndex }
      : { fences: [], index: 0 };
    contextById.set(id, context);
    seen.add(id);

    items.push({ id, root, mount, original, context, inExercise });
  });

  for (const id of originals.keys()) {
    if (!seen.has(id)) originals.delete(id);
  }

  return items;
}

export default function JavaExamplesApp() {
  const [items, setItems] = useState<ExampleItem[]>([]);
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    preloadJavaRuntimeSoon();
  }, []);

  useEffect(() => {
    const apply = () => setItems(scanExamples());
    apply();
    document.addEventListener('astro:page-load', apply);
    return () => document.removeEventListener('astro:page-load', apply);
  }, []);

  const handleEditingChange = useCallback((id: string, isEditing: boolean) => {
    setEditing((prev) => {
      if (prev[id] === isEditing) return prev;
      return { ...prev, [id]: isEditing };
    });
  }, []);

  useEffect(() => {
    for (const item of items) {
      const open = item.inExercise || Boolean(editing[item.id]);
      item.root.classList.toggle('jp-example-editing', open);
    }
  }, [editing, items]);

  const footnoteId = items[0]?.id;

  return (
    <>
      {items.map((item) =>
        createPortal(
          <RunnableJavaExample
            key={item.id}
            id={item.id}
            original={item.original}
            context={item.context}
            inExercise={item.inExercise}
            showFootnote={item.id === footnoteId}
            onEditingChange={handleEditingChange}
          />,
          item.mount,
        ),
      )}
    </>
  );
}
