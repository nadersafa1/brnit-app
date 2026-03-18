import fs from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd())
const apiRoot = path.join(repoRoot, 'apps', 'web', 'src', 'app', 'api')

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else yield full
  }
}

function ensureImport(src) {
  if (src.includes("with-request-logging")) return src

  // Insert after the last import line
  const lines = src.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\b/.test(lines[i])) lastImportIdx = i
  }
  if (lastImportIdx === -1) return src
  lines.splice(lastImportIdx + 1, 0, "import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'")
  return lines.join('\n')
}

function wrapExportConstAsync(src, method) {
  const exportRe = new RegExp(String.raw`export const ${method}\s*=\s*async\s*\(`)
  if (!exportRe.test(src)) return src
  if (src.includes(`export const ${method} = withRequestLogging(`)) return src

  const handlerName = `${method.toLowerCase()}Handler`
  src = src.replace(exportRe, `const ${handlerName} = async (`)

  // Append exports at end (keep newline)
  if (!src.endsWith('\n')) src += '\n'
  src += `\nexport const ${method} = withRequestLogging(${handlerName})\n`
  return src
}

function wrapExportAsyncFunction(src, method) {
  const exportFnRe = new RegExp(String.raw`export async function ${method}\s*\(`)
  if (!exportFnRe.test(src)) return src
  if (src.includes(`export const ${method} = withRequestLogging(`)) return src

  const handlerName = `${method.toLowerCase()}Handler`
  src = src.replace(exportFnRe, `async function ${handlerName}(`)
  if (!src.endsWith('\n')) src += '\n'
  src += `\nexport const ${method} = withRequestLogging(${handlerName})\n`
  return src
}

async function main() {
  const changed = []
  for await (const file of walk(apiRoot)) {
    if (!file.endsWith('route.ts') && !file.endsWith('route.js')) continue
    if (file.endsWith('.test.ts')) continue

    let src = await fs.readFile(file, 'utf8')
    const original = src

    src = ensureImport(src)

    for (const m of HTTP_METHODS) {
      src = wrapExportConstAsync(src, m)
      src = wrapExportAsyncFunction(src, m)
    }

    if (src !== original) {
      await fs.writeFile(file, src, 'utf8')
      changed.push(path.relative(repoRoot, file))
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Updated ${changed.length} route files`)
  for (const f of changed) console.log(`- ${f}`)
}

try {
  await main()
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
}

