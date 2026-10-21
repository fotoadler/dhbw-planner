Pod::Spec.new do |s|
  s.name = 'DhbwCapacitorAppReview'
  s.version = '0.1.0'
  s.summary = 'Native StoreKit and Google Play review requests.'
  s.license = 'GPL-3.0-or-later'
  s.homepage = 'https://github.com/fotoadler/dhbw-planner'
  s.author = 'fotoadler'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.frameworks = 'StoreKit'
  s.swift_version = '5.0'
end
