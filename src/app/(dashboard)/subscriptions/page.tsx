'use client'

import { useLanguage } from '@/context/LanguageContext'

export default function SubscriptionsPage() {
  const { locale } = useLanguage()
  const hi = locale === 'hi'

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl max-w-lg mx-auto select-none mt-10">
      <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm border border-amber-100 animate-pulse">
        💳
      </div>
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">
        {hi ? 'सदस्यता प्लान प्रबंधन' : 'Subscriptions Console'}
      </h2>
      <p className="text-slate-400 mt-2 font-semibold text-sm max-w-xs">
        {hi 
          ? 'सदस्यता भुगतान और गेटवे एकीकरण का मॉड्यूल आगामी अपडेट में उपलब्ध होगा।' 
          : 'Subscription payment integrations and billing history records will be available in the upcoming update.'}
      </p>
    </div>
  )
}
