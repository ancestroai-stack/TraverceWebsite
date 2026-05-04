const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const roots = ['assets', 'images'];
const sourcePattern = /\.(png|jpe?g)$/i;

async function convertImage(input) {
  const parsed = path.parse(input);
  const output = path.join(parsed.dir, `${parsed.name}.webp`);
  const image = sharp(input);
  const metadata = await image.metadata();

  await image
    .resize({
      width: metadata.width && metadata.width > 1920 ? 1920 : undefined,
      withoutEnlargement: true,
    })
    .webp({ quality: 78, effort: 6 })
    .toFile(output);

  const before = await fs.stat(input);
  const after = await fs.stat(output);
  const saved = Math.round((1 - after.size / before.size) * 100);

  return {
    input,
    output,
    width: metadata.width,
    height: metadata.height,
    before: before.size,
    after: after.size,
    saved,
  };
}

async function main() {
  const results = [];

  for (const root of roots) {
    const entries = await fs.readdir(root, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !sourcePattern.test(entry.name)) continue;
      results.push(await convertImage(path.join(root, entry.name)));
    }
  }

  for (const result of results) {
    console.log(
      `${result.input} (${result.width}x${result.height}) -> ${result.output} ` +
        `${result.before}B to ${result.after}B (${result.saved}% smaller)`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
