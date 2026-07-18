'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLanguage } from '@/context/LanguageContext'
import { usePathname, useRouter } from 'next/navigation'
import { getSessionUser } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { t, locale } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const hi = locale === 'hi'
  const [user, setUser] = useState<{ role: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [deactivated, setDeactivated] = useState(false)
  const [deactivatedReason, setDeactivatedReason] = useState<'DEACTIVATED' | 'FORCE_LOGOUT' | null>(null)
  const [expired, setExpired] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [offlineLock, setOfflineLock] = useState(false)
  const [clockTampered, setClockTampered] = useState(false)

  useEffect(() => {
    let lastCheckTime = Date.now()

    async function loadUser(isSilent = false) {
      try {
        if (typeof window !== 'undefined' && !navigator.onLine) {
          const cached = localStorage.getItem('sharma_dairy_cached_user')
          if (cached) {
            const cachedUser = JSON.parse(cached)
            setUser(cachedUser)

            // Clock tampering check
            const lastUseStr = localStorage.getItem('sharma_dairy_last_app_use_time')
            const lastUse = lastUseStr ? parseInt(lastUseStr, 10) : Date.now()
            const now = Date.now()
            
            if (now < lastUse - 600000) { // 10 minutes tolerance threshold
              setClockTampered(true)
              if (!isSilent) setLoading(false)
              return
            } else {
              localStorage.setItem('sharma_dairy_last_app_use_time', now.toString())
            }

            // 7-day offline verification check
            const lastVerifiedStr = localStorage.getItem('sharma_dairy_last_verified_at')
            const lastVerified = lastVerifiedStr ? parseInt(lastVerifiedStr, 10) : Date.now()
            if (!lastVerifiedStr) {
              localStorage.setItem('sharma_dairy_last_verified_at', now.toString())
            }

            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
            if (now - lastVerified > sevenDaysMs) {
              setOfflineLock(true)
              if (!isSilent) setLoading(false)
              return
            }

            if (!isSilent) setLoading(false)
            return
          }
        }

        const currUser = await getSessionUser()
        if (currUser) {
          if (currUser.error === 'DEACTIVATED' || currUser.error === 'FORCE_LOGOUT') {
            setDeactivated(true)
            setDeactivatedReason(currUser.error as 'DEACTIVATED' | 'FORCE_LOGOUT')
            if (!isSilent) setLoading(false)
            return
          }
          if (currUser.error === 'EXPIRED') {
            setExpired(true)
            setIsDemo(currUser.subscription_plan === 'demo')
            if (!isSilent) setLoading(false)
            return
          }
          setUser(currUser)
          localStorage.setItem('sharma_dairy_cached_user', JSON.stringify(currUser))
          const now = Date.now()
          localStorage.setItem('sharma_dairy_last_verified_at', now.toString())
          localStorage.setItem('sharma_dairy_last_app_use_time', now.toString())
          setOfflineLock(false)
          setClockTampered(false)
          lastCheckTime = now
        } else {
          // Instantly redirect to login if session becomes invalid or account is deactivated
          if (typeof window !== 'undefined' && navigator.onLine) {
            window.location.href = '/login?message=Session+invalidated+or+account+deactivated'
          }
        }
      } catch (e) {
        console.error('Error loading session user:', e)
        if (typeof window !== 'undefined' && !navigator.onLine) {
          const cached = localStorage.getItem('sharma_dairy_cached_user')
          if (cached) {
            setUser(JSON.parse(cached))
            if (!isSilent) setLoading(false)
            return
          }
        }
        if (!isSilent && typeof window !== 'undefined' && navigator.onLine) {
          window.location.href = '/login'
        }
      } finally {
        if (!isSilent) setLoading(false)
      }
    }

    // Initial verification
    loadUser(false)

    // Periodically poll for session status every 60 seconds to enforce deactivation/invalidation
    const sessionPoll = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadUser(true)
      }
    }, 60000)

    // Trigger instant check when tab is refocused/reopened, throttled to max once every 30 seconds
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheckTime > 30000) {
        loadUser(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      clearInterval(sessionPoll)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [])

  // Deactivation countdown timer
  useEffect(() => {
    if (!deactivated) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          import('@/app/actions/auth').then(({ logout }) => logout())
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [deactivated])

  // Expiration countdown timer
  useEffect(() => {
    if (!expired) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          import('@/app/actions/auth').then(({ logout }) => logout())
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [expired])

  // Prefetch all dashboard pages dynamically so they are cached by service worker for offline use
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.onLine && user) {
      const routes = (user.role === 'super_admin' || user.role === 'admin')
        ? ['/home', '/agent-management', '/settings', '/staff', '/subscriptions']
        : [
            '/home',
            '/members',
            '/purchase',
            '/milk-rates',
            '/sale',
            '/payments',
            '/passbook',
            '/reports',
            '/inventory',
            '/settings'
          ]
      
      const timer = setTimeout(() => {
        routes.forEach(route => {
          try {
            router.prefetch(route)
          } catch (e) {
            console.warn('Failed to prefetch route:', route, e)
          }
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [router, user])

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin'

  if (expired) {
    const title = isDemo
      ? (locale === 'hi' ? 'डेमो समाप्त (Demo Expired)' : 'Demo Expired')
      : (locale === 'hi' ? 'सदस्यता समाप्त (Subscription Expired)' : 'Subscription Expired')
    const description = isDemo
      ? (locale === 'hi'
        ? 'आपका ट्रायल (डेमो) समाप्त हो गया है। कृपया आगे उपयोग के लिए शर्मा डेयरी इक्विपमेंट्स से संपर्क करें।'
        : 'Your trial (demo) has expired. Please contact Sharma Dairy Equipments to activate subscription.')
      : (locale === 'hi'
        ? 'आपकी सदस्यता अवधि समाप्त हो गई है। कृपया शर्मा डेयरी इक्विपमेंट्स से संपर्क करें।'
        : 'Your subscription has expired. Please contact Sharma Dairy Equipments to renew access.')

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600 border border-amber-100 text-2xl font-bold animate-bounce">
            ⏳
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-semibold">
              {description}
            </p>
            <div className="text-xs text-blue-600 font-black pt-3.5 border-t border-slate-100 space-y-1">
              <p>🏢 Sharma Dairy Equipments</p>
              <p>👤 Mr. Mukesh Sharma</p>
              <p>📞 Phone: +91 99286 53383</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl py-3 px-4 inline-flex items-center gap-2 text-slate-600 text-xs font-bold border border-slate-100">
            <span>⏳ {locale === 'hi' ? 'स्वचालित लॉगआउट' : 'Automatic logout in'}</span>
            <span className="bg-rose-500 text-white h-6 w-6 rounded-full flex items-center justify-center font-black animate-pulse">
              {countdown}
            </span>
            <span>{locale === 'hi' ? 'सेकंड में' : 'seconds'}</span>
          </div>
        </div>
      </div>
    )
  }

  if (deactivated) {
    const isForcedLogout = deactivatedReason === 'FORCE_LOGOUT'
    const title = isForcedLogout ? 'Session Terminated' : 'Account Deactivated'
    const description = isForcedLogout
      ? 'Logged out by administrator. Please contact Sharma Dairy.'
      : 'Your account has been deactivated by the administrator. Please contact support.'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 border border-rose-100 text-2xl font-bold animate-bounce">
            ⚠️
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-semibold">
              {description}
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl py-3 px-4 inline-flex items-center gap-2 text-slate-600 text-xs font-bold border border-slate-100">
            <span>⏳ Automatic logout in</span>
            <span className="bg-rose-500 text-white h-6 w-6 rounded-full flex items-center justify-center font-black animate-pulse">
              {countdown}
            </span>
            <span>seconds</span>
          </div>
        </div>
      </div>
    )
  }

  if (clockTampered) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 border border-rose-100 text-2xl font-bold animate-bounce">
            ⏰
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {locale === 'hi' ? 'समय में गड़बड़ी का पता चला' : 'Device Clock Alteration Detected'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-semibold">
              {locale === 'hi'
                ? 'सिस्टम घड़ी में हेरफेर का पता चला है। कृपया अपने डिवाइस पर सही समय सेट करें और सत्यापन के लिए इंटरनेट से कनेक्ट करें।'
                : 'System clock tampering or alteration has been detected. Please correct your device date/time settings and connect to the internet to verify subscription.'}
            </p>
            <div className="text-xs text-blue-600 font-black pt-3.5 border-t border-slate-100 space-y-1">
              <p>🏢 Sharma Dairy Equipments</p>
              <p>📞 Phone: +91 99286 53383</p>
            </div>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold"
          >
            🔄 {locale === 'hi' ? 'पुनः प्रयास करें' : 'Retry Verification'}
          </Button>
        </div>
      </div>
    )
  }

  if (offlineLock) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 border border-blue-100 text-2xl font-bold animate-bounce">
            📡
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {locale === 'hi' ? 'इंटरनेट कनेक्शन आवश्यक है' : 'Internet Connection Required'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-semibold">
              {locale === 'hi'
                ? 'ऑफ़लाइन सीमा समाप्त हो गई है। सुरक्षा कारणों से, आपको सप्ताह में कम से कम एक बार अपनी सक्रिय सदस्यता सत्यापित करने के लिए इंटरनेट से कनेक्ट करना होगा।'
                : 'Offline limit reached. For security and subscription licensing checks, you must connect to the internet at least once every 7 days to verify active status.'}
            </p>
            <div className="text-xs text-blue-600 font-black pt-3.5 border-t border-slate-100 space-y-1">
              <p>🏢 Sharma Dairy Equipments</p>
              <p>📞 Phone: +91 99286 53383</p>
            </div>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold"
          >
            🔄 {locale === 'hi' ? 'सत्यापित करें' : 'Verify Online Now'}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f8fc]/40">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold text-sm">
            {locale === 'hi' ? 'सदस्यता सत्र सत्यापित किया जा रहा है...' : 'Verifying subscription session...'}
          </p>
        </div>
      </div>
    )
  }

  const isSubPage = pathname !== '/home' && pathname !== '/'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Container takes 100% width since Sidebar is removed */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-xl shrink-0">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              {isSubPage ? (
                <Link
                  href="/home"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-[#1e293b] bg-white/80 border border-slate-200/60 rounded-xl shadow-xs hover:bg-slate-50 transition-all duration-200"
                >
                  <span className="font-mono">←</span> <span>{hi ? 'मुख्य पृष्ठ' : 'Home'}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Sharma Dairy" width={32} height={32} className="rounded-lg border border-blue-100" />
                  <div className="flex flex-col text-left leading-tight shrink-0">
                    <span className="font-extrabold text-slate-700 text-xs sm:text-sm tracking-tight whitespace-nowrap">
                      {locale === 'hi' ? 'शर्मा डेयरी' : 'Sharma Dairy'}
                    </span>
                    <span className="font-bold text-[9px] sm:text-xs text-[#0084FF] tracking-wider uppercase whitespace-nowrap">
                      {locale === 'hi' ? 'इक्विपमेंट्स' : 'Equipments'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Middle Logo (Centered on Desktop) only for sub-pages */}
            {isSubPage && (
              <div className="hidden md:flex items-center gap-3">
                <Image src="/logo.png" alt="Sharma Dairy" width={28} height={28} className="rounded-lg border border-blue-100" />
                <div className="flex flex-col text-left leading-tight shrink-0">
                  <span className="font-extrabold text-slate-700 text-[11px] tracking-tight whitespace-nowrap">
                    {locale === 'hi' ? 'शर्मा डेयरी' : 'Sharma Dairy'}
                  </span>
                  <span className="font-bold text-[8px] text-[#0084FF] tracking-wider uppercase whitespace-nowrap">
                    {locale === 'hi' ? 'इक्विपमेंट्स' : 'Equipments'}
                  </span>
                </div>
              </div>
            )}

            {/* Desktop/Mobile Header Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && (
                <div className="flex flex-col text-right leading-none shrink-0 min-w-0 pr-2 sm:pr-4 border-r border-slate-200">
                  <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 tracking-tight truncate max-w-[85px] sm:max-w-[120px]">
                    {user.name ? user.name.split(' ')[0] : ''}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-[#0084FF] mt-0.5 tracking-wider uppercase">
                    {isSuperAdmin
                      ? (locale === 'hi' ? 'एडमिन' : 'Admin')
                      : (locale === 'hi' ? 'एजेंट' : 'Agent')}
                  </span>
                </div>
              )}
              <LanguageSelector />
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Dynamic page content (takes full width) */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#f4f8fc]/40">
          {children}
        </div>
      </main>
    </div>
  )
}
