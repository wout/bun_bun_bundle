# frozen_string_literal: true

require 'spec_helper'

class ConfigTest < Minitest::Test
  include TestHelpers

  def test_defaults
    config = BunBunBundle::Config.new

    assert_equal 'public/bun-manifest.json', config.manifest_path
    assert_equal 'public/assets', config.out_dir
    assert_equal '/assets', config.public_path
    assert_equal %w[app/assets/images app/assets/fonts], config.static_dirs
  end

  def test_entry_point_defaults
    config = BunBunBundle::Config.new

    assert_equal %w[app/assets/js/app.js], config.entry_points.js
    assert_equal %w[app/assets/css/app.css], config.entry_points.css
  end

  def test_entry_points_accepts_strings
    config = BunBunBundle::Config.new(
      'entryPoints' => { 'js' => 'app/assets/js/app.js', 'css' => 'app/assets/css/app.css' },
    )

    assert_equal %w[app/assets/js/app.js], config.entry_points.js
    assert_equal %w[app/assets/css/app.css], config.entry_points.css
  end

  def test_dev_server_defaults
    config = BunBunBundle::Config.new

    assert_equal '127.0.0.1', config.dev_server.host
    assert_equal 3002, config.dev_server.port
    refute config.dev_server.secure?
  end

  def test_dev_server_ws_url
    config = BunBunBundle::Config.new

    assert_equal 'ws', config.dev_server.ws_protocol
    assert_equal 'ws://127.0.0.1:3002', config.dev_server.ws_url
  end

  def test_dev_server_secure_ws_url
    config = BunBunBundle::Config.new('devServer' => { 'secure' => true })

    assert_equal 'wss', config.dev_server.ws_protocol
    assert_equal 'wss://127.0.0.1:3002', config.dev_server.ws_url
  end

  def test_custom_values
    config = BunBunBundle::Config.new(
      'outDir' => 'dist/assets',
      'publicPath' => '/static',
      'devServer' => { 'port' => 4000 },
    )

    assert_equal 'dist/assets', config.out_dir
    assert_equal '/static', config.public_path
    assert_equal 4000, config.dev_server.port
  end

  def test_load_from_file
    Dir.mktmpdir do |dir|
      FileUtils.mkdir_p(File.join(dir, 'config'))
      File.write(File.join(dir, 'config/bun.json'), JSON.generate(
                                                      'outDir' => 'dist/assets',
                                                      'devServer' => { 'port' => 4000 },
                                                    ),)

      config = BunBunBundle::Config.load(root: dir)

      assert_equal 'dist/assets', config.out_dir
      assert_equal 4000, config.dev_server.port
      # Defaults still apply for unset values
      assert_equal '/assets', config.public_path
    end
  end

  def test_load_without_config_file
    Dir.mktmpdir do |dir|
      config = BunBunBundle::Config.load(root: dir)

      assert_equal 'public/assets', config.out_dir
      assert_equal 3002, config.dev_server.port
    end
  end
end
