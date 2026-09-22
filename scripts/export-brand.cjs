// Deterministic delivery-size exports only. The approved generated PNG and its alpha are retained.
// Usage: node scripts/export-brand.cjs [path-to-sharp-module]
const path = require('node:path')
const sharp = require(process.argv[2] || 'sharp')
const directory = path.resolve(__dirname, '../public/brand')

async function main() {
  for (const size of [32, 64, 180, 192]) {
    await sharp(path.join(directory, 'comqora-symbol.png'))
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(directory, `comqora-symbol-${size}.png`))
  }
  for (const name of ['comqora-logo', 'comqora-logo-dark']) {
    await sharp(path.join(directory, `${name}.svg`), { density: 144 })
      .png()
      .toFile(path.join(directory, `${name}.png`))
  }
  for (const name of [
    'comqora-symbol-32.png',
    'comqora-symbol-192.png',
    'comqora-logo.png',
    'comqora-logo-dark.png',
  ]) {
    const file = path.join(directory, name)
    const metadata = await sharp(file).metadata()
    const corner = await sharp(file)
      .ensureAlpha()
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .raw()
      .toBuffer()
    if (!metadata.hasAlpha || corner[3] !== 0)
      throw new Error(`Transparent export check failed: ${name}`)
    console.log(`${name}: ${metadata.width}x${metadata.height}, transparent alpha verified`)
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
