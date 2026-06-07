'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/LanguageContext'

export function ReportsViewer({ purchases, payments }: { purchases: any[]; payments: any[] }) {
  const { locale } = useLanguage()
  const [reportType, setReportType] = useState<'purchase' | 'payment'>('purchase')
  
  // Default date filter: past 30 days
  const today = new Date().toISOString().slice(0, 10)
  const past30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  
  const [startDate, setStartDate] = useState(past30)
  const [endDate, setEndDate] = useState(today)

  // Filter purchases
  const filteredPurchases = purchases.filter((p) => {
    const pDate = p.purchase_date || p.created_at?.slice(0, 10)
    return pDate >= startDate && pDate <= endDate
  })

  // Filter payments
  const filteredPayments = payments.filter((pay) => {
    const payDate = pay.payment_date || pay.created_at?.slice(0, 10)
    return payDate >= startDate && payDate <= endDate
  })

  // Calculate purchase stats
  const totalLiters = filteredPurchases.reduce((sum, p) => sum + Number(p.quantity_liters || 0), 0)
  const avgFat = filteredPurchases.length > 0 
    ? Number((filteredPurchases.reduce((sum, p) => sum + Number(p.fat_percentage || 0), 0) / filteredPurchases.length).toFixed(2)) 
    : 0
  const avgSnf = filteredPurchases.length > 0 
    ? Number((filteredPurchases.reduce((sum, p) => sum + Number(p.snf_percentage || 0), 0) / filteredPurchases.length).toFixed(2)) 
    : 0
  const totalPurchaseAmt = filteredPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0)

  // Calculate payment stats
  const totalPaymentAmt = filteredPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0)
  const advanceAmt = filteredPayments.filter(p => p.payment_type === 'advance').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const settlementAmt = filteredPayments.filter(p => p.payment_type === 'settlement').reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const getPaymentMethodLabel = (method: string) => {
    if (locale === 'hi') {
      switch (method) {
        case 'cash': return 'नकद (Cash)'
        case 'bank': return 'बैंक ट्रांसफर (Bank)'
        case 'upi': return 'यूपीआई (UPI)'
        case 'gpay': return 'जीपे (GPay)'
        case 'phonepe': return 'फ़ोनपे (PhonePe)'
        case 'paytm': return 'पेटीएम (Paytm)'
        default: return method
      }
    }
    return method.toUpperCase()
  }

  const getShiftLabel = (shift: string) => {
    if (locale === 'hi') {
      return shift === 'morning' ? 'सुबह (Morning)' : 'शाम (Evening)'
    }
    return shift === 'morning' ? 'Morning' : 'Evening'
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex gap-2 border-b pb-4">
          <Button 
            variant={reportType === 'purchase' ? 'default' : 'outline'}
            onClick={() => setReportType('purchase')}
            className={reportType === 'purchase' ? 'bg-blue-700 text-white' : ''}
          >
            {locale === 'hi' ? 'दूध संग्रह रिपोर्ट' : 'Milk Collection Report'}
          </Button>
          <Button 
            variant={reportType === 'payment' ? 'default' : 'outline'}
            onClick={() => setReportType('payment')}
            className={reportType === 'payment' ? 'bg-emerald-700 text-white' : ''}
          >
            {locale === 'hi' ? 'भुगतान एवं अग्रिम रिपोर्ट' : 'Payouts & Advances Report'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="start_date">{locale === 'hi' ? 'प्रारंभ तिथि' : 'Start Date'}</Label>
            <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">{locale === 'hi' ? 'अंतिम तिथि' : 'End Date'}</Label>
            <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {reportType === 'purchase' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block">{locale === 'hi' ? 'कुल खरीदा दूध (लीटर)' : 'Total Liters Purchased'}</span>
              <span className="text-xl font-bold text-blue-700">{totalLiters.toFixed(1)} L</span>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block">{locale === 'hi' ? 'औसत फैट / एसएनएफ' : 'Average FAT / SNF'}</span>
              <span className="text-xl font-bold text-slate-700">{avgFat}% / {avgSnf}%</span>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block">{locale === 'hi' ? 'कुल व्यय (राशि)' : 'Total Expenditure'}</span>
              <span className="text-xl font-bold text-green-700">Rs {totalPurchaseAmt.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="border-b border-slate-200/70 p-4">
              <h3 className="font-bold text-slate-800">{locale === 'hi' ? 'दूध संग्रह विवरण पत्रक' : 'Milk Collection Summary Sheet'}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                  <tr>
                    <th className="px-4 py-3">{locale === 'hi' ? 'तारीख' : 'Date'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'किसान' : 'Farmer'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'शिफ्ट' : 'Shift'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'मात्रा (लीटर)' : 'Qty (L)'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'फैट / एसएनएफ' : 'FAT / SNF'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'दर (रु/लीटर)' : 'Rate (Rs/L)'}</th>
                    <th className="px-4 py-3 text-right">{locale === 'hi' ? 'राशि' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {new Date(p.purchase_date || p.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {p.customers?.customer_code} - {p.customers?.name}
                      </td>
                      <td className="px-4 py-3 capitalize">{getShiftLabel(p.shift)}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{p.quantity_liters} L</td>
                      <td className="px-4 py-3">{p.fat_percentage}% / {p.snf_percentage}%</td>
                      <td className="px-4 py-3">Rs {p.rate_per_liter}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">Rs {p.total_amount}</td>
                    </tr>
                  ))}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        {locale === 'hi' ? 'इस अवधि के लिए कोई संग्रह प्रविष्टि नहीं मिली।' : 'No collection entries found for this period.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block">{locale === 'hi' ? 'कुल निपटाया गया भुगतान' : 'Total Payouts Settled'}</span>
              <span className="text-xl font-bold text-emerald-700">Rs {settlementAmt.toFixed(2)}</span>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block">{locale === 'hi' ? 'कुल जारी अग्रिम' : 'Total Advances Issued'}</span>
              <span className="text-xl font-bold text-amber-700">Rs {advanceAmt.toFixed(2)}</span>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
              <span className="text-xs text-slate-500 block">{locale === 'hi' ? 'कुल वितरित राशि' : 'Total Funds Disbursed'}</span>
              <span className="text-xl font-bold text-slate-800">Rs {totalPaymentAmt.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/75 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="border-b border-slate-200/70 p-4">
              <h3 className="font-bold text-slate-800">{locale === 'hi' ? 'भुगतान सारांश पत्रक' : 'Payout Logs Summary Sheet'}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                  <tr>
                    <th className="px-4 py-3">{locale === 'hi' ? 'तारीख' : 'Date'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'किसान' : 'Farmer'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'विवरण' : 'Particulars'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'विधि' : 'Method'}</th>
                    <th className="px-4 py-3 text-right">{locale === 'hi' ? 'राशि' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((pay) => (
                    <tr key={pay.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {new Date(pay.payment_date || pay.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {pay.customers?.customer_code} - {pay.customers?.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                        {pay.notes || pay.reference_no || '-'}
                      </td>
                      <td className="px-4 py-3 capitalize">{getPaymentMethodLabel(pay.payment_method)}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">Rs {pay.amount}</td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {locale === 'hi' ? 'इस अवधि के लिए कोई भुगतान विवरण नहीं मिला।' : 'No payouts issued for this period.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
