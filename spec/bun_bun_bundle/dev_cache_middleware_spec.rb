# frozen_string_literal: true

require 'spec_helper'

class DevCacheMiddlewareTest < Minitest::Test
  include Rack::Test::Methods

  def app
    inner = ->(_env) { [200, { 'content-type' => 'text/plain' }, ['OK']] }
    BunBunBundle::DevCacheMiddleware.new(inner)
  end

  def test_sets_no_cache_headers_for_js
    get '/assets/js/app.js'

    assert_equal 200, last_response.status
    assert_equal 'no-store, no-cache, must-revalidate', last_response.headers['Cache-Control']
    assert_equal '0', last_response.headers['Expires']
  end

  def test_sets_no_cache_headers_for_css
    get '/assets/css/app.css'

    assert_equal 'no-store, no-cache, must-revalidate', last_response.headers['Cache-Control']
  end

  def test_sets_no_cache_headers_for_images
    %w[.png .jpg .jpeg .gif .svg .webp].each do |ext|
      get "/assets/images/logo#{ext}"

      assert_equal 'no-store, no-cache, must-revalidate', last_response.headers['Cache-Control'],
                   "Expected no-cache for #{ext}"
    end
  end

  def test_sets_no_cache_headers_for_fonts
    %w[.woff .woff2 .ttf .eot].each do |ext|
      get "/assets/fonts/Inter#{ext}"

      assert_equal 'no-store, no-cache, must-revalidate', last_response.headers['Cache-Control'],
                   "Expected no-cache for #{ext}"
    end
  end

  def test_does_not_set_cache_headers_for_html
    get '/index.html'

    assert_nil last_response.headers['Expires']
  end

  def test_does_not_set_cache_headers_for_non_asset_paths
    get '/api/users'

    assert_nil last_response.headers['Expires']
  end

  def test_passes_through_response_body
    get '/assets/js/app.js'

    assert_equal 'OK', last_response.body
  end
end
