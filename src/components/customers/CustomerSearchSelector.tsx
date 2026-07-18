'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Check, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

interface Customer {
  id: string
  customer_code: string
  name: string
  mobile?: string
  village?: string
  address?: string
}

interface CustomerSearchSelectorProps {
  customers: Customer[]
  selectedCustomerId: string | undefined
  onChange: (customerId: string | undefined) => void
  error?: string
}

export function CustomerSearchSelector({
  customers,
  selectedCustomerId,
  onChange,
  error: externalError,
}: CustomerSearchSelectorProps) {
  const { locale } = useLanguage()
  const hi = locale === 'hi'

  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find currently selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter customers by name, code, or mobile
  const filteredCustomers = searchQuery.trim()
    ? customers.filter((c) => {
        const query = searchQuery.toLowerCase()
        const code = c.customer_code.toLowerCase()
        const name = c.name.toLowerCase()
        const mobile = (c.mobile || '').toLowerCase()
        return code.includes(query) || name.includes(query) || mobile.includes(query)
      })
    : customers

  // Core selector handler
  const handleSelect = (customer: Customer) => {
    onChange(customer.id)
    setSearchQuery('')
    setIsOpen(false)
    setLocalError(null)
  }

  // Handle direct code quick entry (on Enter or on Blur)
  const handleQuickEntry = (codeOrQuery: string) => {
    const trimmed = codeOrQuery.trim()
    if (!trimmed) return

    // Standardize digits (e.g. "001" to match "M-001" or similar)
    const digitsOnly = trimmed.replace(/\D/g, '')

    // Look for exact match or code digits match
    const matched = customers.find((c) => {
      const cCode = c.customer_code.toLowerCase()
      const cDigits = c.customer_code.replace(/\D/g, '')

      // Matches full code (e.g. "M-001" matches "m-001") or numeric suffix (e.g. "001" matches "M-001")
      return (
        cCode === trimmed.toLowerCase() ||
        (digitsOnly && cDigits === digitsOnly) ||
        cCode.includes(trimmed.toLowerCase())
      )
    })

    if (matched) {
      onChange(matched.id)
      setLocalError(null)
      setSearchQuery('')
    } else {
      setLocalError(hi ? 'ग्राहक नहीं मिला' : 'Customer not found')
    }
  }

  // Clear selection
  const handleClear = () => {
    onChange(undefined)
    setSearchQuery('')
    setLocalError(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const activeError = localError || externalError

  return (
    <div ref={containerRef} className="relative z-30 w-full space-y-1.5 text-left">
      {selectedCustomer ? (
        // Selected Customer Display Card
        <div className="flex h-10 items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 shadow-xs text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="font-black text-slate-800 truncate shrink-0">{selectedCustomer.name}</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black shrink-0">
              Code: {selectedCustomer.customer_code}
            </span>
            {selectedCustomer.mobile && (
              <span className="text-slate-500 font-bold text-[11px] truncate">
                Mobile: {selectedCustomer.mobile}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-blue-200/50 text-blue-600 active:scale-95 transition-all shrink-0 ml-2"
            title="Change Customer"
          >
            <X size={14} className="stroke-[2.5]" />
          </button>
        </div>
      ) : (
        // Search Input Selector
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder={hi ? 'नाम, कोड या मोबाइल से खोजें...' : 'Search by name, code or mobile...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsOpen(true)
                if (localError) setLocalError(null)
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleQuickEntry(searchQuery)
                  setIsOpen(false)
                }
              }}
              onBlur={() => {
                // Delay so that clicking dropdown items triggers before blur QuickEntry
                setTimeout(() => {
                  if (searchQuery.trim()) {
                    handleQuickEntry(searchQuery)
                  }
                }, 200)
              }}
              className="h-10 w-full pl-10 pr-4 text-xs font-semibold rounded-xl border border-slate-200 bg-white shadow-xs focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          {/* Search Dropdown / Modal List */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl animate-in fade-in duration-200">
              <div className="space-y-0.5">
                {filteredCustomers.slice(0, 50).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {c.customer_code} {c.mobile ? `• ${c.mobile}` : ''} {c.village ? `• ${c.village}` : ''}
                      </p>
                    </div>
                    {c.id === selectedCustomerId && <Check size={14} className="text-blue-600 stroke-[3]" />}
                  </button>
                ))}

                {filteredCustomers.length === 0 && (
                  <p className="p-3 text-center text-xs font-bold text-slate-400">
                    {hi ? 'कोई ग्राहक नहीं मिला।' : 'No customers found.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Feedback */}
      {activeError && (
        <p className="flex items-center gap-1 text-[11px] font-bold text-red-500 animate-in slide-in-from-top-1">
          <AlertCircle size={12} />
          <span>{activeError}</span>
        </p>
      )}
    </div>
  )
}
