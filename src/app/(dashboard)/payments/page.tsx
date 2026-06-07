'use client'

import { useState, useEffect } from 'react'
import { getCustomers } from '@/lib/customers-local'
import { getRecentPayments } from '@/lib/payments-local'
import { AddPaymentForm } from '@/components/payments/add-payment-form'
import { PaymentsTable } from '@/components/payments/payments-table'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

export default function PaymentsPage() {
  const { t } = useLanguage()
  const [customers, setCustomers] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [c, p] = await Promise.all([getCustomers(), getRecentPayments()])
    setCustomers(c.customers || [])
    setPayments(p.payments || [])
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t('payments.title')}</h1>
          <p className="text-sm text-slate-600">{t('payments.tagline')}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={async () => {
            setLoading(true)
            await reload()
            setLoading(false)
          }}
          disabled={loading}
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-9 w-9 shadow-sm"
          title={t('common.search') || 'Refresh'}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <AddPaymentForm customers={customers} onAdded={reload} />

      <PaymentsTable payments={payments} onRefresh={reload} />
    </div>
  )
}
