'use client'

import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export function LogoutButton({ mobile = false }: { mobile?: boolean }) {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant={mobile ? 'ghost' : 'outline'}
        className={mobile ? 'w-full justify-start rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50' : 'text-red-600 border-red-200 hover:bg-red-50'}
      >
        Logout
      </Button>
    </form>
  )
}
