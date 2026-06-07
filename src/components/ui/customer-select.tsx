'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'

interface Customer {
  id: string
  customer_code: string
  name: string
  village?: string
}

interface SearchableCustomerSelectProps {
  customers: Customer[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  error?: string
}

export function SearchableCustomerSelect({
  customers,
  value,
  onChange,
  placeholder = 'Type code or name to search...',
  error,
}: SearchableCustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Find currently selected customer
  const selectedCustomer = customers.find((c) => c.id === value)

  // Sync display search text with selected value
  useEffect(() => {
    if (selectedCustomer) {
      setSearch(`${selectedCustomer.customer_code} - ${selectedCustomer.name}`)
    } else {
      setSearch('')
    }
  }, [value, selectedCustomer])

  // Filter customers based on search query
  const filtered = customers.filter(
    (c) =>
      c.customer_code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.village && c.village.toLowerCase().includes(search.toLowerCase()))
  )

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset search to selected customer name if they clicked away without choosing
        if (selectedCustomer) {
          setSearch(`${selectedCustomer.customer_code} - ${selectedCustomer.name}`)
        } else {
          setSearch('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedCustomer])

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setIsOpen(true)
          // If search is cleared, reset selection
          if (!e.target.value) {
            onChange('')
          }
        }}
        onFocus={() => setIsOpen(true)}
        className={`w-full ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white/95 py-1 text-sm shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition ${
                  value === c.id ? 'bg-blue-50/70 text-blue-700 font-semibold' : 'text-slate-700'
                }`}
                onClick={() => {
                  onChange(c.id)
                  setIsOpen(false)
                }}
              >
                <div>
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-2 font-bold">
                    {c.customer_code}
                  </span>
                  <span>{c.name}</span>
                </div>
                {c.village && <span className="text-xs text-slate-400 font-semibold">{c.village}</span>}
              </button>
            ))
          ) : (
            <div className="px-3.5 py-2 text-slate-400 text-xs italic">No matching customers found</div>
          )}
        </div>
      )}
    </div>
  )
}
