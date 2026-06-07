'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { connectToDatabase } from '@/lib/mongodb'
import { User, UserSession } from '@/models'

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123_sharma_dairy'

function isRedirectError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    ((error as { digest: string }).digest.startsWith('NEXT_REDIRECT'))
  )
}

/**
 * Regex-based helper to parse browser & OS platform from User Agent string
 */
function parseUserAgent(userAgent: string) {
  let browser = 'Unknown Browser'
  let platform = 'Unknown OS'

  if (/chrome|crios/i.test(userAgent) && !/edge|edg/i.test(userAgent) && !/opr/i.test(userAgent)) {
    browser = 'Chrome'
  } else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) {
    browser = 'Safari'
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = 'Firefox'
  } else if (/edge|edg/i.test(userAgent)) {
    browser = 'Edge'
  } else if (/opr/i.test(userAgent)) {
    browser = 'Opera'
  }

  if (/windows/i.test(userAgent)) {
    platform = 'Windows'
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    platform = 'macOS'
  } else if (/linux/i.test(userAgent)) {
    platform = 'Linux'
  } else if (/android/i.test(userAgent)) {
    platform = 'Android'
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    platform = 'iOS'
  }

  const deviceName = `${browser} on ${platform}`
  return { browser, platform, deviceName }
}

/**
 * Core User Sign In Action
 */
export async function login(formData: FormData) {
  try {
    await connectToDatabase()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')
    const deviceId = String(formData.get('device_id') ?? '').trim()
    const forceLogoutOldest = formData.get('force_logout_oldest') === 'true'
    const tempToken = String(formData.get('temp_token') ?? '').trim()

    let user = null

    if (tempToken) {
      // Decode and verify secure one-time temporary action token
      try {
        const decoded = jwt.verify(tempToken, JWT_SECRET) as any
        if (decoded.action === 'limit_resolution' && decoded.deviceId === deviceId) {
          user = await User.findById(decoded.userId)
        }
      } catch (err) {
        redirect('/login?message=Verification+token+expired.+Please+login+again.')
      }
      if (!user) {
        redirect('/login?message=Invalid+verification+token.+Please+login+again.')
      }
    } else {
      if (!email || !password) {
        redirect('/login?message=Email+and+password+are+required')
      }

      // Try finding the user
      user = await User.findOne({ email })

      // Auto-seed admin user if none exists in database
      if (!user && email === 'admin@sharmadairy.com') {
        const hashedPassword = await bcrypt.hash('Admin@123', 10)
        user = await User.create({
          name: 'Super Admin',
          email: 'admin@sharmadairy.com',
          password: hashedPassword,
          role: 'super_admin',
          active: true,
          subscription_plan: 'enterprise',
          subscription_status: 'active'
        })
      }

      if (!user) {
        redirect('/login?message=Invalid+email+or+password')
      }

      const isMatch = await bcrypt.compare(password, user.password!)
      if (!isMatch) {
        redirect('/login?message=Invalid+email+or+password')
      }
    }

    if (!user.active) {
      redirect('/login?message=Account+is+disabled')
    }

    // SaaS Expiry Validation
    if (user.role === 'agent') {
      const isExpired = user.subscription_end && new Date() > new Date(user.subscription_end)
      if (isExpired) {
        user.subscription_status = 'expired'
        await user.save()
        redirect('/login?message=Subscription+Expired')
      }
    }

    // ── Concurrency Session Limits (2 devices maximum per Agent) ────────────────
    if (user.role === 'agent') {
      const activeSessions = await UserSession.find({ user_id: user._id.toString(), is_active: true }).sort({ last_active: 1 })
      
      // Determine if current device already has a session
      const existingSessionIndex = activeSessions.findIndex(s => s.device_id === deviceId)
      
      // If we already have 2 active devices AND this is a NEW device
      if (activeSessions.length >= 2 && existingSessionIndex === -1) {
        if (forceLogoutOldest) {
          // Deactivate oldest session in database (kick out oldest device)
          const oldest = activeSessions[0]
          oldest.is_active = false
          await oldest.save()
        } else {
          // Generate a cryptographically signed 5-minute temporary token for the limit resolution flow
          const limitToken = jwt.sign(
            { userId: user._id.toString(), deviceId, action: 'limit_resolution' },
            JWT_SECRET,
            { expiresIn: '5m' }
          )
          // Trigger Login Limit Screen redirect
          redirect(`/login?showLimitReached=true&userId=${user._id.toString()}&deviceId=${deviceId}&email=${encodeURIComponent(user.email)}&tempToken=${limitToken}`)
        }
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Log the active session
    const reqHeaders = await headers()
    const userAgent = reqHeaders.get('user-agent') || ''
    const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1'
    const { browser, platform, deviceName } = parseUserAgent(userAgent)

    // Save/Update current session in MongoDB
    await UserSession.findOneAndUpdate(
      { user_id: user._id.toString(), device_id: deviceId || 'unknown-device' },
      {
        token,
        is_active: true,
        last_active: new Date(),
        device_name: deviceName,
        browser,
        platform,
        ip_address: ip,
        created_at: new Date()
      },
      { upsert: true }
    )

    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (error) {
    if (isRedirectError(error)) throw error
    const message = error instanceof Error ? error.message : 'Authentication failed'
    redirect(`/login?message=${encodeURIComponent(message)}`)
  }
}

// Server-side in-memory cache for session user validation to optimize Vercel serverless operations
const sessionCache = new Map<string, { user: any; timestamp: number }>()
const SESSION_CACHE_TTL = 10000 // 10 seconds cache TTL

/**
 * Log out current device
 */
export async function logout() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (token) {
      sessionCache.delete(token)
      await connectToDatabase()
      await UserSession.findOneAndUpdate({ token }, { is_active: false })
    }
    cookieStore.delete('token')
  } catch (e) {
    console.error('Logout error:', e)
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function sendPasswordReset(formData: FormData) {
  redirect('/login?message=Password+reset+functionality+not+supported+in+local+database')
}

export async function getSessionUserRole(): Promise<'admin' | 'staff' | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) return null

    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.role || null
  } catch (err) {
    console.error('Error fetching session user role:', err)
    return null
  }
}

/**
 * Fully authenticates current request against database and device session state
 */
export async function getSessionUser() {
  let token: string | undefined = undefined
  try {
    const cookieStore = await cookies()
    token = cookieStore.get('token')?.value

    if (!token) return null

    // Check cache first
    const now = Date.now()
    const cached = sessionCache.get(token)
    if (cached && (now - cached.timestamp < SESSION_CACHE_TTL)) {
      return cached.user
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any

    await connectToDatabase()
    const dbUser = await User.findById(decoded.userId)
    if (!dbUser) {
      sessionCache.delete(token)
      return null
    }

    // 1. Account Deactivation instant lockout check
    if (!dbUser.active) {
      const deactResult = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        error: 'DEACTIVATED' as const
      }
      sessionCache.set(token, { user: deactResult, timestamp: now })
      return deactResult
    }

    // 2. Subscription Expiry instant check
    if (dbUser.role === 'agent') {
      const isExpired = dbUser.subscription_end && new Date() > new Date(dbUser.subscription_end)
      if (isExpired || dbUser.subscription_status === 'expired') {
        const expResult = {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          name: dbUser.name,
          subscription_plan: dbUser.subscription_plan,
          error: 'EXPIRED' as const
        }
        sessionCache.set(token, { user: expResult, timestamp: now })
        return expResult
      }
    }

    // 3. Verify session in UserSession (blocks token sharing / force logged out sessions)
    const session = await UserSession.findOne({ token })
    if (!session) {
      sessionCache.delete(token)
      return null
    }

    if (!session.is_active) {
      const forceResult = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        error: 'FORCE_LOGOUT' as const
      }
      sessionCache.set(token, { user: forceResult, timestamp: now })
      return forceResult
    }

    // Throttle last_active updates in database to once per minute to avoid constant writes on Vercel
    const lastActiveTime = session.last_active ? new Date(session.last_active).getTime() : 0
    if (now - lastActiveTime > 60000) {
      session.last_active = new Date()
      await session.save()
    }

    // Self-cleaning of session cache if it gets too large
    if (sessionCache.size > 500) {
      const pruneLimit = now - 60000
      for (const [key, val] of sessionCache.entries()) {
        if (val.timestamp < pruneLimit) {
          sessionCache.delete(key)
        }
      }
    }

    const validUser = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      name: dbUser.name
    }
    sessionCache.set(token, { user: validUser, timestamp: now })
    return validUser
  } catch (err) {
    if (token) {
      sessionCache.delete(token)
    }
    return null
  }
}

/**
 * Fetches all active sessions for a user (called by limit screen)
 */
export async function getActiveSessionsForUser(userId: string) {
  try {
    await connectToDatabase()
    const sessions = await UserSession.find({ user_id: userId, is_active: true }).sort({ last_active: -1 })
    return JSON.parse(JSON.stringify(sessions))
  } catch (e) {
    return []
  }
}
