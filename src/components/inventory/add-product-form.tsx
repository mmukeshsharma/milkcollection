'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addProduct } from '@/app/actions/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/LanguageContext'

const productSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than 0'),
  stock_quantity: z.number().nonnegative('Stock cannot be negative'),
})

type ProductFormValues = z.infer<typeof productSchema>

export function AddProductForm() {
  const { t, locale } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      product_name: '',
      description: '',
      price: 1000,
      stock_quantity: 50,
    },
  })

  async function onSubmit(data: ProductFormValues) {
    setIsLoading(true)
    setMessage(null)

    const response = await addProduct(data)

    if (response?.error) {
      setMessage({ type: 'error', text: response.error })
    } else {
      setMessage({ 
        type: 'success', 
        text: locale === 'hi' ? 'उत्पाद सफलतापूर्वक जोड़ा गया!' : 'Product added successfully!' 
      })
      reset({
        product_name: '',
        description: '',
        price: 1000,
        stock_quantity: 50,
      })
    }
    setIsLoading(false)
  }

  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-5 shadow-xl backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-bold text-slate-800">
        {locale === 'hi' ? 'नया उत्पाद जोड़ें' : 'Add New Product'}
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product_name">{t('inventory.form.productName')}</Label>
          <Input 
            id="product_name" 
            placeholder={locale === 'hi' ? 'सुपर कैटल फीड / लिक्विड कैल्शियम' : 'Super Cattle Feed / Liquid Calcium'} 
            {...register('product_name')} 
          />
          {errors.product_name && <p className="text-xs text-red-500">{errors.product_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('inventory.form.description')} ({locale === 'hi' ? 'वैकल्पिक' : 'Optional'})</Label>
          <Input 
            id="description" 
            placeholder={locale === 'hi' ? 'उदा. उच्च वसा सामग्री पूरक' : 'E.g., High-fat content supplement'} 
            {...register('description')} 
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">{locale === 'hi' ? 'विक्रय मूल्य (Rs)' : 'Selling Price (Rs)'}</Label>
            <Input 
              id="price" 
              type="number" 
              placeholder="1200" 
              onChange={(e) => setValue('price', Number(e.target.value))}
            />
            {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_quantity">{locale === 'hi' ? 'प्रारंभिक स्टॉक मात्रा' : 'Initial Stock Quantity'}</Label>
            <Input 
              id="stock_quantity" 
              type="number" 
              placeholder="100" 
              onChange={(e) => setValue('stock_quantity', Number(e.target.value))}
            />
            {errors.stock_quantity && <p className="text-xs text-red-500">{errors.stock_quantity.message}</p>}
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="bg-blue-700 hover:bg-blue-800 text-white font-semibold w-full">
          {isLoading 
            ? (locale === 'hi' ? 'जोड़ रहे हैं...' : 'Adding...') 
            : (locale === 'hi' ? 'इन्वेंटरी में जोड़ें' : 'Add to Inventory')
          }
        </Button>
      </form>
    </div>
  )
}
