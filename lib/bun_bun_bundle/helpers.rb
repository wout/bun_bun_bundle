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
    include SafeHtml

    FINGERPRINTED_CSS_REGEX = /-[0-9a-f]{8}\.css$/

    # Returns the public path to an asset from the manifest.
    #
    # Prepends the configured public_path and asset_host:
    #
    #   bun_asset("js/app.js")       # => "/assets/js/app.js"
    #   bun_asset("images/logo.png") # => "/assets/images/logo-abc123.png" (production)
    #
    def bun_asset(path)
      bun_asset_url(bun_entry(path))
    end

    # Generates a <script> tag for a JS entry point.
    #
    #   bun_js_tag("js/app.js")
    #   # => '<script src="/assets/js/app.js" type="text/javascript"></script>'
    #
    def bun_js_tag(source, **options)
      entry = bun_entry(source)
      attrs = { type: 'text/javascript' }
              .merge(bun_sri_attrs(entry))
              .merge(options)
              .merge(src: bun_asset_url(entry))
      bun_safe(%(<script #{bun_html_attrs(attrs)}></script>))
    end

    # Generates a <link> tag for a CSS entry point.
    #
    #   bun_css_tag("css/app.css")
    #   # => '<link href="/assets/css/app.css" type="text/css" rel="stylesheet">'
    #
    def bun_css_tag(source, **options)
      entry = bun_entry(source)
      attrs = { type: 'text/css', rel: 'stylesheet' }
              .merge(bun_sri_attrs(entry))
              .merge(options)
              .merge(href: bun_href_with_timestamp(bun_asset_url(entry)))
      bun_safe(%(<link #{bun_html_attrs(attrs)}>))
    end

    # Generates an <img> tag for an image asset.
    #
    # Subresource Integrity is intentionally not rendered on images: browsers
    # do not enforce SRI for <img> elements.
    #
    #   bun_img_tag("images/logo.png", alt: "Logo")
    #   # => '<img src="/assets/images/logo.png" alt="Logo">'
    #
    def bun_img_tag(source, **options)
      src = bun_asset(source)
      alt = options.delete(:alt) || File.basename(source, '.*').tr('-_', ' ').capitalize
      attrs = { alt: alt }.merge(options).merge(src: src)
      bun_safe(%(<img #{bun_html_attrs(attrs)}>))
    end

    private

    def bun_entry(source)
      BunBunBundle.manifest[source]
    end

    def bun_asset_url(entry)
      "#{BunBunBundle.asset_host}#{BunBunBundle.config.public_path}/#{entry.url}"
    end

    def bun_sri_attrs(entry)
      return {} if entry.sri.empty?

      { integrity: entry.sri.join(' '), crossorigin: 'anonymous' }
    end

    def bun_html_attrs(hash)
      bun_flatten_attrs(hash).compact.map do |k, v|
        k = k.to_s.tr('_', '-')
        v == true ? k : %(#{k}="#{bun_escape_attr(v)}")
      end.join(' ')
    end

    def bun_flatten_attrs(hash, prefix: nil)
      hash.each_with_object({}) do |(k, v), flat|
        key = prefix ? :"#{prefix}_#{k}" : k
        if v.is_a?(Hash)
          flat.merge!(bun_flatten_attrs(v, prefix: key))
        else
          flat[key] = v
        end
      end
    end

    def bun_escape_attr(value)
      value.to_s.gsub('&', '&amp;').gsub('"', '&quot;').gsub('<', '&lt;').gsub('>', '&gt;')
    end

    def bun_href_with_timestamp(href)
      config = BunBunBundle.config
      return href unless href.start_with?(config.public_path)
      return href if href.match?(FINGERPRINTED_CSS_REGEX)

      file_path = href.sub(config.public_path, config.out_dir)
      mtime = File.exist?(file_path) ? File.mtime(file_path).to_i : Time.now.to_i

      "#{href}#{href.include?('?') ? '&' : '?'}bust=#{mtime}"
    end
  end
end
