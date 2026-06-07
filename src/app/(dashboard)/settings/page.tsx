'use client'

import { useState, useEffect, useRef } from 'react'
import {
  getPrinterSettings,
  savePrinterSettings,
  generateTestHtml,
  printReceipt,
  type PrinterSettings
} from '@/lib/printer-service'
import { MilkPurchaseReceipt } from '@/components/receipts/MilkPurchaseReceipt'
import { MilkSaleReceipt } from '@/components/receipts/MilkSaleReceipt'
import { StoreSaleReceipt } from '@/components/receipts/StoreSaleReceipt'
import { PaymentReceipt } from '@/components/receipts/PaymentReceipt'
import { PassbookReceipt } from '@/components/receipts/PassbookReceipt'
import { dbGetAll, dbPut, openDB, STORES } from '@/lib/local-db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/LanguageContext'

// ── Backup / Restore helpers ──────────────────────────────────────────────────

const BACKUP_STORES = [
  STORES.customers,
  STORES.purchases,
  STORES.sales,
  STORES.payments,
  STORES.passbook,
  STORES.rate_charts,
  STORES.products,
  STORES.inventory,
] as const

async function createBackup(): Promise<void> {
  const backup: Record<string, any[]> = {
    _version: 1,
    _created_at: new Date().toISOString(),
    _app: 'Sharma Dairy ERP',
  } as any

  for (const store of BACKUP_STORES) {
    backup[store] = await dbGetAll(store)
  }

  // Backup MongoDB products
  try {
    const { getProducts } = await import('@/app/actions/inventory')
    const res = await getProducts()
    if (res && res.products) {
      backup[STORES.products] = res.products
    }
  } catch (e) {
    console.error('Failed to backup MongoDB products:', e)
  }

  // Backup local storage store sales
  if (typeof window !== 'undefined') {
    try {
      const localSales = localStorage.getItem('sharma_dairy_store_sales')
      if (localSales) {
        backup['_local_store_sales'] = JSON.parse(localSales)
      }
    } catch (e) {
      console.error('Failed to backup local store sales:', e)
    }
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.href = url
  link.download = `sharma-dairy-backup-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function mergeArrays(local: any[], remote: any[]): any[] {
  const map = new Map<string, any>()
  if (Array.isArray(remote)) {
    for (const item of remote) {
      if (item && item.id) map.set(item.id, item)
    }
  }
  if (Array.isArray(local)) {
    for (const item of local) {
      if (item && item.id) {
        const existing = map.get(item.id)
        if (!existing) {
          map.set(item.id, item)
        } else {
          const localTime = new Date(item.updated_at || item.created_at || item.sale_date || 0).getTime()
          const remoteTime = new Date(existing.updated_at || existing.created_at || existing.sale_date || 0).getTime()
          if (localTime >= remoteTime) {
            map.set(item.id, item)
          }
        }
      }
    }
  }
  return Array.from(map.values())
}

async function restoreBackup(file: File): Promise<{ restored: number; errors: string[] }> {
  const text = await file.text()
  const data = JSON.parse(text)
  let restored = 0
  const errors: string[] = []

  for (const store of BACKUP_STORES) {
    if (store === STORES.products) continue // Handled separately via MongoDB server actions below
    const records: any[] = data[store]
    if (!Array.isArray(records)) continue

    // Read local records first
    const localList = await dbGetAll(store)

    // Merge them using conflict resolution (local vs backup)
    const mergedList = mergeArrays(localList, records)

    for (const record of mergedList) {
      try {
        await dbPut(store, record)
        restored++
      } catch (e: any) {
        errors.push(`${store}: ${record.id ?? '?'} — ${e.message}`)
      }
    }
  }

  // Restore MongoDB products
  if (data[STORES.products] && Array.isArray(data[STORES.products])) {
    try {
      const { restoreProducts } = await import('@/app/actions/inventory')
      const res = await restoreProducts(data[STORES.products])
      if (res?.error) {
        errors.push(`MongoDB products: ${res.error}`)
      } else {
        restored += data[STORES.products].length
      }
    } catch (e: any) {
      errors.push(`MongoDB products: ${e.message}`)
    }
  }

  // Restore local storage store sales
  if (typeof window !== 'undefined' && data['_local_store_sales']) {
    try {
      const remoteSales = data['_local_store_sales']
      if (Array.isArray(remoteSales)) {
        const localSalesStr = localStorage.getItem('sharma_dairy_store_sales')
        const localSales = localSalesStr ? JSON.parse(localSalesStr) : []

        // Merge them using conflict resolution
        const map = new Map<string, any>()
        for (const item of remoteSales) {
          if (item && item.id) map.set(item.id, item)
        }
        for (const item of localSales) {
          if (item && item.id) {
            const existing = map.get(item.id)
            if (!existing) {
              map.set(item.id, item)
            } else {
              const localTime = new Date(item.updated_at || item.created_at || item.sale_date || 0).getTime()
              const remoteTime = new Date(existing.updated_at || existing.created_at || existing.sale_date || 0).getTime()
              if (localTime >= remoteTime) {
                map.set(item.id, item)
              }
            }
          }
        }
        const mergedSales = Array.from(map.values())
        localStorage.setItem('sharma_dairy_store_sales', JSON.stringify(mergedSales))
        restored += remoteSales.length
      }
    } catch (e) {
      console.error('Failed to restore local store sales:', e)
    }
  }

  return { restored, errors }
}

// ── Contact Card Component ───────────────────────────────────────────────────

function ContactCard({ hi }: { hi: boolean }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/80 p-5 shadow-xl backdrop-blur-xl space-y-4">
      <div className="border-b pb-2 flex justify-between items-start">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">
            🏢 {hi ? 'शर्मा डेयरी इक्विपमेंट्स' : 'Sharma Dairy Equipments'}
          </h3>
          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
            👤 {hi ? 'श्री मुकेश शर्मा' : 'Mr. Mukesh Sharma'}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="tel:9928653383"
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg border border-blue-100 transition-all flex items-center justify-center"
            title={hi ? "कॉल करें" : "Call"}
          >
            📞
          </a>
          <a
            href="https://wa.me/919928653383"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-2 rounded-lg border border-emerald-100 transition-all flex items-center justify-center"
            title={hi ? "व्हाट्सएप चैट" : "WhatsApp Chat"}
          >
            💬
          </a>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Phone Link Detail */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-500">{hi ? 'फ़ोन नंबर' : 'Phone'}</span>
          <a
            href="tel:9928653383"
            className="font-black text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-all"
          >
            +91 99286 53383
          </a>
        </div>

        {/* Address Link Detail */}
        <div className="space-y-1 pt-1.5 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500">{hi ? 'कार्यालय का पता' : 'Office Address'}</span>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Shop+No.+1,+Sukh+Sagar+Complex,+Maha+Mandir+Road,+Nagori+Gate,+Jodhpur,+Rajasthan"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[11px] text-slate-600 hover:text-blue-600 font-semibold leading-relaxed hover:underline underline-offset-2 transition-all p-2 rounded-xl bg-slate-50 border border-slate-100"
          >
            📍 {hi ? 'दुकान नं. 1, सुख सागर कॉम्प्लेक्स, महा मंदिर रोड, नागोरी गेट, जोधपुर, राजस्थान' : 'Shop No. 1, Sukh Sagar Complex, Maha Mandir Road, Nagori Gate, Jodhpur, Rajasthan'}
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Mock Data for Previews ───────────────────────────────────────────────────
const MOCK_PURCHASE = {
  id: '998877',
  purchase_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  shift: 'morning',
  milk_type: 'cow',
  quantity_liters: 10.0,
  fat_percentage: 4.0,
  snf_percentage: 8.0,
  rate_per_liter: 49.0,
  total_amount: 490.0,
  customers: {
    name: 'Murli',
    customer_code: 'M-001'
  }
}

const MOCK_SALE = {
  id: 'SALE-4433',
  sale_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  buyer_name: 'Jaidev Dairy S',
  milk_type: 'buffalo',
  quantity_liters: 25.0,
  rate_per_liter: 62.0,
  total_amount: 1550.0
}

const MOCK_PAYMENT = {
  id: 'PAY-8877',
  payment_date: new Date().toISOString(),
  amount: 12500.0,
  payment_type: 'settlement',
  payment_method: 'bank_transfer',
  reference_no: 'TXN102938',
  customers: {
    name: 'Murli Dhar',
    customer_code: 'M-102'
  }
}

const MOCK_STORE_SALE = {
  id: 'SALE-1029',
  sale_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  customerName: 'Murli Dhar',
  customerCode: 'M-102',
  total_amount: 1150.0,
  items: [
    { product_name: 'Cattle Feed', price_per_item: 450, quantity: 2, total_amount: 900 },
    { product_name: 'Mineral Mix', price_per_item: 250, quantity: 1, total_amount: 250 }
  ]
}

const MOCK_LEDGER = [
  {
    transaction_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    particulars: 'Morning Milk',
    credit_amount: 358,
    debit_amount: 0,
    running_balance: 358
  },
  {
    transaction_date: new Date(Date.now() - 86400000).toISOString(),
    particulars: 'Evening Milk',
    credit_amount: 412,
    debit_amount: 0,
    running_balance: 770
  },
  {
    transaction_date: new Date().toISOString(),
    particulars: 'Cash Payment',
    credit_amount: 0,
    debit_amount: 500,
    running_balance: 270
  }
]

const MOCK_CUSTOMER = {
  name: 'Murli Dhar',
  customer_code: 'M-102',
  village: 'Kalyanpura'
}

// ── Component ─────────────────────────────────────────────────────────────────


export default function SettingsPage() {
  const { locale } = useLanguage()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [settings, setSettings] = useState<PrinterSettings | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null)
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Preview States
  const [previewLang, setPreviewLang] = useState<'en' | 'hi' | null>(null)
  const [previewType, setPreviewType] = useState<'purchase' | 'sale' | 'payment' | 'passbook' | 'store_sale'>('purchase')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function verifyAuth() {
      const { getSessionUser } = await import('@/app/actions/auth')
      const currUser = await getSessionUser()
      if (currUser && (currUser.role === 'super_admin' || currUser.role === 'admin' || currUser.role === 'agent')) {
        setAuthorized(true)
      } else {
        setAuthorized(false)
      }
    }
    verifyAuth()
    setSettings(getPrinterSettings())
  }, [])

  useEffect(() => {
    document.title = locale === 'hi' ? 'सेटिंग्स | शर्मा डेयरी' : 'Settings | Sharma Dairy'
  }, [locale])

  // ── Backup / Restore Actions ────────────────────────────────────────────────
  async function handleBackup() {
    setBackupStatus(null)
    try {
      await createBackup()
      setBackupStatus({
        type: 'success',
        msg: locale === 'hi' ? 'डेटा बैकअप फ़ाइल सफलतापूर्वक डाउनलोड की गई।' : 'Local data backup file downloaded successfully.'
      })
    } catch (e: any) {
      setBackupStatus({
        type: 'error',
        msg: locale === 'hi' ? `बैकअप विफल: ${e.message}` : `Backup failed: ${e.message}`
      })
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsRestoring(true)
    setBackupStatus(null)
    try {
      const result = await restoreBackup(file)
      if (result.errors.length > 0) {
        setBackupStatus({
          type: 'error',
          msg: locale === 'hi'
            ? `आंशिक रिस्टोर: ${result.restored} रिकॉर्ड लोड हुए, ${result.errors.length} त्रुटियां।`
            : `Partial restore: loaded ${result.restored} records, ${result.errors.length} errors.`
        })
      } else {
        setBackupStatus({
          type: 'success',
          msg: locale === 'hi'
            ? `रिस्टोर पूरा हुआ! ${result.restored} रिकॉर्ड लोड किए गए।`
            : `Restore complete! Successfully loaded ${result.restored} records.`
        })
      }
    } catch (e: any) {
      setBackupStatus({
        type: 'error',
        msg: locale === 'hi' ? `रिस्टोर विफल: ${e.message}` : `Restore failed: ${e.message}`
      })
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Print Preview Auto-Update ──────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return
    const lang = settings.autoFollowAppLanguage ? (locale === 'hi' ? 'hi' : 'en') : (settings.receiptLanguage || 'en')
    setPreviewLang(lang)
  }, [settings?.autoFollowAppLanguage, settings?.receiptLanguage, locale])

  if (authorized === null) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-500 font-semibold animate-pulse">
        Verifying authorization…
      </div>
    )
  }

  if (authorized === false) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-sm text-slate-500">
          Only authorized staff can access the system configurations page.
        </p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-500 font-semibold animate-pulse">
        Loading settings…
      </div>
    )
  }

  // ── Printer ───────────────────────────────────────────────────────────────
  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    savePrinterSettings(settings)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  async function handleTestPrint() {
    if (!settings) return
    setTestResult(null)
    try {
      const html = generateTestHtml(settings, locale as 'en' | 'hi')
      await printReceipt(html)
      setTestResult({ success: true, msg: locale === 'hi' ? 'परीक्षण रसीद भेजी गई।' : 'Test receipt sent to printer.' })
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || 'Printing failed.' })
    }
    setTimeout(() => setTestResult(null), 5000)
  }

  function handleReset() {
    const defaults: PrinterSettings = {
      dairyName: 'SHARMA DAIRY',
      dairySubtitle: 'Milk Collection Center',
      dairyPhone: '+91 98765 43210',
      connectionType: 'system',
      autoPrintAfterSave: false,
      paperWidth: '58mm',
      copies: 1,
      paperFeedAfterPrint: 3,
      receiptLanguage: 'en',
      autoFollowAppLanguage: true,
      supportsHindi: true,
    }
    setSettings(defaults)
    savePrinterSettings(defaults)
    setIsSaved(true)
    setPreviewLang(null)
    setTimeout(() => setIsSaved(false), 2000)
  }

  function handleShowPreview(lang: 'en' | 'hi') {
    setPreviewLang(lang)
  }

  const hi = locale === 'hi'

  return (
    <div className="h-full flex flex-col space-y-4 md:h-[calc(100vh-7.5rem)] md:overflow-hidden select-none">
      {(isSaved || testResult) && (
        <div className="flex flex-col gap-2 shrink-0">
          {isSaved && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-bold shadow-sm animate-in fade-in duration-200">
              ✓ {hi ? 'प्रिंटर सेटिंग्स सफलतापूर्वक सहेजी गईं!' : 'Printer configurations saved successfully!'}
            </div>
          )}
          {testResult && (
            <div className={`rounded-xl border p-3 text-xs font-bold shadow-sm animate-in fade-in duration-200 ${testResult.success ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}>
              {testResult.success ? '🖨️' : '⚠️'} {testResult.msg}
            </div>
          )}
        </div>
      )}

      {/* 2-Column Responsive Layout - scrollable parent container for a unified scrollbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 overflow-y-auto pr-1 pb-6 scrollbar-thin items-stretch">

        {/* Left Column (50% Width) - Backup, Preview, Language */}
        <div className="flex flex-col space-y-4 md:space-y-0 md:grid md:grid-rows-[auto_1fr_auto_auto] md:gap-4 h-full">

          {/* Data Backup & Restore */}
          <div className="rounded-2xl border border-white/40 bg-white/80 p-5 shadow-xl backdrop-blur-xl space-y-4">
            <div className="border-b pb-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                💾 {hi ? 'डेटा बैकअप और रिस्टोर' : 'Data Backup & Restore'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                {hi
                  ? 'सभी ग्राहक, खरीद, बिक्री, भुगतान और रेट चार्ट का बैकअप डाउनलोड करें। फ़ाइल से पुराना डेटा वापस लोड करें।'
                  : 'Download a backup of all customers, purchases, sales, payments, passbook and rate charts. Upload the backup file to restore previous data.'}
              </p>
            </div>

            {/* Status banner */}
            {backupStatus && (
              <div className={`rounded-xl border p-3 text-xs font-semibold animate-in fade-in duration-200 ${backupStatus.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                  backupStatus.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                    'border-blue-200 bg-blue-50 text-blue-700'
                }`}>
                {backupStatus.msg}
              </div>
            )}

            {/* Action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Download Backup */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 flex flex-col justify-between gap-3">
                <div>
                  <p className="font-bold text-emerald-800 text-sm">⬇️ {hi ? 'बैकअप डाउनलोड' : 'Download Backup'}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    {hi ? 'सभी स्थानीय डेटा एक JSON फ़ाइल में डाउनलोड होगी।' : 'All local data exports to a single .json file.'}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleBackup}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 shadow-sm text-xs h-8"
                >
                  💾 {hi ? 'बैकअप लें' : 'Take Backup'}
                </Button>
              </div>

              {/* Upload Restore */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col justify-between gap-3">
                <div>
                  <p className="font-bold text-blue-800 text-sm">⬆️ {hi ? 'बैकअप से रिस्टोर' : 'Restore from Backup'}</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    {hi ? 'पहले से डाउनलोड .json बैकअप फ़ाइल अपलोड करें।' : 'Select a previously downloaded .json backup file to restore.'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestore}
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 shadow-sm disabled:opacity-60 text-xs h-8"
                >
                  {isRestoring
                    ? (hi ? '⏳ रिस्टोर हो रहा है…' : '⏳ Restoring…')
                    : (hi ? '📂 बैकअप अपलोड करें' : '📂 Upload Backup')}
                </Button>
              </div>
            </div>
          </div>

          {/* Receipt Print Preview Block */}
          {settings && (
            <div className="rounded-2xl border border-slate-200 bg-slate-100/50 p-4 shadow-md space-y-3 animate-in zoom-in-95 duration-200 flex-1 flex flex-col">
              <div className="flex justify-between items-center border-b pb-1.5">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>📝</span>
                  <span>
                    {previewType === 'purchase' ? (hi ? 'दूध खरीद रसीद पूर्वावलोकन' : 'Milk Purchase Receipt Preview') :
                      previewType === 'sale' ? (hi ? 'दूध बिक्री रसीद पूर्वावलोकन' : 'Milk Sales Receipt Preview') :
                        previewType === 'store_sale' ? (hi ? 'स्टोर बिक्री रसीद पूर्वावलोकन' : 'Store Sale Receipt Preview') :
                          previewType === 'payment' ? (hi ? 'भुगतान रसीद पूर्वावलोकन' : 'Payment Receipt Preview') :
                            (hi ? 'पासबुक विवरण पूर्वावलोकन' : 'Passbook Ledger Preview')}
                    {` (${(previewLang || settings.receiptLanguage || 'en') === 'hi' ? 'हिन्दी' : 'English'})`}
                  </span>
                </h3>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded uppercase">
                  {settings.paperWidth}
                </span>
              </div>

              {/* Receipt Type Selector */}
              <div className="space-y-1">
                <Label htmlFor="previewTypeSelect" className="text-xs font-bold text-slate-600">
                  {hi ? 'रसीद का प्रकार' : 'Receipt Type'}
                </Label>
                <select
                  id="previewTypeSelect"
                  value={previewType}
                  onChange={(e: any) => setPreviewType(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs shadow-xs focus:outline-none font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="purchase">🥛 {hi ? 'दूध खरीद (Milk Purchase)' : 'Milk Purchase'}</option>
                  <option value="sale">🏪 {hi ? 'दूध बिक्री (Milk Sale)' : 'Milk Sale'}</option>
                  <option value="store_sale">🛒 {hi ? 'स्टोर बिक्री (Store Sale)' : 'Store Sale'}</option>
                  <option value="payment">💸 {hi ? 'भुगतान (Payment)' : 'Payment'}</option>
                  <option value="passbook">📖 {hi ? 'पासबुक (Passbook)' : 'Passbook'}</option>
                </select>
              </div>

              {/* Simulated Monospace Receipt Container */}
              <div className="flex-1 flex justify-center items-start min-w-0 bg-slate-200/20 rounded-xl p-4 border border-slate-200/50 max-h-[350px] overflow-y-auto scrollbar-thin">
                <div
                  className="bg-white border border-slate-300 shadow-lg px-0 py-3 overflow-hidden transition-all duration-300"
                  style={{
                    width: settings.paperWidth === '58mm' ? '58mm' : '80mm',
                    height: 'auto',
                    boxSizing: 'content-box',
                  }}
                >
                  {previewType === 'purchase' && (
                    <MilkPurchaseReceipt
                      data={MOCK_PURCHASE}
                      settings={settings}
                      locale={previewLang || 'en'}
                    />
                  )}
                  {previewType === 'sale' && (
                    <MilkSaleReceipt
                      data={MOCK_SALE}
                      settings={settings}
                      locale={previewLang || 'en'}
                    />
                  )}
                  {previewType === 'store_sale' && (
                    <StoreSaleReceipt
                      data={MOCK_STORE_SALE}
                      settings={settings}
                      locale={previewLang || 'en'}
                    />
                  )}
                  {previewType === 'payment' && (
                    <PaymentReceipt
                      data={MOCK_PAYMENT}
                      settings={settings}
                      locale={previewLang || 'en'}
                    />
                  )}
                  {previewType === 'passbook' && (
                    <PassbookReceipt
                      data={{ ledger: MOCK_LEDGER, customer: MOCK_CUSTOMER }}
                      settings={settings}
                      locale={previewLang || 'en'}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Receipt Language Settings Card */}
          <div className="rounded-2xl border border-white/40 bg-white/80 p-5 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                🌐 {hi ? 'रसीद मुद्रण भाषा' : 'Receipt Print Language Settings'}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewLang(previewLang === 'hi' ? 'en' : 'hi')}
                className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold h-7 px-2.5 shadow-sm shrink-0 cursor-pointer"
              >
                📄 {hi ? 'पूर्वावलोकन: ' : 'Preview: '}{previewLang === 'hi' ? (hi ? 'हिन्दी' : 'Hindi') : 'English'}
              </Button>
            </div>

            <div className="flex flex-col gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoFollowAppLanguage"
                  checked={settings.autoFollowAppLanguage}
                  onChange={(e) => setSettings({ ...settings, autoFollowAppLanguage: e.target.checked })}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <Label htmlFor="autoFollowAppLanguage" className="cursor-pointer font-bold text-slate-700 text-xs">
                  🔄 {hi ? 'ऐप भाषा का पालन करें (ऑटो)' : 'Auto Follow App Language'}
                </Label>
              </div>

              {!settings.autoFollowAppLanguage && (
                <div className="flex gap-4 pt-2 pl-6 border-t border-slate-200/60 mt-1 animate-in slide-in-from-top-1 duration-200">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="receiptLanguage"
                      value="en"
                      checked={settings.receiptLanguage === 'en'}
                      onChange={() => setSettings({ ...settings, receiptLanguage: 'en' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span>English</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="receiptLanguage"
                      value="hi"
                      checked={settings.receiptLanguage === 'hi'}
                      onChange={() => setSettings({ ...settings, receiptLanguage: 'hi' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <span>हिन्दी</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Contact Card (Desktop - below language settings) */}
          <div className="hidden md:block">
            <ContactCard hi={hi} />
          </div>
        </div>

        {/* Right Column (50% Width) - Form Settings Cards */}
        <form onSubmit={handleSave} className="flex flex-col space-y-4 md:space-y-0 md:grid md:grid-rows-[auto_1fr_auto] md:gap-4 h-full">

          {/* Card 1: Thermal Printer Settings (Shop customisation) */}
          <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl space-y-4">
            <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5 text-sm">
              🖨️ {hi ? 'थर्मल प्रिंटर सेटिंग्स' : 'Thermal Printer Settings'}
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="dairyName" className="text-xs font-bold text-slate-700">{hi ? 'डेयरी / दुकान का नाम' : 'Dairy / Shop Name'}</Label>
                <Input id="dairyName" value={settings.dairyName}
                  onChange={(e) => setSettings({ ...settings, dairyName: e.target.value })}
                  className="bg-white/50 border-slate-200 font-bold text-blue-700 text-sm uppercase h-8"
                  placeholder="SHARMA DAIRY" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dairySubtitle" className="text-xs font-bold text-slate-700">{hi ? 'रसीद उपशीर्षक' : 'Receipt Subtitle'}</Label>
                <Input id="dairySubtitle" value={settings.dairySubtitle}
                  onChange={(e) => setSettings({ ...settings, dairySubtitle: e.target.value })}
                  className="bg-white/50 border-slate-200 h-8 text-xs" placeholder="Milk Collection Center" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dairyPhone" className="text-xs font-bold text-slate-700">{hi ? 'फोन नंबर' : 'Phone Number'}</Label>
                <Input id="dairyPhone" value={settings.dairyPhone}
                  onChange={(e) => setSettings({ ...settings, dairyPhone: e.target.value })}
                  className="bg-white/50 border-slate-200 h-8 text-xs" placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>

          {/* Card 2: Hardware Configurations */}
          <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl space-y-4 flex-1">
            <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5 text-sm">
              🔧 {hi ? 'हार्डवेयर कॉन्फ़िगरेशन' : 'Hardware Configurations'}
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="connectionType" className="text-xs font-bold text-slate-700">{hi ? 'कनेक्शन प्रकार' : 'Connection Type'}</Label>
                <select id="connectionType" value={settings.connectionType}
                  onChange={(e: any) => setSettings({ ...settings, connectionType: e.target.value })}
                  className="flex h-8 w-full rounded-md border border-slate-200 bg-white/50 px-2 py-0.5 text-xs shadow-xs focus:outline-none font-semibold text-slate-700 cursor-pointer">
                  <option value="system">🖥️ {hi ? 'सिस्टम प्रिंट (Browser)' : 'System print (window)'}</option>
                  <option value="bluetooth">📶 {hi ? 'ब्लूटूथ (Web Bluetooth)' : 'Bluetooth (GATT)'}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="paperWidth" className="text-xs font-bold text-slate-700">{hi ? 'कागज की चौड़ाई' : 'Paper Roll Width'}</Label>
                <select id="paperWidth" value={settings.paperWidth}
                  onChange={(e: any) => setSettings({ ...settings, paperWidth: e.target.value })}
                  className="flex h-8 w-full rounded-md border border-slate-200 bg-white/50 px-2 py-0.5 text-xs shadow-xs focus:outline-none font-semibold text-slate-700 cursor-pointer">
                  <option value="58mm">58mm {hi ? '(मानक थर्मल)' : '(Standard 32 cols)'}</option>
                  <option value="80mm">80mm {hi ? '(चौड़ा बिल)' : '(Wide 48 cols)'}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="paperFeed" className="text-xs font-bold text-slate-700">{hi ? 'प्रिंट के बाद कागज फीड' : 'Paper Feed After Print'}</Label>
                <select id="paperFeed" value={settings.paperFeedAfterPrint}
                  onChange={(e: any) => setSettings({ ...settings, paperFeedAfterPrint: parseInt(e.target.value) as any })}
                  className="flex h-8 w-full rounded-md border border-slate-200 bg-white/50 px-2 py-0.5 text-xs shadow-xs focus:outline-none font-semibold text-slate-700 cursor-pointer">
                  <option value={0}>0 mm</option>
                  <option value={3}>3 mm ({hi ? 'अनुशंसित' : 'Recommended'})</option>
                  <option value={5}>5 mm</option>
                  <option value={10}>10 mm</option>
                  <option value={15}>15 mm</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="copies" className="text-xs font-bold text-slate-700">{hi ? 'प्रतियां' : 'Number of Copies'}</Label>
                <Input id="copies" type="number" min="1" max="5" value={settings.copies}
                  onChange={(e) => setSettings({ ...settings, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="bg-white/50 border-slate-200 font-semibold h-8 text-xs" />
              </div>

              {/* Auto-print Toggle */}
              <div className="flex items-center space-x-2.5 pt-2.5 border-t">
                <input type="checkbox" id="autoPrint" checked={settings.autoPrintAfterSave}
                  onChange={(e) => setSettings({ ...settings, autoPrintAfterSave: e.target.checked })}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <Label htmlFor="autoPrint" className="cursor-pointer font-bold text-slate-700 text-xs">
                  ⚡ {hi ? 'सहेजने के बाद ऑटो-प्रिंट' : 'Auto-Print Receipts on Save'}
                </Label>
              </div>

              {/* Unicode Hindi support fallback configuration */}
              <div className="flex flex-col gap-1.5 pt-2.5 border-t">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="supportsHindi"
                    checked={settings.supportsHindi}
                    onChange={(e) => setSettings({ ...settings, supportsHindi: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <Label htmlFor="supportsHindi" className="cursor-pointer font-bold text-slate-700 text-xs">
                    🔤 {hi ? 'प्रिंटर हिन्दी अक्षर समर्थन' : 'Printer Supports Hindi Characters'}
                  </Label>
                </div>
                <p className="text-[10px] text-slate-400 pl-7 leading-relaxed italic">
                  {hi
                    ? '*यदि ब्लूटूथ प्रिंटर हिन्दी भाषा प्रिंट नहीं कर सकता, तो इसे बंद कर दें। बंद करने पर हिन्दी रसीदें अंग्रेजी लेबल में प्रिंट होंगी।'
                    : '*Turn off if your Bluetooth printer spits out garbage (????) for Hindi. When off, translations automatically fallback to English.'}
                </p>
              </div>
            </div>
          </div>

          {/* Save Config Actions - naturally positioned below hardware config card */}
          <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl flex flex-col gap-3">
            <Button type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-2 shadow-md h-9 text-xs">
              💾 {hi ? 'सेटिंग्स सहेजें' : 'Save Config'}
            </Button>
            <Button type="button" variant="outline" onClick={handleTestPrint}
              className="w-full border-blue-200 hover:bg-blue-50/50 text-blue-700 font-bold py-2 bg-white/40 h-9 text-xs">
              🖨️ {hi ? 'टेस्ट प्रिंट भेजें' : 'Send Test Print'}
            </Button>
            <button type="button" onClick={handleReset}
              className="text-xs text-rose-500 hover:text-rose-700 font-bold transition-all text-center py-1 mt-1">
              🔄 {hi ? 'डिफ़ॉल्ट पर रीसेट करें' : 'Reset to Defaults'}
            </button>
          </div>
          {/* Contact Card (Mobile - bottom of settings page) */}
          <div className="block md:hidden pb-4">
            <ContactCard hi={hi} />
          </div>
        </form>

        {/* Footer */}
        <div className="col-span-1 md:col-span-2 text-center text-[10px] text-slate-400/80 font-bold tracking-wider py-4 uppercase mt-4">
          Designed and Developed by{' '}
          <a
            href="https://www.linkedin.com/in/murlisoni/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 hover:underline transition-all"
          >
            MURLI MANOHAR SONI
          </a>
        </div>
      </div>
    </div>
  )
}
