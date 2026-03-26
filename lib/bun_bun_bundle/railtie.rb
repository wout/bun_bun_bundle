# frozen_string_literal: true

require 'rails/railtie'

module BunBunBundle
  class Railtie < Rails::Railtie
    initializer 'bun_bun_bundle.helpers' do
      ActiveSupport.on_load(:action_view) do
        include BunBunBundle::Helpers
        include BunBunBundle::ReloadTag
      end
    end

    initializer 'bun_bun_bundle.manifest' do |app|
      config.after_initialize do
        BunBunBundle.config = Config.load(root: app.root.to_s)

        BunBunBundle.manifest = if BunBunBundle.development?
                                  Manifest.load(root: app.root.to_s)
                                else
                                  Manifest.load(root: app.root.to_s, retries: 1, delay: 0)
                                end
      end
    end

    initializer 'bun_bun_bundle.dev_cache' do |app|
      app.middleware.insert_before(0, BunBunBundle::DevCacheMiddleware) if BunBunBundle.development?
    end
  end
end
