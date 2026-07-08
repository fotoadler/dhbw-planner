Pod::Spec.new do |s|
  s.name = 'DhbwCapacitorCourseLiveActivity'
  s.module_name = 'CourseLiveActivityPlugin'
  s.version = '0.1.0'
  s.summary = 'Reusable Capacitor bridge for course live activities.'
  s.license = 'MIT'
  s.homepage = 'https://local.invalid'
  s.author = 'DHBW Planner'
  s.source = { :path => '.' }
  s.source_files = 'ios/Sources/CourseLiveActivityPlugin/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.0'
end
