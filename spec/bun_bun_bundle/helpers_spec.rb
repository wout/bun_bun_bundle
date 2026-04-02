# frozen_string_literal: true

require 'spec_helper'

class HelpersTest < Minitest::Test
  include TestHelpers
  include BunBunBundle::Helpers

  def setup
    super
    with_config
    with_manifest(
      'js/app.js' => 'js/app.js',
      'css/app.css' => 'css/app.css',
      'images/logo.png' => 'images/logo-abc12345.png',
    )
  end

  # bun_asset

  def test_bun_asset_returns_public_path
    assert_equal '/assets/js/app.js', bun_asset('js/app.js')
  end

  def test_bun_asset_returns_fingerprinted_path
    assert_equal '/assets/images/logo-abc12345.png', bun_asset('images/logo.png')
  end

  def test_bun_asset_with_custom_public_path
    with_config('publicPath' => '/static')

    assert_equal '/static/js/app.js', bun_asset('js/app.js')
  end

  def test_bun_asset_with_asset_host
    BunBunBundle.asset_host = 'https://cdn.example.com'

    assert_equal 'https://cdn.example.com/assets/js/app.js', bun_asset('js/app.js')
  end

  def test_bun_asset_missing_raises
    assert_raises(BunBunBundle::Manifest::MissingAssetError) do
      bun_asset('js/missing.js')
    end
  end

  # bun_js_tag

  def test_bun_js_tag
    html = bun_js_tag('js/app.js')

    assert_equal '<script type="text/javascript" src="/assets/js/app.js"></script>', html
  end

  def test_bun_js_tag_with_options
    html = bun_js_tag('js/app.js', defer: true)

    assert_includes html, 'defer'
    assert_includes html, 'src="/assets/js/app.js"'
  end

  # bun_css_tag

  def test_bun_css_tag
    html = bun_css_tag('css/app.css')

    assert_equal '<link type="text/css" rel="stylesheet" href="/assets/css/app.css">', html
  end

  def test_bun_css_tag_with_options
    html = bun_css_tag('css/app.css', media: 'print')

    assert_includes html, 'media="print"'
    assert_includes html, 'href="/assets/css/app.css"'
  end

  # bun_img_tag

  def test_bun_img_tag
    html = bun_img_tag('images/logo.png')

    assert_includes html, 'src="/assets/images/logo-abc12345.png"'
    assert_includes html, 'alt="Logo"'
  end

  def test_bun_img_tag_with_custom_alt
    html = bun_img_tag('images/logo.png', alt: 'My Logo')

    assert_includes html, 'alt="My Logo"'
  end

  def test_bun_img_tag_auto_alt_from_filename
    with_manifest('images/hero-banner.png' => 'images/hero-banner.png')
    html = bun_img_tag('images/hero-banner.png')

    assert_includes html, 'alt="Hero banner"'
  end

  # data attributes (Rails-style nested hash)

  def test_data_attributes_with_nested_hash
    html = bun_js_tag('js/app.js', data: { turbo_track: 'reload' })

    assert_includes html, 'data-turbo-track="reload"'
  end

  def test_data_attributes_with_multiple_nested_keys
    html = bun_js_tag('js/app.js', data: { controller: 'app', action: 'click' })

    assert_includes html, 'data-controller="app"'
    assert_includes html, 'data-action="click"'
  end

  def test_data_attributes_with_boolean_value_in_hash
    html = bun_js_tag('js/app.js', data: { turbo: true })

    assert_includes html, 'data-turbo'
    refute_includes html, 'data-turbo="'
  end

  # data attributes (Lucky-style underscored keys)

  def test_data_attributes_with_underscored_key
    html = bun_js_tag('js/app.js', data_turbo_track: 'reload')

    assert_includes html, 'data-turbo-track="reload"'
  end

  def test_data_attributes_with_single_underscore
    html = bun_css_tag('css/app.css', data_controller: 'styles')

    assert_includes html, 'data-controller="styles"'
  end

  # aria attributes

  def test_aria_attributes_with_nested_hash
    html = bun_js_tag('js/app.js', aria: { label: 'Main script' })

    assert_includes html, 'aria-label="Main script"'
  end

  def test_aria_attributes_with_underscored_key
    html = bun_img_tag('images/logo.png', aria_hidden: true)

    assert_includes html, 'aria-hidden'
  end

  # HTML escaping

  def test_escapes_html_in_attributes
    html = bun_img_tag('images/logo.png', alt: 'a "quoted" <value>')

    assert_includes html, '&quot;quoted&quot;'
    assert_includes html, '&lt;value&gt;'
  end

  # boolean attributes

  def test_boolean_attributes
    html = bun_js_tag('js/app.js', async: true)

    assert_includes html, 'async'
    refute_includes html, 'async="'
  end
end
