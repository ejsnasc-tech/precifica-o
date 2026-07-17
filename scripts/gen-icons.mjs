// Gera icon-192.png e icon-512.png com puro Node.js (sem dependências)
import { createDeflate } from "zlib";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function adler32(buf) {
  let s1 = 1, s2 = 0;
  for (const b of buf) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
  return (s2 << 16) | s1;
}

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const header = Buffer.from(type, "ascii");
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([header, data])), 0);
  return Buffer.concat([len, header, data, crc]);
}

async function deflate(buf) {
  return new Promise((res, rej) => {
    const chunks = [];
    const d = createDeflate({ level: 6 });
    d.on("data", (c) => chunks.push(c));
    d.on("end", () => res(Buffer.concat(chunks)));
    d.on("error", rej);
    d.write(buf); d.end();
  });
}

// Renderiza pixel por pixel com gradiente + texto "$"
function renderPixel(x, y, size) {
  const r = size * 0.22; // corner radius
  const cx = size / 2, cy = size / 2;

  // Verifica se está dentro do rounded rect
  const dx = Math.max(r - x, 0, x - (size - r));
  const dy = Math.max(r - y, 0, y - (size - r));
  if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0]; // transparente

  // Gradiente diagonal (indigo → violet)
  const t = (x + y) / (size * 2);
  const rr = Math.round(79 + (124 - 79) * t);
  const g  = Math.round(70 + (58  - 70) * t);
  const b  = Math.round(229+ (237 - 229) * t);

  // Círculo central para o "$" (simplificado — apenas a cor de fundo)
  return [rr, g, b, 255];
}

async function generatePNG(size) {
  // Renderiza RGBA
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = renderPixel(x, y, size);
      const i = (y * size + x) * 4;
      pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
    }
  }

  // Constrói raw image data (RGBA, filter byte 0 por linha)
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter type None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }
  const rawBuf = Buffer.from(raw);

  // Comprime (zlib)
  const compressed = await deflate(rawBuf);

  // Adiciona header zlib manualmente se necessário... na verdade createDeflate já gera o formato correto para PNG
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

for (const size of [192, 512]) {
  const buf = await generatePNG(size);
  writeFileSync(join(publicDir, `icon-${size}.png`), buf);
  console.log(`✓ icon-${size}.png`);
}
console.log("Ícones gerados com sucesso!");
