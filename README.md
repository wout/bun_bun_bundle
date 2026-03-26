# BunBunBundle

A self-contained asset bundler for Ruby powered by [Bun](https://bun.sh). No
development dependencies, no complex configuration. Fast builds with CSS
hot-reloading, fingerprinting, live reload, and a flexible plugin system. Works
with Rails, Hanami, or any Rack app.

## Why use BunBunBundle?

### Lightning fast bundling

BunBunBundle leverages Bun's native bundler which is orders of magnitude faster
than traditional Node.js-based tools. Your assets are built in milliseconds,
not seconds.

### CSS hot-reloading

CSS changes are hot-reloaded in the browser without a full page refresh. Your
state stays intact, your scroll position is preserved, and you see changes
instantly.

### Asset fingerprinting

Every asset is fingerprinted with a content-based hash in production, so
browsers always fetch the right version.

### No surprises in production

Development and production builds go through the exact same pipeline. The only
differences are fingerprinting and minification being enabled in production,
but nothing is holding you back form them in development as well.

### Extensible plugin system

Comes with built-in plugins for CSS glob imports, root aliases, and JS glob
imports. Plugins are simple, plain JS files, so you can create your own JS/CSS
transformers, and raw Bun plugins are supported as well.

### Just one dependency: Bun

The bundler ships with the gem. Bun is the only external requirement, so there
are zero dev dependencies.

## Installation

1. Add the gem to your `Gemfile`:

   ```ruby
   gem 'bun_bun_bundle'
   ```

2. Run `bundle install`

3. Make sure [Bun](https://bun.sh) is installed:

   ```sh
   curl -fsSL https://bun.sh/install | bash
   ```

## Usage with Rails

The gem auto-configures itself through a Railtie. All helpers are available in
your views immediately:

```erb
<!DOCTYPE html>
<html>
<head>
  <%= bun_css_tag('css/app.css') %>
</head>
<body>
  <%= bun_img_tag('images/logo.png', alt: 'My App') %>
  <%= bun_js_tag('js/app.js', defer: true) %>
  <%= bun_reload_tag %>
</body>
</html>
```

The `DevCacheMiddleware` is automatically inserted in development to prevent
stale asset caching.

## Usage with Hanami

1. Require the Hanami integration:

   ```ruby
   # config/app.rb

   require 'bun_bun_bundle/hanami'
   ```

2. Optionally add the dev cache middleware:

   ```ruby
   # config/app.rb

   module MyApp
     class App < Hanami::App
       config.middleware.use BunBunBundle::DevCacheMiddleware if Hanami.env?(:development)
     end
   end
   ```

3. Include the helpers in your views:

   ```ruby
   # app/views/helpers.rb

   module MyApp
     module Views
       module Helpers
         include BunBunBundle::Helpers
         include BunBunBundle::ReloadTag
       end
     end
   end
   ```

4. Use them in your templates:

   ```erb
   <%= bun_css_tag('css/app.css') %>
   <%= bun_js_tag('js/app.js') %>
   <%= bun_reload_tag %>
   ```

## Usage with any Rack app

```ruby
require 'bun_bun_bundle'

# Configure manually
BunBunBundle.config = BunBunBundle::Config.load(root: __dir__)
BunBunBundle.manifest = BunBunBundle::Manifest.load(root: __dir__)

# Optionally set a CDN host
BunBunBundle.asset_host = 'https://cdn.example.com'
```

## Helpers

All helpers are prefixed with `bun_` to avoid conflicts with framework helpers:

| Helper                           | Description                                      |
| -------------------------------- | ------------------------------------------------ |
| `bun_asset('images/logo.png')`   | Returns the fingerprinted asset path             |
| `bun_js_tag('js/app.js')`        | Generates a `<script>` tag                       |
| `bun_css_tag('css/app.css')`     | Generates a `<link>` tag                         |
| `bun_img_tag('images/logo.png')` | Generates an `<img>` tag                         |
| `bun_reload_tag`                 | Live reload script (only renders in development) |

All tag helpers accept additional HTML attributes:

```erb
<%= bun_js_tag('js/app.js', defer: true, async: true) %>
<%= bun_css_tag('css/app.css', media: 'print') %>
<%= bun_img_tag('images/logo.png', alt: 'My App', class: 'logo') %>
```

## CLI

Build your assets using the bundled CLI:

```sh
# Development: builds, watches, and starts the live reload server
bun_bun_bundle dev

# Production: builds with fingerprinting and minification
bun_bun_bundle build

# Development with a production build (fingerprinting + minification)
bun_bun_bundle dev --prod
```

## Configuration

Place a `config/bun.json` in your project root:

```json
{
  "entryPoints": {
    "js": ["app/assets/js/app.js"],
    "css": ["app/assets/css/app.css"]
  },
  "outDir": "public/assets",
  "publicPath": "/assets",
  "manifestPath": "public/bun-manifest.json",
  "staticDirs": ["app/assets/images", "app/assets/fonts"],
  "devServer": {
    "host": "127.0.0.1",
    "port": 3002,
    "secure": false
  },
  "plugins": {
    "css": ["cssAliases", "cssGlobs"],
    "js": ["jsGlobs"]
  }
}
```

All values shown above are defaults, you only need to specify what you want to
override.

## Plugins

Three plugins are included out of the box:

| Plugin       | Description                                                      |
| ------------ | ---------------------------------------------------------------- |
| `cssAliases` | Resolves `$/` root aliases in CSS `url()` references             |
| `cssGlobs`   | Expands glob patterns in `@import` statements                    |
| `jsGlobs`    | Compiles `import x from 'glob:./path/*.js'` into object mappings |

### Custom plugins

Create a JS file that exports a factory function:

```javascript
// config/bun/banner.js

export default function banner({ prod }) {
  return (content) => {
    const stamp = prod ? "" : ` (dev build ${new Date().toISOString()})`;
    return `/* My App${stamp} */\n${content}`;
  };
}
```

Then reference it in your config:

```json
{
  "plugins": {
    "css": ["cssAliases", "cssGlobs", "config/bun/banner.js"]
  }
}
```

## Project structure

```
your-app/
├── app/
│   └── assets/
│       ├── css/
│       │   └── app.css       # CSS entry point
│       ├── js/
│       │   └── app.js        # JS entry point
│       ├── images/           # Static images (copied + fingerprinted)
│       └── fonts/            # Static fonts (copied + fingerprinted)
├── config/
│   └── bun.json              # Optional bundler configuration
└── public/
    ├── assets/               # Built assets (generated)
    └── bun-manifest.json     # Asset manifest (generated)
```

## Origins

BunBunBundle was originally built for [Fluck](https://fluck.site), a
self-hostable website builder using [Lucky
Framework](https://luckyframework.org/). I wanted to have a fast, comprehensive
asset bundler that would not require too much maintenance in the long term.

Bun was the natural choice because it does almost everything:

- JS bundling, tree-shaking, and minification
- CSS processing and minification (through the built-in
  [LightningCSS](https://lightningcss.dev/) library)
- WebSocket server for hot and live reloading
- Content hashing for asset fingerprints
- Extendability with simple plugins

It's also fast and reliable. We use this setup heavily in two Lucky apps and it
is rock solid, and it has since been adopted by Lucky as the default builder.

I wanted to have the same setup in my Ruby apps as well, that's when this Gem
was born. I hope you enjoy it too!

## Contributing

We use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'feat: new feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## Contributors

- [Wout](https://codeberg.org/w0u7) - creator and maintainer

## License

[MIT](LICENSE)
