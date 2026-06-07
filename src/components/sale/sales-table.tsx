'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/ui/delete-button'
import { deleteSaleEntry, deleteMultipleSales } from '@/lib/sales-local'
import { getSessionUserRole } from '@/app/actions/auth'
import { getPrinterSettings, generateSaleHtml, printReceipt } from '@/lib/printer-service'
import { Pagination } from '@/components/ui/pagination'

import { useLanguage } from '@/context/LanguageContext'

export function SalesTable({ sales: initialSales, onRefresh }: { sales: any[]; onRefresh?: () => void }) {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [role, setRole] = useState<'admin' | 'staff' | null>(null)
  
  // Selection and Pagination states
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    async function loadRole() {
      const userRole = await getSessionUserRole()
      setRole(userRole)
    }
    loadRole()
  }, [])

  // Pagination bounds
  const totalItems = initialSales.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedSales = initialSales.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedSales.map((s) => s.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (role !== 'admin') return

    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected bulk sales records?`)) {
      const res = await deleteMultipleSales(selectedIds)
      if (res?.error) {
        alert('Error: ' + res.error)
      } else {
        alert('Selected milk sales deleted successfully.')
        setSelectedIds([])
        setPage(1)
        if (onRefresh) onRefresh()
        router.refresh()
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl overflow-hidden relative">
        <div className="border-b border-slate-200/70 p-4">
          <h3 className="font-bold text-slate-800">{t('sales.recentSales')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
              <tr>
                {role === 'admin' && (
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={paginatedSales.length > 0 && paginatedSales.every((s) => selectedIds.includes(s.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-4 py-3">{t('sales.form.date')}</th>
                <th className="px-4 py-3">{t('sales.form.buyerName')}</th>
                <th className="px-4 py-3">{t('sales.form.milkType')}</th>
                <th className="px-4 py-3">{t('sales.form.qty')}</th>
                <th className="px-4 py-3">{t('sales.form.rate')}</th>
                <th className="px-4 py-3 text-right">{t('sales.form.amount')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((s) => {
                const isChecked = selectedIds.includes(s.id)
                return (
                  <tr key={s.id} className={`border-b hover:bg-slate-50 ${isChecked ? 'bg-blue-50/30' : ''}`}>
                    {role === 'admin' && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(s.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {new Date(s.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {s.customers 
                        ? `${s.customers.customer_code} - ${s.customers.name} (Farmer)` 
                        : s.buyer_name}
                    </td>
                    <td className="px-4 py-3 capitalize">{t(`common.${s.milk_type}`)}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{s.quantity_liters} L</td>
                    <td className="px-4 py-3">Rs {s.rate_per_liter}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">Rs {s.total_amount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          type="button"
                          title="Print Receipt"
                          onClick={() => {
                            const settings = getPrinterSettings()
                            const html = generateSaleHtml(s, settings, locale as 'en' | 'hi')
                            printReceipt(html)
                          }}
                          className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600 transition-colors text-sm"
                        >
                          🖨️
                        </button>
                        <DeleteButton
                          id={s.id}
                          deleteAction={async (id) => {
                            const res = await deleteSaleEntry(id)
                            if (!res?.error && onRefresh) onRefresh()
                            return res
                          }}
                          confirmMessage={`Are you sure you want to delete this milk sale entry for ${s.customers ? s.customers.name : s.buyer_name} (${s.quantity_liters}L)?`}
                          successMessage="Milk sale entry deleted successfully."
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {initialSales.length === 0 && (
                <tr>
                  <td colSpan={role === 'admin' ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                    No recent sales found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <Pagination
          page={page}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onChangePage={(p) => { setPage(p); setSelectedIds([]); }}
          onChangeItemsPerPage={(sz) => { setItemsPerPage(sz); setSelectedIds([]); }}
          itemLabel={t('nav.milkSales') || 'sales'}
        />
      </div>

      {/* Bulk Delete Bar */}
      {selectedIds.length > 0 && role === 'admin' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-6 px-6 py-3 rounded-2xl bg-white/80 border border-slate-200/50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 w-full max-w-md sm:max-w-lg">
          <span className="text-sm font-semibold text-slate-700">
            {selectedIds.length} sale{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="bg-white border border-slate-200 text-slate-600"
            >
              Deselect
            </Button>
            <Button
              size="sm"
              onClick={handleBulkDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg flex items-center gap-1.5 font-bold"
            >
              🗑️ Delete Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
