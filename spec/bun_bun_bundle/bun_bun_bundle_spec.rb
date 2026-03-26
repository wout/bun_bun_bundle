# frozen_string_literal: true

require 'spec_helper'

class BunBunBundleTest < Minitest::Test
  include TestHelpers

  def test_version
    refute_nil BunBunBundle::VERSION
  end

  def test_default_environment
    assert_equal 'development', BunBunBundle.environment
  end

  def test_custom_environment
    BunBunBundle.environment = 'production'

    assert BunBunBundle.production?
    refute BunBunBundle.development?
  end

  def test_development_check
    BunBunBundle.environment = 'development'

    assert BunBunBundle.development?
    refute BunBunBundle.production?
  end

  def test_asset_host_default
    assert_equal '', BunBunBundle.asset_host
  end

  def test_custom_asset_host
    BunBunBundle.asset_host = 'https://cdn.example.com'

    assert_equal 'https://cdn.example.com', BunBunBundle.asset_host
  end

  def test_reset_clears_all_state
    BunBunBundle.environment = 'production'
    BunBunBundle.asset_host = 'https://cdn.example.com'
    BunBunBundle.config = BunBunBundle::Config.new
    BunBunBundle.manifest = BunBunBundle::Manifest.new

    BunBunBundle.reset!

    assert_equal 'development', BunBunBundle.environment
    assert_equal '', BunBunBundle.asset_host
  end

  def test_bun_path_points_to_js_directory
    path = BunBunBundle.bun_path

    assert File.directory?(path), "Expected #{path} to be a directory"
    assert File.exist?(File.join(path, 'bun_bundle.js'))
    assert File.exist?(File.join(path, 'bake.js'))
  end

  def test_environment_falls_back_to_rack_env
    BunBunBundle.reset!
    original = ENV.fetch('RACK_ENV', nil)
    ENV['RACK_ENV'] = 'production'

    assert_equal 'production', BunBunBundle.environment
  ensure
    ENV['RACK_ENV'] = original
    BunBunBundle.reset!
  end
end
