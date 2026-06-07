// Sharma Dairy Milk Collection ERP — Thermal Printer Service
// Bilingual (English / Hindi) fixed-width receipt for 58mm thermal paper
// Currency: Rs. (not ₹) for universal thermal printer encoding compatibility
// Character width: 32 chars @ Courier New 10px

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MilkPurchaseReceipt } from '@/components/receipts/MilkPurchaseReceipt'
import { MilkSaleReceipt } from '@/components/receipts/MilkSaleReceipt'
import { StoreSaleReceipt } from '@/components/receipts/StoreSaleReceipt'
import { PaymentReceipt } from '@/components/receipts/PaymentReceipt'
import { PassbookReceipt } from '@/components/receipts/PassbookReceipt'


export interface PrinterSettings {
  dairyName: string
  dairySubtitle: string
  dairyPhone: string
  connectionType: 'system' | 'bluetooth'
  autoPrintAfterSave: boolean
  paperWidth: '58mm' | '80mm'
  copies: number
  paperFeedAfterPrint: 0 | 3 | 5 | 10 | 15
  receiptLanguage: 'en' | 'hi'
  autoFollowAppLanguage: boolean
  supportsHindi: boolean // True if printer hardware supports Hindi
}

const DEFAULT_SETTINGS: PrinterSettings = {
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

// ─── Settings helpers ────────────────────────────────────────────────────────

export function getPrinterSettings(): PrinterSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem('sharma_dairy_printer_settings')
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
  } catch (e) {
    console.error('Failed to read printer settings', e)
  }
  return DEFAULT_SETTINGS
}

export function savePrinterSettings(settings: PrinterSettings): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem('sharma_dairy_printer_settings', JSON.stringify(settings))
    return true
  } catch (e) {
    console.error('Failed to save printer settings', e)
    return false
  }
}

// Helper to determine active receipt printing language based on app language
export function getReceiptLocale(settings: PrinterSettings, appLocale: 'en' | 'hi'): 'en' | 'hi' {
  if (settings.autoFollowAppLanguage ?? true) {
    return appLocale
  }
  return settings.receiptLanguage || 'en'
}

// ─── Bilingual label dictionary ──────────────────────────────────────────────

type Locale = 'en' | 'hi'

const L: Record<string, Record<Locale, string>> = {
  // Header
  milkCenter: { en: 'Milk Collection Center', hi: 'दूध संग्रह केंद्र' },
  phone: { en: 'Ph', hi: 'फोन' },
  miniStatement: { en: 'Mini Statement', hi: 'मिनी पासबुक' },
  printerTest: { en: 'PRINTER TEST', hi: 'प्रिंटर परीक्षण' },
  testOk: { en: 'TEST OK', hi: 'परीक्षण सफल' },
  // Purchase receipt
  date: { en: 'Date', hi: 'दिनांक' },
  time: { en: 'Time', hi: 'समय' },
  customer: { en: 'Customer', hi: 'ग्राहक' },
  code: { en: 'Code', hi: 'कोड' },
  milkType: { en: 'Milk Type', hi: 'दूध प्रकार' },
  shift: { en: 'Shift', hi: 'पाली' },
  qty: { en: 'Qty', hi: 'मात्रा' },
  fat: { en: 'Fat', hi: 'फैट' },
  snf: { en: 'SNF', hi: 'एसएनएफ' },
  rate: { en: 'Rate', hi: 'दर' },
  amount: { en: 'Amount', hi: 'राशि' },
  // Payment receipt
  invoiceNo: { en: 'Invoice No', hi: 'चालान क्र.' },
  paidTo: { en: 'Paid To', hi: 'प्राप्तकर्ता' },
  payType: { en: 'Pay Type', hi: 'भुगतान प्रकार' },
  method: { en: 'Method', hi: 'माध्यम' },
  refNo: { en: 'Ref No', hi: 'संदर्भ क्र.' },
  // Sale receipt
  buyer: { en: 'Buyer', hi: 'खरीदार' },
  qtySold: { en: 'Qty Sold', hi: 'बेची मात्रा' },
  // Passbook
  village: { en: 'Village', hi: 'गांव' },
  netDue: { en: 'Net Due', hi: 'कुल बकाया' },
  // Passbook table header cols
  pbDate: { en: 'Date', hi: 'तारीख' },
  pbParticulars: { en: 'Entry', hi: 'प्रविष्टि' },
  pbAmt: { en: 'Amt', hi: 'राशि' },
  pbBal: { en: 'Bal', hi: 'शेष' },
  // Settings test
  grandTotal: { en: 'Grand Total', hi: 'कुल राशि' },
  paper: { en: 'Paper', hi: 'कागज' },
  mode: { en: 'Mode', hi: 'मोड' },
  copies: { en: 'Copies', hi: 'प्रतियां' },
  autoPrint: { en: 'Auto Print', hi: 'ऑटो प्रिंट' },
}

/** Translate a key to the given locale, with fallback to English if supportsHindi is false */
function tr(key: string, locale: Locale, settings?: PrinterSettings): string {
  const targetLocale = (settings && !settings.supportsHindi) ? 'en' : locale
  return L[key]?.[targetLocale] ?? L[key]?.['en'] ?? key
}

// Milk type localisation
const MILK_TYPE: Record<string, Record<Locale, string>> = {
  cow: { en: 'Cow', hi: 'गाय' },
  buffalo: { en: 'Buffalo', hi: 'भैंस' },
  mixed: { en: 'Mixed', hi: 'मिश्रित' },
}

// Shift localisation
const SHIFT: Record<string, Record<Locale, string>> = {
  morning: { en: 'Morning', hi: 'सुबह' },
  evening: { en: 'Evening', hi: 'शाम' },
}

function localMilkType(raw: string, locale: Locale, settings?: PrinterSettings): string {
  const key = String(raw || 'cow').toLowerCase()
  const targetLocale = (settings && !settings.supportsHindi) ? 'en' : locale
  return MILK_TYPE[key]?.[targetLocale] ?? MILK_TYPE[key]?.['en'] ?? raw
}

function localShift(raw: string, locale: Locale, settings?: PrinterSettings): string {
  const key = String(raw || 'morning').toLowerCase()
  const targetLocale = (settings && !settings.supportsHindi) ? 'en' : locale
  return SHIFT[key]?.[targetLocale] ?? SHIFT[key]?.['en'] ?? raw
}

// ─── Fixed-width text helpers ────────────────────────────────────────────────

// Computes the visual character cell width of Hindi/English text in monospace fonts
export function getVisualWidth(text: string): number {
  let width = 0
  const combiningRegex = /[\u0901\u0902\u0903\u093c\u093e\u093f\u0940-\u094c\u094d\u0951-\u0957\u0962\u0963]/

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (combiningRegex.test(char)) {
      continue
    }
    // Zero width if combining consonant conjunct
    if (i > 0 && text[i - 1] === '\u094d' && char >= '\u0900' && char <= '\u097f') {
      continue
    }
    width++
  }
  return width
}

// Right pad text taking Unicode visual cell counts into account
export function padEndVisual(text: string, targetWidth: number): string {
  const vWidth = getVisualWidth(text)
  if (vWidth >= targetWidth) return text
  return text + ' '.repeat(targetWidth - vWidth)
}

function lineWidth(paperWidth: '58mm' | '80mm') {
  return paperWidth === '58mm' ? 32 : 48
}

function sep(char: '=' | '-', width: number) {
  return char.repeat(width)
}

function centre(text: string, width: number) {
  const vWidth = getVisualWidth(text)
  if (vWidth >= width) return text.slice(0, width)
  const pad = Math.floor((width - vWidth) / 2)
  return ' '.repeat(pad) + text
}

/**
 * Two-column row — label fixed to 10 chars, then " : ", then value.
 * Uses getVisualWidth to maintain correct spacing with diacritics.
 */
function row(label: string, value: string, width: number) {
  return rowCustom(label, value, 9, width)
}

export function rowCustom(label: string, value: string, padWidth: number, width: number) {
  const labelWidth = getVisualWidth(label)
  const valStr = String(value)
  const valWidth = getVisualWidth(valStr)

  // Ideal padding is padWidth
  let currentPad = padWidth

  // If label + ": " + value exceeds width, reduce padding but keep at least labelWidth
  if (currentPad + 2 + valWidth > width) {
    const neededPad = width - 2 - valWidth
    currentPad = Math.max(labelWidth, neededPad)
  }

  const padded = padEndVisual(label, currentPad)
  const available = width - currentPad - 2
  const val = valStr.slice(0, available)
  return `${padded}: ${val}`
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  } catch {
    return dateStr
  }
}

function fmtTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
}

/** Currency — Rs. (ASCII-safe, works on all thermal encodings) */
function cur(amount: number): string {
  return 'Rs.' + amount.toFixed(2)
}

// ─── Receipt builders ─────────────────────────────────────────────────────────

export function buildPurchaseText(purchase: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const W = lineWidth(settings.paperWidth)
  const EQ = sep('=', W)
  const DA = sep('-', W)

  const customerName = purchase.customers?.name || purchase.customerName || 'Farmer'
  const customerCode = purchase.customers?.customer_code || purchase.customerCode || 'N/A'
  const dateStr = fmtDate(purchase.purchase_date || new Date().toISOString())
  const timeStr = fmtTime(purchase.created_at || new Date().toISOString())
  const milkType = localMilkType(purchase.milk_type, locale, settings)
  const shift = localShift(purchase.shift, locale, settings)
  const qty = Number(purchase.quantity_liters || 0).toFixed(2) + ' L'
  const fat = Number(purchase.fat_percentage || 0).toFixed(1)
  const snf = Number(purchase.snf_percentage || 0).toFixed(1)
  const rate = cur(Number(purchase.rate_per_liter || 0))
  const amount = cur(Number(purchase.total_amount || 0))

  return [
    EQ,
    centre(settings.dairyName, W),
    centre(settings.dairySubtitle, W),
    centre(tr('phone', locale, settings) + ': ' + settings.dairyPhone, W),
    EQ,
    rowCustom(tr('date', locale, settings), dateStr + ' ' + timeStr, 6, W),
    rowCustom(tr('code', locale, settings), customerCode, 11, W),
    rowCustom(tr('customer', locale, settings), customerName, 11, W),
    rowCustom(tr('milkType', locale, settings), milkType + ', ' + shift, 11, W),
    rowCustom(tr('qty', locale, settings), qty, 11, W),
    rowCustom(tr('fat', locale, settings), fat, 11, W),
    rowCustom(tr('snf', locale, settings), snf, 11, W),
    rowCustom(tr('rate', locale, settings), rate, 11, W),
    DA,
    rowCustom(tr('amount', locale, settings), amount, 11, W),
  ].join('\n')
}

export function buildPaymentText(payment: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const W = lineWidth(settings.paperWidth)
  const EQ = sep('=', W)
  const DA = sep('-', W)

  const customerName = payment.customers?.name || payment.customerName || 'Farmer'
  const customerCode = payment.customers?.customer_code || payment.customerCode || 'N/A'
  const dateStr = fmtDate(payment.payment_date || new Date().toISOString())
  const timeStr = fmtTime(payment.created_at || new Date().toISOString())
  const payMethod = String(payment.payment_method || 'cash').toUpperCase()
  const amount = cur(Number(payment.amount || 0))

  return [
    EQ,
    centre(settings.dairyName, W),
    centre(settings.dairySubtitle, W),
    centre(tr('phone', locale, settings) + ': ' + settings.dairyPhone, W),
    EQ,
    rowCustom(tr('date', locale, settings), dateStr + ' ' + timeStr, 6, W),
    rowCustom(tr('paidTo', locale, settings), customerName, 11, W),
    rowCustom(tr('code', locale, settings), customerCode, 11, W),
    rowCustom(tr('method', locale, settings), payMethod, 11, W),
    ...(payment.reference_no ? [rowCustom(tr('refNo', locale, settings), payment.reference_no, 11, W)] : []),
    DA,
    rowCustom(tr('amount', locale, settings), amount, 11, W),
  ].join('\n')
}

export function buildSaleText(sale: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const W = lineWidth(settings.paperWidth)
  const EQ = sep('=', W)
  const DA = sep('-', W)

  const buyerName = sale.buyer_name || 'Buyer'
  const dateStr = fmtDate(sale.sale_date || new Date().toISOString())
  const timeStr = fmtTime(sale.created_at || new Date().toISOString())
  const milkType = localMilkType(sale.milk_type, locale, settings)
  const qty = Number(sale.quantity_liters || 0).toFixed(2) + ' L'
  const rate = cur(Number(sale.rate_per_liter || 0))
  const amount = cur(Number(sale.total_amount || 0))

  return [
    EQ,
    centre(settings.dairyName, W),
    centre(settings.dairySubtitle, W),
    centre(tr('phone', locale, settings) + ': ' + settings.dairyPhone, W),
    EQ,
    rowCustom(tr('date', locale, settings), dateStr + ' ' + timeStr, 6, W),
    rowCustom(tr('buyer', locale, settings), buyerName, 11, W),
    rowCustom(tr('milkType', locale, settings), milkType, 11, W),
    rowCustom(tr('qtySold', locale, settings), qty, 11, W),
    rowCustom(tr('rate', locale, settings), rate, 11, W),
    DA,
    rowCustom(tr('amount', locale, settings), amount, 11, W),
  ].join('\n')
}

export function buildStoreSaleText(sale: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const W = lineWidth(settings.paperWidth)
  const EQ = sep('=', W)
  const DA = sep('-', W)

  const customerName = sale.customerName || sale.customers?.name || 'Guest Customer'
  const customerCode = sale.customerCode || sale.customers?.customer_code || 'WALK-IN'
  const dateStr = fmtDate(sale.sale_date || new Date().toISOString())
  const timeStr = fmtTime(sale.created_at || new Date().toISOString())

  const items = sale.items || []
  const grandTotal = sale.total_amount || 0

  // Label variables
  const labelItem = locale === 'en' ? 'Items' : tr('pbParticulars', locale, settings)
  const labelRat = locale === 'en' ? 'Rate' : tr('rate', locale, settings)
  const labelQty = tr('qty', locale, settings)
  const labelAmt = locale === 'en' ? 'Total' : (locale === 'hi' ? 'कुल' : tr('amount', locale, settings))

  // Align column headers to exactly 32 chars: 12 + 7 + 5 + 8 = 32
  const colItem = padEndVisual(labelItem, 12)
  const colRat = padEndVisual(labelRat, 7)
  const colQty = padEndVisual(labelQty, 5)
  const colAmt = labelAmt.padStart(8, ' ')
  const tableHeader = `${colItem}${colRat}${colQty}${colAmt}`

  const isHi = locale === 'hi'
  const datePad = isHi ? 7 : 6

  let output = [
    EQ,
    centre(settings.dairyName, W),
    centre(settings.dairySubtitle, W),
    centre(tr('phone', locale, settings) + ': ' + settings.dairyPhone, W),
    EQ,
    rowCustom(tr('date', locale, settings), dateStr + ' ' + timeStr, datePad, W),
    rowCustom(tr('code', locale, settings), customerCode, 11, W),
    rowCustom(tr('customer', locale, settings), customerName, 11, W),
    DA,
    tableHeader,
    DA,
  ]

  items.forEach((item: any) => {
    const namePart = padEndVisual(String(item.product_name || item.name || '').slice(0, 12), 12)
    const ratePart = `Rs.${Number(item.price_per_item || item.price || 0).toFixed(0)}`.padStart(7, ' ')
    const qtyPart = `${item.quantity}`.padStart(5, ' ')
    const totalPart = `${Number(item.total_amount || item.total || 0).toFixed(0)}`.padStart(8, ' ')
    output.push(`${namePart}${ratePart}${qtyPart}${totalPart}`)
  })

  output.push(DA)
  output.push(rowCustom(tr('grandTotal', locale, settings), cur(grandTotal), 11, W))

  return output.join('\n')
}

export function buildPassbookText(ledger: any[], customer: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const W = lineWidth(settings.paperWidth)
  const EQ = sep('=', W)
  const DA = sep('-', W)

  const custName = customer?.name || 'N/A'
  const custCode = customer?.customer_code || 'N/A'
  const village = customer?.village || ''
  const today = fmtDate(new Date().toISOString()) + ' ' + fmtTime(new Date().toISOString())

  // Dynamically aligned Passbook headers using padEndVisual to exactly 32 chars: 5 + 1 + 10 + 2 + 6 + 2 + 6 = 32
  const colDate = padEndVisual(tr('pbDate', locale, settings), 5)
  const colPart = padEndVisual(locale === 'en' ? 'Entry' : tr('pbParticulars', locale, settings), 10)
  const colAmt = (locale === 'en' ? 'Amt' : tr('pbAmt', locale, settings)).padStart(6, ' ')
  const colBal = (locale === 'en' ? 'Bal' : tr('pbBal', locale, settings)).padStart(6, ' ')
  const pbHeader = `${colDate} ${colPart}  ${colAmt}  ${colBal}`

  const ledgerLines = ledger.map(r => {
    const d = new Date(r.transaction_date)
    const dateLabel = String(d.getDate()).padStart(2, '0') + '/' +
      String(d.getMonth() + 1).padStart(2, '0')
    const dateCol = padEndVisual(dateLabel, 5)
    
    // Particulars/entry padded to 10
    const particulars = padEndVisual(String(r.particulars || r.entry || '').slice(0, 10), 10)
    
    // Amount with sign (+/-) padded to 6
    const credit = Number(r.credit_amount || 0)
    const debit = Number(r.debit_amount || 0)
    const amtVal = credit > 0
      ? ('+' + credit.toFixed(0))
      : (debit > 0 ? ('-' + debit.toFixed(0)) : '0')
    const amtCol = amtVal.padStart(6, ' ')
    
    // Running balance padded to 6
    const balVal = Number(r.running_balance || 0).toFixed(0)
    const balCol = balVal.padStart(6, ' ')
    
    return `${dateCol} ${particulars}  ${amtCol}  ${balCol}`
  })

  const net = ledger.length > 0 ? ledger[ledger.length - 1].running_balance : 0
  const netFormatted = cur(Number(net))

  return [
    EQ,
    centre(settings.dairyName, W),
    centre(tr('miniStatement', locale, settings), W),
    EQ,
    rowCustom(tr('customer', locale, settings), custName, 11, W),
    rowCustom(tr('code', locale, settings), custCode, 11, W),
    ...(village ? [rowCustom(tr('village', locale, settings), village, 11, W)] : []),
    rowCustom(tr('date', locale, settings), today, 6, W),
    DA,
    pbHeader,
    DA,
    ...ledgerLines,
    DA,
    rowCustom(tr('netDue', locale, settings), netFormatted, 11, W),
  ].join('\n')
}

export function buildTestText(settings: PrinterSettings, locale: Locale = 'en'): string {
  const W = lineWidth(settings.paperWidth)
  const EQ = sep('=', W)
  const DA = sep('-', W)

  return [
    EQ,
    centre(settings.dairyName, W),
    centre(tr('printerTest', locale, settings), W),
    EQ,
    rowCustom(tr('paper', locale, settings), settings.paperWidth, 11, W),
    rowCustom(tr('mode', locale, settings), settings.connectionType, 11, W),
    rowCustom(tr('copies', locale, settings), String(settings.copies), 11, W),
    rowCustom(tr('autoPrint', locale, settings), settings.autoPrintAfterSave ? 'ON' : 'OFF', 11, W),
    DA,
    centre(tr('testOk', locale, settings), W),
    DA,
    centre(new Date().toLocaleString('en-IN'), W),
  ].join('\n')
}

// ─── HTML wrappers ────────────────────────────────────────────────────────────
// Uses <pre> for pixel-perfect monospace layout on screen + @media print

function wrapAsHtml(text: string, settings: PrinterSettings): string {
  const w = settings.paperWidth === '58mm' ? '58mm' : '80mm'
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const feedPadding = `${settings.paperFeedAfterPrint ?? 5}mm`
  return `<pre style="font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.2;color:#000;margin:0 auto;padding:0 0 ${feedPadding} 0;width:${w};white-space:pre-wrap;word-break:break-word;">${escaped}</pre>`
}

export function generatePurchaseHtml(purchase: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const printLocale = getReceiptLocale(settings, locale)
  return renderToStaticMarkup(
    React.createElement(MilkPurchaseReceipt, {
      data: purchase,
      settings: settings,
      locale: printLocale
    })
  )
}

export function generatePaymentHtml(payment: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const printLocale = getReceiptLocale(settings, locale)
  return renderToStaticMarkup(
    React.createElement(PaymentReceipt, {
      data: payment,
      settings: settings,
      locale: printLocale
    })
  )
}

export function generateSaleHtml(sale: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const printLocale = getReceiptLocale(settings, locale)
  return renderToStaticMarkup(
    React.createElement(MilkSaleReceipt, {
      data: sale,
      settings: settings,
      locale: printLocale
    })
  )
}

export function generateStoreSaleHtml(sale: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const printLocale = getReceiptLocale(settings, locale)
  return renderToStaticMarkup(
    React.createElement(StoreSaleReceipt, {
      data: sale,
      settings: settings,
      locale: printLocale
    })
  )
}

export function generatePassbookHtml(ledger: any[], customer: any, settings: PrinterSettings, locale: Locale = 'en'): string {
  const printLocale = getReceiptLocale(settings, locale)
  return renderToStaticMarkup(
    React.createElement(PassbookReceipt, {
      data: { ledger, customer },
      settings: settings,
      locale: printLocale
    })
  )
}

export function generateTestHtml(settings: PrinterSettings, locale: Locale = 'en'): string {
  const printLocale = getReceiptLocale(settings, locale)
  return wrapAsHtml(buildTestText(settings, printLocale), settings)
}

// ─── Print trigger (window.print via @media print CSS) ───────────────────────

export function triggerSystemPrint(htmlContent: string, paperWidth: '58mm' | '80mm' = '58mm') {
  if (typeof window === 'undefined') return

  const staleContainer = document.getElementById('thermal-receipt-container')
  const staleStyle = document.getElementById('thermal-print-styles')
  if (staleContainer) document.body.removeChild(staleContainer)
  if (staleStyle) document.head.removeChild(staleStyle)

  const pw = paperWidth === '58mm' ? '58mm' : '80mm'

  const style = document.createElement('style')
  style.id = 'thermal-print-styles'
  style.innerHTML = `
    @media print {
      @page {
        size: ${pw} auto;
        margin: 0 !important;
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        height: auto !important;
        min-height: 0 !important;
      }
      body > *:not(#thermal-receipt-container) {
        display: none !important;
        visibility: hidden !important;
      }
      #thermal-receipt-container {
        display: block !important;
        visibility: visible !important;
        width: ${pw} !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        background: #fff !important;
        height: auto !important;
        min-height: 0 !important;
      }
      #thermal-receipt-container pre {
        margin: 0 auto !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
        color: #000 !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
        height: auto !important;
        min-height: 0 !important;
      }
    }
  `

  const container = document.createElement('div')
  container.id = 'thermal-receipt-container'
  container.innerHTML = htmlContent

  document.head.appendChild(style)
  document.body.appendChild(container)

  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        try { document.head.removeChild(style) } catch { }
        try { document.body.removeChild(container) } catch { }
      }, 700)
    }, 150)
  })
}

// ─── Web Bluetooth ESC/POS (GATT) ────────────────────────────────────────────

export async function triggerBluetoothPrint(
  plainText: string,
  settings: PrinterSettings
): Promise<{ success: boolean; error?: string }> {
  let device: any = null
  let server: any = null

  try {
    const nav = (typeof navigator !== 'undefined' ? navigator : null) as any
    if (!nav?.bluetooth) {
      return { success: false, error: 'Web Bluetooth API not supported. Falling back to system print.' }
    }

    const ALL_PRINTER_UUIDS = [
      '000018f0-0000-1000-8000-00805f9b34fb', // Generic print
      '00001101-0000-1000-8000-00805f9b34fb', // Classic SPP
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // PT-210 custom
      '49535343-fe7d-41aa-8fa5-a7ff054b4007', // ISSC SPP
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC SPP alternative
      '49535343-8841-43f4-a8d4-ecbe34729bb3', // MPT-II user characteristic/service UUID
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f90', // User missing last digit
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f91',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f92',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f93',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f94',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f95',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f96',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f97',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f98',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f99',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9a',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9b',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9c',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9d',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9e',
      'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
      '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 custom serial
      '0000ffd0-0000-1000-8000-00805f9b34fb', // Custom serial
      '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent custom
      '0000ae30-0000-1000-8000-00805f9b34fb', // Custom BLE print
      '0000af0a-0000-1000-8000-00805f9b34fb', // Custom BLE print
      '0000e781-0000-1000-8000-00805f9b34fb', // Generic print
      '0000ae00-0000-1000-8000-00805f9b34fb', // Custom print
      '0000ff00-0000-1000-8000-00805f9b34fb', // Custom serial HM-19
    ]

    device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ALL_PRINTER_UUIDS,
    })

    server = await device.gatt?.connect()
    if (!server) return { success: false, error: 'Failed to establish GATT connection.' }

    // Wait 500ms for connection parameters to negotiate and stabilize
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Re-verify connection and reconnect if printer dropped it during negotiation
    if (!device.gatt?.connected) {
      console.warn('GATT disconnected during negotiation. Reconnecting...')
      server = await device.gatt?.connect()
      if (!server) return { success: false, error: 'Failed to re-establish GATT connection.' }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    let service: any
    let writeChar: any

    // 1. Try resolving services dynamically from Chrome's permitted service list
    try {
      const services = await server.getPrimaryServices()
      for (const s of services) {
        try {
          const characteristics = await s.getCharacteristics()
          const found = characteristics.find(
            (c: any) => c.properties.write || c.properties.writeWithoutResponse
          )
          if (found) {
            service = s
            writeChar = found
            break
          }
        } catch {
          // Access restricted or not matching
        }
      }
    } catch (e) {
      console.warn('Dynamic service discovery failed, falling back to manual probe...', e)
    }

    // 2. Fallback: if dynamic discovery is restricted, probe pre-declared printer UUIDs one-by-one
    if (!writeChar) {
      for (const uuid of ALL_PRINTER_UUIDS) {
        try {
          // Re-verify connection before each probe
          if (!device.gatt?.connected) {
            server = await device.gatt?.connect()
            await new Promise((resolve) => setTimeout(resolve, 350))
          }
          const s = await server.getPrimaryService(uuid)
          const characteristics = await s.getCharacteristics()
          const found = characteristics.find(
            (c: any) => c.properties.write || c.properties.writeWithoutResponse
          )
          if (found) {
            service = s
            writeChar = found
            break
          }
        } catch {
          // Probe failed for this UUID, try next
        }
      }
    }

    if (!writeChar) {
      return { success: false, error: 'Printer service UUID not resolved on this device. None of the standard serial or printing services could be found.' }
    }

    const encoder = new TextEncoder()
    const initCmd = new Uint8Array([0x1B, 0x40])
    const alignLft = new Uint8Array([0x1B, 0x61, 0x00])
    const cutCmd = new Uint8Array([0x1D, 0x56, 0x41, 0x10])

    await writeChar.writeValue(initCmd)
    await writeChar.writeValue(alignLft)

    // Dynamic feed newlines (1 newline ≈ 4mm)
    const newlineCount = Math.max(0, Math.round((settings.paperFeedAfterPrint ?? 5) / 4))
    const textBytes = encoder.encode(plainText + '\n'.repeat(newlineCount))
    const CHUNK = 512
    for (let i = 0; i < textBytes.length; i += CHUNK) {
      await writeChar.writeValue(textBytes.slice(i, i + CHUNK))
    }
    await writeChar.writeValue(cutCmd)
    await server.disconnect()

    return { success: true }
  } catch (error: any) {
    // Release GATT server immediately on failure
    if (server && device?.gatt?.connected) {
      try {
        await server.disconnect()
        console.log('GATT server disconnected after print error.')
      } catch (e) {
        console.warn('Failed to disconnect GATT server on error:', e)
      }
    }

    const msg = error.message || String(error)
    if (msg.includes('cancelled') || msg.includes('chooser')) {
      console.warn('Bluetooth chooser cancelled by user.')
    } else {
      console.error('Bluetooth printing failed:', error)
    }
    return { success: false, error: msg }
  }
}

export function getFriendlyErrorMessage(err: string, lang: 'en' | 'hi'): string {
  const isHi = lang === 'hi'
  const lower = err.toLowerCase()

  if (
    lower.includes('connection attempt failed') || 
    lower.includes('spp') || 
    lower.includes('networkerror') || 
    lower.includes('gatt server is disconnected') ||
    lower.includes('connect first')
  ) {
    return isHi
      ? 'प्रिंटर से कनेक्शन विफल रहा। कृपया जांचें कि क्या प्रिंटर चालू (ON) है, ब्लूटूथ रेंज में है, और किसी अन्य डिवाइस से कनेक्टेड नहीं है।'
      : 'Printer connection failed. Please check if the printer is turned ON, within Bluetooth range, and not connected to another device.'
  }
  if (lower.includes('uuid not resolved') || lower.includes('none of the standard')) {
    return isHi
      ? 'प्रिंटर सेवा (UUID) नहीं मिली। यदि आप MPT-II जैसे ब्लूटूथ क्लासिक प्रिंटर का उपयोग कर रहे हैं, तो कृपया इसे अपने कंप्यूटर/फ़ोन में सिस्टम प्रिंटर के रूप में जोड़ें और कनेक्शन प्रकार को "सिस्टम प्रिंट (Browser)" पर सेट करें।'
      : 'Printer service UUID not resolved. If you are using a Bluetooth Classic printer (like the MPT-II), please pair it with your OS, add it as a system printer, and set connection type to "System print (Browser)" in Settings.'
  }
  if (lower.includes('write characteristic not found')) {
    return isHi
      ? 'प्रिंटर पर डेटा लिखने की सेवा नहीं मिली। यह प्रिंटर इस वेब ब्लूटूथ ऐप के साथ कंपैटिबल नहीं हो सकता है।'
      : 'Write characteristic not found on the printer. This device might not be compatible with Web Bluetooth printing.'
  }
  if (lower.includes('not supported') || lower.includes('bluetooth api not supported')) {
    return isHi
      ? 'आपके ब्राउज़र में वेब ब्लूटूथ समर्थित नहीं है। कृपया गूगल क्रोम (Google Chrome) का उपयोग करें।'
      : 'Web Bluetooth is not supported in your browser. Please use Google Chrome.'
  }
  
  return err
}

// ─── Unified print entry point ────────────────────────────────────────────────

export async function printReceipt(htmlContent: string) {
  const settings = getPrinterSettings()

  for (let c = 0; c < (settings.copies || 1); c++) {
    if (settings.connectionType === 'bluetooth') {
      const tmp = document.createElement('div')
      tmp.innerHTML = htmlContent
      const plainText = tmp.innerText || tmp.textContent || ''
      const res = await triggerBluetoothPrint(plainText, settings)
      if (!res.success) {
        const isCancellation = res.error?.includes('cancelled') || res.error?.includes('chooser')
        if (isCancellation) {
          console.log('Bluetooth print cancelled by user.')
          break
        }
        console.error('Bluetooth printing failed:', res.error)
        const friendlyError = getFriendlyErrorMessage(res.error || '', settings.receiptLanguage)
        alert(friendlyError)
        throw new Error(friendlyError)
      }
    } else {
      triggerSystemPrint(htmlContent, settings.paperWidth)
    }
  }
}
