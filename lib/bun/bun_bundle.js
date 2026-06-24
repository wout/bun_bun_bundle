import {
  mkdirSync,
  readFileSync,
  readdirSync,
  existsSync,
  rmSync,
  statSync,
  watch
} from 'fs'
import {join, dirname, basename, extname} from 'path'
import {Glob} from 'bun'
import {resolvePlugins} from './plugins/index.js'

export default {
  CONFIG_PATH: 'config/bun.json',
  IGNORE_PATTERNS: [
    /^\d+$/,
    /^\.#/,
    /\.swp$/,
    /\.swo$/,
    /\.tmp$/,
    /^#.*#$/,
    /\.DS_Store$/
  ],

  root: process.cwd(),
  config: null,
  manifest: {},
  targets: [],
  debug: false,
  dev: false,
  prod: false,
  fingerprint: false,
  minify: false,
  sourcemap: null,
  sri: [],
  wsClients: new Set(),
  watchTimers: new Map(),
  watchers: [],
  plugins: [],

  SRI_ALGORITHMS: ['sha256', 'sha384', 'sha512'],

  flags(input) {
    const {debug, dev, prod, fingerprint, minify, sourcemap, sri} =
      Array.isArray(input) ? this.parseArgv(input) : input
    if (debug != null) this.debug = debug
    if (dev != null) this.dev = dev
    if (prod != null) this.prod = prod
    if (fingerprint != null) this.fingerprint = fingerprint
    else if (prod === true) this.fingerprint = true
    if (minify != null) this.minify = minify
    else if (prod === true) this.minify = true
    if (sourcemap != null) this.sourcemap = sourcemap
    if (sri != null) this.sri = sri
  },

  SOURCEMAP_KINDS: ['inline', 'linked', 'external', 'none'],
  BOOLEAN_FLAGS: ['debug', 'dev', 'prod', 'fingerprint', 'minify'],

  parseArgv(argv) {
    return {
      ...this.parseBooleanFlags(argv),
      ...this.parseSourcemapFlag(argv),
      ...this.parseSriFlag(argv)
    }
  },

  parseBooleanFlags(argv) {
    const opts = {}
    for (const name of this.BOOLEAN_FLAGS) {
      if (argv.includes(`--${name}`)) opts[name] = true
    }
    return opts
  },

  findValueFlag(argv, name, defaultValue) {
    const flag = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`))
    if (!flag) return null
    return flag.includes('=') ? flag.split('=')[1] : defaultValue
  },

  parseSourcemapFlag(argv) {
    const value = this.findValueFlag(argv, 'sourcemap', 'linked')
    if (value === null) return {}
    if (this.SOURCEMAP_KINDS.includes(value)) return {sourcemap: value}
    console.warn(
      ` ▸ Ignoring --sourcemap=${value} (valid: ${this.SOURCEMAP_KINDS.join(', ')})`
    )
    return {}
  },

  parseSriFlag(argv) {
    const value = this.findValueFlag(argv, 'sri', 'sha384')
    if (value === null) return {}
    const algos = value
      .split(',')
      .map(a => a.trim())
      .filter(Boolean)
    const valid = algos.filter(a => this.SRI_ALGORITHMS.includes(a))
    const invalid = algos.filter(a => !this.SRI_ALGORITHMS.includes(a))
    if (invalid.length) {
      console.warn(
        ` ▸ Ignoring --sri=${invalid.join(',')} (valid: ${this.SRI_ALGORITHMS.join(', ')})`
      )
    }
    return valid.length ? {sri: valid} : {}
  },

  computeSri(content) {
    if (!this.sri.length) return null
    return this.sri.map(algo => {
      const hasher = new Bun.CryptoHasher(algo)
      hasher.update(content)
      return `${algo}-${hasher.digest('base64')}`
    })
  },

  manifestEntry(url, content) {
    const entry = {url}
    const sri = this.computeSri(content)
    if (sri) entry.sri = sri
    return entry
  },

  deepMerge(target, source) {
    const result = {...target}
    for (const k of Object.keys(source))
      result[k] =
        source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])
          ? this.deepMerge(target[k] || {}, source[k])
          : source[k]
    return result
  },

  loadConfig() {
    const defaults = {
      entryPoints: {
        js: ['app/assets/js/app.js'],
        css: ['app/assets/css/app.css']
      },
      plugins: {css: ['aliases', 'cssGlobs'], js: ['aliases', 'jsGlobs']},
      watchDirs: ['app/assets'],
      staticDirs: ['app/assets/images', 'app/assets/fonts'],
      outDir: 'public/assets',
      publicPath: '/assets',
      manifestPath: 'public/bun-manifest.json',
      devServer: {host: '127.0.0.1', port: 3002, secure: false}
    }

    let user = {}
    try {
      const json = readFileSync(join(this.root, this.CONFIG_PATH), 'utf-8')
      user = JSON.parse(json)
      this.config = this.deepMerge(defaults, user)
      if (user.plugins != null) this.config.plugins = user.plugins
    } catch {
      this.config = {...defaults}
    }

    if (this.config.manifestFormat == null)
      this.config.manifestFormat = existsSync(join(this.root, 'config/app.rb'))
        ? 'hanami'
        : 'standard'

    if (this.config.manifestFormat === 'hanami' && user.watchDirs == null)
      this.config.watchDirs = ['app/assets', 'slices/*/assets']

    this.targets = this.discoverTargets()
  },

  get hanami() {
    return this.config?.manifestFormat === 'hanami'
  },

  discoverTargets() {
    if (this.config == null) throw new Error(' ✖ Config is not loaded')

    const appTarget = {
      name: 'app',
      srcDir: 'app/assets',
      outSubdir: '',
      urlPrefix: this.config.publicPath,
      entryPoints: this.config.entryPoints,
      staticDirs: this.config.staticDirs
    }

    if (!this.hanami) return [appTarget]

    const slicesDir = join(this.root, 'slices')
    if (!existsSync(slicesDir)) return [appTarget]

    const slices = readdirSync(slicesDir)
      .sort()
      .map(name => this.sliceTarget(name))
      .filter(Boolean)

    return [appTarget, ...slices]
  },

  sliceTarget(name) {
    const srcDir = join('slices', name, 'assets')
    const fullDir = join(this.root, srcDir)
    if (!existsSync(fullDir) || !statSync(fullDir).isDirectory()) return null

    const jsExts = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'mts']
    const js = this.findEntries(srcDir, 'js', jsExts)
    const css = this.findEntries(srcDir, 'css', ['css'])
    const staticDirs = this.findStaticDirs(srcDir)

    if (!js.length && !css.length && !staticDirs.length) return null

    return {
      name,
      srcDir,
      outSubdir: `_${name}`,
      urlPrefix: `${this.config.publicPath}/_${name}`,
      entryPoints: {js, css},
      staticDirs,
      manifest: {}
    }
  },

  findEntries(srcDir, subdir, exts) {
    const fullDir = join(this.root, srcDir, subdir)
    if (!existsSync(fullDir)) return []
    return readdirSync(fullDir)
      .filter(f => exts.includes(extname(f).slice(1)))
      .sort()
      .map(f => join(srcDir, subdir, f))
  },

  findStaticDirs(srcDir) {
    const fullDir = join(this.root, srcDir)
    if (!existsSync(fullDir)) return []
    return readdirSync(fullDir)
      .filter(d => d !== 'js' && d !== 'css')
      .filter(d => statSync(join(fullDir, d)).isDirectory())
      .sort()
      .map(d => join(srcDir, d))
  },

  manifestFor(target) {
    return target.name === 'app' ? this.manifest : target.manifest
  },

  async loadPlugins() {
    this.plugins = await resolvePlugins(this.config.plugins, {
      root: this.root,
      config: this.config,
      dev: this.dev,
      prod: this.prod,
      fingerprint: this.fingerprint,
      minify: this.minify,
      sourcemap: this.sourcemap,
      manifest: this.manifest
    })
  },

  get outDir() {
    if (this.config == null) throw new Error(' ✖ Config is not loaded')

    return join(this.root, this.config.outDir)
  },

  fingerprintName(name, ext, content) {
    if (!this.fingerprint) return `${name}${ext}`

    const hash = Bun.hash(content).toString(16).slice(0, 8)
    return `${name}-${hash}${ext}`
  },

  async buildAssets(target, type, options = {}) {
    const outDir = this.hanami
      ? join(this.outDir, target.outSubdir)
      : join(this.outDir, type)
    mkdirSync(outDir, {recursive: true})

    const raw = target.entryPoints[type]
    const entries = Array.isArray(raw) ? raw : raw == null ? [] : [raw]
    const ext = `.${type}`

    for (const entry of entries) {
      const entryPath = join(this.root, entry)
      const entryName = basename(entry).replace(/\.(ts|js|tsx|jsx|css)$/, '')

      if (!existsSync(entryPath)) {
        console.warn(` ▸ Missing entry point ${entry}, continuing...`)
        continue
      }

      let result
      try {
        result = await Bun.build({
          entrypoints: [entryPath],
          minify: this.minify,
          plugins: this.plugins,
          ...options
        })
      } catch (err) {
        console.error(` ▸ Failed to build ${entry}`)
        if (err.errors) for (const e of err.errors) console.error(e)
        else console.error(err)
        continue
      }

      if (!result.success) {
        console.error(` ▸ Failed to build ${entry}`)
        for (const log of result.logs) console.error(log)
        continue
      }

      const mainOutput = result.outputs.find(o => o.path.endsWith(ext))
      if (!mainOutput) {
        console.error(` ▸ No ${type.toUpperCase()} output for ${entry}`)
        continue
      }
      const mapOutput = result.outputs.find(o => o.kind === 'sourcemap')

      let content = await mainOutput.text()
      const fileName = this.fingerprintName(entryName, ext, content)

      if (mapOutput) {
        const mapFileName = `${fileName}.map`
        content = content.replace(
          /\/\/# sourceMappingURL=\S+/,
          () => `//# sourceMappingURL=${mapFileName}`
        )
        await Bun.write(join(outDir, mapFileName), await mapOutput.text())
      }

      await Bun.write(join(outDir, fileName), content)
      const key = this.hanami
        ? `${entryName}${ext}`
        : `${type}/${entryName}${ext}`
      const url = this.hanami
        ? `${target.urlPrefix}/${fileName}`
        : `${type}/${fileName}`
      this.manifestFor(target)[key] = this.manifestEntry(url, content)
    }
  },

  async buildJS() {
    for (const target of this.targets) {
      await this.buildAssets(target, 'js', {
        target: 'browser',
        format: 'iife',
        sourcemap: this.sourcemap || (this.dev ? 'inline' : 'linked')
      })
    }
  },

  async buildCSS() {
    for (const target of this.targets) {
      await this.buildAssets(target, 'css')
    }
  },

  async copyStaticAssets() {
    for (const target of this.targets) {
      await this.copyStaticAssetsForTarget(target)
    }
  },

  async copyStaticAssetsForTarget(target) {
    const glob = new Glob('**/*.*')
    const baseOutDir = this.hanami
      ? join(this.outDir, target.outSubdir)
      : this.outDir

    for (const dir of target.staticDirs) {
      const fullDir = join(this.root, dir)
      if (!existsSync(fullDir)) continue

      const assetType = basename(dir)
      const destDir = join(baseOutDir, assetType)

      for await (const file of glob.scan({cwd: fullDir, onlyFiles: true})) {
        const srcPath = join(fullDir, file)
        const content = await Bun.file(srcPath).arrayBuffer()
        const bytes = new Uint8Array(content)

        const ext = extname(file)
        const name = file.slice(0, -ext.length) || file
        const fileName = this.fingerprintName(name, ext, bytes)
        const destPath = join(destDir, fileName)

        mkdirSync(dirname(destPath), {recursive: true})
        await Bun.write(destPath, content)

        const url = this.hanami
          ? `${target.urlPrefix}/${assetType}/${fileName}`
          : `${assetType}/${fileName}`
        const key = this.hanami ? file : `${assetType}/${file}`
        this.manifestFor(target)[key] = this.manifestEntry(url, bytes)
      }
    }
  },

  cleanOutDir() {
    rmSync(this.outDir, {recursive: true, force: true})
  },

  async writeManifest() {
    if (!this.hanami) {
      const manifestFullPath = join(this.root, this.config.manifestPath)
      mkdirSync(dirname(manifestFullPath), {recursive: true})
      await Bun.write(manifestFullPath, JSON.stringify(this.manifest, null, 2))
      return
    }

    for (const target of this.targets) {
      const m = this.manifestFor(target)
      if (Object.keys(m).length === 0) continue
      const path = join(this.outDir, target.outSubdir, 'assets.json')
      mkdirSync(dirname(path), {recursive: true})
      await Bun.write(path, JSON.stringify(m, null, 2))
    }
  },

  async build() {
    const env = this.prod ? 'production' : 'development'
    console.log(`Building manifest for ${env}...`)
    const start = performance.now()
    this.loadConfig()
    await this.loadPlugins()
    this.cleanOutDir()
    await this.copyStaticAssets()
    await this.buildJS()
    await this.buildCSS()
    await this.writeManifest()
    const ms = Math.round(performance.now() - start)
    console.log(`DONE  Built successfully in ${ms} ms`, this.prettyManifest())
  },

  prettyManifest() {
    const formatEntries = m =>
      Object.entries(m)
        .map(([key, value]) => {
          const url = value && typeof value === 'object' ? value.url : value
          return `  ${key} → ${url}`
        })
        .join('\n')

    if (!this.hanami) return `\n${formatEntries(this.manifest)}\n\n`

    const sections = this.targets
      .map(target => {
        const m = this.manifestFor(target)
        if (Object.keys(m).length === 0) return null
        const label = target.name === 'app' ? 'app' : `slice: ${target.name}`
        return `[${label}]\n${formatEntries(m)}`
      })
      .filter(Boolean)
    return `\n${sections.join('\n\n')}\n\n`
  },

  reload(type = 'full') {
    setTimeout(() => {
      const message = JSON.stringify({type})
      for (const client of this.wsClients) {
        try {
          client.send(message)
        } catch {
          this.wsClients.delete(client)
        }
      }
    }, 50)
  },

  async watch() {
    const cssBase = ['css']
    const jsBase = ['js', 'ts', 'jsx', 'tsx']
    const extras = this.config.watchExtensions || {}
    const cssExts = [...cssBase, ...(extras.css || [])]
    const jsExts = [...jsBase, ...(extras.js || [])]

    const handler = (event, filename) => {
      if (!filename) return

      let normalizedFilename = filename.replace(/\\/g, '/')

      // Vim backup files (e.g. app.css~) signal the original file changed
      if (normalizedFilename.endsWith('~'))
        normalizedFilename = normalizedFilename.slice(0, -1)

      const base = basename(normalizedFilename)
      const ext = extname(base).slice(1)

      if (this.IGNORE_PATTERNS.some(pattern => pattern.test(base))) return

      // Debounce: multiple events for the same file (e.g. actual save + backup)
      if (this.watchTimers.has(normalizedFilename)) return
      this.watchTimers.set(
        normalizedFilename,
        setTimeout(() => {
          this.watchTimers.delete(normalizedFilename)
        }, 100)
      )

      console.log(` ▸ ${normalizedFilename} changed`)
      ;(async () => {
        try {
          let kind = null
          if (cssExts.includes(ext)) {
            await this.buildCSS()
            if (cssBase.includes(ext)) kind = 'css'
          } else if (jsExts.includes(ext)) {
            await this.buildJS()
            if (jsBase.includes(ext)) kind = 'full'
          } else if (base.includes('.')) {
            await this.copyStaticAssets()
            kind = 'full'
          }

          await this.writeManifest()
          if (kind) this.reload(kind)
        } catch (err) {
          console.error(' ✖ Build error:', err.message)
          if (err.errors) for (const e of err.errors) console.error(e)
        }
      })()
    }

    for (const pattern of this.config.watchDirs) {
      const dirs = pattern.includes('*')
        ? await Array.fromAsync(
            new Glob(pattern).scan({cwd: this.root, onlyFiles: false})
          )
        : [pattern]
      for (const dir of dirs) {
        const fullDir = join(this.root, dir)
        if (!existsSync(fullDir) || !statSync(fullDir).isDirectory()) {
          console.warn(` ▸ Watch directory ${dir} does not exist, skipping...`)
          continue
        }
        this.watchers.push(watch(fullDir, {recursive: true}, handler))
      }
    }

    console.log('Beginning to watch your project')
  },

  shutdown() {
    for (const w of this.watchers) {
      try {
        w.close()
      } catch {}
    }
    this.watchers = []
    for (const client of this.wsClients) {
      try {
        client.close()
      } catch {}
    }
    this.wsClients.clear()
  },

  async serve() {
    await this.build()
    await this.watch()

    const {host, listenHost, port, secure} = this.config.devServer
    const hostname = listenHost || (secure ? '0.0.0.0' : host)
    const debug = this.debug
    const wsClients = this.wsClients

    const server = Bun.serve({
      hostname,
      port,
      fetch(req, server) {
        if (server.upgrade(req)) return
        return new Response('BunBunBundle WebSocket Server', {status: 200})
      },
      websocket: {
        open(ws) {
          wsClients.add(ws)
          if (debug) console.log(` ▸ Client connected (${wsClients.size})\n\n`)
        },
        close(ws) {
          wsClients.delete(ws)
          if (debug)
            console.log(` ▸ Client disconnected (${wsClients.size})\n\n`)
        },
        message() {}
      }
    })

    const protocol = secure ? 'wss' : 'ws'
    console.log(`\n\n    🔌 Live reload at ${protocol}://${host}:${port}\n\n`)

    process.on('SIGINT', () => {
      console.log('\n ▸ Shutting down...')
      this.shutdown()
      try {
        server.stop(true)
      } catch {}
      process.exit(0)
    })
  },

  async bake() {
    this.dev ? await this.serve() : await this.build()
  }
}
