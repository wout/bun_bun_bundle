# frozen_string_literal: true

require 'spec_helper'

class ManifestTest < Minitest::Test
  include TestHelpers

  def test_lookup_existing_asset
    manifest = BunBunBundle::Manifest.new(
      'js/app.js' => { 'url' => 'js/app-abc123.js' },
    )

    entry = manifest['js/app.js']

    assert_kind_of BunBunBundle::Manifest::Entry, entry
    assert_equal 'js/app-abc123.js', entry.url
    assert_equal [], entry.sri
  end

  def test_lookup_includes_sri_when_present
    manifest = BunBunBundle::Manifest.new(
      'js/app.js' => { 'url' => 'js/app-abc123.js', 'sri' => ['sha384-xyz'] },
    )

    entry = manifest['js/app.js']

    assert_equal ['sha384-xyz'], entry.sri
  end

  def test_lookup_missing_asset_raises
    manifest = BunBunBundle::Manifest.new(
      'js/app.js' => { 'url' => 'js/app-abc123.js' },
    )

    error = assert_raises(BunBunBundle::Manifest::MissingAssetError) do
      manifest['js/main.js']
    end

    assert_match(%r{Asset not found: js/main\.js}, error.message)
  end

  def test_lookup_missing_asset_suggests_similar
    manifest = BunBunBundle::Manifest.new(
      'js/app.js' => { 'url' => 'js/app-abc123.js' },
    )

    error = assert_raises(BunBunBundle::Manifest::MissingAssetError) do
      manifest['js/ap.js']
    end

    assert_match(%r{Did you mean: js/app\.js}, error.message)
  end

  def test_key_check
    manifest = BunBunBundle::Manifest.new('js/app.js' => { 'url' => 'js/app.js' })

    assert manifest.key?('js/app.js')
    refute manifest.key?('js/missing.js')
  end

  def test_css_entry_points
    manifest = BunBunBundle::Manifest.new(
      'js/app.js' => { 'url' => 'js/app.js' },
      'css/app.css' => { 'url' => 'css/app.css' },
      'css/admin.css' => { 'url' => 'css/admin.css' },
      'images/logo.png' => { 'url' => 'images/logo.png' },
    )

    assert_equal %w[css/app.css css/admin.css], manifest.css_entry_points
  end

  def test_entries_are_frozen
    manifest = BunBunBundle::Manifest.new('js/app.js' => { 'url' => 'js/app.js' })

    assert manifest.entries.frozen?
  end

  def test_old_string_shape_raises_migration_error
    error = assert_raises(BunBunBundle::Manifest::MigrationError) do
      BunBunBundle::Manifest.new('js/app.js' => 'js/app-abc.js')
    end

    assert_match(/predates bun_bun_bundle 0\.13/, error.message)
  end

  def test_entry_without_url_raises_invalid_entry_error
    error = assert_raises(BunBunBundle::Manifest::InvalidEntryError) do
      BunBunBundle::Manifest.new('js/app.js' => { 'sri' => ['sha384-xyz'] })
    end

    assert_match(/missing 'url'/, error.message)
  end

  def test_entry_with_empty_url_raises_invalid_entry_error
    assert_raises(BunBunBundle::Manifest::InvalidEntryError) do
      BunBunBundle::Manifest.new('js/app.js' => { 'url' => '' })
    end
  end

  def test_entry_ignores_unknown_fields
    manifest = BunBunBundle::Manifest.new(
      'js/app.js' => { 'url' => 'js/app.js', 'extra' => 'whatever', 'note' => [1, 2] },
    )

    assert_equal 'js/app.js', manifest['js/app.js'].url
  end

  def test_load_from_file
    Dir.mktmpdir do |dir|
      manifest_path = File.join(dir, 'public/bun-manifest.json')
      FileUtils.mkdir_p(File.dirname(manifest_path))
      File.write(manifest_path, JSON.generate(
                                  'js/app.js' => { 'url' => 'js/app-abc123.js' },
                                  'css/app.css' => { 'url' => 'css/app-def456.css' },
                                ),)

      with_config('manifestPath' => 'public/bun-manifest.json')
      manifest = BunBunBundle::Manifest.load(root: dir, retries: 1, delay: 0)

      assert_equal 'js/app-abc123.js', manifest['js/app.js'].url
      assert_equal 'css/app-def456.css', manifest['css/app.css'].url
    end
  end

  def test_load_old_shape_raises_migration_error
    Dir.mktmpdir do |dir|
      manifest_path = File.join(dir, 'public/bun-manifest.json')
      FileUtils.mkdir_p(File.dirname(manifest_path))
      File.write(manifest_path, JSON.generate('js/app.js' => 'js/app-abc.js'))

      with_config('manifestPath' => 'public/bun-manifest.json')

      assert_raises(BunBunBundle::Manifest::MigrationError) do
        BunBunBundle::Manifest.load(root: dir, retries: 1, delay: 0)
      end
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
    manifest = BunBunBundle::Manifest.new('js/app.js' => { 'url' => 'js/app.js' })

    error = assert_raises(BunBunBundle::Manifest::MissingAssetError) do
      manifest['completely/different/path.txt']
    end

    refute_match(/Did you mean/, error.message)
  end
end
