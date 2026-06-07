'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function PassbookFilter({ customers }: { customers: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentId = searchParams.get('customer_id') || ''

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
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
        <select
          id="customer-select"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={currentId}
          onChange={handleChange}
        >
          <option value="">-- Choose Customer --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.customer_code} - {c.name} ({c.village})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
