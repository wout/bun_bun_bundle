# frozen_string_literal: true

require 'spec_helper'

class ReloadTagTest < Minitest::Test
  include TestHelpers
  include BunBunBundle::ReloadTag

  def setup
    super
    with_config
    with_manifest(
      'js/app.js' => 'js/app.js',
      'css/app.css' => 'css/app.css',
      'css/admin.css' => 'css/admin.css',
    )
  end

  def test_renders_script_tag_in_development
    BunBunBundle.environment = 'development'
    html = bun_reload_tag

    assert_includes html, '<script>'
    assert_includes html, '</script>'
    assert_includes html, 'new WebSocket'
    assert_includes html, 'ws://127.0.0.1:3002'
  end

  def test_includes_css_entry_points
    BunBunBundle.environment = 'development'
    html = bun_reload_tag

    assert_includes html, '/assets/css/app.css'
    assert_includes html, '/assets/css/admin.css'
  end

  def test_returns_empty_string_in_production
    BunBunBundle.environment = 'production'

    assert_equal '', bun_reload_tag
  end

  def test_returns_empty_string_in_test
    BunBunBundle.environment = 'test'

    assert_equal '', bun_reload_tag
  end

  def test_handles_css_hmr_message_type
    BunBunBundle.environment = 'development'
    html = bun_reload_tag

    assert_includes html, "data.type === 'css'"
    assert_includes html, 'link.href = url.toString()'
  end

  def test_handles_full_reload
    BunBunBundle.environment = 'development'
    html = bun_reload_tag

    assert_includes html, 'location.reload()'
  end

  def test_uses_secure_websocket_when_configured
    BunBunBundle.environment = 'development'
    with_config('devServer' => { 'secure' => true })
    html = bun_reload_tag

    assert_includes html, 'wss://127.0.0.1:3002'
  end

  def test_uses_custom_port
    BunBunBundle.environment = 'development'
    with_config('devServer' => { 'port' => 4000 })
    html = bun_reload_tag

    assert_includes html, 'ws://127.0.0.1:4000'
  end
end
