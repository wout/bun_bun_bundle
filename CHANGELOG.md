# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Hanami integration via `bun_bun_bundle/hanami`
- CLI: `bun_bun_bundle dev` and `bun_bun_bundle build`
- Flag pass-through (`bun_bun_bundle dev --prod`)
- Levenshtein-based asset name suggestions on typos
