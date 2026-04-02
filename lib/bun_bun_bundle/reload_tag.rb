# frozen_string_literal: true

module BunBunBundle
  # Renders a live reload script tag for development.
  #
  # Connects to Bun's WebSocket dev server for:
  # - CSS hot-reloading (without full page refresh)
  # - Full page reload on JS/image changes
  #
  # Only outputs content when BunBunBundle.development? is true.
  #
  module ReloadTag
    include SafeHtml

    # Returns the live reload <script> tag, or an empty string in production.
    #
    # Example (ERB):
    #
    #   <%= bun_reload_tag %>
    #
    def bun_reload_tag # rubocop:disable Metrics/MethodLength
      return '' unless BunBunBundle.development?

      config = BunBunBundle.config
      css_paths = BunBunBundle.manifest.css_entry_points.map do |key|
        "#{config.public_path}/#{key}"
      end

      html = <<~HTML
        <script>
        (() => {
          const cssPaths = #{css_paths.to_json};
          const ws = new WebSocket('#{config.dev_server.ws_url}')

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data)

            if (data.type === 'css') {
              document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const linkPath = new URL(link.href).pathname.split('?')[0]
                if (cssPaths.some(p => linkPath.startsWith(p))) {
                  const url = new URL(link.href)
                  url.searchParams.set('r', Date.now())
                  link.href = url.toString()
                }
              })
              console.log('\\u25b8 CSS reloaded')
            } else if (data.type === 'error') {
              console.error('\\u2716 Build error:', data.message)
            } else {
              console.log('\\u25b8 Reloading...')
              location.reload()
            }
          }

          ws.onopen = () => console.log('\\u25b8 Live reload connected')
          ws.onclose = () => setTimeout(() => location.reload(), 2000)
        })()
        </script>
      HTML
      bun_safe(html)
    end
  end
end
