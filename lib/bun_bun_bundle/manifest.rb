# frozen_string_literal: true

require 'json'

module BunBunBundle
  class Manifest
    class MissingAssetError < StandardError; end

    attr_reader :entries

    def initialize(entries = {})
      @entries = entries.freeze
    end

    # Loads the manifest from a JSON file.
    #
    # Retries a configurable number of times to allow for the manifest to be
    # built during boot (e.g. in development).
    def self.load(path: nil, root: Dir.pwd, retries: 10, delay: 0.25)
      path ||= BunBunBundle.config.manifest_path
      full_path = File.expand_path(path, root)

      retries.times do
        if File.exist?(full_path)
          data = JSON.parse(File.read(full_path))
          return new(data)
        end
        sleep(delay)
      end

      raise "Manifest not found at #{full_path}. Run: bun_bun_bundle build"
    end

    def [](key)
      entries.fetch(key) do
        suggestion = find_similar(key)
        message = "Asset not found: #{key}"
        message += ". Did you mean: #{suggestion}?" if suggestion
        raise MissingAssetError, message
      end
    end

    def key?(key)
      entries.key?(key)
    end

    def css_entry_points
      entries.keys.select { |k| k.end_with?('.css') }
    end

    private

    def find_similar(key, tolerance: 4)
      entries.keys
             .map { |k| [k, levenshtein(key, k)] }
             .select { |_, d| d <= tolerance }
             .min_by { |_, d| d }
             &.first
    end

    def levenshtein(str_a, str_b) # rubocop:disable Metrics/AbcSize
      return str_b.length if str_a.empty?
      return str_a.length if str_b.empty?

      distances = Array.new(str_a.length + 1) { |i| i }

      (1..str_b.length).each do |j|
        prev = distances[0]
        distances[0] = j
        (1..str_a.length).each do |i|
          cost = str_a[i - 1] == str_b[j - 1] ? 0 : 1
          temp = distances[i]
          distances[i] = [distances[i] + 1, distances[i - 1] + 1, prev + cost].min
          prev = temp
        end
      end

      distances[str_a.length]
    end
  end
end
