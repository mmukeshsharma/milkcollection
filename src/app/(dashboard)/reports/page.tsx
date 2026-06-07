'use client'

import { useState, useEffect } from 'react'
import { getAllPurchases } from '@/lib/purchases-local'
import { getAllPayments } from '@/lib/payments-local'
import { ReportsViewer } from '@/components/reports/reports-viewer'
import { useLanguage } from '@/context/LanguageContext'

export default function ReportsPage() {
  const { t } = useLanguage()
  const [purchases, setPurchases] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    Promise.all([getAllPurchases(), getAllPayments()]).then(([p, pay]) => {
      setPurchases(p.purchases || [])
      setPayments(pay.payments || [])
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t('reports.title')}</h1>
        <p className="text-sm text-slate-600">{t('reports.tagline')}</p>
      </div>

      <ReportsViewer purchases={purchases} payments={payments} />
    </div>
  )
}
