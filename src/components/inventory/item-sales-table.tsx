'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSessionUserRole } from '@/app/actions/auth'
import { Pagination } from '@/components/ui/pagination'
import { useLanguage } from '@/context/LanguageContext'

export function ItemSalesTable({ 
  itemSales: initialSales,
  onSalesChanged
}: { 
  itemSales: any[]
  onSalesChanged?: () => void
}) {
  const router = useRouter()
  const { locale } = useLanguage()
  const [role, setRole] = useState<string | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  
  // Selection and Pagination states
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Edit Sale Modal State
  const [editingSale, setEditingSale] = useState<any | null>(null)
  const [editQty, setEditQty] = useState(0)
  const [editPrice, setEditPrice] = useState(0)
  const [editSaleDate, setEditSaleDate] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function loadRoleAndCustomers() {
      const [userRole, { getCustomers }] = await Promise.all([
        getSessionUserRole(),
        import('@/lib/customers-local')
      ])
      setRole(userRole)
      const res = await getCustomers()
      if (res.customers) {
        setCustomers(res.customers)
      }
    }
    loadRoleAndCustomers()
  }, [])

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'agent'

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
    if (!isAdmin) return

    const confirmMsg = locale === 'hi'
      ? `क्या आप वाकई ${selectedIds.length} चयनित स्टोर बिक्री रिकॉर्ड को हटाना चाहते हैं? इससे स्टॉक वापस मिल जाएगा।`
      : `Are you sure you want to delete the ${selectedIds.length} selected store sale records? This will refund their stock levels inside inventory.`

    if (confirm(confirmMsg)) {
      const { refundProductStockLocal } = await import('@/lib/products-local')
      const { itemSalesLocal } = await import('@/lib/item-sales-local')
      
      let errorHappened = false
      for (const id of selectedIds) {
        const sale = initialSales.find((s) => s.id === id)
        if (sale) {
          const refundRes = await refundProductStockLocal(sale.product_id, sale.quantity)
          if (refundRes?.error) {
            console.error(`Failed to refund stock for sale ${id}:`, refundRes.error)
            errorHappened = true
          }
        }
      }
      
      // Bulk delete locally
      itemSalesLocal.deleteMultiple(selectedIds)
      
      if (errorHappened) {
        alert(locale === 'hi' ? 'कुछ स्टॉक रिफंड करने में त्रुटि हुई, लेकिन बिक्री रिकॉर्ड हटा दिए गए।' : 'Some stock refunds encountered errors, but sale records were removed.')
      } else {
        alert(locale === 'hi' ? 'चयनित बिक्री सफलतापूर्वक हटा दी गई।' : 'Selected store sales deleted successfully.')
      }
      
      setSelectedIds([])
      setPage(1)
      if (onSalesChanged) onSalesChanged()
      router.refresh()
    }
  }

  const startEditSale = (sale: any) => {
    setEditingSale(sale)
    setEditQty(sale.quantity)
    setEditPrice(sale.price_per_item)
    setEditSaleDate(sale.sale_date)
  }

  const handleUpdateSale = async () => {
    if (!editingSale) return
    setIsUpdating(true)
    
    const qtyDiff = editQty - editingSale.quantity
    
    // 1. Adjust stock locally in IndexedDB
    const { adjustProductStockLocal } = await import('@/lib/products-local')
    const adjustRes = await adjustProductStockLocal(editingSale.product_id, qtyDiff)
    if (adjustRes?.error) {
      setIsUpdating(false)
      alert('Error adjusting stock: ' + adjustRes.error)
      return
    }
    
    // 2. Update locally in localStorage
    const { itemSalesLocal } = await import('@/lib/item-sales-local')
    itemSalesLocal.update(editingSale.id, {
      quantity: editQty,
      price_per_item: editPrice,
      sale_date: editSaleDate,
    })
    
    setIsUpdating(false)
    alert(locale === 'hi' ? 'बिक्री सफलतापूर्वक संपादित की गई!' : 'Sale updated successfully!')
    setEditingSale(null)
    if (onSalesChanged) onSalesChanged()
    router.refresh()
  }

  const handleSingleDelete = async (sale: any) => {
    if (!isAdmin) {
      alert(locale === 'hi' ? 'केवल एडमिन ही बिक्री हटा सकते हैं।' : 'Only administrators can delete sale records.')
      return
    }
    
    const name = sale.customer_id?.startsWith('custom:')
      ? sale.customer_id.split('custom:')[1]
      : (customers.find((c) => c.id === sale.customer_id)?.name || 'Walk-in Customer')
       
    const confirmMsg = locale === 'hi'
      ? `क्या आप वाकई ${name} के लिए ${sale.product_name || sale.inventory?.product_name} की इस बिक्री को हटाना चाहते हैं? यह स्टॉक वापस कर देगा।`
      : `Are you sure you want to delete this store sale of ${sale.product_name || sale.inventory?.product_name} for ${name}? This will refund the stock.`
       
    if (confirm(confirmMsg)) {
      // 1. Refund stock locally in IndexedDB
      const { refundProductStockLocal } = await import('@/lib/products-local')
      const refundRes = await refundProductStockLocal(sale.product_id, sale.quantity)
      if (refundRes?.error) {
        alert('Error reverting stock: ' + refundRes.error)
        return
      }
      
      // 2. Delete locally in localStorage
      const { itemSalesLocal } = await import('@/lib/item-sales-local')
      itemSalesLocal.delete(sale.id)
      
      alert(locale === 'hi' ? 'बिक्री सफलतापूर्वक हटा दी गई।' : 'Store sale deleted successfully.')
      
      if (onSalesChanged) onSalesChanged()
      router.refresh()
    }
  }

  const handleDownloadExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const dataToExport = initialSales.map((s) => {
        const date = new Date(s.sale_date).toLocaleDateString('en-IN')
        let customerName = 'Guest Customer'
        if (s.customer_id.startsWith('custom:')) {
          customerName = s.customer_id.split('custom:')[1] || 'Guest Customer'
        } else if (s.customer_id !== 'custom') {
          const found = customers.find(c => c.id === s.customer_id)
          if (found) customerName = `${found.customer_code} - ${found.name}`
        }
        return {
          [locale === 'hi' ? 'तारीख (Date)' : 'Date']: date,
          [locale === 'hi' ? 'ग्राहक (Customer)' : 'Customer']: customerName,
          [locale === 'hi' ? 'उत्पाद (Product)' : 'Product']: s.product_name || s.inventory?.product_name || '',
          [locale === 'hi' ? 'मात्रा (Quantity)' : 'Quantity']: s.quantity,
          [locale === 'hi' ? 'दर (Rate)' : 'Price Per Item']: s.price_per_item,
          [locale === 'hi' ? 'कुल राशि (Total)' : 'Total Amount']: s.total_amount
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales')
      XLSX.writeFile(workbook, `store-sales-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error('Failed to export Excel:', err)
      alert('Failed to export Excel file.')
    }
  }

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups to print PDF.')
      return
    }

    const dateStr = new Date().toLocaleDateString('en-IN')
    let tableRows = initialSales.map((s) => {
      const date = new Date(s.sale_date).toLocaleDateString('en-IN')
      let customerName = 'Guest Customer'
      if (s.customer_id.startsWith('custom:')) {
        customerName = s.customer_id.split('custom:')[1] || 'Guest Customer'
      } else if (s.customer_id === 'custom') {
        customerName = 'Guest Customer'
      } else {
        const found = customers.find(c => c.id === s.customer_id)
        if (found) customerName = `${found.customer_code} - ${found.name}`
      }
      return `
        <tr>
          <td>${date}</td>
          <td>${customerName}</td>
          <td>${s.product_name || s.inventory?.product_name || ''}</td>
          <td>${s.quantity}</td>
          <td>Rs ${s.price_per_item}</td>
          <td style="text-align: right; font-weight: bold; color: #dc2626;">Rs ${s.total_amount}</td>
        </tr>
      `
    }).join('')

    if (initialSales.length === 0) {
      tableRows = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No sales recorded yet.</td></tr>`
    }

    const titleText = locale === 'hi' ? 'हाल की स्टोर बिक्री रिपोर्ट' : 'Recent Store Sales Report'
    const subTitleText = locale === 'hi' ? 'शर्मा डेयरी - स्टॉक और स्टोर बिक्री (किसान डेबिट) विवरण' : 'Sharma Dairy - Stock & Store Sales (Customer Debits) Details'

    printWindow.document.write(`
      <html>
        <head>
          <title>${titleText}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; }
            h1 { font-size: 24px; margin-bottom: 5px; color: #0f172a; }
            h2 { font-size: 14px; font-weight: normal; margin-top: 0; color: #475569; margin-bottom: 20px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background-color: #f8fafc; color: #475569; text-align: left; padding: 10px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
            tr:hover { background-color: #f8fafc; }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>${titleText}</h1>
              <h2>${subTitleText}</h2>
            </div>
            <button onclick="window.print();" style="background-color: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
              Print / Save as PDF
            </button>
          </div>
          <div class="meta">
            <span>Date Generated: ${dateStr}</span>
            <span>Total Sales Records: ${initialSales.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Price Per Item</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl relative overflow-hidden flex flex-col justify-between h-full">
      <div className="border-b border-slate-200/70 p-4 flex justify-between items-center bg-white/30 gap-4">
        <h3 className="font-bold text-slate-800">
          {locale === 'hi' ? 'हाल की स्टोर बिक्री (किसान डेबिट)' : 'Recent Store Sales (Customer Debits)'}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            className="text-slate-600 hover:bg-slate-100 rounded-lg px-2.5 h-8 flex items-center justify-center border border-slate-200 shadow-sm bg-white text-xs font-semibold gap-1.5 cursor-pointer"
            title={locale === 'hi' ? 'एक्सेल शीट डाउनलोड करें' : 'Download Excel Sheet'}
          >
            📊 {locale === 'hi' ? 'एक्सेल' : 'Excel'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="text-slate-600 hover:bg-slate-100 rounded-lg px-2.5 h-8 flex items-center justify-center border border-slate-200 shadow-sm bg-white text-xs font-semibold gap-1.5 cursor-pointer"
            title={locale === 'hi' ? 'पीडीएफ रिपोर्ट डाउनलोड करें' : 'Download PDF Report'}
          >
            📄 {locale === 'hi' ? 'पीडीएफ' : 'PDF'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[380px] overflow-y-auto flex-grow">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 z-10">
            <tr>
              {isAdmin && (
                <th className="px-4 py-3 w-12 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={paginatedSales.length > 0 && paginatedSales.every((s) => selectedIds.includes(s.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-4 py-3 bg-slate-50">{locale === 'hi' ? 'तारीख' : 'Date'}</th>
              <th className="px-4 py-3 bg-slate-50">{locale === 'hi' ? 'ग्राहक' : 'Customer'}</th>
              <th className="px-4 py-3 bg-slate-50">{locale === 'hi' ? 'उत्पाद' : 'Product'}</th>
              <th className="px-4 py-3 bg-slate-50">{locale === 'hi' ? 'मात्रा' : 'Qty'}</th>
              <th className="px-4 py-3 text-right bg-slate-50">{locale === 'hi' ? 'कुल' : 'Total'}</th>
              <th className="px-4 py-3 text-right bg-slate-50">{locale === 'hi' ? 'कार्रवाई' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSales.map((s) => {
              const isChecked = selectedIds.includes(s.id)
              return (
                <tr key={s.id} className={`border-b hover:bg-slate-50 ${isChecked ? 'bg-blue-50/30' : ''}`}>
                  {isAdmin && (
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
                    {new Date(s.sale_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {(() => {
                      if (s.customer_id?.startsWith('custom:')) {
                        const name = s.customer_id.split('custom:')[1] || 'Guest Customer'
                        return `NA - ${name}`
                      }
                      if (s.customer_id === 'custom') return 'NA - Guest Customer'
                      const found = customers.find(c => c.id === s.customer_id)
                      return found ? `${found.customer_code} - ${found.name}` : 'Walk-in / Deleted'
                    })()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.product_name || s.inventory?.product_name}</td>
                  <td className="px-4 py-3">{s.quantity}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">Rs {s.total_amount}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    <div className="flex justify-end items-center gap-1">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          onClick={() => startEditSale(s)}
                          className="text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg p-1.5 h-8 w-8 flex items-center justify-center border border-transparent hover:border-blue-200"
                          title={locale === 'hi' ? 'बिक्री संपादित करें' : 'Edit sale'}
                        >
                          ✏️
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          onClick={() => handleSingleDelete(s)}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg p-1.5 h-8 w-8 flex items-center justify-center border border-transparent hover:border-rose-200"
                          title={locale === 'hi' ? 'बिक्री हटाएं' : 'Delete sale'}
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {initialSales.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                  {locale === 'hi' ? 'अभी तक कोई चारा या पूरक नहीं बेचा गया है।' : 'No feed or supplements sold yet.'}
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
        onChangePage={(p) => { setPage(p); setSelectedIds([]); }}
        onChangeItemsPerPage={(sz) => { setItemsPerPage(sz); setSelectedIds([]); }}
        itemLabel={locale === 'hi' ? 'बिक्री' : 'sales'}
      />

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {locale === 'hi' ? 'बिक्री संपादित करें' : 'Edit Sale'}
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  {locale === 'hi' ? 'मात्रा' : 'Quantity'}
                </label>
                <Input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  {locale === 'hi' ? 'दर (Rs)' : 'Rate (Rs)'}
                </label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  {locale === 'hi' ? 'बिक्री की तारीख' : 'Sale Date'}
                </label>
                <Input
                  type="date"
                  value={editSaleDate}
                  onChange={(e) => setEditSaleDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingSale(null)}
                className="bg-white border-slate-200"
              >
                {locale === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button
                onClick={handleUpdateSale}
                disabled={isUpdating}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold"
              >
                {isUpdating ? (locale === 'hi' ? 'सहेज रहे हैं...' : 'Saving...') : (locale === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Bar */}
      {selectedIds.length > 0 && isAdmin && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-6 px-6 py-3 rounded-2xl bg-white/80 border border-slate-200/50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300 w-full max-w-md sm:max-w-lg">
          <span className="text-sm font-semibold text-slate-700">
            {selectedIds.length} {locale === 'hi' ? 'चयनित' : 'selected'}
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
