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

export function InventoryClient() {
  const { locale } = useLanguage()
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadLocalData() {
    try {
      const { getProductsLocal } = await import('@/lib/products-local')
      const res = await getProductsLocal()
      if (res.products) {
        setProducts(res.products)
      }
    } catch (e) {
      console.error('Failed to load local products:', e)
    }
    setSales(itemSalesLocal.getAll())
    setIsLoading(false)
  }

  useEffect(() => {
    loadLocalData()
  }, [])

  const refreshProducts = async () => {
    try {
      const { getProductsLocal } = await import('@/lib/products-local')
      const res = await getProductsLocal()
      if (res.products) {
        setProducts(res.products)
      }
    } catch (e) {
      console.error('Failed to refresh local products:', e)
    }
  }

  const refreshSalesAndProducts = async () => {
    await refreshProducts()
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
          <AddProductForm onProductAdded={refreshProducts} />
          <CreateItemSaleForm 
            customers={[]} 
            products={products} 
            onSaleRecorded={refreshSalesAndProducts} 
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-stretch">
          <div className="xl:col-span-1 flex flex-col h-full">
            <ProductsList products={products} onProductsChanged={refreshProducts} />
          </div>

          <div className="xl:col-span-2 flex flex-col h-full">
            <ItemSalesTable itemSales={sales} onSalesChanged={refreshSalesAndProducts} />
          </div>
        </div>
      </div>
    </div>
  )
}
