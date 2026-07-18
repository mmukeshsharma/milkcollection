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

  // Calculate today's summary metrics
  const todayIso = new Date().toISOString().slice(0, 10)
  const todaySales = sales.filter(
    (s) => (s.sale_date || s.created_at || '').slice(0, 10) === todayIso
  )
  const todayTotalAmount = todaySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
  const todayLiters = todaySales.reduce((sum, s) => sum + Number(s.quantity_liters || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/60 pb-2">
        <h1 className="text-lg font-black text-slate-800 sm:text-2xl min-w-0 truncate">
          Milk Sales <span className="text-[#0084FF] ml-1">₹{todayTotalAmount.toLocaleString('en-IN')}</span> <span className="text-slate-300 px-1 font-normal">|</span> <span className="text-emerald-600">{todayLiters.toFixed(2)} Ltr</span>
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

      <MilkSaleForm customers={customers} onAdded={reload} />

      <SalesTable sales={sales} onRefresh={reload} />
    </div>
  )
}
