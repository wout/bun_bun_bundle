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
      'js/app.js' => { 'url' => 'js/app.js' },
      'css/app.css' => { 'url' => 'css/app.css' },
      'images/logo.png' => { 'url' => 'images/logo-abc12345.png' },
      'fonts/Inter.woff2' => { 'url' => 'fonts/Inter-def67890.woff2' },
    )
  end

  def with_manifest(entries = {})
    wrapped = entries.transform_values do |value|
      value.is_a?(Hash) ? value : { 'url' => value }
    end
    BunBunBundle.manifest = BunBunBundle::Manifest.new(wrapped)
  end

  def with_config(data = {})
    BunBunBundle.config = BunBunBundle::Config.new(data)
  end
end
