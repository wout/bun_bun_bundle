# frozen_string_literal: true

module BunBunBundle
  # Rack middleware that sets no-cache headers on asset requests in development.
  #
  # This ensures the browser always fetches fresh assets during development,
  # avoiding stale-cache issues when files are rebuilt.
  #
  # Usage:
  #
  #   # In Rails:
  #   # Automatically added by the Railtie in development.
  #
  #   # In Hanami:
  #   # Automatically added by the Hanami integration in development.
  #
  #   # Manual Rack usage:
  #   use BunBunBundle::DevCacheMiddleware
  #
  class DevCacheMiddleware
    ASSET_EXTENSIONS = %w[
      .js .css .map .json
      .png .jpg .jpeg .gif .svg .webp
      .woff .woff2 .ttf .eot
    ].freeze

    def initialize(app)
      @app = app
    end

    def call(env)
      status, headers, body = @app.call(env)

      if asset_request?(env['PATH_INFO'])
        headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        headers['Expires'] = '0'
      end

      [status, headers, body]
    end

    private

    def asset_request?(path)
      return false unless path

      ASSET_EXTENSIONS.any? { |ext| path.end_with?(ext) }
    end
  end
end
