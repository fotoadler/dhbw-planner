Pod::Spec.new do |s|
  s.name = 'DhbwCapacitorSecureStorage'
  s.module_name = 'SecureStoragePlugin'
  s.version = '0.1.0'
  s.summary = 'Native secure storage for small app secrets.'
  s.license = 'GPL-3.0-or-later'
  s.homepage = 'https://github.com/fotoadler/dhbw-planner'
  s.author = 'fotoadler'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/SecureStoragePlugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.frameworks = 'Security'
  s.swift_version = '5.0'
end
