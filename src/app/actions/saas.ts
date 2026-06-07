'use server'

import { connectToDatabase } from '@/lib/mongodb'
import { User, ArchivedAgent, UserSession } from '@/models'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from './auth'

import { type SubscriptionPlan, PLAN_PRICES } from '@/lib/saas-constants'

/**
 * Calculates start, end, and grace dates for a subscription plan
 */
export async function calculateSubscriptionDates(plan: SubscriptionPlan, customEnd?: Date) {
  const start = new Date()
  let end = new Date()

  switch (plan) {
    case 'demo':
      end.setDate(start.getDate() + 7)
      break
    case 'basic':
      end.setMonth(start.getMonth() + 6)
      break
    case 'premium':
      end.setFullYear(start.getFullYear() + 1)
      break
    case 'enterprise':
      end.setFullYear(start.getFullYear() + 2)
      break
    case 'custom':
      if (customEnd) {
        end = new Date(customEnd)
      } else {
        end.setDate(start.getDate() + 30) // Default to 30 days if unspecified
      }
      break
  }

  // Grace period is exactly 7 days after expiry
  const grace = new Date(end)
  grace.setDate(end.getDate() + 7)

  return { start, end, grace }
}

/**
 * Super Admin Auth Guard
 */
async function ensureSuperAdmin() {
  const user = await getSessionUser()
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    throw new Error('Unauthorized: Super Admin access required')
  }
  return user
}

/**
 * Automatic background check & cleanup of expired accounts after 7-day grace period
 * Before deletion, agent's profile details are saved to ArchivedAgent collection.
 */
export async function checkAndCleanupExpiredAgents(): Promise<{ cleaned: number }> {
  try {
    await connectToDatabase()
    const now = new Date()

    // Find all agents where subscription expired AND grace period has ended
    const toDelete = await User.find({
      role: 'agent',
      grace_period_end: { $lte: now }
    })

    let cleaned = 0
    for (const agent of toDelete) {
      // 1. Save to ArchivedAgent collection (Backup data to archive collection)
      await ArchivedAgent.create({
        original_id: agent._id.toString(),
        name: agent.name,
        email: agent.email,
        mobile: agent.mobile,
        role: agent.role,
        subscription_plan: agent.subscription_plan,
        subscription_start: agent.subscription_start,
        subscription_end: agent.subscription_end,
        reason: `Auto-deleted after grace period ended. Expiry: ${agent.subscription_end?.toISOString()}`
      })

      // 2. Delete the user
      await User.findByIdAndDelete(agent._id)
      cleaned++
    }

    // Update statuses of other agents whose subscription is past end date but within grace period
    const toExpire = await User.find({
      role: 'agent',
      subscription_end: { $lt: now },
      subscription_status: { $ne: 'expired' }
    })

    for (const agent of toExpire) {
      agent.subscription_status = 'expired'
      await agent.save()
    }

    return { cleaned }
  } catch (error) {
    console.error('Error during auto-cleanup of expired agents:', error)
    return { cleaned: 0 }
  }
}

/**
 * Fetches dashboard statistics for Super Admin
 */
export async function getSuperAdminDashboardStats() {
  await ensureSuperAdmin()
  await connectToDatabase()

  // Run cleanup job first so stats are accurate
  await checkAndCleanupExpiredAgents()

  const allAgents = await User.find({ role: 'agent' })
  const now = new Date()

  let activeCount = 0
  let expiredCount = 0
  let demoCount = 0
  let renewalsDue = 0
  let totalRevenue = 0

  allAgents.forEach(agent => {
    // Check active
    const isExpired = agent.subscription_end && now > new Date(agent.subscription_end)
    const isPlanActive = agent.active && !isExpired

    if (isPlanActive) activeCount++
    if (isExpired) expiredCount++

    // Check demo plan
    if (agent.subscription_plan === 'demo') demoCount++

    // Renewals due in the next 30 days
    if (agent.subscription_end) {
      const expiry = new Date(agent.subscription_end)
      const diffTime = expiry.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays <= 30) {
        renewalsDue++
      }
    }

    // Revenue calculation based on assigned plan price
    const plan = (agent.subscription_plan || 'demo') as SubscriptionPlan
    totalRevenue += PLAN_PRICES[plan] || 0
  })

  return {
    totalAgents: allAgents.length,
    activeAgents: activeCount,
    expiredAgents: expiredCount,
    demoAccounts: demoCount,
    renewalsDue,
    revenueSummary: totalRevenue
  }
}

/**
 * Get paginated & filtered Agents list
 */
export async function getAgentsList(query?: {
  search?: string
  status?: string
  plan?: string
}) {
  await ensureSuperAdmin()
  await connectToDatabase()

  // Auto clean first
  await checkAndCleanupExpiredAgents()

  const filter: any = { role: 'agent' }

  if (query?.search) {
    const s = new RegExp(query.search, 'i')
    filter.$or = [{ name: s }, { email: s }, { mobile: s }]
  }

  if (query?.status) {
    if (query.status === 'active') {
      filter.active = true
      filter.subscription_status = { $ne: 'expired' }
    } else if (query.status === 'expired') {
      filter.subscription_status = 'expired'
    } else if (query.status === 'inactive') {
      filter.active = false
    }
  }

  if (query?.plan) {
    filter.subscription_plan = query.plan
  }

  const agents = await User.find(filter).sort({ createdAt: -1 })
  return JSON.parse(JSON.stringify(agents))
}

/**
 * Create a new Agent account with a subscription plan
 */
export async function createAgent(formData: FormData) {
  await ensureSuperAdmin()
  await connectToDatabase()

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const mobile = String(formData.get('mobile') ?? '').trim()
  const plan = String(formData.get('plan') ?? 'demo') as SubscriptionPlan
  const customExpiryStr = String(formData.get('customExpiry') ?? '')

  if (!name || !email || !password) {
    return { success: false, error: 'Name, email, and password are required' }
  }

  const existing = await User.findOne({ email })
  if (existing) {
    return { success: false, error: 'Agent with this email already exists' }
  }

  let customExpiryDate: Date | undefined
  if (plan === 'custom' && customExpiryStr) {
    customExpiryDate = new Date(customExpiryStr)
  }

  const { start, end, grace } = await calculateSubscriptionDates(plan, customExpiryDate)
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const newAgent = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'agent',
      active: true,
      mobile: mobile || undefined,
      subscription_plan: plan,
      subscription_start: start,
      subscription_end: end,
      grace_period_end: grace,
      subscription_status: 'active'
    })

    revalidatePath('/agent-management')
    return { success: true, agent: JSON.parse(JSON.stringify(newAgent)) }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create Agent account' }
  }
}

/**
 * Update Agent core details (non-subscription parameters)
 */
export async function updateAgent(id: string, formData: FormData) {
  await ensureSuperAdmin()
  await connectToDatabase()

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const mobile = String(formData.get('mobile') ?? '').trim()
  const activeVal = formData.get('active')

  if (!name || !email) {
    return { success: false, error: 'Name and email are required' }
  }

  try {
    const agent = await User.findById(id)
    if (!agent) return { success: false, error: 'Agent not found' }

    agent.name = name
    agent.email = email
    agent.mobile = mobile || undefined
    if (activeVal !== null) {
      agent.active = activeVal === 'true'
      if (!agent.active) {
        agent.active_sessions = [] // Force instant logout of all devices on deactivation
        await UserSession.updateMany({ user_id: id }, { is_active: false })
      }
    }

    await agent.save()
    revalidatePath('/agent-management')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update Agent account' }
  }
}

/**
 * Renew Agent Subscription
 */
export async function renewAgentSubscription(
  id: string,
  plan: SubscriptionPlan,
  customExpiryStr?: string
) {
  await ensureSuperAdmin()
  await connectToDatabase()

  try {
    const agent = await User.findById(id)
    if (!agent) return { success: false, error: 'Agent not found' }

    let customDate: Date | undefined
    if (plan === 'custom' && customExpiryStr) {
      customDate = new Date(customExpiryStr)
    }

    const { start, end, grace } = await calculateSubscriptionDates(plan, customDate)

    agent.subscription_plan = plan
    agent.subscription_start = start
    agent.subscription_end = end
    agent.grace_period_end = grace
    agent.subscription_status = 'active'
    agent.active = true // Re-activate upon renewal

    await agent.save()
    revalidatePath('/agent-management')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to renew subscription' }
  }
}

/**
 * Toggle Agent Activation Status (Suspend/Unsuspend)
 */
export async function toggleAgentActivation(id: string) {
  await ensureSuperAdmin()
  await connectToDatabase()

  try {
    const agent = await User.findById(id)
    if (!agent) return { success: false, error: 'Agent not found' }

    agent.active = !agent.active
    if (!agent.active) {
      agent.active_sessions = [] // Force instant logout of all devices on deactivation
      await UserSession.updateMany({ user_id: id }, { is_active: false })
    }
    await agent.save()
    revalidatePath('/agent-management')
    return { success: true, active: agent.active }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle activation status' }
  }
}

/**
 * Delete Agent immediately (Super Admin force delete)
 * Creates backup in archive first.
 */
export async function deleteAgent(id: string) {
  await ensureSuperAdmin()
  await connectToDatabase()

  try {
    const agent = await User.findById(id)
    if (!agent) return { success: false, error: 'Agent not found' }

    // 1. Create Archive Backup
    await ArchivedAgent.create({
      original_id: agent._id.toString(),
      name: agent.name,
      email: agent.email,
      mobile: agent.mobile,
      role: agent.role,
      subscription_plan: agent.subscription_plan,
      subscription_start: agent.subscription_start,
      subscription_end: agent.subscription_end,
      reason: 'Manually deleted by Super Admin'
    })

    // 2. Delete Agent & Sessions
    await User.findByIdAndDelete(id)
    await UserSession.deleteMany({ user_id: id })
    revalidatePath('/agent-management')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete Agent account' }
  }
}

/**
 * Super Admin Action: Fetches all active sessions for a given Agent
 */
export async function getAgentActiveSessions(agentId: string) {
  await ensureSuperAdmin()
  await connectToDatabase()
  try {
    const sessions = await UserSession.find({ user_id: agentId, is_active: true }).sort({ last_active: -1 })
    return { success: true, sessions: JSON.parse(JSON.stringify(sessions)) }
  } catch (e: any) {
    return { success: false, error: e.message, sessions: [] }
  }
}

/**
 * Super Admin Action: Force log out a specific session device
 */
export async function forceLogoutSession(sessionId: string) {
  await ensureSuperAdmin()
  await connectToDatabase()
  try {
    await UserSession.findByIdAndUpdate(sessionId, { is_active: false })
    revalidatePath('/agent-management')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Super Admin Action: Force log out ALL devices of an Agent
 */
export async function forceLogoutAllSessions(agentId: string) {
  await ensureSuperAdmin()
  await connectToDatabase()
  try {
    await UserSession.updateMany({ user_id: agentId }, { is_active: false })
    revalidatePath('/agent-management')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

