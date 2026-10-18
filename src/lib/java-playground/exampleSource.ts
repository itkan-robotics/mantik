import { hasMainMethod, publicClassName, withoutComments } from './sourceChecks';

export interface WrappedExample {
  source: string;
  entryClass: string;
  hasMain: boolean;
  wrapped: boolean;
}

const UTIL_TYPES = [
  'ArrayList',
  'LinkedList',
  'HashMap',
  'HashSet',
  'TreeMap',
  'TreeSet',
  'Scanner',
  'Queue',
  'Deque',
  'ArrayDeque',
  'PriorityQueue',
  'Collections',
  'Arrays',
  'Optional',
  'Objects',
  'Iterator',
  'List',
  'Map',
  'Set',
  'Comparator',
];

const FUNCTION_TYPES = [
  'Function',
  'Consumer',
  'Supplier',
  'Predicate',
  'BiFunction',
  'BiConsumer',
  'BiPredicate',
  'UnaryOperator',
  'BinaryOperator',
  'DoubleSupplier',
  'IntSupplier',
  'BooleanSupplier',
  'IntFunction',
  'ToIntFunction',
];

const CONCURRENT_TYPES = [
  'ExecutorService',
  'Executors',
  'Future',
  'Callable',
  'CountDownLatch',
  'ConcurrentHashMap',
  'CopyOnWriteArrayList',
  'Semaphore',
  'ThreadPoolExecutor',
  'TimeUnit',
  'CompletableFuture',
  'ScheduledExecutorService',
  'ScheduledFuture',
];

const STREAM_TYPES = ['Stream', 'Collectors', 'IntStream', 'LongStream', 'DoubleStream'];

const ATOMIC_TYPES = ['AtomicInteger', 'AtomicBoolean', 'AtomicLong'];

/** Replace comments with spaces so regex indexes still match the original source. */
export function maskComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => ' '.repeat(block.length))
    .replace(/\/\/.*$/gm, (line) => ' '.repeat(line.length));
}

export function exampleNeedsStdin(source: string): boolean {
  const masked = maskComments(source);
  return /\bScanner\b/.test(masked) || /\bSystem\.in\b/.test(masked);
}

const READ_CALL = /\.(?:nextLine|nextInt|nextDouble|next|readLine)\s*\(/g;

function countReads(text: string): number {
  return (maskComments(text).match(READ_CALL) || []).length;
}

interface BraceBlock {
  start: number;
  end: number;
  body: string;
}

function extractBraceBlocks(source: string, headerRe: RegExp): BraceBlock[] {
  const masked = maskComments(source);
  const blocks: BraceBlock[] = [];
  const re = new RegExp(headerRe.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(masked))) {
    let i = match.index + match[0].length;
    while (i < masked.length && /\s/.test(masked[i] ?? '')) i += 1;
    if (masked[i] !== '{') continue;
    i += 1;
    const bodyStart = i;
    let depth = 1;
    while (i < masked.length && depth > 0) {
      if (masked[i] === '{') depth += 1;
      else if (masked[i] === '}') depth -= 1;
      if (depth === 0) break;
      i += 1;
    }
    blocks.push({ start: bodyStart, end: i, body: source.slice(bodyStart, i) });
    re.lastIndex = i + 1;
  }
  return blocks;
}

/** True when a while(true) would never exit (freezes the tab). */
export function exampleLooksNonterminating(source: string): boolean {
  if (/runs forever/i.test(source)) return true;
  for (const block of extractBraceBlocks(source, /while\s*\(\s*true\s*\)/g)) {
    const body = maskComments(block.body);
    const canStop =
      /\bbreak\b/.test(body) || /\breturn\b/.test(body) || countReads(block.body) > 0;
    if (!canStop) return true;
  }
  return false;
}

function stdinForLoopBody(body: string): string[] {
  const masked = maskComments(body);
  if (/\.equals(?:IgnoreCase)?\s*\(\s*"y"/i.test(masked)) {
    return ['n', 'y'];
  }
  if (/\.equals(?:IgnoreCase)?\s*\(\s*"(quit|exit)"/i.test(masked)) {
    return ['5', 'quit'];
  }
  const counted = masked.match(/\b(?:numbersRead|count|readCount)\s*==\s*(\d+)/);
  if (counted && /\bbreak\b/.test(masked)) {
    const n = Number(counted[1]);
    return Array.from({ length: n }, (_, i) => String(i + 1));
  }
  if (/(?<![!=])==\s*999\b/.test(masked) && /\bbreak\b/.test(masked)) {
    const lines: string[] = [];
    if (/\bcontinue\b/.test(masked)) lines.push('-2');
    lines.push('15', '999');
    return lines;
  }
  if (/(?<![!=])==\s*-1\b/.test(masked) && /\bbreak\b/.test(masked)) {
    const lines = ['42'];
    if (/\bcontinue\b/.test(masked)) lines.push('150');
    lines.push('-1');
    return lines;
  }
  if (/(?<![!=])==\s*0\b/.test(masked) && /\bbreak\b/.test(masked)) {
    return ['4', '1', '0'];
  }
  if (/\bInteger\.(?:valueOf|parseInt)|parseInt\s*\(|\.nextInt\s*\(/.test(masked)) {
    return ['3', '0'];
  }
  return ['y'];
}

function sequentialStdinLines(source: string, count: number): string[] {
  const masked = maskComments(source);
  if (count <= 0) return [];
  if (/sensor index|0-3/.test(masked)) return ['1'];
  if (/How many robots|teamSize/.test(masked) && count >= 3) {
    return ['1', 'Spark', '3476'];
  }
  if (/\bInteger\.(?:valueOf|parseInt)|parseInt\s*\(|parseDouble|nextInt|nextDouble/.test(masked)) {
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }
  return Array.from({ length: count }, () => 'hello');
}

/**
 * Sample stdin so Scanner / System.in examples finish instead of throwing or hanging.
 */
export function suggestExampleStdin(source: string): string {
  if (!exampleNeedsStdin(source)) return '';
  const lines: string[] = [];
  const inputLoops = extractBraceBlocks(source, /while\s*\(\s*true\s*\)/g).filter(
    (block) => countReads(block.body) > 0,
  );

  if (inputLoops.length > 0) {
    const first = inputLoops[0];
    const before = source.slice(0, first.start);
    lines.push(...sequentialStdinLines(before, countReads(before)));
    for (const block of inputLoops) {
      lines.push(...stdinForLoopBody(block.body));
    }
  } else {
    lines.push(...sequentialStdinLines(source, countReads(source)));
  }

  if (lines.length === 0) return '';
  return `${lines.join('\n')}\n`;
}

/**
 * True when a fenced Java example is worth compiling in the browser.
 * Skips placeholders, comment-only blocks, and Git snippets tagged as java.
 */
export function looksLikeRunnableJava(source: string): boolean {
  if (/<code>|&lt;code/.test(source)) return false;
  if (exampleLooksNonterminating(source)) return false;
  const body = withoutComments(source).trim();
  if (!body) return false;
  if (/^\s*git\b/m.test(body) && !/\b(class|interface|enum)\s+[A-Za-z_]/.test(body)) {
    return false;
  }
  if (/\b(class|interface|enum)\s+[A-Za-z_]/.test(body)) return true;
  if (/\bSystem\.out\b/.test(body)) return true;
  if (hasTopLevelMember(body)) return true;
  if (!/;/.test(body)) return false;
  if (/\b(int|long|short|byte|double|float|boolean|char|void|String|var|if|for|while|do|switch|new|return|try|throw)\b/.test(body)) {
    return true;
  }
  return /\w+\s*\(.*\)\s*;/.test(body);
}

interface TypeDecl {
  kind: 'class' | 'interface' | 'enum' | 'record';
  name: string;
  isPublic: boolean;
  index: number;
}

function findTypeDeclaration(source: string): TypeDecl | null {
  return collectTypeSpans(source)[0]?.decl ?? null;
}

interface TypeSpan {
  decl: TypeDecl;
  /** Exclusive index after the type's closing brace. */
  end: number;
}

function braceDepthAt(masked: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    if (masked[i] === '{') depth += 1;
    else if (masked[i] === '}') depth -= 1;
  }
  return depth;
}

function matchingBraceEnd(masked: string, start: number): number {
  let i = start;
  while (i < masked.length && masked[i] !== '{') i += 1;
  if (i >= masked.length) return masked.length;
  let depth = 0;
  for (; i < masked.length; i += 1) {
    if (masked[i] === '{') depth += 1;
    else if (masked[i] === '}') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return masked.length;
}

function collectTypeSpans(source: string): TypeSpan[] {
  const masked = maskComments(source);
  const re =
    /(?:^|\n)[ \t]*(public\s+)?(?:(?:abstract|final|strictfp|static)\s+)*(class|interface|enum|record)\s+([A-Za-z_]\w*)/g;
  const spans: TypeSpan[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(masked))) {
    if (braceDepthAt(masked, match.index) !== 0) continue;
    const newline = match[0].startsWith('\n') ? 1 : 0;
    const decl: TypeDecl = {
      isPublic: Boolean(match[1]),
      kind: match[2] as TypeDecl['kind'],
      name: match[3],
      index: match.index + newline,
    };
    const end = matchingBraceEnd(masked, decl.index);
    spans.push({ decl, end });
    re.lastIndex = end;
  }
  return spans;
}

function isAnnotationOnly(text: string): boolean {
  const body = withoutComments(text).trim();
  if (!body) return false;
  return /^(?:@[\w.]+(?:\([^;]*\))?\s*)+$/.test(body);
}

/** Lesson snippets often mix types with a demo. Java allows only one public type per file. */
/** `static class X` is a nested-class habit; at the top level of a unit it is an error. */
function stripTopLevelStatic(source: string): string {
  return source.replace(
    /(^|\n)([ \t]*)((?:public\s+)?)static\s+((?:(?:abstract|final|strictfp)\s+)*)(class|interface|enum|record)\b/g,
    '$1$2$3$4$5',
  );
}

function demotePublicTypes(source: string): string {
  return stripTopLevelStatic(source).replace(
    /(^|\n)([ \t]*)public\s+((?:(?:abstract|final|strictfp)\s+)*)(class|interface|enum|record)\b/g,
    '$1$2$3$4',
  );
}

/**
 * A fragment can mix members (methods, fields with modifiers) with statements that
 * use them. Split at the top level: members go into the class body, statements into
 * main. Methods declared without a modifier are made static so main can call them.
 */
function splitMembersAndStatements(body: string): { members: string; statements: string } {
  const lines = body.split('\n');
  const masked = maskComments(body).split('\n');
  const members: string[] = [];
  const statements: string[] = [];
  let depth = 0;
  let inMember = false;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = masked[i]?.trim() ?? '';
    if (depth === 0 && !inMember && trimmed && !isControlOrBlockStart(trimmed) && looksLikeMember(trimmed)) {
      inMember = true;
      const needsStatic =
        !/^(?:public|private|protected|static|final|native|synchronized|abstract|strictfp|default)\b/.test(trimmed) &&
        /\(/.test(trimmed);
      lines[i] = needsStatic ? lines[i].replace(/^(\s*)/, '$1static ') : lines[i];
    }
    (inMember ? members : statements).push(lines[i]);
    for (const ch of masked[i] ?? '') {
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
    }
    if (inMember && depth === 0 && /[;}]\s*$/.test(trimmed)) inMember = false;
  }
  return { members: members.join('\n'), statements: statements.join('\n') };
}

function wrapMembersAndStatements(preamble: string, types: string, extra: string): WrappedExample {
  const { members, statements } = splitMembersAndStatements(extra);
  const hasStatements = Boolean(withoutComments(statements).trim());
  const hasMembers = Boolean(withoutComments(members).trim());
  const mainBlock = hasStatements
    ? [
        '    public static void main(String[] args) throws Exception {',
        indentBlock(statements.replace(/^\n+|\s+$/g, ''), 8),
        '    }',
      ].join('\n')
    : '';
  const memberBlock = hasMembers ? indentBlock(members.replace(/^\n+|\s+$/g, ''), 4) : '';
  const combined = joinParts(
    preamble,
    types ? demotePublicTypes(types) : '',
    ['public class Main {', memberBlock, memberBlock && mainBlock ? '' : undefined, mainBlock, '}']
      .filter((part) => part !== undefined && part !== '')
      .join('\n'),
  );
  const withImports = ensureCommonImports(combined.endsWith('\n') ? combined : `${combined}\n`);
  return {
    source: withImports,
    entryClass: 'Main',
    hasMain: hasStatements || hasMainMethod(members),
    wrapped: true,
  };
}

function splitPreamble(source: string): { preamble: string; body: string } {
  const lines = source.split('\n');
  const maskedLines = maskComments(source).split('\n');
  let i = 0;
  while (i < lines.length) {
    const trimmed = maskedLines[i]?.trim() ?? '';
    if (
      trimmed === '' ||
      trimmed.startsWith('package ') ||
      trimmed.startsWith('import ')
    ) {
      i += 1;
      continue;
    }
    break;
  }
  return {
    preamble: lines.slice(0, i).join('\n'),
    body: lines.slice(i).join('\n'),
  };
}

function hasTopLevelMember(code: string): boolean {
  const stripped = withoutComments(code);
  let depth = 0;
  for (const line of stripped.split('\n')) {
    const trimmed = line.trim();
    if (depth === 0 && trimmed && !isControlOrBlockStart(trimmed) && looksLikeMember(trimmed)) {
      return true;
    }
    for (const ch of line) {
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
    }
  }
  return false;
}

function isControlOrBlockStart(trimmed: string): boolean {
  return /^(if|for|while|switch|catch|try|else|do|synchronized)\b/.test(trimmed);
}

function looksLikeMember(trimmed: string): boolean {
  if (
    /^(?:public|private|protected|static|final|native|synchronized|abstract|strictfp|default)\b/.test(
      trimmed,
    ) &&
    (/\(.*\)\s*\{/.test(trimmed) || (/\(/.test(trimmed) && !/;\s*$/.test(trimmed)))
  ) {
    return true;
  }
  if (
    /^(?:public|private|protected|static|final)\b/.test(trimmed) &&
    /;\s*$/.test(trimmed) &&
    !trimmed.includes('(')
  ) {
    return true;
  }
  // A method declared without any modifier — `void record(double reading) {` — is
  // still a member. Distinguish it from a call or a control statement by shape:
  // a type, a name, a parameter list, an opening brace, and no control keyword.
  if (
    /^(?!(?:if|for|while|switch|catch|synchronized|try|else|do|return|new|throw)\b)[A-Za-z_][\w<>\[\],.? ]*\s+[A-Za-z_]\w*\s*\([^)]*\)\s*(?:throws\s+[\w., ]+)?\s*\{/.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text.replace(/^(?!\s*$)/gm, pad);
}

function joinParts(...parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join('\n\n');
}

function usesType(masked: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(masked);
}

function ensureCommonImports(source: string): string {
  const masked = maskComments(source);
  const extras: string[] = [];
  if (!/import\s+java\.util\./.test(masked) && UTIL_TYPES.some((name) => usesType(masked, name))) {
    extras.push('import java.util.*;');
  }
  if (
    !/import\s+java\.util\.function\./.test(masked) &&
    FUNCTION_TYPES.some((name) => usesType(masked, name))
  ) {
    extras.push('import java.util.function.*;');
  }
  if (
    !/import\s+java\.util\.concurrent\./.test(masked) &&
    CONCURRENT_TYPES.some((name) => usesType(masked, name))
  ) {
    extras.push('import java.util.concurrent.*;');
  }
  if (
    !/import\s+java\.util\.stream\./.test(masked) &&
    STREAM_TYPES.some((name) => usesType(masked, name))
  ) {
    extras.push('import java.util.stream.*;');
  }
  if (
    !/import\s+java\.util\.concurrent\.atomic\./.test(masked) &&
    ATOMIC_TYPES.some((name) => usesType(masked, name))
  ) {
    extras.push('import java.util.concurrent.atomic.*;');
  }
  if (extras.length === 0) return source;
  const { preamble, body } = splitPreamble(source);
  return joinParts(preamble, extras.join('\n'), body) + '\n';
}

function wrapAsClassBody(preamble: string, body: string): WrappedExample {
  const innerHasMain = hasMainMethod(body);
  const source = ensureCommonImports(
    joinParts(preamble, `public class Main {\n${body.replace(/\s+$/, '')}\n}`) + '\n',
  );
  return {
    source,
    entryClass: 'Main',
    hasMain: innerHasMain,
    wrapped: true,
  };
}

function wrapAsStatements(preamble: string, body: string): WrappedExample {
  const source = ensureCommonImports(
    joinParts(
      preamble,
      [
        'public class Main {',
        '    public static void main(String[] args) throws Exception {',
        indentBlock(body.replace(/\s+$/, ''), 8),
        '    }',
        '}',
      ].join('\n'),
    ) + '\n',
  );
  return {
    source,
    entryClass: 'Main',
    hasMain: true,
    wrapped: true,
  };
}

/**
 * Turn a lesson snippet into a compilation unit CheerpJ can run.
 * Full programs keep their class name; fragments are wrapped in Main.
 */
/**
 * Top-level type declarations a fence contributes to the rest of its page, with
 * the fence's own import lines so they compile wherever they are pulled in.
 */
interface ContextDecl {
  name: string;
  text: string;
  imports: string[];
}

function contextDeclarations(fence: string): ContextDecl[] {
  const source = fence.replace(/\r\n/g, '\n');
  const imports = maskComments(source)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('import '));
  return collectTypeSpans(source).map(({ decl, end }) => ({
    name: decl.name,
    text: source.slice(decl.index, end),
    imports,
  }));
}

/** The other Java fences on an example's page, and where the example sits among them. */
export interface PageContext {
  fences: string[];
  index: number;
}

/**
 * Lesson pages build a class across several fences and then use it in later ones —
 * and sometimes show the use first. Pick the type declarations the example refers to
 * but does not declare, transitively. A fence that comes earlier on the page wins
 * over a later one (the latest earlier definition is the one the reader has seen);
 * later fences only fill in names nothing earlier declared.
 */
export function selectPageContext(source: string, context: PageContext): string {
  const decls = new Map<string, ContextDecl>();
  for (let i = 0; i < context.index && i < context.fences.length; i += 1) {
    for (const decl of contextDeclarations(context.fences[i])) decls.set(decl.name, decl);
  }
  for (let i = context.index + 1; i < context.fences.length; i += 1) {
    for (const decl of contextDeclarations(context.fences[i])) {
      if (!decls.has(decl.name)) decls.set(decl.name, decl);
    }
  }
  if (decls.size === 0) return '';
  const own = new Set(collectTypeSpans(source.replace(/\r\n/g, '\n')).map((s) => s.decl.name));
  const identifiers = (text: string) => new Set(maskComments(text).match(/\b[A-Z]\w*/g) ?? []);
  const needed = new Map<string, ContextDecl>();
  const queue = [...identifiers(source)];
  while (queue.length) {
    const name = queue.pop()!;
    if (own.has(name) || needed.has(name)) continue;
    const decl = decls.get(name);
    if (!decl) continue;
    needed.set(name, decl);
    queue.push(...identifiers(decl.text));
  }
  if (needed.size === 0) return '';
  // Keep page order so a class comes before the subclass that extends it.
  const ordered = [...decls.values()].filter((d) => needed.has(d.name));
  const imports = [...new Set(ordered.flatMap((d) => d.imports))];
  return joinParts(imports.join('\n'), demotePublicTypes(ordered.map((d) => d.text).join('\n\n')));
}

function spliceContext(unit: string, context: string): string {
  if (!context) return unit;
  const { preamble, body } = splitPreamble(unit);
  const contextPreamble = splitPreamble(context);
  const imports = [
    ...new Set(
      [preamble, contextPreamble.preamble]
        .join('\n')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ].join('\n');
  return joinParts(imports, contextPreamble.body, body) + (unit.endsWith('\n') ? '\n' : '');
}

/**
 * Wrap a lesson snippet into a compilable unit. With a page context, any types the
 * page's other fences declare and this snippet uses are spliced in, so an example
 * can build on the class introduced a few paragraphs up.
 */
export function wrapExampleSource(raw: string, context?: PageContext): WrappedExample {
  const wrapped = wrapExampleSourceAlone(raw);
  if (!context || context.fences.length < 2) return wrapped;
  const block = selectPageContext(raw, context);
  if (!block) return wrapped;
  return { ...wrapped, source: spliceContext(wrapped.source, block) };
}

function wrapExampleSourceAlone(raw: string): WrappedExample {
  const source = raw.replace(/\r\n/g, '\n');
  const { preamble, body } = splitPreamble(source);
  const spans = collectTypeSpans(body);

  if (spans.length > 0) {
    const first = spans[0];
    const last = spans[spans.length - 1];
    const leading = body.slice(0, first.decl.index);
    const types = body.slice(first.decl.index, last.end);
    const trailing = body.slice(last.end);
    const annotationLead = isAnnotationOnly(leading);
    const keepLeading =
      Boolean(maskComments(leading).trim()) && !hasTopLevelMember(leading) && !annotationLead;
    const typeBlock = annotationLead ? joinParts(leading.trim(), types) : types;
    const extra = joinParts(keepLeading ? leading : '', trailing);
    const extraCode = withoutComments(extra).trim();

    if (extraCode) {
      return wrapMembersAndStatements(preamble, typeBlock, extra);
    }

    const unit = joinParts(preamble, stripTopLevelStatic(typeBlock)) + (source.endsWith('\n') ? '\n' : '');
    const withImports = ensureCommonImports(unit.endsWith('\n') ? unit : `${unit}\n`);
    const publicName = publicClassName(withImports);
    const entryClass = publicName ?? first.decl.name;
    const kind = findTypeDeclaration(withImports)?.kind ?? first.decl.kind;
    return {
      source: withImports,
      entryClass,
      hasMain: kind === 'class' && hasMainMethod(withImports),
      wrapped: Boolean(maskComments(leading).trim()),
    };
  }

  if (hasTopLevelMember(body)) {
    const { statements } = splitMembersAndStatements(body);
    const statementLines = withoutComments(statements)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const onlyDeclarations = statementLines.every((l) =>
      /^[A-Za-z_][\w<>\[\],.? ]*\s+[A-Za-z_]\w*(?:\s*=\s*[^;]+)?;$/.test(l),
    );
    if (statementLines.length > 0 && !onlyDeclarations) {
      return wrapMembersAndStatements(preamble, '', body);
    }
    return wrapAsClassBody(preamble, body);
  }

  return wrapAsStatements(preamble, body);
}
