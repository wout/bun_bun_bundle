# frozen_string_literal: true

module BunBunBundle
  # Hanami integration for BunBunBundle.
  #
  # Add to your Hanami app's config/app.rb:
  #
  #   require "bun_bun_bundle/hanami"
  #
  #   module MyApp
  #     class App < Hanami::App
  #       config.middleware.use BunBunBundle::DevCacheMiddleware if Hanami.env?(:development)
  #     end
  #   end
  #
  # Then include helpers in your views:
  #
  #   # app/views/helpers.rb
  #   module MyApp
  #     module Views
  #       module Helpers
  #         include BunBunBundle::Helpers
  #         include BunBunBundle::ReloadTag
  #       end
  #     end
  #   end
  #
  module HanamiIntegration
    def self.setup(root: Dir.pwd)
      BunBunBundle.config = Config.load(root: root)

      BunBunBundle.manifest = if BunBunBundle.development?
                                Manifest.load(root: root)
                              else
                                Manifest.load(root: root, retries: 1, delay: 0)
                              end
    end
  end
end

# Auto-setup when loaded in a Hanami app.
if defined?(Hanami)
  Hanami::App.after :configure do
    BunBunBundle::HanamiIntegration.setup(root: root.to_s)
  end
end
