'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogoutButton } from '@/components/auth/logout-button'
import { LanguageSelector } from '@/components/ui/language-selector'
import { useLanguage } from '@/context/LanguageContext'
import { usePathname, useRouter } from 'next/navigation'
import { getSessionUser } from '@/app/actions/auth'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { t, locale } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ role: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [deactivated, setDeactivated] = useState(false)
  const [deactivatedReason, setDeactivatedReason] = useState<'DEACTIVATED' | 'FORCE_LOGOUT' | null>(null)
  const [expired, setExpired] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    let lastCheckTime = Date.now()

    async function loadUser(isSilent = false) {
      try {
        if (typeof window !== 'undefined' && !navigator.onLine) {
          const cached = localStorage.getItem('sharma_dairy_cached_user')
          if (cached) {
            setUser(JSON.parse(cached))
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
          lastCheckTime = Date.now()
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
        ? ['/dashboard', '/agent-management', '/settings']
        : [
            '/dashboard',
            '/members',
            '/purchase',
            '/dashboard/milk-rates',
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

  // Dynamic Navigation Links based on User Role
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin'

  const navLinks = isSuperAdmin
    ? [
      { href: '/dashboard', labelKey: 'nav.dashboard' },
      { href: '/agent-management', labelKey: 'nav.agentManagement' },
      { href: '/settings', labelKey: 'nav.settings' },
    ]
    : [
      { href: '/dashboard', labelKey: 'nav.dashboard' },
      { href: '/members', labelKey: 'nav.customers' },
      { href: '/purchase', labelKey: 'nav.milkPurchase' },
      { href: '/dashboard/milk-rates', labelKey: 'nav.milkRates' },
      { href: '/sale', labelKey: 'nav.milkSales' },
      { href: '/payments', labelKey: 'nav.payments' },
      { href: '/passbook', labelKey: 'nav.passbook' },
      { href: '/reports', labelKey: 'nav.reports' },
      { href: '/inventory', labelKey: 'nav.inventory' },
      { href: '/settings', labelKey: 'nav.settings' },
    ]

  const isActive = (href: string) => pathname === href

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-72 border-r border-white/30 bg-white/65 backdrop-blur-xl lg:block select-none h-full overflow-y-auto">
        <div className="border-b border-white/40 p-5">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Sharma Dairy" width={44} height={44} className="rounded-xl border border-blue-100" />
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {isSuperAdmin
                  ? (locale === 'hi' ? 'सास सुपर एडमिन' : 'SaaS Super Admin')
                  : (locale === 'hi' ? 'डेयरी ऑपरेटर सास' : 'Dairy Operator SaaS')}
              </p>
              <p className="text-lg font-extrabold text-[#0084FF]">
                {isSuperAdmin
                  ? (locale === 'hi' ? 'सास एडमिन कंसोल' : 'SaaS Admin Console')
                  : (locale === 'hi' ? 'शर्मा डेयरी' : 'Sharma Dairy')}
              </p>
            </div>
          </div>
        </div>
        <nav className="space-y-1.5 p-4 text-sm font-semibold text-slate-600">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-4 py-2.5 transition ${active
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 pl-3'
                  : 'hover:bg-blue-50/50 hover:text-slate-800'
                  }`}
              >
                {t(link.labelKey)}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/70 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Sharma Dairy" width={32} height={32} className="rounded-lg border border-blue-100 lg:hidden" />
              <div className="flex flex-col text-left leading-tight shrink-0">
                <span className="font-extrabold text-slate-700 text-xs sm:text-sm tracking-tight whitespace-nowrap">
                  {locale === 'hi' ? 'शर्मा डेयरी' : 'Sharma Dairy'}
                </span>
                <span className="font-bold text-[9px] sm:text-xs text-[#0084FF] tracking-wider uppercase whitespace-nowrap">
                  {locale === 'hi' ? 'इक्विपमेंट्स' : 'Equipments'}
                </span>
              </div>
            </div>

            {/* Desktop Header Actions */}
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

          {/* Mobile Sidebar - Horizontal Dropdown Menu */}
          <div className="lg:hidden border-t border-white/40 px-3 py-2.5 bg-white/40">
            <nav className="flex gap-2 items-center overflow-x-auto whitespace-nowrap text-xs pb-1 scrollbar-none">
              {navLinks.map((link) => {
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-1.5 font-semibold transition ${active ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                  >
                    {t(link.labelKey)}
                  </Link>
                )
              })}

            </nav>
          </div>
        </header>

        {/* Dynamic page content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#f4f8fc]/40">
          {children}
        </div>
      </main>
    </div>
  )
}
