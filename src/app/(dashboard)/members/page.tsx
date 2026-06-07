'use client'

import { useState, useEffect } from 'react'
import { getCustomers } from '@/lib/customers-local'
import { AddCustomerDialog } from '@/components/customers/add-customer-dialog'
import { CustomersTable } from '@/components/customers/customers-table'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    const { customers: all } = await getCustomers()
    setCustomers(all || [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Customers</h1>
          <p className="text-sm text-slate-600">Manage your dairy farmers and milk suppliers.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={reload}
            disabled={loading}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-9 w-9 shadow-sm"
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <AddCustomerDialog onAdded={reload} />
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-400 animate-pulse font-semibold">
          Loading customers…
        </div>
      ) : (
        <CustomersTable customers={customers} onRefresh={reload} />
      )}
    </div>
  )
}
