# frozen_string_literal: true

require 'json'

module BunBunBundle
  class Config
    CONFIG_PATH = 'config/bun.json'

    attr_reader :manifest_path, :out_dir, :public_path, :static_dirs,
                :entry_points, :dev_server

    def initialize(data = {})
      @manifest_path = data.fetch('manifestPath', 'public/bun-manifest.json')
      @out_dir = data.fetch('outDir', 'public/assets')
      @public_path = data.fetch('publicPath', '/assets')
      @static_dirs = data.fetch('staticDirs', %w[app/assets/images app/assets/fonts])
      @entry_points = EntryPoints.new(data.fetch('entryPoints', {}))
      @dev_server = DevServer.new(data.fetch('devServer', {}))
    end

    def self.load(root: Dir.pwd)
      path = File.join(root, CONFIG_PATH)
      data = File.exist?(path) ? JSON.parse(File.read(path)) : {}
      new(data)
    end

    class EntryPoints
      attr_reader :js, :css

      def initialize(data = {})
        @js = Array(data.fetch('js', %w[app/assets/js/app.js]))
        @css = Array(data.fetch('css', %w[app/assets/css/app.css]))
      end
    end

    class DevServer
      attr_reader :host, :port

      def initialize(data = {})
        @host = data.fetch('host', '127.0.0.1')
        @port = data.fetch('port', 3002)
        @secure = data.fetch('secure', false)
      end

      def secure?
        @secure
      end

      def ws_protocol
        secure? ? 'wss' : 'ws'
      end

      def ws_url
        "#{ws_protocol}://#{host}:#{port}"
      end
    end
  end
end
