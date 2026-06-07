'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addCustomer } from '@/lib/customers-local'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PlusCircle } from 'lucide-react'

// Zod schema for customer validation
const customerSchema = z.object({
  customer_code: z.string().min(1, 'Code is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().length(10, 'Mobile must be exactly 10 digits').regex(/^\d{10}$/, 'Mobile must contain only digits'),
  address: z.string().min(1, 'Address is required'),
  village: z.string().min(1, 'Village is required'),
  milk_type_preference: z.enum(['cow', 'buffalo', 'mixed']),
})

type CustomerFormValues = z.infer<typeof customerSchema>

import { useLanguage } from '@/context/LanguageContext'

export function AddCustomerDialog({ onAdded }: { onAdded?: () => void } = {}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      milk_type_preference: 'cow',
    },
  })

  async function onSubmit(data: CustomerFormValues) {
    setIsLoading(true)
    setErrorMsg('')

    const response = await addCustomer({
      ...data,
      active_status: true,
    })

    if (response?.error) {
      setErrorMsg(response.error)
    } else {
      setOpen(false)
      reset()
      onAdded?.()
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg hover:from-blue-700 hover:to-cyan-600" />
      }>
        <PlusCircle className="mr-2 h-4 w-4" />
        {t('customers.addCustomer')}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[460px] border border-white/40 bg-white/85 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>{t('customers.addCustomer')}</DialogTitle>
          <DialogDescription>
            Register a new farmer or milk supplier here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          {errorMsg && (
            <div className="text-sm font-medium text-red-500 bg-red-50 p-2 rounded">
              {errorMsg}
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_code">{t('customers.form.customerCode')}</Label>
              <Input id="customer_code" placeholder="M-001" {...register('customer_code')} />
              {errors.customer_code && <p className="text-xs text-red-500">{errors.customer_code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('customers.form.fullName')}</Label>
              <Input id="name" placeholder="Ramesh Singh" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mobile">{t('customers.form.mobileNumber')}</Label>
              <Input 
                id="mobile" 
                placeholder="9876543210" 
                maxLength={10}
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault()
                  }
                }}
                {...register('mobile')} 
              />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="village">{t('customers.form.village')}</Label>
              <Input id="village" placeholder="Rampur" {...register('village')} />
              {errors.village && <p className="text-xs text-red-500">{errors.village.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('customers.form.address')}</Label>
            <Input id="address" placeholder="House No 42, Main Road" {...register('address')} />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="milk_type">{t('customers.form.milkTypePreference')}</Label>
            <select 
              id="milk_type" 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              {...register('milk_type_preference')}
            >
              <option value="cow">{t('common.cow')}</option>
              <option value="buffalo">{t('common.buffalo')}</option>
              <option value="mixed">{t('common.mixed')}</option>
            </select>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800">
              {isLoading ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
