import {describe, test, expect, beforeEach, afterAll} from 'bun:test'
import {mkdirSync, writeFileSync, rmSync, existsSync, readFileSync} from 'fs'
import {join} from 'path'
import BunBundle from '../../lib/bun/bun_bundle.js'

const TEST_DIR = join(process.cwd(), '.test-tmp')

beforeEach(() => {
  rmSync(TEST_DIR, {recursive: true, force: true})
  mkdirSync(TEST_DIR, {recursive: true})
  BunBundle.manifest = {}
  BunBundle.config = null
  BunBundle.plugins = []
  BunBundle.debug = false
  BunBundle.prod = false
  BunBundle.dev = false
  BunBundle.root = TEST_DIR
})

afterAll(() => {
  rmSync(TEST_DIR, {recursive: true, force: true})
})

function createFile(relativePath, content = '') {
  const fullPath = join(TEST_DIR, relativePath)
  mkdirSync(join(fullPath, '..'), {recursive: true})
  writeFileSync(fullPath, content)
  return fullPath
}

function readOutput(relativePath) {
  return readFileSync(join(TEST_DIR, 'public/assets', relativePath), 'utf-8')
}

async function setupProject(files = {}, configOverrides = {}) {
  for (const [path, content] of Object.entries(files)) createFile(path, content)
  if (configOverrides && Object.keys(configOverrides).length)
    createFile('config/bun.json', JSON.stringify(configOverrides))
  BunBundle.loadConfig()
  await BunBundle.loadPlugins()
}

async function buildCSS(files, configOverrides) {
  await setupProject(files, configOverrides)
  await BunBundle.buildCSS()
  return readOutput('css/app.css')
}

async function buildJS(files, configOverrides) {
  await setupProject(files, configOverrides)
  await BunBundle.buildJS()
  return readOutput('js/app.js')
}

describe('flags', () => {
  test('sets known flags and ignores undefined values', () => {
    BunBundle.flags({dev: true})
    expect(BunBundle.dev).toBe(true)

    BunBundle.flags({prod: true})
    expect(BunBundle.prod).toBe(true)

    BunBundle.flags({debug: true})
    expect(BunBundle.debug).toBe(true)

    BunBundle.dev = true
    BunBundle.flags({prod: false})
    expect(BunBundle.dev).toBe(true)
    expect(BunBundle.prod).toBe(false)
  })
})

describe('deepMerge', () => {
  test('deep merges objects, replaces arrays and nulls', () => {
    expect(BunBundle.deepMerge({a: 1, b: 2}, {b: 3, c: 4})).toEqual({
      a: 1,
      b: 3,
      c: 4
    })
    expect(
      BunBundle.deepMerge({outer: {a: 1, b: 2}}, {outer: {b: 3, c: 4}})
    ).toEqual({outer: {a: 1, b: 3, c: 4}})
    expect(BunBundle.deepMerge({arr: [1, 2]}, {arr: [3, 4, 5]})).toEqual({
      arr: [3, 4, 5]
    })
    expect(BunBundle.deepMerge({a: {nested: 1}}, {a: null})).toEqual({a: null})
  })
})

describe('loadConfig', () => {
  test('uses defaults without a config file', () => {
    BunBundle.loadConfig()
    expect(BunBundle.config.outDir).toBe('public/assets')
    expect(BunBundle.config.entryPoints.js).toEqual(['app/assets/js/app.js'])
    expect(BunBundle.config.devServer.port).toBe(3002)
    expect(BunBundle.config.plugins).toEqual({
      css: ['aliases', 'cssGlobs'],
      js: ['aliases', 'jsGlobs']
    })
  })

  test('merges user config with defaults', () => {
    createFile(
      'config/bun.json',
      JSON.stringify({outDir: 'dist', devServer: {port: 4000}})
    )

    BunBundle.loadConfig()

    expect(BunBundle.config.outDir).toBe('dist')
    expect(BunBundle.config.devServer.port).toBe(4000)
    expect(BunBundle.config.devServer.host).toBe('127.0.0.1')
    expect(BunBundle.config.entryPoints.js).toEqual(['app/assets/js/app.js'])
  })

  test('merges listenHost into devServer config', () => {
    createFile(
      'config/bun.json',
      JSON.stringify({devServer: {listenHost: '0.0.0.0'}})
    )

    BunBundle.loadConfig()

    expect(BunBundle.config.devServer.listenHost).toBe('0.0.0.0')
    expect(BunBundle.config.devServer.host).toBe('127.0.0.1')
  })

  test('user can override plugins', () => {
    createFile(
      'config/bun.json',
      JSON.stringify({
        plugins: {css: ['cssAliases'], js: ['config/bun/banner.js']}
      })
    )
    BunBundle.loadConfig()

    expect(BunBundle.config.plugins.css).toEqual(['cssAliases'])
    expect(BunBundle.config.plugins.js).toEqual(['config/bun/banner.js'])
  })
})

describe('fingerprint', () => {
  test('returns plain filename in dev mode', () => {
    expect(BunBundle.fingerprint('app', '.js', 'content')).toBe('app.js')
  })

  test('returns consistent, content-dependent hashes in prod mode', () => {
    BunBundle.prod = true
    const hash = BunBundle.fingerprint('app', '.js', 'content')
    expect(hash).toMatch(/^app-[a-f0-9]{8}\.js$/)
    expect(BunBundle.fingerprint('app', '.js', 'content')).toBe(hash)
    expect(BunBundle.fingerprint('app', '.js', 'different')).not.toBe(hash)
  })
})

describe('IGNORE_PATTERNS', () => {
  test('ignores editor artifacts and system files but allows normal files', () => {
    const ignores = f => BunBundle.IGNORE_PATTERNS.some(p => p.test(f))

    for (const f of [
      '.#file.js',
      'file.swp',
      'file.swo',
      'file.tmp',
      '#file.js#',
      '.DS_Store',
      '12345'
    ])
      expect(ignores(f)).toBe(true)
    for (const f of ['app.js', 'styles.css', 'image.png'])
      expect(ignores(f)).toBe(false)
  })
})

describe('buildAssets', () => {
  test('builds JS files', async () => {
    await buildJS({'app/assets/js/app.js': 'console.log("test")'})

    expect(BunBundle.manifest['js/app.js']).toBe('js/app.js')
    expect(existsSync(join(TEST_DIR, 'public/assets/js/app.js'))).toBe(true)
  })

  test('builds CSS files', async () => {
    await buildCSS({'app/assets/css/app.css': 'body { color: pink }'})

    expect(BunBundle.manifest['css/app.css']).toBe('css/app.css')
    expect(existsSync(join(TEST_DIR, 'public/assets/css/app.css'))).toBe(true)
  })

  test('fingerprints in prod mode', async () => {
    BunBundle.prod = true
    await setupProject({'app/assets/js/app.js': 'console.log("prod")'})
    await BunBundle.buildJS()

    expect(BunBundle.manifest['js/app.js']).toMatch(/^js\/app-[a-f0-9]{8}\.js$/)
  })

  test('warns on missing entry point and continues', async () => {
    await setupProject()
    // No app/assets/js/app.js created — should not throw
    await BunBundle.buildJS()

    expect(BunBundle.manifest['js/app.js']).toBeUndefined()
  })

  test('accepts a string entry point', async () => {
    await setupProject(
      {'app/assets/js/app.js': 'console.log("single")'},
      {entryPoints: {js: 'app/assets/js/app.js'}}
    )
    await BunBundle.buildJS()

    expect(BunBundle.manifest['js/app.js']).toBe('js/app.js')
  })

  test('builds multiple JS entry points', async () => {
    await buildJS(
      {
        'app/assets/js/app.js': 'console.log("app")',
        'app/assets/js/admin.js': 'console.log("admin")'
      },
      {entryPoints: {js: ['app/assets/js/app.js', 'app/assets/js/admin.js']}}
    )

    expect(BunBundle.manifest['js/app.js']).toBe('js/app.js')
    expect(BunBundle.manifest['js/admin.js']).toBe('js/admin.js')
  })

  test('builds TypeScript files', async () => {
    await setupProject(
      {'app/assets/js/app.ts': 'const msg: string = "hello"\nconsole.log(msg)'},
      {entryPoints: {js: ['app/assets/js/app.ts']}}
    )
    await BunBundle.buildJS()

    expect(BunBundle.manifest['js/app.js']).toBe('js/app.js')
    expect(existsSync(join(TEST_DIR, 'public/assets/js/app.js'))).toBe(true)
    expect(readOutput('js/app.js')).toContain('hello')
  })

  test('builds TSX files', async () => {
    await setupProject(
      {
        'app/assets/js/app.tsx': [
          'function App(): string { return "tsx works" }',
          'console.log(App())'
        ].join('\n')
      },
      {entryPoints: {js: ['app/assets/js/app.tsx']}}
    )
    await BunBundle.buildJS()

    expect(BunBundle.manifest['js/app.js']).toBe('js/app.js')
    expect(existsSync(join(TEST_DIR, 'public/assets/js/app.js'))).toBe(true)
  })

  test('builds multiple CSS entry points', async () => {
    await buildCSS(
      {
        'app/assets/css/app.css': 'body { color: red }',
        'app/assets/css/admin.css': 'body { color: blue }'
      },
      {entryPoints: {css: ['app/assets/css/app.css', 'app/assets/css/admin.css']}}
    )

    expect(BunBundle.manifest['css/app.css']).toBe('css/app.css')
    expect(BunBundle.manifest['css/admin.css']).toBe('css/admin.css')
  })
})

describe('copyStaticAssets', () => {
  async function copyAssets(files = {}, config = {}) {
    await setupProject(files, config)
    await BunBundle.copyStaticAssets()
  }

  test('copies images and fonts, preserving nested structure', async () => {
    await copyAssets({
      'app/assets/images/logo.png': 'fake-image-data',
      'app/assets/images/icons/arrow.svg': '<svg/>',
      'app/assets/fonts/Inter.woff2': 'fake-font-data'
    })

    expect(BunBundle.manifest['images/logo.png']).toBe('images/logo.png')
    expect(BunBundle.manifest['images/icons/arrow.svg']).toBeDefined()
    expect(BunBundle.manifest['fonts/Inter.woff2']).toBe('fonts/Inter.woff2')
    expect(existsSync(join(TEST_DIR, 'public/assets/images/logo.png'))).toBe(
      true
    )
    expect(
      existsSync(join(TEST_DIR, 'public/assets/images/icons/arrow.svg'))
    ).toBe(true)
  })

  test('fingerprints static assets in prod mode', async () => {
    BunBundle.prod = true
    await copyAssets({'app/assets/images/logo.png': 'fake-image-data'})

    expect(BunBundle.manifest['images/logo.png']).toMatch(
      /^images\/logo-[a-f0-9]{8}\.png$/
    )
  })

  test('skips missing static directories', async () => {
    await copyAssets()

    expect(Object.keys(BunBundle.manifest)).toHaveLength(0)
  })
})

describe('cleanOutDir', () => {
  test('removes output directory and does not throw if already absent', async () => {
    createFile('public/assets/js/old.js', 'old')
    await setupProject()
    BunBundle.cleanOutDir()

    expect(existsSync(join(TEST_DIR, 'public/assets'))).toBe(false)
    expect(() => BunBundle.cleanOutDir()).not.toThrow()
  })
})

describe('writeManifest', () => {
  test('writes manifest JSON', async () => {
    await setupProject()
    BunBundle.manifest = {'js/app.js': 'js/app-abc123.js'}
    await BunBundle.writeManifest()
    const content = readFileSync(
      join(TEST_DIR, BunBundle.config.manifestPath),
      'utf-8'
    )

    expect(JSON.parse(content)).toEqual({'js/app.js': 'js/app-abc123.js'})
  })
})

describe('outDir', () => {
  test('throws if config not loaded', () => {
    BunBundle.config = null

    expect(() => BunBundle.outDir).toThrow('Config is not loaded')
  })

  test('returns full path when config loaded', () => {
    BunBundle.loadConfig()

    expect(BunBundle.outDir).toBe(join(TEST_DIR, 'public/assets'))
  })
})

describe('loadPlugins', () => {
  test('loads default plugins', async () => {
    BunBundle.loadConfig()
    await BunBundle.loadPlugins()

    expect(BunBundle.plugins).toHaveLength(2)
    expect(
      BunBundle.plugins.find(p => p.name === 'css-transforms')
    ).toBeDefined()
    expect(BunBundle.plugins.find(p => p.name === 'js-transforms')).toBeDefined()
  })

  test('loads no plugins when config is empty', async () => {
    createFile('config/bun.json', JSON.stringify({plugins: {}}))
    BunBundle.loadConfig()
    await BunBundle.loadPlugins()

    expect(BunBundle.plugins).toHaveLength(0)
  })

  test('handles unknown built-in plugin gracefully', async () => {
    createFile(
      'config/bun.json',
      JSON.stringify({plugins: {css: ['nonExistent']}})
    )
    BunBundle.loadConfig()
    await BunBundle.loadPlugins()

    expect(BunBundle.plugins).toHaveLength(0)
  })

  test('loads custom plugin from path', async () => {
    createFile(
      'config/bun/uppercase.js',
      `export default function() {
        return content => content.toUpperCase()
      }`
    )
    createFile(
      'config/bun.json',
      JSON.stringify({plugins: {css: ['config/bun/uppercase.js']}})
    )
    BunBundle.loadConfig()
    await BunBundle.loadPlugins()

    expect(BunBundle.plugins).toHaveLength(1)
    expect(BunBundle.plugins[0].name).toBe('css-transforms')
  })
})

describe('aliases plugin', () => {
  test('replaces $/ references with root path in CSS url()', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css': [
        "body { background: url('$/app/assets/images/bg.png'); }",
        ".icon { background: url('$/app/assets/images/icon.svg'); }"
      ].join('\n'),
      'app/assets/images/bg.png': 'fake',
      'app/assets/images/icon.svg': '<svg/>'
    })

    // The alias is resolved and Bun inlines the assets as data URIs
    expect(content).not.toContain('$/')
    expect(content).toContain('url(')
  })

  test('replaces $/ references in JS imports', async () => {
    const content = await buildJS({
      'app/assets/js/app.js': "import utils from '$/lib/utils.js'\nconsole.log(utils)",
      'lib/utils.js': 'export default 42'
    })

    expect(content).not.toContain('$/')
    expect(content).toContain('42')
  })

  test('replaces $/ references in CSS @import', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css': "@import '$/lib/reset.css';",
      'lib/reset.css': '* { margin: 0 }'
    })

    expect(content).not.toContain('$/')
    expect(content).toContain('margin')
  })

  test('leaves non-alias urls untouched', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css':
        "body { background: url('https://example.com/bg.png'); }"
    })

    expect(content).toContain('https://example.com/bg.png')
  })

  test('replaces $/ references in TypeScript imports', async () => {
    await setupProject(
      {
        'app/assets/js/app.ts': "import utils from '$/lib/utils.ts'\nconsole.log(utils)",
        'lib/utils.ts': 'const val: number = 99\nexport default val'
      },
      {entryPoints: {js: ['app/assets/js/app.ts']}}
    )
    await BunBundle.buildJS()
    const content = readOutput('js/app.js')

    expect(content).not.toContain('$/')
    expect(content).toContain('99')
  })

  test('leaves non-alias imports untouched', async () => {
    const content = await buildJS({
      'app/assets/js/app.js': "import {x} from './utils.js'\nconsole.log(x)",
      'app/assets/js/utils.js': 'export const x = 42'
    })

    expect(content).toContain('42')
  })

  test('resolves $/ inside prefixed strings like glob:$/', async () => {
    const aliases = (await import('../../lib/bun/plugins/aliases.js')).default
    const transform = aliases({root: '/root'})
    const result = transform("import c from 'glob:$/lib/components/*.js'")

    expect(result).toBe("import c from 'glob:/root/lib/components/*.js'")
  })

  test('does not replace $/ inside regex literals', async () => {
    const aliases = (await import('../../lib/bun/plugins/aliases.js')).default
    const transform = aliases({root: '/root'})
    const input = "s.replace(/.*components\\//, '').replace(/_component$/, '')"
    const result = transform(input)

    expect(result).toBe(input)
  })

  test('does not match $/ preceded by a word character', async () => {
    const content = await buildJS({
      'app/assets/js/app.js': [
        "const el = document.querySelector('div')",
        "const path = '/api/test'",
        "console.log(el, path)"
      ].join('\n')
    })

    expect(content).not.toContain(TEST_DIR)
  })
})

describe('cssGlobs plugin', () => {
  test('expands glob @import with flat wildcard', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css': "@import './components/*.css';",
      'app/assets/css/components/button.css': '.button { color: red }',
      'app/assets/css/components/card.css': '.card { color: blue }'
    })

    expect(content).toContain('.button')
    expect(content).toContain('.card')
  })

  test('expands glob @import with ** recursive wildcard', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css': "@import './components/**/*.css';",
      'app/assets/css/components/button.css': '.button { color: red }',
      'app/assets/css/components/forms/input.css': '.input { color: green }',
      'app/assets/css/components/forms/select.css': '.select { color: blue }'
    })

    expect(content).toContain('.button')
    expect(content).toContain('.input')
    expect(content).toContain('.select')
  })

  test('does not import the file itself', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css': "@import './*.css';",
      'app/assets/css/other.css': '.other { color: red }'
    })

    expect(content).toContain('.other')
  })

  test('handles glob matching no files', async () => {
    await buildCSS({
      'app/assets/css/app.css': "@import './empty/**/*.css';",
      'app/assets/css/empty/.gitkeep': ''
    })
  })

  test('preserves non-glob imports', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css':
        "@import './reset.css';\n@import './components/*.css';",
      'app/assets/css/reset.css': '* { margin: 0 }',
      'app/assets/css/components/button.css': '.button { color: red }'
    })

    expect(content).toContain('margin')
    expect(content).toContain('.button')
  })

  test('expands globs in deterministic sorted order', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css': "@import './components/*.css';",
      'app/assets/css/components/zebra.css': '.zebra { order: 3 }',
      'app/assets/css/components/alpha.css': '.alpha { order: 1 }',
      'app/assets/css/components/middle.css': '.middle { order: 2 }'
    })
    const alphaPos = content.indexOf('.alpha')
    const middlePos = content.indexOf('.middle')
    const zebraPos = content.indexOf('.zebra')

    expect(alphaPos).toBeLessThan(middlePos)
    expect(middlePos).toBeLessThan(zebraPos)
  })
})

describe('jsGlobs plugin', () => {
  const jsGlobsConfig = {plugins: {js: ['jsGlobs']}}

  function jsApp(...lines) {
    return {'app/assets/js/app.js': lines.join('\n')}
  }

  async function buildJSGlobs(files) {
    return buildJS(files, jsGlobsConfig)
  }

  test('expands glob import into named exports', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import components from 'glob:./components/*.js'",
        'console.log(components)'
      ),
      'app/assets/js/components/modal.js': 'export default function modal() {}',
      'app/assets/js/components/dropdown.js':
        'export default function dropdown() {}'
    })

    expect(content).toContain('modal')
    expect(content).toContain('dropdown')
  })

  test('expands recursive glob with relative path keys', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import controllers from 'glob:./controllers/**/*.js'",
        'console.log(Object.keys(controllers))'
      ),
      'app/assets/js/controllers/nav.js': 'export default function nav() {}',
      'app/assets/js/controllers/forms/input.js':
        'export default function input() {}'
    })

    expect(content).toContain('nav')
    expect(content).toContain('forms/input')
  })

  test('avoids naming clashes for same-named files in different dirs', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import modules from 'glob:./components/**/*.js'",
        'console.log(Object.keys(modules))'
      ),
      'app/assets/js/components/nav.js': 'export default function nav() {}',
      'app/assets/js/components/admin/nav.js':
        'export default function adminNav() {}'
    })

    expect(content).toContain('nav')
    expect(content).toContain('admin/nav')
  })

  test('handles glob matching no files', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import components from 'glob:./components/*.js'",
        'console.log(components)'
      ),
      'app/assets/js/components/.gitkeep': ''
    })

    expect(content).toBeDefined()
  })

  test('leaves non-glob imports untouched', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import {something} from './utils.js'",
        'console.log(something)'
      ),
      'app/assets/js/utils.js': 'export const something = 42'
    })

    expect(content).toContain('42')
  })

  test('handles multiple glob imports', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import data from 'glob:./data/*.js'",
        "import stores from 'glob:./stores/*.js'",
        'console.log(data, stores)'
      ),
      'app/assets/js/data/counter.js': 'export default function counter() {}',
      'app/assets/js/stores/auth.js': 'export default function auth() {}'
    })

    expect(content).toContain('counter')
    expect(content).toContain('auth')
  })

  test('avoids variable collisions across multiple globs with same filenames', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import components from 'glob:./components/*.js'",
        "import widgets from 'glob:./widgets/*.js'",
        'console.log(components, widgets)'
      ),
      'app/assets/js/components/theme.js':
        'export default function componentTheme() { return "component" }',
      'app/assets/js/widgets/theme.js':
        'export default function widgetTheme() { return "widget" }'
    })

    expect(content).toContain('component')
    expect(content).toContain('widget')
  })

  test('expands globs in deterministic sorted order', async () => {
    const content = await buildJSGlobs({
      ...jsApp(
        "import components from 'glob:./components/*.js'",
        'for (const [k, v] of Object.entries(components)) console.log(k)'
      ),
      'app/assets/js/components/zebra.js': 'export default function zebra() {}',
      'app/assets/js/components/alpha.js': 'export default function alpha() {}',
      'app/assets/js/components/middle.js':
        'export default function middle() {}'
    })
    const alphaPos = content.indexOf('alpha')
    const middlePos = content.indexOf('middle')
    const zebraPos = content.indexOf('zebra')

    expect(alphaPos).toBeLessThan(middlePos)
    expect(middlePos).toBeLessThan(zebraPos)
  })
})

describe('plugin pipeline', () => {
  test('css plugins run in configured order', async () => {
    const content = await buildCSS({
      'app/assets/css/app.css':
        "@import './components/*.css';\nbody { background: url('$/app/assets/images/bg.png'); }",
      'app/assets/css/components/button.css': '.button { color: red }',
      'app/assets/images/bg.png': 'fake'
    })

    expect(content).not.toContain('$/')
    expect(content).toContain('.button')
  })

  test('disabling all plugins still builds valid output', async () => {
    const css = await buildCSS(
      {'app/assets/css/app.css': 'body { color: red }'},
      {plugins: {}}
    )
    expect(css).toContain('color')

    const js = await buildJS(
      {'app/assets/js/app.js': 'console.log("hello")'},
      {plugins: {}}
    )
    expect(js).toContain('hello')
  })
})

describe('full build', () => {
  test('runs the complete build pipeline', async () => {
    await setupProject({
      'app/assets/js/app.js': 'console.log("built")',
      'app/assets/css/app.css': 'body { color: red }',
      'app/assets/images/logo.png': 'fake-image'
    })
    BunBundle.cleanOutDir()
    await BunBundle.copyStaticAssets()
    await BunBundle.buildJS()
    await BunBundle.buildCSS()
    await BunBundle.writeManifest()

    expect(BunBundle.manifest['js/app.js']).toBeDefined()
    expect(BunBundle.manifest['css/app.css']).toBeDefined()
    expect(BunBundle.manifest['images/logo.png']).toBeDefined()
    expect(existsSync(join(TEST_DIR, BunBundle.config.manifestPath))).toBe(true)
  })

  test('clean build removes previous output', async () => {
    createFile('public/assets/js/stale.js', 'old stuff')
    await setupProject({'app/assets/js/app.js': 'console.log("fresh")'})
    BunBundle.cleanOutDir()
    await BunBundle.buildJS()

    expect(existsSync(join(TEST_DIR, 'public/assets/js/stale.js'))).toBe(false)
    expect(existsSync(join(TEST_DIR, 'public/assets/js/app.js'))).toBe(true)
  })
})

describe('prettyManifest', () => {
  test('formats manifest entries and handles empty manifest', () => {
    BunBundle.manifest = {
      'js/app.js': 'js/app-abc123.js',
      'css/app.css': 'css/app-def456.css'
    }
    const output = BunBundle.prettyManifest()
    expect(output).toContain('js/app.js → js/app-abc123.js')
    expect(output).toContain('css/app.css → css/app-def456.css')

    BunBundle.manifest = {}
    expect(BunBundle.prettyManifest()).toContain('\n')
  })
})
