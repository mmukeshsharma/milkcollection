'use client'

import { useState, useEffect } from 'react'

export function MobileApkPromo() {
  const [isMobile, setIsMobile] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [lang, setLang] = useState<'hi' | 'en'>('hi')

  useEffect(() => {
    // Detect browser language or cached setting
    const cachedUser = localStorage.getItem('sharma_dairy_cached_user')
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser)
        // If language selector was used, respect it
      } catch (e) {}
    }
    const htmlLang = document.documentElement.lang
    if (htmlLang === 'hi' || navigator.language.startsWith('hi')) {
      setLang('hi')
    } else {
      setLang('en')
    }

    // Detect mobile device
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    const isMob = mobileRegex.test(navigator.userAgent) || window.innerWidth < 768
    setIsMobile(isMob)

    // Detect standalone PWA mode
    const isPWA = 
      (window.navigator as any).standalone || 
      window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(isPWA)

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('sharma_apk_promo_dismissed') === 'true'
    setDismissed(isDismissed)

    if (isMob && !isPWA && !isDismissed) {
      const timer = setTimeout(() => {
        setShowPopup(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setShowPopup(false)
    setDismissed(true)
    sessionStorage.setItem('sharma_apk_promo_dismissed', 'true')
  }

  // Render nothing if it is not a mobile browser or has been fully dismissed
  if (!isMobile || isStandalone) return null

  const titleText = lang === 'hi' ? 'एंड्रॉइड ऐप डाउनलोड करें' : 'Download Android App'
  const descText = lang === 'hi' 
    ? 'सर्वोत्तम ऑफलाइन परफॉरमेंस और ब्लूटूथ प्रिंटिंग के लिए Sharma Dairy APK डाउनलोड करें।' 
    : 'Download the Sharma Dairy APK for the best offline performance and direct Bluetooth printing.'
  const btnText = lang === 'hi' ? 'एपीके डाउनलोड करें (.APK)' : 'Download APK (.APK)'
  const closeText = lang === 'hi' ? 'बंद करें' : 'Close'

  return (
    <>
      {/* Top Banner on Login Page */}
      <div className="w-full mb-4 animate-in slide-in-from-top duration-500">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-4 text-white shadow-md border border-blue-400/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">🤖</span>
            <div className="text-left">
              <h4 className="text-sm font-black tracking-tight">{titleText}</h4>
              <p className="text-[10px] text-blue-50 opacity-90 font-semibold max-w-[280px]">
                {descText}
              </p>
            </div>
          </div>
          <a
            href="/sharma-dairy.apk"
            download
            className="shrink-0 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs py-2 px-3 rounded-xl transition-all shadow-sm active:scale-95"
          >
            {btnText}
          </a>
        </div>
      </div>

      {/* Automatic Dialog Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="h-14 w-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 border border-blue-100 text-2xl animate-pulse">
              🤖
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {lang === 'hi' ? 'एंड्रॉइड ऐप उपलब्ध है!' : 'Android App Available!'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                {lang === 'hi'
                  ? 'क्या आप ब्राउज़र का उपयोग कर रहे हैं? बेहतर ब्लूटूथ प्रिंटिंग स्पीड के लिए हमारे ऑफिशियल एंड्रॉइड ऐप को इंस्टॉल करें।'
                  : 'Are you using a mobile browser? Install our official Android app for faster Bluetooth printing and smooth offline logs.'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href="/sharma-dairy.apk"
                download
                onClick={handleDismiss}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-md text-center inline-block"
              >
                📥 {btnText}
              </a>
              <button
                onClick={handleDismiss}
                className="w-full text-slate-400 hover:text-slate-600 font-semibold text-xs py-2"
              >
                {closeText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
