import {dirname, extname} from 'path'
import {Glob} from 'bun'

const REGEX = /import\s+(\w+)\s+from\s+['"]glob:([^'"]+)['"]/g

function parseImport(raw) {
  const parts = raw.split(/\s+not\s+/)
  return {pattern: parts[0], excludes: parts.slice(1)}
}

function splitBase(pattern) {
  const clean = pattern.replace(/^\.\//, '')
  const base = clean.slice(0, clean.search(/[*?{[]|$/)).replace(/\/$/, '')
  return {clean, base}
}

function excluded(file, matchers) {
  return matchers.some(m => m.match(file))
}

function scanFiles(dir, pattern, excludes) {
  const {clean, base} = splitBase(pattern)
  const matchers = excludes.map(e => new Glob(e.replace(/^\.\//, '')))
  const glob = new Glob(clean)
  return Array.from(glob.scanSync({cwd: dir}))
    .filter(f => !excluded(f, matchers))
    .sort()
}

function buildImportMap(files, base) {
  const imports = []
  const entries = []

  for (const file of files) {
    const ext = extname(file)
    const rel = base ? file.slice(base.length + 1) : file
    const key = rel.slice(0, -ext.length)
    const prefix = base ? `${base}_` : ''
    const safe = `_glob_${prefix}${key}`.replace(/[^a-zA-Z0-9]/g, '_')
    imports.push(`import ${safe} from './${file}'`)
    entries.push(`  '${key}': ${safe}`)
  }

  return {imports, entries}
}

export default function jsGlobs() {
  return (content, args) => {
    return content.replace(REGEX, (_, binding, raw) => {
      const {pattern, excludes} = parseImport(raw)
      const {base} = splitBase(pattern)
      const dir = dirname(args.path)
      const files = scanFiles(dir, pattern, excludes)

      if (!files.length) return `const ${binding} = {}`

      const {imports, entries} = buildImportMap(files, base)

      return [
        ...imports,
        `const ${binding} = {`,
        entries.join(',\n'),
        '}'
      ].join('\n')
    })
  }
}
