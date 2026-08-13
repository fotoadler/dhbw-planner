Pod::Spec.new do |s|
  s.name = 'DhbwCapacitorWatchSync'
  s.module_name = 'WatchSyncPlugin'
  s.version = '0.1.0'
  s.summary = 'Capacitor bridge for syncing the DHBW Planner schedule to watches.'
  s.license = 'GPL-3.0-or-later'
  s.homepage = 'https://github.com/fotoadler/dhbw-planner'
  s.author = 'DHBW Planner'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/WatchSyncPlugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.frameworks = 'WatchConnectivity'
  s.swift_version = '5.0'
end
