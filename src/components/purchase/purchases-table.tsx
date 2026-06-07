'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletePurchaseEntry, deleteMultiplePurchases } from '@/lib/purchases-local'
import { getSessionUserRole } from '@/app/actions/auth'
import { useLanguage } from '@/context/LanguageContext'
import { getPrinterSettings, generatePurchaseHtml, printReceipt } from '@/lib/printer-service'
import { Pagination } from '@/components/ui/pagination'

export function PurchasesTable({ purchases: initialPurchases, onRefresh }: { purchases: any[]; onRefresh?: () => void }) {
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
  const totalItems = initialPurchases.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedPurchases = initialPurchases.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedPurchases.map((p) => p.id))
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

    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected milk collection entries? This will adjust the ledger running balance accordingly.`)) {
      const res = await deleteMultiplePurchases(selectedIds)
      if (res?.error) {
        alert('Error: ' + res.error)
      } else {
        alert('Selected purchases deleted successfully.')
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
          <h3 className="font-bold text-slate-800">{t('purchase.recentPurchases')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
              <tr>
                {role === 'admin' && (
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={paginatedPurchases.length > 0 && paginatedPurchases.every((p) => selectedIds.includes(p.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">{t('purchase.form.selectCustomer')}</th>
                <th className="px-4 py-3">{t('purchase.form.qty')}</th>
                <th className="px-4 py-3">FAT / SNF</th>
                <th className="px-4 py-3">{t('purchase.form.rate')}</th>
                <th className="px-4 py-3 text-right">{t('purchase.form.amount')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPurchases.map((p) => {
                const isChecked = selectedIds.includes(p.id)
                return (
                  <tr key={p.id} className={`border-b hover:bg-slate-50 ${isChecked ? 'bg-blue-50/30' : ''}`}>
                    {role === 'admin' && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(p.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {p.customers?.customer_code} - {p.customers?.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-600">{p.quantity_liters} L</td>
                    <td className="px-4 py-3">{p.fat_percentage} / {p.snf_percentage}</td>
                    <td className="px-4 py-3">Rs {p.rate_per_liter}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">Rs {p.total_amount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          type="button"
                          title="Print Receipt"
                          onClick={() => {
                            const settings = getPrinterSettings()
                            const html = generatePurchaseHtml(p, settings, locale as 'en' | 'hi')
                            printReceipt(html)
                          }}
                          className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600 transition-colors text-sm"
                        >
                          🖨️
                        </button>
                        <DeleteButton
                          id={p.id}
                          deleteAction={async (id) => {
                            const res = await deletePurchaseEntry(id)
                            if (!res?.error && onRefresh) onRefresh()
                            return res
                          }}
                          confirmMessage={`Are you sure you want to delete this purchase entry for ${p.customers?.name} (${p.quantity_liters}L)?`}
                          successMessage="Purchase entry deleted successfully."
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {initialPurchases.length === 0 && (
                <tr>
                  <td colSpan={role === 'admin' ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                    No recent collections found.
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
          itemLabel={t('nav.milkPurchase') || 'entries'}
        />
      </div>

      {/* Bulk Delete Bar */}
      {selectedIds.length > 0 && role === 'admin' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-6 px-6 py-3 rounded-2xl bg-white/80 border border-slate-200/50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 w-full max-w-md sm:max-w-lg">
          <span className="text-sm font-semibold text-slate-700">
            {selectedIds.length} purchase{selectedIds.length > 1 ? 's' : ''} selected
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
