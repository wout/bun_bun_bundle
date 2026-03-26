# frozen_string_literal: true

require 'minitest/autorun'
require 'rack/test'
require 'json'
require 'fileutils'
require 'bun_bun_bundle'

FIXTURES_PATH = File.expand_path('fixtures', __dir__)

module TestHelpers
  def setup
    BunBunBundle.reset!
  end

  def fixture_path(name)
    File.join(FIXTURES_PATH, name)
  end

  def load_fixture_manifest
    BunBunBundle::Manifest.new(
      'js/app.js' => 'js/app.js',
      'css/app.css' => 'css/app.css',
      'images/logo.png' => 'images/logo-abc12345.png',
      'fonts/Inter.woff2' => 'fonts/Inter-def67890.woff2',
    )
  end

  def with_manifest(entries = {})
    BunBunBundle.manifest = BunBunBundle::Manifest.new(entries)
  end

  def with_config(data = {})
    BunBunBundle.config = BunBunBundle::Config.new(data)
  end
end
