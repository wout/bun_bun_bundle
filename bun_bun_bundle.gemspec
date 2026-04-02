# frozen_string_literal: true

require_relative 'lib/bun_bun_bundle/version'

Gem::Specification.new do |spec|
  spec.name = 'bun_bun_bundle'
  spec.version = BunBunBundle::VERSION
  spec.authors = ['Wout Fierens']
  spec.summary = 'A self-contained asset bundler powered by Bun'
  spec.description = 'Zero-dependency asset bundler with CSS hot-reloading, fingerprinting, ' \
                     'live reload, and a flexible plugin system. Works with Rails, ' \
                     'Hanami, or any Rack app.'
  spec.homepage = 'https://codeberg.org/w0u7/bun_bun_bundle'
  spec.license = 'MIT'
  spec.required_ruby_version = '>= 3.1.0'

  spec.metadata['homepage_uri'] = spec.homepage
  spec.metadata['source_code_uri'] = spec.homepage
  spec.metadata['changelog_uri'] = "#{spec.homepage}/blob/main/CHANGELOG.md"
  spec.metadata['rubygems_mfa_required'] = 'true'

  spec.files = Dir[
    'lib/**/*',
    'exe/*',
    'LICENSE',
    'README.md',
  ]
  spec.bindir = 'exe'
  spec.executables = %w[bun_bun_bundle bbb]

  spec.add_dependency 'json'
end
