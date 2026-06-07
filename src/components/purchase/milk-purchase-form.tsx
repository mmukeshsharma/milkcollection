'use client'

import { useState, useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addPurchaseEntry } from '@/lib/purchases-local'
import { calculateRateForPurchaseLocal as calculateRateForPurchase } from '@/lib/rate-charts-local'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPrinterSettings, generatePurchaseHtml, printReceipt } from '@/lib/printer-service'

const purchaseSchema = z.object({
  customer_id: z.string().min(1, 'Please select a valid customer'),
  purchase_date: z.string(),
  shift: z.enum(['morning', 'evening']),
  milk_type: z.enum(['cow', 'buffalo', 'mixed']),
  quantity_liters: z.coerce.number().min(0.1, 'Quantity must be > 0'),
  fat_percentage: z.coerce.number().min(1, 'FAT required').max(15, 'Invalid FAT'),
  snf_percentage: z.coerce.number().min(1, 'SNF required').max(12, 'Invalid SNF'),
  rate_per_liter: z.coerce.number().min(0),
  total_amount: z.coerce.number().min(0),
})

type PurchaseFormValues = z.infer<typeof purchaseSchema>
type PurchaseCustomer = { id: string; customer_code: string; name: string }

import { useLanguage } from '@/context/LanguageContext'

export function MilkPurchaseForm({ customers }: { customers: PurchaseCustomer[] }) {
  const { t, locale } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [rateError, setRateError] = useState('')
  const [chartUsed, setChartUsed] = useState('')
  const [lastSaved, setLastSaved] = useState<any | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema) as Resolver<PurchaseFormValues>,
    defaultValues: {
      purchase_date: new Date().toISOString().split('T')[0],
      shift: new Date().getHours() < 14 ? 'morning' : 'evening',
      milk_type: 'cow',
      quantity_liters: 0,
      fat_percentage: 0,
      snf_percentage: 0,
      rate_per_liter: 0,
      total_amount: 0,
    },
  })

  const watchQty = watch('quantity_liters')
  const watchFat = watch('fat_percentage')
  const watchSnf = watch('snf_percentage')
  const watchMilkType = watch('milk_type')
  const watchDate = watch('purchase_date')

  useEffect(() => {
    let active = true
    async function updateCalculatedRate() {
      const fatVal = Number(watchFat)
      const snfVal = Number(watchSnf)
      
      if (fatVal > 0 && snfVal > 0) {
        const lookup = await calculateRateForPurchase(watchMilkType, fatVal, snfVal)
        if (!active) return

        if (lookup.error) {
          setRateError(lookup.error)
          setChartUsed('')
          setValue('rate_per_liter', 0)
          setValue('total_amount', 0)
        } else {
          setRateError('')
          setChartUsed(lookup.chartName || '')
          setValue('rate_per_liter', lookup.rate)
          if (watchQty > 0) {
            setValue('total_amount', Number((lookup.rate * Number(watchQty)).toFixed(2)))
          } else {
            setValue('total_amount', 0)
          }
        }
      } else {
        setRateError('')
        setChartUsed('')
        setValue('rate_per_liter', 0)
        setValue('total_amount', 0)
      }
    }

    updateCalculatedRate()
    return () => {
      active = false
    }
  }, [watchFat, watchSnf, watchQty, watchMilkType, watchDate, setValue])

  async function handleFormSubmit(data: PurchaseFormValues, shouldPrint: boolean = false) {
    if (rateError) {
      setErrorMsg(rateError)
      return
    }

    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setLastSaved(null)

    const response = await addPurchaseEntry(data)

    if (response?.error) {
      setErrorMsg(response.error)
    } else {
      const savedPurchase = response.purchase
      const custObj = customers.find(c => c.id === data.customer_id)
      const purchaseWithCustomer = {
        ...savedPurchase,
        customers: {
          name: custObj?.name || 'Farmer',
          customer_code: custObj?.customer_code || 'N/A'
        }
      }

      setLastSaved(purchaseWithCustomer)
      setSuccessMsg(locale === 'hi' ? 'प्रविष्टि सफलतापूर्वक सहेजी गई!' : 'Entry saved successfully!')
      
      // Print handling
      const settings = getPrinterSettings()
      if (shouldPrint || settings.autoPrintAfterSave) {
        const html = generatePurchaseHtml(purchaseWithCustomer, settings, locale as 'en' | 'hi')
        printReceipt(html)
      }

      reset({
        ...data,
        customer_id: '',
        quantity_liters: 0,
        fat_percentage: 0,
        snf_percentage: 0,
        rate_per_liter: 0,
        total_amount: 0,
      })
      setRateError('')
      setTimeout(() => setSuccessMsg(''), 5000)
    }
    setIsLoading(false)
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/80 p-4 shadow-xl backdrop-blur-xl sm:p-6 animate-[fadeIn_0.3s_ease-out]">
      <h2 className="mb-4 text-xl font-bold text-blue-700">{t('purchase.formTitle')}</h2>

      {errorMsg && <div className="mb-4 text-sm font-medium text-red-500 bg-red-50 p-3 rounded">{errorMsg}</div>}
      {successMsg && <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded">{successMsg}</div>}

      {/* Dynamic Last Saved Receipt Actions card */}
      {lastSaved && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="text-left">
            <p className="text-sm font-bold text-blue-800">
              🎉 {locale === 'hi' ? 'नवीनतम प्रविष्टि रसीद तैयार है!' : 'Latest milk entry recorded successfully!'}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {lastSaved.customers.name} ({lastSaved.customers.customer_code}) - {lastSaved.quantity_liters}L @ Rs {lastSaved.rate_per_liter}/L
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                const settings = getPrinterSettings()
                const html = generatePurchaseHtml(lastSaved, settings, locale as 'en' | 'hi')
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchase_date">{t('purchase.form.date')}</Label>
            <Input type="date" id="purchase_date" {...register('purchase_date')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift">{t('purchase.form.shift')}</Label>
            <select id="shift" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" {...register('shift')}>
              <option value="morning">{t('common.morning')}</option>
              <option value="evening">{t('common.evening')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="milk_type">{t('purchase.form.milkType')}</Label>
            <select id="milk_type" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" {...register('milk_type')}>
              <option value="cow">{t('common.cow')}</option>
              <option value="buffalo">{t('common.buffalo')}</option>
              <option value="mixed">{t('common.mixed')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_id">{t('purchase.form.selectCustomer')}</Label>
          <select id="customer_id" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" {...register('customer_id')}>
            <option value="">-- {t('purchase.form.selectCustomer')} --</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.customer_code} - {c.name}</option>
            ))}
          </select>
          {errors.customer_id && <p className="text-xs text-red-500">{errors.customer_id.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="quantity_liters">{t('purchase.form.qty')}</Label>
            <Input type="number" step="0.1" id="quantity_liters" {...register('quantity_liters')} />
            {errors.quantity_liters && <p className="text-xs text-red-500">{errors.quantity_liters.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fat_percentage">{t('purchase.form.fat')}</Label>
            <Input type="number" step="0.1" id="fat_percentage" {...register('fat_percentage')} />
            {errors.fat_percentage && <p className="text-xs text-red-500">{errors.fat_percentage.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="snf_percentage">{t('purchase.form.snf')}</Label>
            <Input type="number" step="0.1" id="snf_percentage" {...register('snf_percentage')} />
            {errors.snf_percentage && <p className="text-xs text-red-500">{errors.snf_percentage.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate_per_liter">{t('purchase.form.rate')}</Label>
            <Input type="number" readOnly id="rate_per_liter" className={`font-bold ${rateError ? 'bg-rose-50 border-rose-300 text-rose-600' : 'bg-slate-100'}`} {...register('rate_per_liter')} />
            {chartUsed && !rateError && (
              <p className="text-xs text-blue-600 font-bold mt-1">
                📈 {locale === 'hi' ? 'लागू रेट चार्ट' : 'Applied Chart'}: {chartUsed}
              </p>
            )}
          </div>
        </div>

        {rateError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-sm text-rose-600 font-medium">
            ⚠️ {rateError}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base sm:text-lg">
            {t('purchase.form.amount')}: <span className="font-bold text-green-700 text-xl sm:text-2xl">Rs {watch('total_amount') || 0}</span>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={handleSubmit((d) => handleFormSubmit(d, false))}
              disabled={isLoading}
              className="h-11 flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-900 text-white px-5 text-sm font-bold shadow-md"
            >
              {isLoading ? t('common.loading') : (locale === 'hi' ? 'सहेजें (Save Only)' : 'Save Only')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((d) => handleFormSubmit(d, true))}
              disabled={isLoading}
              className="h-11 flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-emerald-500 px-6 text-sm font-bold text-white shadow-lg hover:from-blue-700 hover:to-emerald-600"
            >
              🖨️ {locale === 'hi' ? 'सहेजें और प्रिंट' : 'Save & Print'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
