'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CustomerRowActions } from './customer-row-actions'
import { deleteMultipleCustomers } from '@/lib/customers-local'
import { getSessionUserRole } from '@/app/actions/auth'
import { Pagination } from '@/components/ui/pagination'

import { useLanguage } from '@/context/LanguageContext'

export function CustomersTable({ customers: initialCustomers, onRefresh }: { customers: any[]; onRefresh?: () => void }) {
  const router = useRouter()
  const { t } = useLanguage()
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
  const totalItems = initialCustomers.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedCustomers = initialCustomers.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const idsOnPage = paginatedCustomers.map((c) => c.id)
      setSelectedIds(idsOnPage)
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
    if (role !== 'admin') {
      alert('Only admins are authorized to perform bulk delete operations.')
      return
    }

    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected customers? This will cascadingly delete their related transactional history.`)) {
      const res = await deleteMultipleCustomers(selectedIds)
      if (res?.error) {
        alert('Error: ' + res.error)
      } else {
        alert('Selected customers deleted successfully.')
        setSelectedIds([])
        setPage(1)
        router.refresh()
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl overflow-hidden relative">
        <Table>
          <TableHeader>
            <TableRow>
              {role === 'admin' && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={paginatedCustomers.length > 0 && paginatedCustomers.every((c) => selectedIds.includes(c.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </TableHead>
              )}
              <TableHead>{t('customers.table.code')}</TableHead>
              <TableHead>{t('customers.table.name')}</TableHead>
              <TableHead>{t('customers.table.mobile')}</TableHead>
              <TableHead>{t('customers.table.village')}</TableHead>
              <TableHead>{t('customers.table.milkPref')}</TableHead>
              <TableHead>{t('customers.table.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCustomers.map((customer: any) => {
              const isChecked = selectedIds.includes(customer.id)
              return (
                <TableRow key={customer.id} className={isChecked ? 'bg-blue-50/30' : ''}>
                  {role === 'admin' && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleSelectRow(customer.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{customer.customer_code}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.mobile}</TableCell>
                  <TableCell>{customer.village}</TableCell>
                  <TableCell className="capitalize">{t(`common.${customer.milk_type_preference}`)}</TableCell>
                  <TableCell>
                    {customer.active_status ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {t('common.active')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                        {t('common.inactive')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <CustomerRowActions customer={customer} />
                  </TableCell>
                </TableRow>
              )
            })}
            {initialCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={role === 'admin' ? 8 : 7} className="text-center text-slate-500 py-8">
                  No customers found. Click &apos;Add Customer&apos; to start.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <Pagination
          page={page}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onChangePage={(p) => { setPage(p); setSelectedIds([]); }}
          onChangeItemsPerPage={(sz) => { setItemsPerPage(sz); setSelectedIds([]); }}
          itemLabel={t('nav.customers') || 'farmers'}
        />
      </div>

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedIds.length > 0 && role === 'admin' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-6 px-6 py-3 rounded-2xl bg-white/80 border border-slate-200/50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 w-full max-w-md sm:max-w-lg">
          <span className="text-sm font-semibold text-slate-700">
            {selectedIds.length} customer{selectedIds.length > 1 ? 's' : ''} selected
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
