#!/usr/bin/env node
/**
 * Downloads Eclipse Compiler for Java (ECJ) into public/ so CheerpJ can
 * compile student code in the browser. Skips the download when a large
 * enough versioned jar is already present.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const destDir = path.resolve(__dirname, '../public/java-playground');
const filename = 'ecj-3.46.100.jar';
const dest = path.join(destDir, filename);
const legacy = path.join(destDir, 'ecj.jar');
// 3.46.100 is Java 17 bytecode, matching the Java 17 CheerpJ runtime, and supports
// source levels up to 26. The compiler and the runtime have to move together:
// ECJ 3.16 is Java 8 bytecode and will not load on a Java 17 runtime, or vice versa.
const ECJ_URL = 'https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.46.100/ecj-3.46.100.jar';
const MIN_BYTES = 500_000;
const force = process.argv.includes('--force');

if (!force && fs.existsSync(dest) && fs.statSync(dest).size >= MIN_BYTES) {
  console.log(`java-playground: using existing ${path.relative(process.cwd(), dest)}`);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

if (!force && fs.existsSync(legacy) && fs.statSync(legacy).size >= MIN_BYTES) {
  fs.copyFileSync(legacy, dest);
  console.log(`java-playground: copied ${path.relative(process.cwd(), legacy)} → ${filename}`);
  process.exit(0);
}

console.log('java-playground: downloading ECJ from Maven Central…');

const res = await fetch(ECJ_URL);
if (!res.ok) {
  throw new Error(`Failed to download ECJ: ${res.status} ${res.statusText} (${ECJ_URL})`);
}

const buf = Buffer.from(await res.arrayBuffer());
if (buf.byteLength < MIN_BYTES) {
  throw new Error(`ECJ download too small (${buf.byteLength} bytes)`);
}

fs.writeFileSync(dest, buf);
console.log(`java-playground: wrote ${path.relative(process.cwd(), dest)} (${buf.byteLength} bytes)`);
