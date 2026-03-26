# frozen_string_literal: true

require 'spec_helper'

class ManifestTest < Minitest::Test
  include TestHelpers

  def test_lookup_existing_asset
    manifest = BunBunBundle::Manifest.new('js/app.js' => 'js/app-abc123.js')

    assert_equal 'js/app-abc123.js', manifest['js/app.js']
  end

  def test_lookup_missing_asset_raises
    manifest = BunBunBundle::Manifest.new('js/app.js' => 'js/app-abc123.js')

    error = assert_raises(BunBunBundle::Manifest::MissingAssetError) do
      manifest['js/main.js']
    end

    assert_match(%r{Asset not found: js/main\.js}, error.message)
  end

  def test_lookup_missing_asset_suggests_similar
    manifest = BunBunBundle::Manifest.new('js/app.js' => 'js/app-abc123.js')

    error = assert_raises(BunBunBundle::Manifest::MissingAssetError) do
      manifest['js/ap.js']
    end

    assert_match(%r{Did you mean: js/app\.js}, error.message)
  end

  def test_key_check
    manifest = BunBunBundle::Manifest.new('js/app.js' => 'js/app.js')

    assert manifest.key?('js/app.js')
    refute manifest.key?('js/missing.js')
  end

  def test_css_entry_points
    manifest = BunBunBundle::Manifest.new(
      'js/app.js' => 'js/app.js',
      'css/app.css' => 'css/app.css',
      'css/admin.css' => 'css/admin.css',
      'images/logo.png' => 'images/logo.png',
    )

    assert_equal %w[css/app.css css/admin.css], manifest.css_entry_points
  end

  def test_entries_are_frozen
    manifest = BunBunBundle::Manifest.new('js/app.js' => 'js/app.js')

    assert manifest.entries.frozen?
  end

  def test_load_from_file
    Dir.mktmpdir do |dir|
      manifest_path = File.join(dir, 'public/bun-manifest.json')
      FileUtils.mkdir_p(File.dirname(manifest_path))
      File.write(manifest_path, JSON.generate(
                                  'js/app.js' => 'js/app-abc123.js',
                                  'css/app.css' => 'css/app-def456.css',
                                ),)

      with_config('manifestPath' => 'public/bun-manifest.json')
      manifest = BunBunBundle::Manifest.load(root: dir, retries: 1, delay: 0)

      assert_equal 'js/app-abc123.js', manifest['js/app.js']
      assert_equal 'css/app-def456.css', manifest['css/app.css']
    end
  end

  def test_load_missing_manifest_raises
    Dir.mktmpdir do |dir|
      with_config

      error = assert_raises(RuntimeError) do
        BunBunBundle::Manifest.load(root: dir, retries: 1, delay: 0)
      end

      assert_match(/Manifest not found/, error.message)
    end
  end

  def test_no_suggestion_for_very_different_names
    manifest = BunBunBundle::Manifest.new('js/app.js' => 'js/app.js')

    error = assert_raises(BunBunBundle::Manifest::MissingAssetError) do
      manifest['completely/different/path.txt']
    end

    refute_match(/Did you mean/, error.message)
  end
end
