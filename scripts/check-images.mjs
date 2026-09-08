import sharp from "sharp";
import { readFileSync } from "node:fs";

// Эвристики целостности композиции без визуального просмотра:
// яркость центра против фона, цветность, покрытие холста объектом.
const files = process.argv.slice(2);

for (const f of files) {
  const { data, info } = await sharp(readFileSync(f))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const at = (x, y) => ((y * width + x) * channels);

  const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

  let centerLum = 0, centerMax = 0, centerColor = 0, n = 0;
  const cx0 = Math.floor(width * 0.35), cx1 = Math.floor(width * 0.65);
  const cy0 = Math.floor(height * 0.3), cy1 = Math.floor(height * 0.75);
  for (let y = cy0; y < cy1; y += 3) {
    for (let x = cx0; x < cx1; x += 3) {
      const i = at(x, y);
      const l = lum(i);
      centerLum += l;
      centerMax = Math.max(centerMax, l);
      centerColor += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
      n += 1;
    }
  }
  centerLum /= n; centerColor /= n;

  let cornerLum = 0; n = 0;
  for (const [x, y] of [[2, 2], [width - 3, 2], [2, height - 3], [width - 3, height - 3]]) {
    cornerLum += lum(at(x, y)); n += 1;
  }
  cornerLum /= n;

  console.log(`${f}: ${width}x${height} centerLum=${centerLum.toFixed(1)} centerMax=${centerMax.toFixed(0)} centerSat=${centerColor.toFixed(1)} cornerLum=${cornerLum.toFixed(1)}`);
}
