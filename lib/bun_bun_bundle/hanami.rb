# frozen_string_literal: true

module BunBunBundle
  # Hanami integration for BunBunBundle.
  #
  # Add to your Hanami app's config/app.rb:
  #
  #   require 'bun_bun_bundle/hanami'
  #
  #   module MyApp
  #     class App < Hanami::App
  #       BunBunBundle.setup(root: root)
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
end
