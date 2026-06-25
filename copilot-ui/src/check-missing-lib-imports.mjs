import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const srcRoot = path.dirname(fileURLToPath(import.meta.url));
const libRoot = path.join(srcRoot, 'lib');
const SCRIPT = 'check-missing-lib-imports.mjs';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function exists(spec) {
  const rel = spec.replace(/\.tsx?$/, '');
  const base = path.join(libRoot, ...rel.split('/'));
  const c = [base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  return c.some((f) => fs.existsSync(f));
}

const re = /@\/lib\/([a-zA-Z0-9_./-]+)/g;
const missing = new Set();

for (const file of walk(srcRoot)) {
  if (file.endsWith(SCRIPT)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('@/lib/')) continue;
    if (!/^\s*(import|export)\b/.test(line) && !/import\s*\(/.test(line)) continue;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line))) {
      const spec = m[1];
      if (!exists(spec)) missing.add('@/lib/' + spec);
    }
  }
}

const list = [...missing].sort();
console.log('=== MISSING @/lib imports (' + list.length + ') ===');
for (const item of list) console.log(item);
