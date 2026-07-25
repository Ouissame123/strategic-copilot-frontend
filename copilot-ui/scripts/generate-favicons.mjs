/**
 * Génère favicon.ico / PNG teal à partir du SVG (boussole #0F6E56).
 * Usage: node scripts/generate-favicons.mjs
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pub = join(root, "public");

function ensureSharp() {
  try {
    return createRequire(import.meta.url)("sharp");
  } catch {
    console.log("Installing sharp (dev)…");
    execSync("npm install --no-save sharp", { cwd: root, stdio: "inherit" });
    return createRequire(import.meta.url)("sharp");
  }
}

function pngToIco(pngBuffers) {
  // Minimal ICO writer: ICONDIR + ICONDIRENTRY[] + PNG payloads
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (const buf of pngBuffers) {
    const size = buf.length;
    // Infer dimensions from PNG IHDR
    const w = buf[16] << 24 | buf[17] << 16 | buf[18] << 8 | buf[19];
    const h = buf[20] << 24 | buf[21] << 16 | buf[22] << 8 | buf[23];
    entries.push({ w: w >= 256 ? 0 : w, h: h >= 256 ? 0 : h, size, offset, buf });
    offset += size;
  }
  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  let entryOff = 6;
  for (const e of entries) {
    out[entryOff] = e.w;
    out[entryOff + 1] = e.h;
    out[entryOff + 2] = 0;
    out[entryOff + 3] = 0;
    out.writeUInt16LE(1, entryOff + 4);
    out.writeUInt16LE(32, entryOff + 6);
    out.writeUInt32LE(e.size, entryOff + 8);
    out.writeUInt32LE(e.offset, entryOff + 12);
    e.buf.copy(out, e.offset);
    entryOff += 16;
  }
  return out;
}

async function main() {
  const sharp = ensureSharp();
  const svgPath = join(pub, "favicon.svg");
  if (!existsSync(svgPath)) throw new Error("Missing public/favicon.svg");
  const svg = readFileSync(svgPath);

  const sizes = [
    { name: "favicon-16x16.png", size: 16 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "apple-touch-icon.png", size: 180 },
  ];

  const pngsForIco = [];
  for (const { name, size } of sizes) {
    const buf = await sharp(svg).resize(size, size).png().toBuffer();
    writeFileSync(join(pub, name), buf);
    console.log("Wrote", name, buf.length, "bytes");
    if (size === 16 || size === 32) pngsForIco.push(buf);
  }

  const ico = pngToIco(pngsForIco);
  writeFileSync(join(pub, "favicon.ico"), ico);
  console.log("Wrote favicon.ico", ico.length, "bytes");

  const viteSvg = join(pub, "vite.svg");
  if (existsSync(viteSvg)) {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(viteSvg);
    console.log("Deleted vite.svg");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
