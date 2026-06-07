'use client'

import { useState, useEffect } from 'react'
import { getCustomers } from '@/lib/customers-local'
import { passbookLocal } from '@/lib/passbook-local'
import { PassbookClient } from '@/components/passbook/passbook-client'
import { useSearchParams } from 'next/navigation'

type PassbookRow = {
  id: string
  transaction_date: string
  transaction_type: 'purchase' | 'sale' | 'payment' | 'advance' | 'adjustment'
  particulars: string
  credit_amount: number
  debit_amount: number
  running_balance: number
}

export default function PassbookPage() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customer_id') || ''

  const [customers, setCustomers] = useState<any[]>([])
  const [ledger, setLedger] = useState<PassbookRow[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const { customers: allCustomers } = await getCustomers()
    setCustomers(allCustomers)

    if (customerId) {
      const { passbook } = await passbookLocal.getPassbook(customerId)
      setLedger(passbook as PassbookRow[])
    } else {
      setLedger([])
    }
  }

  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
  }, [customerId])

  const selectedCustomer = customers.find((c: any) => c.id === customerId) || null
  const totalCredit = ledger.reduce((sum, row) => sum + Number(row.credit_amount || 0), 0)
  const totalDebit  = ledger.reduce((sum, row) => sum + Number(row.debit_amount  || 0), 0)
  const netDue      = ledger.length > 0 ? ledger[ledger.length - 1].running_balance : 0

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading passbook…</div>
  }

  return (
    <PassbookClient
      customers={customers}
      customerId={customerId}
      selectedCustomer={selectedCustomer}
      ledger={ledger}
      totalCredit={totalCredit}
      totalDebit={totalDebit}
      netDue={netDue}
      onRefresh={async () => {
        setLoading(true)
        await reload()
        setLoading(false)
      }}
    />
  )
}
