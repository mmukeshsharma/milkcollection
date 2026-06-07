'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getLanguageSetting, saveLanguageSetting } from '@/app/actions/settings'
import en from '../../messages/en.json'
import hi from '../../messages/hi.json'

type Locale = 'en' | 'hi'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Locale, any> = { en, hi }

// Utility to set cookies client-side
function setCookie(name: string, value: string, days = 365) {
  const date = new Date()
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
  const expires = "; expires=" + date.toUTCString()
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax"
}

function getCookie(name: string): string | null {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    // 1. Initialize language priorities: User Settings (DB), Cookie, LocalStorage, default to en
    async function initLanguage() {
      // Priority 1: User Settings (Database)
      try {
        const dbLang = await getLanguageSetting()
        if (dbLang === 'en' || dbLang === 'hi') {
          setLocaleState(dbLang)
          updateDocumentProperties(dbLang)
          return
        }
      } catch (e) {
        console.error('Failed to get database setting:', e)
      }

      // Priority 2: Cookie
      const cookieLang = getCookie('language')
      if (cookieLang === 'en' || cookieLang === 'hi') {
        setLocaleState(cookieLang)
        updateDocumentProperties(cookieLang)
        return
      }

      // Priority 3: LocalStorage
      const localLang = localStorage.getItem('language')
      if (localLang === 'en' || localLang === 'hi') {
        setLocaleState(localLang)
        updateDocumentProperties(localLang)
        return
      }

      updateDocumentProperties('en')
    }

    initLanguage()
  }, [])

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale)
    updateDocumentProperties(newLocale)

    // Save in LocalStorage
    localStorage.setItem('language', newLocale)

    // Save in Cookie
    setCookie('language', newLocale)

    // Save in Database Settings
    try {
      await saveLanguageSetting(newLocale)
    } catch (e) {
      console.error('Failed to save language in database:', e)
    }
  }

  const updateDocumentProperties = (loc: Locale) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = loc
      
      // Update page title dynamically
      const currentTitle = document.title
      if (loc === 'hi') {
        document.title = "शर्मा डेयरी दूध संग्रह प्रणाली"
      } else {
        document.title = "Sharma Dairy Milk Collection"
      }
    }
  }

  const t = (path: string): string => {
    const keys = path.split('.')
    let current = translations[locale]
    
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key]
      } else {
        return path // Fallback to path if translation key missing
      }
    }
    
    return String(current)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
