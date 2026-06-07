'use client'

import { useState, useEffect } from 'react'
import { getCustomers } from '@/lib/customers-local'
import { getRecentSales } from '@/lib/sales-local'
import { MilkSaleForm } from '@/components/sale/milk-sale-form'
import { SalesTable } from '@/components/sale/sales-table'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function SalePage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [c, s] = await Promise.all([getCustomers(), getRecentSales()])
    setCustomers(c.customers || [])
    setSales(s.sales || [])
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Milk Sales</h1>
          <p className="text-sm text-slate-600">Record and track bulk milk sales to external buyers or local farmers.</p>
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
          title="Refresh List"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <MilkSaleForm customers={customers} onAdded={reload} />

      <SalesTable sales={sales} onRefresh={reload} />
    </div>
  )
}
