# frozen_string_literal: true

require 'bun_bun_bundle'

module BunBunBundle
  # Hanami integration for BunBunBundle.
  #
  # Add to your Hanami app's config/app.rb:
  #
  #   require 'bun_bun_bundle/hanami'
  #
  #   module MyApp
  #     class App < Hanami::App
  #       BunBunBundle.setup(root: root, hanami: config)
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
