import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(resolve(__dirname, '../public/favicon.svg'), 'utf-8');

const sizes = [180, 152, 167, 144, 120, 76, 192, 512];

for (const size of sizes) {
  const png = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(resolve(__dirname, `../public/icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png`);
}
