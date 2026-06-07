import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/members') ||
    request.nextUrl.pathname.startsWith('/purchase') ||
    request.nextUrl.pathname.startsWith('/sale') ||
    request.nextUrl.pathname.startsWith('/reports') ||
    request.nextUrl.pathname.startsWith('/payments') ||
    request.nextUrl.pathname.startsWith('/passbook') ||
    request.nextUrl.pathname.startsWith('/inventory') ||
    request.nextUrl.pathname.startsWith('/staff')

  const token = request.cookies.get('token')?.value

  let user = null
  if (token) {
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        const isExpired = Date.now() >= payload.exp * 1000
        if (!isExpired) {
          user = payload
        }
      }
    } catch (e) {
      console.error('Error decoding token in middleware:', e)
    }
  }

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('message', 'Please log in to access this page')
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
