'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addPaymentEntry } from '@/lib/payments-local'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/LanguageContext'
import { getPrinterSettings, generatePaymentHtml, printReceipt } from '@/lib/printer-service'

const paymentSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  payment_date: z.string().min(1, 'Date is required'),
  payment_type: z.enum(['advance', 'settlement']),
  amount: z.number().positive('Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'upi', 'bank', 'gpay', 'phonepe', 'paytm']),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

export function AddPaymentForm({ customers, onAdded }: { customers: any[]; onAdded?: () => void }) {
  const { t, locale } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastSaved, setLastSaved] = useState<any | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customer_id: '',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_type: 'settlement',
      amount: 1000,
      payment_method: 'cash',
    },
  })

  async function handleFormSubmit(data: PaymentFormValues, shouldPrint: boolean = false) {
    setIsLoading(true)
    setMessage(null)
    setLastSaved(null)

    const response = await addPaymentEntry(data)

    if (response?.error) {
      setMessage({ type: 'error', text: response.error })
    } else {
      const savedPayment = response.payment || {
        payment_date: data.payment_date,
        payment_type: data.payment_type,
        amount: data.amount,
        payment_method: data.payment_method,
        reference_no: data.reference_no
      }
      const custObj = customers.find(c => c.id === data.customer_id)
      const paymentWithCustomer = {
        ...savedPayment,
        customers: {
          name: custObj?.name || 'Farmer',
          customer_code: custObj?.customer_code || 'N/A'
        }
      }

      setLastSaved(paymentWithCustomer)
      setMessage({ type: 'success', text: locale === 'hi' ? 'भुगतान प्रविष्टि सफलतापूर्वक सहेजी गई!' : 'Farmer payout recorded successfully!' })
      
      const settings = getPrinterSettings()
      if (shouldPrint || settings.autoPrintAfterSave) {
        const html = generatePaymentHtml(paymentWithCustomer, settings, locale as 'en' | 'hi')
        printReceipt(html)
      }

      reset({
        customer_id: '',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_type: 'settlement',
        amount: 1000,
        payment_method: 'cash',
      })
    }
    setIsLoading(false)
  }

  const getMethodOptionLabel = (method: string) => {
    if (locale === 'hi') {
      switch (method) {
        case 'cash': return 'नकद (Cash)'
        case 'upi': return 'यूपीआई (UPI)'
        case 'bank': return 'बैंक ट्रांसफर (Bank)'
        case 'gpay': return 'जीपे (GPay)'
        case 'phonepe': return 'फ़ोनपे (PhonePe)'
        case 'paytm': return 'पेटीएम (Paytm)'
        default: return method
      }
    }
    return method.toUpperCase()
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-bold text-slate-800">
        {locale === 'hi' ? 'नया किसान भुगतान दर्ज करें' : 'Record New Farmer Payout'}
      </h3>

      {message && (
        <div className={`mb-4 rounded-xl p-3 text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Dynamic Last Saved Payout reprint banner */}
      {lastSaved && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="text-left">
            <p className="text-sm font-bold text-blue-800">
              🎉 {locale === 'hi' ? 'नवीनतम भुगतान रसीद तैयार है!' : 'Latest payout slip registered successfully!'}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {lastSaved.customers.name} ({lastSaved.customers.customer_code}) - Rs {lastSaved.amount} ({lastSaved.payment_method.toUpperCase()})
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                const settings = getPrinterSettings()
                const html = generatePaymentHtml(lastSaved, settings, locale as 'en' | 'hi')
                printReceipt(html)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2"
            >
              🖨️ {locale === 'hi' ? 'रसीद प्रिंट करें' : 'Print Receipt'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLastSaved(null)}
              className="border-slate-300 text-slate-600 hover:bg-slate-100 text-xs px-3 py-2 bg-white"
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer_id">{t('payments.form.selectCustomer')}</Label>
            <select
              id="customer_id"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              {...register('customer_id')}
            >
              <option value="">{locale === 'hi' ? '-- किसान चुनें --' : '-- Choose Customer --'}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_code} - {c.name}
                </option>
              ))}
            </select>
            {errors.customer_id && <p className="text-xs text-red-500">{errors.customer_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">{t('payments.form.date')}</Label>
            <Input id="payment_date" type="date" {...register('payment_date')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="amount">{t('payments.form.amount')}</Label>
            <Input 
              id="amount" 
              type="number" 
              placeholder="1000" 
              onChange={(e) => setValue('amount', Number(e.target.value))}
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">{t('payments.form.method')}</Label>
            <select
              id="payment_method"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              {...register('payment_method')}
            >
              <option value="cash">{getMethodOptionLabel('cash')}</option>
              <option value="upi">{getMethodOptionLabel('upi')}</option>
              <option value="bank">{getMethodOptionLabel('bank')}</option>
              <option value="gpay">{getMethodOptionLabel('gpay')}</option>
              <option value="phonepe">{getMethodOptionLabel('phonepe')}</option>
              <option value="paytm">{getMethodOptionLabel('paytm')}</option>
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reference_no">
              {locale === 'hi' ? 'संदर्भ / लेनदेन संख्या (वैकल्पिक)' : 'Reference / Txn No (Optional)'}
            </Label>
            <Input 
              id="reference_no" 
              placeholder={locale === 'hi' ? 'यूपीआई लेनदेन आईडी या बैंक संदर्भ संख्या' : 'UPI Txn ID or Bank Ref No'} 
              {...register('reference_no')} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">{t('payments.form.notes')}</Label>
          <Input 
            id="notes" 
            placeholder={locale === 'hi' ? 'अतिरिक्त विवरण, जैसे: पशु चारा राशि समायोजित' : 'Extra details, e.g., Feed cost adjusted'} 
            {...register('notes')} 
          />
        </div>

        <div className="flex gap-2.5">
          <Button
            type="button"
            onClick={handleSubmit((d) => handleFormSubmit(d, false))}
            disabled={isLoading}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 h-10 shadow-md text-xs sm:text-sm"
          >
            {isLoading ? '...' : (locale === 'hi' ? 'केवल सहेजें' : 'Save Only')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit((d) => handleFormSubmit(d, true))}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white hover:from-blue-700 hover:to-emerald-600 font-bold px-6 h-10 shadow-lg flex items-center gap-1.5 text-xs sm:text-sm"
          >
            🖨️ {locale === 'hi' ? 'सहेजें और प्रिंट' : 'Save & Print'}
          </Button>
        </div>
      </form>
    </div>
  )
}
