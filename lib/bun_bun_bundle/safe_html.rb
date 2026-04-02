# frozen_string_literal: true

module BunBunBundle
  module SafeHtml
    private

    if String.method_defined?(:html_safe)
      def bun_safe(html) = html.html_safe
    else
      def bun_safe(html) = html
    end
  end
end
