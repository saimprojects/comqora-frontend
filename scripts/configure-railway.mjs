import { readFileSync, writeFileSync } from 'node:fs'

const input = process.argv[2]
if (!input)
  throw new Error('Usage: npm run configure:railway -- https://your-service.up.railway.app')
const target = new URL(input)
if (
  target.protocol !== 'https:' ||
  target.username ||
  target.password ||
  target.search ||
  target.hash ||
  target.pathname !== '/' ||
  !target.hostname.endsWith('.up.railway.app')
) {
  throw new Error(
    'Enter only an HTTPS Railway public origin, without a path, credentials or query.',
  )
}
const file = new URL('../vercel.json', import.meta.url)
const config = JSON.parse(readFileSync(file, 'utf8'))
for (const rewrite of config.rewrites) {
  if (rewrite.destination.startsWith('https://')) {
    rewrite.destination = target.origin + new URL(rewrite.destination).pathname
  }
}
writeFileSync(file, JSON.stringify(config, null, 2) + '\n')
console.log(
  `API, admin and static proxy now target ${target.origin}. Commit vercel.json before deploying.`,
)
