'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { ChevronDown } from 'lucide-react'

export function LanguageSelector({ mobile = false }: { mobile?: boolean }) {
  const { locale, setLocale } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const languages = [
    { code: 'en', name: 'EN' },
    { code: 'hi', name: 'हिन्दी' }
  ] as const

  const activeLanguage = languages.find(l => l.code === locale) || languages[0]

  const handleLanguageChange = async (code: 'en' | 'hi') => {
    await setLocale(code)
    setIsOpen(false)
  }

  if (mobile) {
    return (
      <div className="relative inline-block w-full text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3.5 text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 transition"
        >
          <span>{activeLanguage.name}</span>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-100 bg-white p-1 shadow-lg animate-[fadeIn_0.15s_ease-out]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-extrabold transition ${
                  locale === lang.code ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-[84px] items-center justify-between rounded-lg border border-slate-200 bg-white/95 px-2.5 text-xs font-extrabold text-slate-700 shadow-xs outline-none hover:bg-slate-50 transition-all duration-200"
      >
        <span>{activeLanguage.name}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-[84px] origin-top-right rounded-lg border border-slate-100 bg-white p-0.5 shadow-md animate-[fadeIn_0.1s_ease-out] select-none">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex w-full items-center px-2.5 py-1.5 text-left text-xs font-bold rounded-md transition ${
                locale === lang.code ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
