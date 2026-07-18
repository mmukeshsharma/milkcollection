'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CustomerSearchSelector } from '@/components/customers/CustomerSearchSelector'

export function PassbookFilter({ customers }: { customers: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentId = searchParams.get('customer_id') || ''

  function handleCustomerChange(val: string | undefined) {
    if (val) {
      router.push(`/passbook?customer_id=${val}`)
    } else {
      router.push('/passbook')
    }
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
      <div className="max-w-md space-y-2">
        <label htmlFor="customer-select" className="text-sm font-medium text-slate-700 block">Select Farmer</label>
        <CustomerSearchSelector
          customers={customers}
          selectedCustomerId={currentId || undefined}
          onChange={handleCustomerChange}
        />
      </div>
    </div>
  )
}
