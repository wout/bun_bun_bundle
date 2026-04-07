# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.2] - 2026-04-07

### Fixed

- CSS files are now cache-busted with a `?bust=` timestamp query parameter in
  development, preventing stale stylesheets when navigating between pages
- Renamed the HMR query parameter from `r` to `bust` to avoid conflicts with
  application query parameters

## [0.6.1] - 2026-04-04

### Fixed

- Missing `watchDirs` directories no longer crash the watcher (skipped with a
  warning instead)

## [0.6.0] - 2026-04-04

### Changed

- Replaced `watchDir` (string) with `watchDirs` (array) to support watching
  multiple asset directories during development

## [0.5.2] - 2026-04-04

### Added

- `devServer.listenHost` config option to set the server bind address separately
  from the client-facing `host` (useful for Docker development setups)

## [0.5.1] - 2026-04-04

### Fixed

- Live reload no longer causes an infinite page reload loop when the WebSocket
  server is unreachable (e.g. in Docker or when the server isn't running)

## [0.5.0] - 2026-04-04

### Added

- `--debug` flag to enable verbose WebSocket logging (connect/disconnect)
- TypeScript and TSX support for entry points
- `entryPoints.js` and `entryPoints.css` now accept a string or an array

### Changed

- `build` command no longer implies `--prod`; use `build --prod` for
  fingerprinting and minification

### Fixed

- Plugin loader now uses the correct parser for `.ts` and `.tsx` files instead
  of forcing the JavaScript parser

## [0.4.0] - 2026-04-02

### Added

- Tag helpers now support Rails-style nested data/aria attributes
  (`data: { turbo_track: "reload" }` → `data-turbo-track="reload"`)
- Tag helpers now support Lucky-style underscored attributes
  (`data_turbo_track: "reload"` → `data-turbo-track="reload"`)

### Changed

- Removed leading underscore from private helper method names (e.g.
  `_bun_html_attrs` → `bun_html_attrs`)

## [0.3.7] - 2026-04-01

### Fixed

- Vim file saves are now detected by the watcher (tilde backup files trigger
  a rebuild for the original file, with debouncing to prevent double builds)
- CSS build errors now show the actual error details (file, line, message)
  instead of just "Bundle failed"

## [0.3.6] - 2026-03-28

### Removed

- `bun_bun_bundle/hanami` require path (use `bun_bun_bundle` directly)

## [0.3.5] - 2026-03-28

### Fixed

- `jsGlobs` plugin now strips the base directory from object keys (e.g. `main`
  instead of `components/main`)

## [0.3.4] - 2026-03-27

### Fixed

- `aliases` plugin regex now resolves `$/` inside prefixed strings like `'glob:$/...'`
- `aliases` plugin no longer corrupts `$/` inside regex literals (e.g. `/_component$/`)

## [0.3.2] - 2026-03-27

### Added

- `bbb` CLI alias for `bun_bun_bundle`
- Note about using `bundle exec` with Procfile-based process managers

## [0.3.1] - 2026-03-27

### Fixed

- `aliases` plugin now resolves `$/` to the project root instead of `src/`

## [0.3.0] - 2026-03-27

### Added

- `aliases` plugin that resolves `$/` root aliases in both CSS and JS files
- JS test suite using Bun's native test runner

### Changed

- Renamed `cssAliases` plugin to `aliases` with broader support for CSS
  `url()`, CSS `@import`, and JS `import` statements
- Default plugin config now includes `aliases` in both `css` and `js` pipelines

### Removed

- `cssAliases` plugin (replaced by `aliases`)

## [0.2.0] - 2026-03-27

### Added

- `BunBunBundle.setup(root:, hanami:)`, a single-call setup that
  auto-configures middleware and CSP for Hanami in development
- Missing `require 'bun_bun_bundle'` in the Hanami integration file

### Changed

- Railtie now uses `BunBunBundle.setup` internally, removing duplicated logic

## [0.1.1] - 2026-03-26

### Fixed

- Mark HTML tag helper output as `html_safe` in Rails to prevent double-escaping

### Changed

- Default asset paths from `src/` to `app/assets/` to match Rails and Hanami conventions
- Extract `SafeHtml` module for cross-framework HTML safety

## [0.1.0] - 2026-03-26

### Added

- Bun-powered asset bundler (JS, CSS, static assets)
- Asset fingerprinting with content-based hashes in production
- CSS hot-reloading via WebSocket
- Live reload for JS and static asset changes
- Built-in plugins: `cssAliases`, `cssGlobs`, `jsGlobs`
- Custom plugin support (transform functions and raw Bun plugins)
- Asset helpers: `bun_asset`, `bun_js_tag`, `bun_css_tag`, `bun_img_tag`
- Live reload tag: `bun_reload_tag`
- Development cache-busting middleware
- Rails integration via Railtie
- Hanami integration
- CLI: `bun_bun_bundle dev` and `bun_bun_bundle build`
- Flag pass-through (`bun_bun_bundle dev --prod`)
- Levenshtein-based asset name suggestions on typos
