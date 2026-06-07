'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DeleteButton } from '@/components/ui/delete-button'
import { deletePaymentEntry, deleteMultiplePayments } from '@/lib/payments-local'
import { getSessionUserRole } from '@/app/actions/auth'
import { getPrinterSettings, generatePaymentHtml, printReceipt } from '@/lib/printer-service'
import { useLanguage } from '@/context/LanguageContext'
import { Pagination } from '@/components/ui/pagination'

export function PaymentsTable({ payments: initialPayments, onRefresh }: { payments: any[]; onRefresh?: () => void }) {
  const router = useRouter()
  const { locale } = useLanguage()
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
  const totalItems = initialPayments.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedPayments = initialPayments.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedPayments.map((p) => p.id))
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

  const getMethodLabel = (method: string) => {
    if (locale === 'hi') {
      switch (method) {
        case 'cash': return 'नकद'
        case 'bank': return 'बैंक ट्रांसफर'
        case 'upi': return 'यूपीआई'
        case 'gpay': return 'जीपे'
        case 'phonepe': return 'फ़ोनपे'
        case 'paytm': return 'पेटीएम'
        default: return method
      }
    }
    return method.toUpperCase()
  }

  const handleBulkDelete = async () => {
    if (role !== 'admin') return

    const confirmMsg = locale === 'hi' 
      ? `क्या आप वाकई चयनित ${selectedIds.length} भुगतान रिकॉर्ड हटाना चाहते हैं? यह बही-खाता संतुलन को समायोजित कर देगा।`
      : `Are you sure you want to delete the ${selectedIds.length} selected farmer payout records? This will cascade and adjust farmer ledger balance.`

    if (confirm(confirmMsg)) {
      const res = await deleteMultiplePayments(selectedIds)
      if (res?.error) {
        alert('Error: ' + res.error)
      } else {
        alert(locale === 'hi' ? 'चयनित भुगतान रिकॉर्ड सफलतापूर्वक हटा दिए गए।' : 'Selected payout records deleted successfully.')
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
          <h3 className="font-bold text-slate-800">
            {locale === 'hi' ? 'हालिया भुगतान बही' : 'Recent Payouts Ledger'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
              <tr>
                {role === 'admin' && (
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={paginatedPayments.length > 0 && paginatedPayments.every((p) => selectedIds.includes(p.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-4 py-3">{locale === 'hi' ? 'तारीख' : 'Date'}</th>
                <th className="px-4 py-3">{locale === 'hi' ? 'किसान' : 'Farmer'}</th>
                <th className="px-4 py-3">{locale === 'hi' ? 'विधि' : 'Method'}</th>
                <th className="px-4 py-3">{locale === 'hi' ? 'संदर्भ संख्या' : 'Reference No'}</th>
                <th className="px-4 py-3 text-right">{locale === 'hi' ? 'राशि' : 'Amount'}</th>
                <th className="px-4 py-3 text-right">{locale === 'hi' ? 'कार्रवाई' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map((pay) => {
                const isChecked = selectedIds.includes(pay.id)
                return (
                  <tr key={pay.id} className={`border-b hover:bg-slate-50 ${isChecked ? 'bg-blue-50/30' : ''}`}>
                    {role === 'admin' && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(pay.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {new Date(pay.payment_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {pay.customers?.customer_code} - {pay.customers?.name}
                    </td>
                    <td className="px-4 py-3 capitalize">{getMethodLabel(pay.payment_method)}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{pay.reference_no || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">Rs {pay.amount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          type="button"
                          title={locale === 'hi' ? 'रसीद प्रिंट करें' : 'Print Receipt'}
                          onClick={() => {
                            const settings = getPrinterSettings()
                            const html = generatePaymentHtml(pay, settings, locale as 'en' | 'hi')
                            printReceipt(html)
                          }}
                          className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600 transition-colors text-sm"
                        >
                          🖨️
                        </button>
                        <DeleteButton
                          id={pay.id}
                          deleteAction={async (id) => {
                            const res = await deletePaymentEntry(id)
                            if (!res?.error && onRefresh) onRefresh()
                            return res
                          }}
                          confirmMessage={locale === 'hi' 
                            ? `क्या आप वाकई ${pay.customers?.name} के लिए Rs ${pay.amount} का यह भुगतान रिकॉर्ड हटाना चाहते हैं?`
                            : `Are you sure you want to delete this payment record of Rs ${pay.amount} for ${pay.customers?.name}?`}
                          successMessage={locale === 'hi' ? 'भुगतान रिकॉर्ड सफलतापूर्वक हटा दिया गया।' : 'Payment record deleted successfully.'}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {initialPayments.length === 0 && (
                <tr>
                  <td colSpan={role === 'admin' ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                    {locale === 'hi' ? 'कोई भुगतान रिकॉर्ड नहीं मिला।' : 'No payout logs found.'}
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
          itemLabel={locale === 'hi' ? 'भुगतान' : 'payments'}
        />
      </div>

      {/* Bulk Delete Bar */}
      {selectedIds.length > 0 && role === 'admin' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-6 px-6 py-3 rounded-2xl bg-white/80 border border-slate-200/50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 w-full max-w-md sm:max-w-lg">
          <span className="text-sm font-semibold text-slate-700">
            {selectedIds.length} {locale === 'hi' ? 'चयनित भुगतान' : `payment${selectedIds.length > 1 ? 's' : ''} selected`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="bg-white border border-slate-200 text-slate-600"
            >
              {locale === 'hi' ? 'चयन रद्द करें' : 'Deselect'}
            </Button>
            <Button
              size="sm"
              onClick={handleBulkDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg flex items-center gap-1.5 font-bold"
            >
              🗑️ {locale === 'hi' ? 'चयनित हटाएं' : 'Delete Selected'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
