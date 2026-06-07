'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'

interface Product {
  id: string
  product_name: string
  price: number
  stock_quantity: number
}

interface SearchableProductSelectProps {
  products: Product[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  error?: string
  locale?: string
}

export function SearchableProductSelect({
  products,
  selectedIds,
  onChange,
  placeholder = 'Type product name to search...',
  error,
  locale = 'en',
}: SearchableProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync display search text with selected value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      const selectedNames = products
        .filter((p) => selectedIds.includes(p.id))
        .map((p) => p.product_name)
      setSearch(selectedNames.join(', '))
    }
  }, [selectedIds, isOpen, products])

  // Filter products based on search query
  const filtered = products.filter((p) => {
    const query = search.toLowerCase()
    // If search matches the list of selected products, show all
    const selectedNames = products
      .filter((sp) => selectedIds.includes(sp.id))
      .map((sp) => sp.product_name)
      .join(', ')
      .toLowerCase()
    if (query === selectedNames) return true

    return p.product_name.toLowerCase().includes(query) || String(p.price).includes(query)
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleProduct = (id: string) => {
    const isSelected = selectedIds.includes(id)
    const newSelected = isSelected
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id]
    onChange(newSelected)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          setIsOpen(true)
          setSearch('') // Clear search text on focus to let operator search fresh
        }}
        className={`w-full ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white/95 py-1 text-sm shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200 scrollbar-thin">
          {filtered.length > 0 ? (
            filtered.map((p) => {
              const isSelected = selectedIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-left hover:bg-blue-50 transition cursor-pointer ${
                    isSelected ? 'bg-blue-100/80 text-blue-800 font-semibold hover:bg-blue-200/60' : 'text-slate-700'
                  }`}
                  onClick={() => handleToggleProduct(p.id)}
                >
                  <div>
                    <span className="font-semibold">{p.product_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-600 block">Rs {p.price}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium inline-block ${
                      p.stock_quantity > 10 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {p.stock_quantity} {locale === 'hi' ? 'उपलब्ध' : 'available'}
                    </span>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="px-3.5 py-2 text-slate-400 text-xs italic">
              {locale === 'hi' ? 'कोई मेल खाने वाला उत्पाद नहीं मिला' : 'No matching products found'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
