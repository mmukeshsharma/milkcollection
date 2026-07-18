'use client'

import { useLanguage } from '@/context/LanguageContext'

export default function StaffPage() {
  const { locale } = useLanguage()
  const hi = locale === 'hi'

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl max-w-lg mx-auto select-none mt-10">
      <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm border border-blue-100 animate-pulse">
        👥
      </div>
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">
        {hi ? 'स्टाफ प्रबंधन' : 'Staff Management'}
      </h2>
      <p className="text-slate-400 mt-2 font-semibold text-sm max-w-xs">
        {hi 
          ? 'कर्मचारियों और सहायकों के वेतन और शिफ्टों को प्रबंधित करने का मॉड्यूल आगामी अपडेट में उपलब्ध होगा।' 
          : 'The employee and staff shifts management system will be available in the upcoming update.'}
      </p>
    </div>
  )
}
