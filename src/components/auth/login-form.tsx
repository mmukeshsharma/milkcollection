'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  AlertCircle, 
  LogIn, 
  ShieldAlert, 
  Monitor, 
  Smartphone, 
  Clock, 
  Network, 
  ArrowLeft, 
  RefreshCw 
} from 'lucide-react'
import { login, getActiveSessionsForUser } from '@/app/actions/auth'
import { useLanguage } from '@/context/LanguageContext'
import { LanguageSelector } from '@/components/ui/language-selector'

function SubmitButton({ onClick, text = 'Log in' }: { onClick: () => void, text?: string }) {
  const { pending } = useFormStatus()
  const { locale } = useLanguage()
  const hi = locale === 'hi'

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={onClick}
      className="h-[46px] w-full bg-gradient-to-r from-[#175cff] to-[#00b0f0] hover:from-[#1350e6] hover:to-[#00a0db] text-sm font-bold text-white rounded-xl shadow-[0_4px_12px_rgba(23,92,255,0.1)] active:scale-[0.99] transition-all duration-150 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <svg className="animate-spin h-4.5 w-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{hi ? 'प्रक्रिया जारी है...' : 'Processing...'}</span>
        </>
      ) : (
        <>
          <LogIn size={18} className="stroke-[2.5]" />
          <span>{text}</span>
        </>
      )}
    </button>
  )
}

interface LoginFormProps {
  message?: string
  showLimitReached?: string
  userId?: string
  deviceId?: string
  email?: string
  tempToken?: string
}

export function LoginForm({ 
  message, 
  showLimitReached, 
  userId, 
  deviceId: propDeviceId, 
  email: propEmail,
  tempToken
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(propEmail || '')
  const [password, setPassword] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLimitScreenCancelled, setIsLimitScreenCancelled] = useState(false)
  const { locale } = useLanguage()
  const hi = locale === 'hi'
  
  // Custom states following exact specifications
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorText, setErrorText] = useState('')

  // Generate/retrieve unique client device fingerprint
  useEffect(() => {
    let id = localStorage.getItem('device_id')
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36)
      localStorage.setItem('device_id', id)
    }
    setDeviceId(id)
  }, [])

  // Dynamic email sync when redirect query changes
  useEffect(() => {
    if (propEmail) {
      setEmail(propEmail)
    }
  }, [propEmail])

  // Fetch active sessions from the DB on limit query activation
  useEffect(() => {
    const shouldFetch = showLimitReached === 'true' && userId && !isLimitScreenCancelled
    if (shouldFetch) {
      setIsLoadingSessions(true)
      getActiveSessionsForUser(userId!)
        .then((sessions) => {
          setActiveSessions(sessions || [])
        })
        .catch((err) => {
          console.error('Failed to load active sessions:', err)
        })
        .finally(() => {
          setIsLoadingSessions(false)
        })
    }
  }, [showLimitReached, userId, isLimitScreenCancelled])

  // Sync redirect messages from URL parameters
  useEffect(() => {
    if (message) {
      setErrorText(message)
      setShowError(true)
      
      // Instantly clear 'message' from URL address bar
      try {
        const url = new URL(window.location.href)
        if (url.searchParams.has('message')) {
          url.searchParams.delete('message')
          window.history.replaceState({}, '', url.pathname)
        }
      } catch (e) {
        console.error('Error resetting query param:', e)
      }
    }
  }, [message])

  // Clear error when user edits either input field
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setShowError(false)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setShowError(false)
  }

  const handleButtonClick = () => {
    setHasAttemptedLogin(true)
  }

  const handleCancelLimitScreen = () => {
    setIsLimitScreenCancelled(true)
    setPassword('')
    // Clear URL parameters
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('showLimitReached')
      url.searchParams.delete('userId')
      url.searchParams.delete('deviceId')
      url.searchParams.delete('email')
      url.searchParams.delete('tempToken')
      window.history.replaceState({}, '', url.pathname)
    } catch (e) {
      console.error(e)
    }
  }

  // Helper to format time relative to now
  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      
      if (diffMins < 1) return hi ? 'अभी' : 'Just now'
      if (diffMins < 60) return hi ? `${diffMins} मिनट पहले` : `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return hi ? `${diffHours} घंटे पहले` : `${diffHours}h ago`
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch (e) {
      return hi ? 'हाल ही में' : 'Recently'
    }
  }

  const isLimitScreenActive = showLimitReached === 'true' && userId && !isLimitScreenCancelled

  return (
    <div className="relative">

      {isLimitScreenActive ? (
        <form action={login} className="space-y-4 animate-[fadeIn_0.3s_ease-out] max-w-[472px] mx-auto text-left">
          {/* Silent parameters for seamless resolution without password confirmation */}
          <input type="hidden" name="device_id" value={deviceId} />
          <input type="hidden" name="force_logout_oldest" value="true" />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="temp_token" value={tempToken || ''} />

          <div className="flex flex-col items-center text-center space-y-2 pb-1">
            <div className="flex items-center justify-center h-11 w-11 rounded-full bg-amber-50 border border-amber-200 text-amber-500 shadow-xs animate-pulse shrink-0">
              <ShieldAlert size={22} className="stroke-[2.5]" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#162a45] leading-tight">
              {hi ? 'लॉगिन सीमा पूरी हो गई' : 'Login Limit Reached'}
            </h2>
            <p className="text-xs text-[#5c6f84] max-w-[340px] font-medium leading-normal">
              {hi ? 'आपका खाता पहले से 2 डिवाइस पर सक्रिय है।' : 'Your account is already active on 2 devices.'}
            </p>
          </div>

          {/* Active sessions list */}
          <div className="space-y-2">
            <div className="text-[10px] font-extrabold text-[#475d76] uppercase tracking-wider flex items-center justify-between">
              <span>{hi ? 'सक्रिय उपकरण' : 'Active Devices'}</span>
              {isLoadingSessions && (
                <RefreshCw size={11} className="animate-spin text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5">
              {isLoadingSessions ? (
                [1, 2].map((i) => (
                  <div key={i} className="h-12 w-full rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />
                ))
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                  {hi ? 'कोई सक्रिय उपकरण नहीं मिला।' : 'No active sessions found.'}
                </div>
              ) : (
                activeSessions.map((session, index) => {
                  // array is sorted newest first, so last element is oldest
                  const isOldest = index === activeSessions.length - 1
                  const isMobile = /android|iphone|ipad/i.test(session.platform)

                  return (
                    <div 
                      key={session.id} 
                      className={`relative flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-150 ${
                        isOldest 
                          ? 'border-rose-100 bg-rose-50/15 hover:bg-rose-50/25' 
                          : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                      }`}
                    >
                      <div className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 border ${
                        isOldest ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-white text-[#175cff] border-slate-200/60 shadow-2xs'
                      }`}>
                        {isMobile ? <Smartphone size={16} /> : <Monitor size={16} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[13px] font-bold text-slate-800 truncate">
                            {session.device_name}
                          </span>
                          {isOldest ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-100 text-rose-700 uppercase tracking-wide">
                              {hi ? 'सबसे पुराना' : 'Oldest'}
                            </span>
                          ) : (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                              {hi ? 'सक्रिय' : 'Active Now'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-medium">
                          <span className="flex items-center gap-0.5 font-mono">
                            <Network size={10} className="stroke-[2.5]" />
                            {session.ip_address}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} className="stroke-[2.5]" />
                            {formatTimeAgo(session.last_active)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Buttons with reduced height and centered spacing */}
          <div className="space-y-1.5 pt-2">
            <SubmitButton 
              onClick={handleButtonClick} 
              text={hi ? 'सबसे पुराने डिवाइस को लॉगआउट करें और जारी रखें' : 'Logout Oldest Device & Continue'} 
            />

            <button
              type="button"
              onClick={handleCancelLimitScreen}
              className="h-[46px] w-full bg-slate-50 hover:bg-slate-100 active:scale-[0.99] text-xs sm:text-sm font-bold text-[#3b4e66] rounded-xl border border-slate-200 transition-all duration-150 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>{hi ? 'लॉगिन पर वापस जाएं' : 'Back to Login'}</span>
            </button>
          </div>
        </form>
      ) : (
        <form action={login} className="space-y-4">
          <input type="hidden" name="device_id" value={deviceId} />

          {/* Email Input Field */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="email" className="text-[13px] font-semibold text-[#3b4e66]">
              {hi ? 'ईमेल' : 'Email'}
            </label>
            <div className="flex items-stretch h-[50px] w-full rounded-xl border border-[#cbdbee] bg-white focus-within:border-[#0084FF] focus-within:ring-4 focus-within:ring-[#0084FF]/10 overflow-hidden transition-all duration-200">
              <div className="flex items-center justify-center w-[50px] bg-[#eef5fc] border-r border-[#cbdbee] text-[#1c64f2]">
                <User size={18} className="stroke-[2.5]" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                placeholder="admin@sharmadairy.com"
                required
                onChange={handleEmailChange}
                className="flex-1 px-4 py-2.5 text-sm text-[#253858] placeholder-slate-400 bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="password" className="text-[13px] font-semibold text-[#3b4e66]">
              {hi ? 'पासवर्ड' : 'Password'}
            </label>
            <div className="flex items-stretch h-[50px] w-full rounded-xl border border-[#cbdbee] bg-white focus-within:border-[#0084FF] focus-within:ring-4 focus-within:ring-[#0084FF]/10 overflow-hidden transition-all duration-200">
              <div className="flex items-center justify-center w-[50px] bg-[#eef5fc] border-r border-[#cbdbee] text-[#1c64f2]">
                <Lock size={18} className="stroke-[2.5]" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                required
                placeholder="••••••••••"
                onChange={handlePasswordChange}
                className="flex-1 px-4 py-2.5 text-sm text-[#253858] placeholder-slate-400 bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center justify-center w-[50px] text-slate-400 hover:text-slate-600 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Render error ONLY when showError is true */}
          {showError && errorText && (
            <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mt-1 text-left">
              <AlertCircle size={14} className="shrink-0" />
              <span>⚠ {errorText}</span>
            </div>
          )}

          {/* Remember Me Checkbox */}
          <div className="flex items-center pt-1">
            <label className="flex items-center gap-2 text-sm text-[#3b4e66] font-semibold cursor-pointer select-none">
              <input 
                type="checkbox" 
                name="remember_me" 
                className="h-4.5 w-4.5 rounded-[6px] border-[#cbdbee] text-[#0084FF] focus:ring-[#0084FF] focus:ring-offset-0 cursor-pointer" 
              />
              {hi ? 'याद रखें' : 'Remember me'}
            </label>
          </div>

          <div className="pt-1.5">
            <SubmitButton onClick={handleButtonClick} text={hi ? 'लॉग इन करें' : 'Log in'} />
          </div>
        </form>
      )}
    </div>
  )
}
