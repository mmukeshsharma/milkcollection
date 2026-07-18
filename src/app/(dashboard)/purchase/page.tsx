'use client'

import { useState, useEffect } from 'react'
import { getCustomers } from '@/lib/customers-local'
import { getRecentPurchases } from '@/lib/purchases-local'
import { MilkPurchaseForm } from '@/components/purchase/milk-purchase-form'
import { PurchasesTable } from '@/components/purchase/purchases-table'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function PurchasePage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [c, p] = await Promise.all([getCustomers(), getRecentPurchases()])
    setCustomers(c.customers || [])
    setPurchases(p.purchases || [])
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  // Calculate today's summary metrics
  const todayIso = new Date().toISOString().slice(0, 10)
  const todayPurchases = purchases.filter(
    (p) => (p.purchase_date || p.created_at || '').slice(0, 10) === todayIso
  )
  const todayTotalAmount = todayPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
  const todayLiters = todayPurchases.reduce((sum, p) => sum + Number(p.quantity_liters || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/60 pb-2">
        <h1 className="text-lg font-black text-slate-800 sm:text-2xl min-w-0 truncate">
          Milk Purchase <span className="text-blue-600 ml-1">₹{todayTotalAmount.toLocaleString('en-IN')}</span> <span className="text-slate-300 px-1 font-normal">|</span> <span className="text-emerald-600">{todayLiters.toFixed(2)} Ltr</span>
        </h1>
        <Button
          variant="outline"
          size="icon"
          onClick={async () => {
            setLoading(true)
            await reload()
            setLoading(false)
          }}
          disabled={loading}
          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-8 w-8 sm:h-9 sm:w-9 shadow-sm shrink-0"
          title="Refresh List"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <MilkPurchaseForm customers={customers} onAdded={reload} />

      <PurchasesTable purchases={purchases} onRefresh={reload} />
    </div>
  )
}
