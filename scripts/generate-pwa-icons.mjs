/**
 * Generates PNG install icons from public/media/mantik-icon.svg.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'public', 'media', 'mantik-icon.svg');
const outDir = path.join(root, 'public', 'icons');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('sharp not installed; skip PNG icon generation (install sharp to regenerate).');
    process.exit(0);
  }

  if (!fs.existsSync(svgPath)) {
    console.error('Missing', svgPath);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const svg = fs.readFileSync(svgPath);

  for (const size of [192, 512]) {
    const out = path.join(outDir, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log('Wrote', path.relative(root, out));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
