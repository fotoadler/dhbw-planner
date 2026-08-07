Pod::Spec.new do |s|
  s.name = 'DhbwCapacitorCommunityMessaging'
  s.module_name = 'CommunityMessagingPlugin'
  s.version = '0.1.0'
  s.summary = 'Native Firebase Cloud Messaging bridge for DHBW Planner.'
  s.license = 'GPL-3.0-or-later'
  s.homepage = 'https://github.com/fotoadler/dhbw-planner'
  s.author = 'fotoadler'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/CommunityMessagingPlugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.dependency 'FirebaseCore', '~> 11.0'
  s.dependency 'FirebaseMessaging', '~> 11.0'
  s.frameworks = 'UserNotifications'
  s.swift_version = '5.0'
end
