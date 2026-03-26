# frozen_string_literal: true

module BunBunBundle
  # Asset helpers for use in views/templates.
  #
  # Include this module in your view helpers to get access to `bun_asset` and
  # tag helpers. Works with ERB, Haml, Slim, or any other templating engine.
  #
  # Example (ERB):
  #
  #   <img src="<%= bun_asset("images/logo.png") %>">
  #   <%= bun_js_tag("js/app.js") %>
  #   <%= bun_css_tag("css/app.css") %>
  #
  module Helpers
    # Returns the public path to an asset from the manifest.
    #
    # Prepends the configured public_path and asset_host:
    #
    #   bun_asset("js/app.js")       # => "/assets/js/app.js"
    #   bun_asset("images/logo.png") # => "/assets/images/logo-abc123.png" (production)
    #
    def bun_asset(path)
      fingerprinted = BunBunBundle.manifest[path]
      "#{BunBunBundle.asset_host}#{BunBunBundle.config.public_path}/#{fingerprinted}"
    end

    # Generates a <script> tag for a JS entry point.
    #
    #   bun_js_tag("js/app.js")
    #   # => '<script src="/assets/js/app.js" type="text/javascript"></script>'
    #
    def bun_js_tag(source, **options)
      src = bun_asset(source)
      attrs = { type: 'text/javascript' }.merge(options).merge(src: src)
      %(<script #{_bun_html_attrs(attrs)}></script>)
    end

    # Generates a <link> tag for a CSS entry point.
    #
    #   bun_css_tag("css/app.css")
    #   # => '<link href="/assets/css/app.css" type="text/css" rel="stylesheet">'
    #
    def bun_css_tag(source, **options)
      href = bun_asset(source)
      attrs = { type: 'text/css', rel: 'stylesheet' }.merge(options).merge(href: href)
      %(<link #{_bun_html_attrs(attrs)}>)
    end

    # Generates an <img> tag for an image asset.
    #
    #   bun_img_tag("images/logo.png", alt: "Logo")
    #   # => '<img src="/assets/images/logo.png" alt="Logo">'
    #
    def bun_img_tag(source, **options)
      src = bun_asset(source)
      alt = options.delete(:alt) || File.basename(source, '.*').tr('-_', ' ').capitalize
      attrs = { alt: alt }.merge(options).merge(src: src)
      %(<img #{_bun_html_attrs(attrs)}>)
    end

    private

    def _bun_html_attrs(hash)
      hash.compact.map do |k, v|
        v == true ? k.to_s : %(#{k}="#{_bun_escape_attr(v)}")
      end.join(' ')
    end

    def _bun_escape_attr(value)
      value.to_s.gsub('&', '&amp;').gsub('"', '&quot;').gsub('<', '&lt;').gsub('>', '&gt;')
    end
  end
end
