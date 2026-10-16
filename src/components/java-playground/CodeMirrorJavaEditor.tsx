import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { useEffect, useRef } from 'react';
import type { SiteTheme } from '@/lib/useSiteTheme';

interface Props {
  code: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  theme: SiteTheme;
}

const lightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#0550ae' },
  { tag: t.controlKeyword, color: '#0550ae' },
  { tag: t.string, color: '#0a3069' },
  { tag: t.number, color: '#0550ae' },
  { tag: t.comment, color: '#6e7781', fontStyle: 'italic' },
  { tag: t.definition(t.variableName), color: '#953800' },
  { tag: t.typeName, color: '#953800' },
  { tag: t.className, color: '#953800' },
  { tag: t.operator, color: '#cf222e' },
  { tag: t.bool, color: '#0550ae' },
  { tag: t.null, color: '#0550ae' },
]);

const darkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#ff7b72' },
  { tag: t.controlKeyword, color: '#ff7b72' },
  { tag: t.string, color: '#a5d6ff' },
  { tag: t.number, color: '#79c0ff' },
  { tag: t.comment, color: '#8b949e', fontStyle: 'italic' },
  { tag: t.definition(t.variableName), color: '#ffa657' },
  { tag: t.typeName, color: '#ffa657' },
  { tag: t.className, color: '#ffa657' },
  { tag: t.operator, color: '#ff7b72' },
  { tag: t.bool, color: '#79c0ff' },
  { tag: t.null, color: '#79c0ff' },
]);

function editorTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'var(--color-code-background)',
        color: 'var(--color-code-foreground)',
      },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: '0.875rem', // rem: follows the reader's text-size preference
        lineHeight: '1.5',
      },
      '.cm-content': {
        paddingTop: '12px',
        paddingBottom: '12px',
        caretColor: 'var(--color-code-foreground)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--color-background-secondary)',
        color: 'var(--color-foreground-muted)',
        borderRight: '1px solid var(--color-background-border)',
      },
      '.cm-activeLine': {
        backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--color-code-foreground)',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
      },
    },
    { dark },
  );
}

function themeExtensions(theme: SiteTheme) {
  const dark = theme === 'dark';
  return [
    editorTheme(dark),
    syntaxHighlighting(dark ? darkHighlight : lightHighlight, { fallback: true }),
  ];
}

export default function CodeMirrorJavaEditor({
  code,
  onChange,
  readOnly = false,
  theme,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readOnlyCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          history(),
          java(),
          indentUnit.of('    '),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
          readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
          themeCompartment.current.of(themeExtensions(theme)),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once; later updates go through compartments / dispatch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor is created once
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === code) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: code },
    });
  }, [code]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.current.reconfigure(themeExtensions(theme)),
    });
  }, [theme]);

  return <div ref={parentRef} className="jp-cm" />;
}
