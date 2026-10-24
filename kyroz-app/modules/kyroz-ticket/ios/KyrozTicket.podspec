Pod::Spec.new do |s|
  s.name           = 'KyrozTicket'
  s.version        = '1.0.0'
  s.summary        = 'Lit un ticket de caisse sur l’iPhone : texte d’un PDF (PDFKit), texte d’une image (Vision).'
  s.description    = 'Module local de Kyroz (E84). Rien ne quitte le téléphone.'
  s.author         = 'Kyroz'
  s.homepage       = 'https://kyroz.app'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'PDFKit', 'Vision', 'UniformTypeIdentifiers'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files   = '**/*.{h,m,mm,swift}'
end
