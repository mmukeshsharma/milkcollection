'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableCustomerSelect } from '@/components/ui/customer-select'
import { SearchableProductSelect } from '@/components/ui/product-select'
import { createItemSale } from '@/app/actions/inventory'
import { printReceipt, generateStoreSaleHtml, getPrinterSettings } from '@/lib/printer-service'
import { useLanguage } from '@/context/LanguageContext'

interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  price: number
}

export function CreateItemSaleForm({
  customers: initialServerCustomers,
  products,
  onSaleRecorded,
}: {
  customers: any[]
  products: any[]
  onSaleRecorded?: () => void
}) {
  const router = useRouter()
  const { locale } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Customer state loaded client-side from IndexedDB
  const [customers, setCustomers] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [customCustomerName, setCustomCustomerName] = useState('')
  const [isCustomCustomer, setIsCustomCustomer] = useState(false)

  // Multiple product cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    async function loadCustomers() {
      const { getCustomers } = await import('@/lib/customers-local')
      const res = await getCustomers()
      if (res.customers) {
        setCustomers(res.customers)
      }
    }
    loadCustomers()
  }, [])

  const handleAddProduct = () => {
    if (selectedProductIds.length === 0) return

    const newCartItems: CartItem[] = []
    const updatedCart = [...cart]

    selectedProductIds.forEach((pid) => {
      const prod = products.find((p) => p.id === pid)
      if (!prod) return

      const existingIndex = updatedCart.findIndex((item) => item.product_id === pid)
      if (existingIndex > -1) {
        updatedCart[existingIndex].quantity += 1
      } else {
        newCartItems.push({
          product_id: prod.id,
          product_name: prod.product_name,
          quantity: 1,
          price: prod.price,
        })
      }
    })

    setCart([...updatedCart, ...newCartItems])
    setSelectedProductIds([])
  }

  const handleRemoveProduct = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId))
  }

  const handleQuantityChange = (productId: string, qty: number) => {
    if (qty <= 0) return
    setCart(
      cart.map((item) => (item.product_id === productId ? { ...item, quantity: qty } : item))
    )
  }

  const grandTotal = Number(cart.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2))

  const getCustomerNameForBill = () => {
    if (isCustomCustomer) return customCustomerName || (locale === 'hi' ? 'अतिथि ग्राहक' : 'Guest Customer')
    const found = customers.find((c) => c.id === customerId)
    return found ? found.name : (locale === 'hi' ? 'अज्ञान ग्राहक' : 'Unknown Customer')
  }

  const getCustomerCodeForBill = () => {
    if (isCustomCustomer) return 'WALK-IN'
    const found = customers.find((c) => c.id === customerId)
    return found ? found.customer_code : 'N/A'
  }

  const triggerLocalPrint = () => {
    const settings = getPrinterSettings()
    const formattedItems = cart.map((item) => ({
      product_name: item.product_name,
      price_per_item: item.price,
      quantity: item.quantity,
      total_amount: item.price * item.quantity,
    }))
    const saleData = {
      customerName: getCustomerNameForBill(),
      customerCode: getCustomerCodeForBill(),
      sale_date: saleDate,
      created_at: new Date().toISOString(),
      total_amount: grandTotal,
      items: formattedItems,
    }
    const htmlContent = generateStoreSaleHtml(saleData, settings, locale as 'en' | 'hi')
    printReceipt(htmlContent)
  }

  const handlePrintBillOnly = () => {
    if (cart.length === 0) {
      alert(locale === 'hi' ? 'कृपया कार्ट में कम से कम एक उत्पाद जोड़ें।' : 'Please add at least one product to the cart.')
      return
    }
    triggerLocalPrint()
  }

  const handleRecordAndPrint = async () => {
    if (cart.length === 0) {
      alert(locale === 'hi' ? 'कृपया कार्ट में कम से कम एक उत्पाद जोड़ें।' : 'Please add at least one product to the cart.')
      return
    }
    if (!isCustomCustomer && !customerId) {
      alert(locale === 'hi' ? 'कृपया ग्राहक चुनें या नाम दर्ज करें।' : 'Please select a customer or type name.')
      return
    }

    setIsLoading(true)
    setMessage(null)

    let errorsList: string[] = []
    const recordedSales: any[] = []

    const { deductProductStockLocal } = await import('@/lib/products-local')
    const { itemSalesLocal } = await import('@/lib/item-sales-local')

    // Record each item sale
    for (const item of cart) {
      // 1. Deduct stock in local IndexedDB
      const stockRes = await deductProductStockLocal(item.product_id, item.quantity)
      if (stockRes?.error) {
        errorsList.push(`${item.product_name}: ${stockRes.error}`)
        continue
      }

      // 2. Save sale record locally in localStorage
      const custId = isCustomCustomer ? `custom:${customCustomerName || 'Guest Customer'}` : customerId
      const localSale = itemSalesLocal.add({
        customer_id: custId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price_per_item: item.price,
        total_amount: Number((item.quantity * item.price).toFixed(2)),
        sale_date: saleDate,
      })

      recordedSales.push(localSale)

      // 3. Write passbook entry locally in IndexedDB
      if (!isCustomCustomer && customerId) {
        try {
          const { passbookLocal } = await import('@/lib/passbook-local')
          const totalItemAmount = Number((item.quantity * item.price).toFixed(2))
          await passbookLocal.addEntry({
            customer_id: customerId,
            transaction_date: saleDate,
            transaction_type: 'sale',
            reference_id: localSale.id,
            particulars: `${item.product_name} - Store Purchase(${item.quantity})`,
            credit_amount: 0,
            debit_amount: totalItemAmount,
          })
        } catch (passbookErr) {
          console.error('Failed to create local passbook entry:', passbookErr)
        }
      }
    }

    setIsLoading(false)

    if (errorsList.length > 0) {
      setMessage({
        type: 'error',
        text: locale === 'hi'
          ? `कुछ उत्पादों को दर्ज करने में विफल:\n${errorsList.join('\n')}`
          : `Failed to record some items:\n${errorsList.join('\n')}`
      })
    } else {
      triggerLocalPrint()
      setMessage({
        type: 'success',
        text: locale === 'hi'
          ? 'बिल सफलतापूर्वक दर्ज और प्रिंट किया गया!'
          : 'Bill recorded and printed successfully!'
      })
      // Clear state
      setCart([])
      setCustomerId('')
      setCustomCustomerName('')
      setIsCustomCustomer(false)
      if (onSaleRecorded) onSaleRecorded()
      router.refresh()
    }
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-bold text-slate-800">
        {locale === 'hi' ? 'ग्राहक को उत्पाद बेचें (कटौती)' : 'Sell Product to Customer (Deduction)'}
      </h3>

      {message && (
        <div className={`mb-4 rounded-xl p-3 text-sm font-medium whitespace-pre-wrap ${message.type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Customer Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{locale === 'hi' ? 'ग्राहक चुनें' : 'Select Customer'}</Label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isCustomCustomer}
                onChange={(e) => {
                  setIsCustomCustomer(e.target.checked)
                  setCustomerId('')
                  setCustomCustomerName('')
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              {locale === 'hi' ? 'सूची में नहीं (मैन्युअल प्रविष्टि)' : 'Not in list (Manual Entry)'}
            </label>
          </div>

          {isCustomCustomer ? (
            <Input
              type="text"
              placeholder={locale === 'hi' ? 'ग्राहक का नाम मैन्युअल रूप से दर्ज करें...' : 'Enter customer name manually...'}
              value={customCustomerName}
              onChange={(e) => setCustomCustomerName(e.target.value)}
              className="w-full"
            />
          ) : (
            <SearchableCustomerSelect
              customers={customers}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              placeholder={locale === 'hi' ? 'खोजने के लिए कोड या नाम टाइप करें...' : 'Type code or name to search...'}
            />
          )}
        </div>

        {/* Product Selector */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
          <div className="space-y-2 sm:col-span-2">
            <Label>{locale === 'hi' ? 'उत्पाद चुनें' : 'Select Product'}</Label>
            <SearchableProductSelect
              products={products}
              selectedIds={selectedProductIds}
              onChange={(ids) => setSelectedProductIds(ids)}
              placeholder={locale === 'hi' ? 'उत्पाद का नाम लिखें...' : 'Type product name to search...'}
              locale={locale}
            />
          </div>

          <Button
            type="button"
            onClick={handleAddProduct}
            disabled={selectedProductIds.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full h-9 sm:col-span-1"
          >
            {locale === 'hi' ? 'बिल में जोड़ें' : 'Add to Bill'}
          </Button>
        </div>

        {/* Cart items list with inner scroll */}
        {cart.length > 0 && (
          <div className="border border-slate-200/60 rounded-xl bg-white/40 max-h-48 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 font-semibold border-b sticky top-0">
                <tr>
                  <th className="px-3 py-2 bg-slate-50">{locale === 'hi' ? 'उत्पाद' : 'Item'}</th>
                  <th className="px-3 py-2 w-20 bg-slate-50">{locale === 'hi' ? 'दर' : 'Rate'}</th>
                  <th className="px-3 py-2 w-24 bg-slate-50">{locale === 'hi' ? 'मात्रा' : 'Qty'}</th>
                  <th className="px-3 py-2 w-24 text-right bg-slate-50">{locale === 'hi' ? 'कुल' : 'Total'}</th>
                  <th className="px-3 py-2 w-10 text-center bg-slate-50"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{item.product_name}</td>
                    <td className="px-3 py-2">Rs {item.price}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        min={1}
                        onChange={(e) => handleQuantityChange(item.product_id, Number(e.target.value))}
                        className="w-16 border rounded px-1.5 py-0.5"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">
                      Rs {(item.price * item.quantity).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(item.product_id)}
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sale_date">{locale === 'hi' ? 'बिक्री की तारीख' : 'Sale Date'}</Label>
            <Input id="sale_date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </div>

          <div className="flex flex-col justify-end">
            <div className="rounded-md bg-blue-50/50 p-2 text-center border border-blue-100">
              <span className="text-xs text-slate-500 block">{locale === 'hi' ? 'कुल योग' : 'Grand Total'}</span>
              <span className="text-lg font-bold text-blue-700">Rs {grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button
            type="button"
            onClick={handlePrintBillOnly}
            className="bg-slate-600 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm py-2 px-1"
          >
            {locale === 'hi' ? 'केवल प्रिंट करें' : 'Print Only'}
          </Button>

          <Button
            type="button"
            disabled={isLoading}
            onClick={handleRecordAndPrint}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold col-span-2 text-xs sm:text-sm py-2 px-1"
          >
            {isLoading
              ? (locale === 'hi' ? 'रिकॉर्ड किया जा रहा है...' : 'Recording...')
              : (locale === 'hi' ? 'रिकॉर्ड और प्रिंट' : 'Record & Print')}
          </Button>
        </div>
      </div>
    </div>
  )
}
