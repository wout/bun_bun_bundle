# frozen_string_literal: true

require 'rake/testtask'

namespace :test do
  Rake::TestTask.new(:ruby) do |t|
    t.libs << 'spec'
    t.libs << 'lib'
    t.test_files = FileList['spec/**/*_spec.rb']
  end

  desc 'Run Bun tests'
  task :bun do
    sh 'bun test'
  end
end

desc 'Run all tests'
task test: %w[test:ruby test:bun]

task default: :test
