Pod::Spec.new do |s|
  s.name = 'DhbwCapacitorEmbeddedMail'
  s.module_name = 'EmbeddedMailPlugin'
  s.version = '0.1.0'
  s.summary = 'Embedded native web view for the DHBW mail tab.'
  s.license = 'GPL-3.0-or-later'
  s.homepage = 'https://github.com/fotoadler/dhbw-planner'
  s.author = 'fotoadler'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/EmbeddedMailPlugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.frameworks = 'WebKit'
  s.swift_version = '5.0'
end
