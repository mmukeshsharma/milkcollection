'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addSaleEntry } from '@/lib/sales-local'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const saleSchema = z.object({
  buyer_type: z.enum(['external', 'farmer']),
  customer_id: z.string().optional(),
  buyer_name: z.string().min(1, 'Buyer name is required'),
  sale_date: z.string().min(1, 'Date is required'),
  milk_type: z.enum(['cow', 'buffalo', 'mixed']),
  quantity_liters: z.number().positive('Quantity must be greater than 0'),
  rate_per_liter: z.number().positive('Rate must be greater than 0'),
})

type SaleFormValues = z.infer<typeof saleSchema>

import { useLanguage } from '@/context/LanguageContext'

export function MilkSaleForm({ customers, onAdded }: { customers: any[]; onAdded?: () => void }) {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      buyer_type: 'external',
      buyer_name: 'Local Dairy Corp',
      sale_date: new Date().toISOString().slice(0, 10),
      milk_type: 'mixed',
      quantity_liters: 50,
      rate_per_liter: 55,
    },
  })

  const buyerType = watch('buyer_type')
  const qty = watch('quantity_liters') || 0
  const rate = watch('rate_per_liter') || 0
  const total = Number((qty * rate).toFixed(2))

  async function onSubmit(data: SaleFormValues) {
    setIsLoading(true)
    setMessage(null)

    const payload = {
      buyer_name: data.buyer_type === 'farmer' 
        ? customers.find(c => c.id === data.customer_id)?.name || 'Farmer' 
        : data.buyer_name,
      customer_id: data.buyer_type === 'farmer' ? data.customer_id : undefined,
      sale_date: data.sale_date,
      milk_type: data.milk_type,
      quantity_liters: data.quantity_liters,
      rate_per_liter: data.rate_per_liter,
      total_amount: Number((data.quantity_liters * data.rate_per_liter).toFixed(2)),
    }

    const response = await addSaleEntry(payload)

    if (response?.error) {
      setMessage({ type: 'error', text: response.error })
    } else {
      setMessage({ type: 'success', text: 'Milk sale recorded successfully!' })
      reset({
        buyer_type: 'external',
        buyer_name: 'Local Dairy Corp',
        sale_date: new Date().toISOString().slice(0, 10),
        milk_type: 'mixed',
        quantity_liters: 50,
        rate_per_liter: 55,
      })
    }
    setIsLoading(false)
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl animate-[fadeIn_0.3s_ease-out]">
      <h3 className="mb-4 text-lg font-bold text-slate-800">{t('sales.formTitle')}</h3>
      
      {message && (
        <div className={`mb-4 rounded-xl p-3 text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="buyer_type">Buyer Type</Label>
            <select
              id="buyer_type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('buyer_type')}
            >
              <option value="external">External Buyer</option>
              <option value="farmer">Internal Farmer</option>
            </select>
          </div>

          {buyerType === 'farmer' ? (
            <div className="space-y-2">
              <Label htmlFor="customer_id">{t('purchase.form.selectCustomer')}</Label>
              <select
                id="customer_id"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('customer_id')}
              >
                <option value="">-- {t('purchase.form.selectCustomer')} --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer_code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="buyer_name">{t('sales.form.buyerName')}</Label>
              <Input id="buyer_name" placeholder="E.g., Mother Dairy" {...register('buyer_name')} />
              {errors.buyer_name && <p className="text-xs text-red-500">{errors.buyer_name.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sale_date">{t('sales.form.date')}</Label>
            <Input id="sale_date" type="date" {...register('sale_date')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="milk_type">{t('sales.form.milkType')}</Label>
            <select
              id="milk_type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('milk_type')}
            >
              <option value="cow">{t('common.cow')}</option>
              <option value="buffalo">{t('common.buffalo')}</option>
              <option value="mixed">{t('common.mixed')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity_liters">{t('sales.form.qty')}</Label>
            <Input 
              id="quantity_liters" 
              type="number" 
              step="any"
              placeholder="50" 
              onChange={(e) => setValue('quantity_liters', Number(e.target.value))}
            />
            {errors.quantity_liters && <p className="text-xs text-red-500">{errors.quantity_liters.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate_per_liter">{t('sales.form.rate')}</Label>
            <Input 
              id="rate_per_liter" 
              type="number" 
              step="any"
              placeholder="55" 
              onChange={(e) => setValue('rate_per_liter', Number(e.target.value))}
            />
            {errors.rate_per_liter && <p className="text-xs text-red-500">{errors.rate_per_liter.message}</p>}
          </div>

          <div className="flex flex-col justify-end">
            <div className="rounded-md bg-blue-50/50 p-2 text-center border border-blue-100">
              <span className="text-xs text-slate-500 block">{t('sales.form.amount')}</span>
              <span className="text-lg font-bold text-blue-700">Rs {total}</span>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6">
          {isLoading ? t('common.loading') : t('sales.form.addEntry')}
        </Button>
      </form>
    </div>
  )
}
