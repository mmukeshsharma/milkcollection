'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSessionUserRole } from '@/app/actions/auth'

type DeleteButtonProps = {
  id: string
  deleteAction: (id: string) => Promise<{ success?: boolean; error?: string }>
  confirmMessage?: string
  successMessage?: string
}

export function DeleteButton({
  id,
  deleteAction,
  confirmMessage = "Are you sure you want to delete this record?",
  successMessage = "Record deleted successfully."
}: DeleteButtonProps) {
  const [role, setRole] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadRole() {
      const userRole = await getSessionUserRole()
      setRole(userRole)
    }
    loadRole()
  }, [])

  const isAuthorized = role === 'admin' || role === 'super_admin' || role === 'agent'
  if (!isAuthorized) return null // Hide delete button for staff/non-admin

  async function handleDelete() {
    if (confirm(confirmMessage)) {
      setIsDeleting(true)
      const res = await deleteAction(id)
      setIsDeleting(false)
      if (res?.error) {
        alert("Error: " + res.error)
      } else {
        alert(successMessage)
        router.refresh()
      }
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg p-1.5 h-8 w-8 flex items-center justify-center transition-colors border border-transparent hover:border-rose-200"
      title="Delete record"
    >
      🗑️
    </Button>
  )
}
