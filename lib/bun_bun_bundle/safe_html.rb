# frozen_string_literal: true

module BunBunBundle
  module SafeHtml
    private

    if String.method_defined?(:html_safe)
      def _bun_safe(html) = html.html_safe
    else
      def _bun_safe(html) = html
    end
  end
end
