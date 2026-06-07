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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Milk Purchase</h1>
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
          title="Refresh List"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <MilkPurchaseForm customers={customers} />

      <PurchasesTable purchases={purchases} onRefresh={reload} />
    </div>
  )
}
