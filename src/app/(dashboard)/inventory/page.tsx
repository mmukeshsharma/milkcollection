export const dynamic = 'force-dynamic'

import { getProducts, getItemSales } from '@/app/actions/inventory'
import { getCustomers } from '@/app/actions/customers'
import { InventoryClient } from '@/components/inventory/inventory-client'

export default async function InventoryPage() {
  const { products = [] } = await getProducts()
  const { itemSales = [] } = await getItemSales()
  const { customers = [] } = await getCustomers()

  return (
    <InventoryClient
      products={products || []}
      itemSales={itemSales || []}
      customers={customers || []}
    />
  )
}
