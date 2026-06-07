'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { PassbookFilter } from '@/components/passbook/passbook-filter'
import { Button } from '@/components/ui/button'
import { getPrinterSettings, generatePassbookHtml, printReceipt } from '@/lib/printer-service'
import { RefreshCw } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

type PassbookRow = {
  id: string
  transaction_date: string
  transaction_type: 'purchase' | 'sale' | 'payment' | 'advance' | 'adjustment'
  particulars: string
  credit_amount: number
  debit_amount: number
  running_balance: number
}

interface PassbookClientProps {
  customers: any[]
  customerId: string
  selectedCustomer: any
  ledger: PassbookRow[]
  totalCredit: number
  totalDebit: number
  netDue: number
  onRefresh?: () => void
}

export function PassbookClient({
  customers,
  customerId,
  selectedCustomer,
  ledger,
  totalCredit,
  totalDebit,
  netDue,
  onRefresh
}: PassbookClientProps) {
  const { t, locale } = useLanguage()
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const totalItems = ledger.length
  const sortedLedger = [...ledger].reverse()
  const paginatedLedger = sortedLedger.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className="space-y-6 select-none animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">{t('passbook.title')}</h1>
          <p className="text-sm text-slate-600">{t('passbook.selectCustomer')}</p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-9 w-9 shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <PassbookFilter customers={customers} />

      {customerId && selectedCustomer ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block font-semibold">{t('passbook.table.credit')}</span>
              <span className="text-xl font-bold text-green-700">Rs {totalCredit.toFixed(2)}</span>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block font-semibold">{t('passbook.table.debit')}</span>
              <span className="text-xl font-bold text-red-600">Rs {totalDebit.toFixed(2)}</span>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block font-semibold">{t('passbook.table.balance')}</span>
              <span className={`text-xl font-bold ${netDue >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                Rs {netDue.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="border-b border-slate-200/70 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-slate-700">
                  {t('nav.passbook')} - {selectedCustomer.name} ({selectedCustomer.customer_code})
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">{t('customers.form.village')}: {selectedCustomer.village}</p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  const settings = getPrinterSettings()
                  const html = generatePassbookHtml(ledger, selectedCustomer, settings, locale as 'en' | 'hi')
                  printReceipt(html)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 flex items-center gap-1.5 h-8 w-fit self-end shadow-sm"
              >
                🖨️ {locale === 'hi' ? 'पासबुक प्रिंट करें' : 'Print Statement'}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">{t('passbook.table.date')}</th>
                    <th className="px-4 py-3">{t('passbook.table.particulars')}</th>
                    <th className="px-4 py-3 text-right">{t('passbook.table.credit')}</th>
                    <th className="px-4 py-3 text-right">{t('passbook.table.debit')}</th>
                    <th className="px-4 py-3 text-right">{t('passbook.table.balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLedger.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {new Date(row.transaction_date).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.particulars}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-bold">
                        {row.credit_amount > 0 ? `Rs ${row.credit_amount}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-bold">
                        {row.debit_amount > 0 ? `Rs ${row.debit_amount}` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-extrabold ${
                        row.running_balance >= 0 ? 'text-blue-700' : 'text-amber-700'
                      }`}>
                        Rs {row.running_balance}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No transactions available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onChangePage={setPage}
              onChangeItemsPerPage={setItemsPerPage}
              itemLabel="transactions"
            />
          </div>
        </div>
      ) : (
        customerId && (
          <div className="text-center py-12 rounded-2xl border border-dashed text-slate-500">
            Selected farmer not found or no passbook ledger could be resolved.
          </div>
        )
      )}
    </div>
  )
}
