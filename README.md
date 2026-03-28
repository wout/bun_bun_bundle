# Bun, Bun, Bundle

A self-contained asset bundler for Ruby powered by [Bun](https://bun.sh). No
development dependencies, no complex configuration. Lightning fast builds with
CSS hot-reloading, fingerprinting, live reload, and a flexible plugin system.
Works with Rails, Hanami, or any Rack app.

## Why use BunBunBundle?

- **Lightning fast.** Bun's native bundler builds assets in milliseconds.
- **CSS hot-reloading.** Instant changes without a full page refresh.
- **Asset fingerprinting.** Fast, content-based file hashing.
- **No surprises in production.** Dev and prod go through the same pipeline.
- **Extensible.** Plugins are simple, tiny JavaScript files.
- **One dependency: Bun.** Everything is included, no other dev dependencies.

> [!Note]
> The original repository is hosted at
> [Codeberg](https://codeberg.org/w0u7/bun_bun_bundle). The [GitHub
> repo](https://github.com/wout/bun_bun_bundle) is just a mirror.

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

BunBunBundle completely bypasses the Rails asset pipeline. If you're adding it
to an existing app, you can remove Sprockets/Propshaft:

- Remove `gem 'sprockets-rails'` or `gem 'propshaft'` from your `Gemfile`
- Delete `config/initializers/assets.rb` if present

For new apps, generate them without the asset pipeline:

```sh
rails new myapp --minimal --skip-asset-pipeline --skip-javascript
```

The gem auto-configures itself through a Railtie. All helpers are available in
your views immediately:

```erb
<!DOCTYPE html>
<html>
<head>
  <%= bun_css_tag('css/app.css') %>
  <%= bun_js_tag('js/app.js', defer: true) %>
  <%= bun_reload_tag %>
</head>
<body>
  <%= bun_img_tag('images/logo.png', alt: 'My App') %>
</body>
</html>
```

> [!NOTE]
> The `DevCacheMiddleware` is automatically inserted in development to prevent
> stale asset caching.

## Usage with Hanami

Hanami ships with its own esbuild-based asset pipeline. Since BunBunBundle
replaces it entirely, you can clean up the default setup:

- Remove `gem 'hanami-assets'` from your `Gemfile`
- Delete `config/assets.js`
- Remove all dev dependencies from `package.json`

1. Set up the Hanami integration:

   ```ruby
   # config/app.rb

   require 'bun_bun_bundle/hanami'

   module MyApp
     class App < Hanami::App
       BunBunBundle.setup(root: root, hanami: config)
     end
   end
   ```

   This loads the manifest, and in development automatically registers the
   cache-busting middleware and configures the CSP to allow the live reload
   script and WebSocket connection.

2. Include the helpers in your views:

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

3. Use them in your templates:

   ```erb
   <%= bun_css_tag('css/app.css') %>
   <%= bun_js_tag('js/app.js') %>
   <%= bun_reload_tag %>
   ```

## Usage with any Rack app

```ruby
require 'bun_bun_bundle'

BunBunBundle.setup(root: __dir__)

# Optionally set a CDN host
BunBunBundle.asset_host = 'https://cdn.example.com'
```

## Helpers

All helpers are prefixed with `bun_` to avoid conflicts with existing framework
helpers:

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

Build your assets using the bundled CLI (`bbb` is available as a shorter
alias):

```sh
# Development: builds, watches, and starts the live reload server
bun_bun_bundle dev

# Production: builds with fingerprinting and minification
bun_bun_bundle build

# Development with a production build (fingerprinting + minification)
bun_bun_bundle dev --prod
```

> [!NOTE]
> When running from a Procfile (e.g. with Overmind or Foreman), use
> `bundle exec bun_bun_bundle` to ensure the correct gem version is loaded.

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
    "css": ["aliases", "cssGlobs"],
    "js": ["aliases", "jsGlobs"]
  }
}
```

All values shown above are defaults. You only need to specify what you want to
override.

## Plugins

Three plugins are included out of the box.

### `aliases`

Resolves `$/` root aliases to absolute paths in both CSS and JS files. This
lets you reference assets and modules from the project root without worrying
about relative paths.

In CSS:

```css
@import '$/app/assets/css/reset.css';

.logo {
  background: url('$/app/assets/images/logo.png');
}
```

In JS:

```javascript
import utils from '$/lib/utils.js'
```

All `$/` references are resolved to your project root.

### `cssGlobs`

Expands glob patterns in CSS `@import` statements. Instead of manually listing
every file, you can import an entire directory at once:

```css
@import './components/**/*.css';
```

This will be expanded into individual `@import` lines for each matching file,
sorted alphabetically.

> [!NOTE]
> A warning is logged if the pattern matches no files.

### `jsGlobs`

Compiles glob imports into an object that maps file paths to their default
exports. Use the special `glob:` prefix in an import statement:

```javascript
import components from 'glob:./components/**/*.js'
```

This will generate individual imports and builds an object mapping. For
example:

```javascript
import _glob_components_theme from './components/theme.js'
import _glob_components_shared_tooltip from './components/shared/tooltip.js'
const components = {
  'theme': _glob_components_theme,
  'shared/tooltip': _glob_components_shared_tooltip
}
```

> [!NOTE]
> If no files match the pattern, an empty object is assigned.

### Custom plugins

Custom plugins are JS files referenced by their path in the config. Each file
must export a factory function that receives a context object. What the factory
returns determines the plugin type.

The context object has the following properties:

| Property   | Description                                  |
| ---------- | -------------------------------------------- |
| `root`     | Absolute path to the project root            |
| `config`   | The resolved `bun.json` configuration object |
| `dev`      | `true` when running in development mode      |
| `prod`     | `true` when running in production mode       |
| `manifest` | The current asset manifest object            |

#### Simple transform plugins

A simple transform plugin returns a function that receives the file content as
a string and an `args` object from Bun's
[`onLoad`](https://bun.sh/docs/bundler/plugins#onload) hook (containing `path`,
`loader`, etc.). It should return the transformed content. The transform can be
synchronous or asynchronous.

Transforms are chained in the order they appear in the config, so each
transform receives the output of the previous one.

```javascript
// config/bun/banner.js

export default function banner({prod}) {
  return (content, args) => {
    const stamp = prod ? '' : ` (dev ${args.path})`
    return `/* My App${stamp} */\n${content}`
  }
}
```

#### Raw Bun plugins

If the factory returns an object with a `setup` method instead of a function,
it is treated as a raw
[Bun plugin](https://bun.sh/docs/bundler/plugins). This gives you full access
to Bun's plugin API, including `onLoad`, `onResolve`, and custom loaders.

```javascript
// config/bun/svg.js

export default function svg() {
  return {
    name: 'svg-loader',
    setup(build) {
      build.onLoad({filter: /\.svg$/}, async args => {
        const text = await Bun.file(args.path).text()
        return {
          contents: `export default ${JSON.stringify(text)}`,
          loader: 'js'
        }
      })
    }
  }
}
```

#### Registering custom plugins

Reference custom plugins by their file path in your config:

```json
{
  "plugins": {
    "css": ["aliases", "cssGlobs", "config/bun/banner.js"],
    "js": ["aliases", "jsGlobs", "config/bun/svg.js"]
  }
}
```

> [!WARNING]
> The order of the plugins matters here. For example, the aliases plugin needs
> to resolve the paths first before the glob plugin can do its work. Keep that
> in mind for your own plugins too.

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

## Deploying with Docker

Install Bun, your JS dependencies, then run the build step:

```dockerfile
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bundle exec bun_bun_bundle build
```

> [!NOTE]
> If you're using BunBunBundle in Rails as your only asset pipeline, you can
> skip the `rails assets:precompile` step entirely.

## Origins

BunBunBundle was originally built for [Fluck](https://fluck.site), a
self-hostable website builder using [Lucky
Framework](https://luckyframework.org/). I wanted to have a fast and modern
asset bundler that would require minimal maintenance in the long term.

Bun was the natural choice because it does almost everything:

- JS bundling, tree-shaking, and minification
- CSS processing and minification (through the built-in
  [LightningCSS](https://lightningcss.dev/) library)
- WebSocket server for hot and live reloading
- Content hashing for asset fingerprints
- Extendability with simple plugins

It's also fast and reliable. We use this setup heavily in two Lucky apps and it
is rock solid. It has since been adopted by Lucky as the default builder.

This Gem was born because I wanted to have the same setup in my Ruby apps as
well. I hope you enjoy it too!

## Contributing

### Setup

```sh
git clone https://codeberg.org/w0u7/bun_bun_bundle.git
cd bun_bun_bundle
bundle install
```

### Running tests

```sh
bundle exec rake test       # run all tests
bundle exec rake test:ruby  # Ruby tests only (Minitest, in spec/)
bundle exec rake test:bun   # JS tests only (Bun, plugin tests)
```

> [!NOTE]
> `bundle exec rake` with no arguments runs all tests too.

### Linting

```sh
bundle exec rubocop
```

### Commit conventions

We use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).

### Submitting changes

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'feat: new feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## Contributors

- [Wout](https://codeberg.org/w0u7) - creator and maintainer

## License

[MIT](LICENSE)
