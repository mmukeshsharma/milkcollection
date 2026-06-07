'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function RefreshInventoryButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleRefresh}
      disabled={isPending}
      className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-9 w-9 shadow-sm"
      title="Refresh Inventory"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
    </Button>
  )
}
