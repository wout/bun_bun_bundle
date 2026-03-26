# frozen_string_literal: true

require_relative 'bun_bun_bundle/version'
require_relative 'bun_bun_bundle/config'
require_relative 'bun_bun_bundle/manifest'
require_relative 'bun_bun_bundle/safe_html'
require_relative 'bun_bun_bundle/helpers'
require_relative 'bun_bun_bundle/reload_tag'
require_relative 'bun_bun_bundle/dev_cache_middleware'

module BunBunBundle
  class << self
    attr_writer :config, :manifest, :asset_host, :environment

    def config
      @config ||= Config.new
    end

    def manifest
      @manifest ||= Manifest.new
    end

    def asset_host
      @asset_host || ''
    end

    def environment
      @environment || ENV['RACK_ENV'] || ENV['RAILS_ENV'] || 'development'
    end

    def development?
      environment == 'development'
    end

    def production?
      environment == 'production'
    end

    # Returns the path to the bundled JS files shipped with the gem.
    def bun_path
      File.expand_path('bun', __dir__)
    end

    # Resets all state. Useful for testing.
    def reset!
      @config = nil
      @manifest = nil
      @asset_host = nil
      @environment = nil
    end
  end
end

require_relative 'bun_bun_bundle/railtie' if defined?(Rails::Railtie)
