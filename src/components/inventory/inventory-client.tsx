'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { AddProductForm } from './add-product-form'
import { CreateItemSaleForm } from './create-item-sale-form'
import { ProductsList } from './products-list'
import { ItemSalesTable } from './item-sales-table'
import { RefreshInventoryButton } from './refresh-button'
import { itemSalesLocal } from '@/lib/item-sales-local'

interface InventoryClientProps {
  products: any[]
  itemSales: any[]
  customers: any[]
}

export function InventoryClient({ products, itemSales: initialItemSales, customers }: InventoryClientProps) {
  const { locale } = useLanguage()
  const [sales, setSales] = useState<any[]>([])

  useEffect(() => {
    // Load store sales client-side from localStorage
    setSales(itemSalesLocal.getAll())
  }, [])

  const refreshSalesList = () => {
    setSales(itemSalesLocal.getAll())
  }

  return (
    <div className="h-full flex flex-col space-y-6 md:h-[calc(100vh-7.5rem)] md:overflow-hidden select-none">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            {locale === 'hi' ? 'स्टॉक और स्टोर' : 'Inventory & Store'}
          </h1>
          <p className="text-sm text-slate-600">
            {locale === 'hi'
              ? 'पशु चारा, खनिज मिश्रण, पूरक आहार प्रबंधित करें, और उन्हें सीधे अपने ग्राहकों को बेचें।'
              : 'Manage cattle feed, mineral mixtures, supplements, and sell them directly to your customers.'}
          </p>
        </div>
        <RefreshInventoryButton />
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-6 scrollbar-thin">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AddProductForm />
          <CreateItemSaleForm 
            customers={customers} 
            products={products} 
            onSaleRecorded={refreshSalesList} 
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-stretch">
          <div className="xl:col-span-1 flex flex-col h-full">
            <ProductsList products={products} />
          </div>

          <div className="xl:col-span-2 flex flex-col h-full">
            <ItemSalesTable itemSales={sales} onSalesChanged={refreshSalesList} />
          </div>
        </div>
      </div>
    </div>
  )
}
