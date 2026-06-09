// remove-bg.mjs
import sharp from 'sharp';
import { renameSync } from 'fs';

const THRESHOLD = 50;

async function removeBlackBg(inputPath, outputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < THRESHOLD && g < THRESHOLD && b < THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  const tempPath = outputPath + '.tmp.png';

  await sharp(Buffer.from(data), {
    raw: { width, height, channels },
  })
    .png()
    .toFile(tempPath);

  renameSync(tempPath, outputPath);
  console.log(`✅ Done: ${outputPath}`);
}

await removeBlackBg('public/counselink-round.png', 'public/counselink-round.png');
await removeBlackBg('public/dsa-logo.png', 'public/dsa-logo.png');
console.log('All logos processed!');
