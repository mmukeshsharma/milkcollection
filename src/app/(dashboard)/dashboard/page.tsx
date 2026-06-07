'use client'

import { useState, useEffect } from 'react'
import { getCustomers } from '@/lib/customers-local'
import { getRecentPurchases } from '@/lib/purchases-local'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { getSessionUser } from '@/app/actions/auth'
import { getSuperAdminDashboardStats } from '@/app/actions/saas'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { 
  Users, CheckCircle, AlertTriangle, Play, Calendar, DollarSign, ArrowRight 
} from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<{ role: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const { locale } = useLanguage()
  const hi = locale === 'hi'

  // Agent States
  const [customers, setCustomers] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])

  // Super Admin States
  const [adminStats, setAdminStats] = useState<{
    totalAgents: number
    activeAgents: number
    expiredAgents: number
    demoAccounts: number
    renewalsDue: number
    revenueSummary: number
  } | null>(null)

  useEffect(() => {
    async function initDashboard() {
      try {
        const currUser = await getSessionUser()
        if (currUser) {
          setUser(currUser)

          if (currUser.role === 'super_admin' || currUser.role === 'admin') {
            const stats = await getSuperAdminDashboardStats()
            setAdminStats(stats)
          } else {
            const [c, p] = await Promise.all([getCustomers(), getRecentPurchases()])
            setCustomers(c.customers || [])
            setPurchases(p.purchases || [])
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    initDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-3 animate-pulse">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold text-sm">
            {hi ? 'डैशबोर्ड डेटा लोड हो रहा है...' : 'Loading dashboard telemetry...'}
          </p>
        </div>
      </div>
    )
  }

  // ── Render Super Admin Dashboard ──────────────────────────────────────────
  if (user?.role === 'super_admin' || user?.role === 'admin') {
    const stats = adminStats || {
      totalAgents: 0,
      activeAgents: 0,
      expiredAgents: 0,
      demoAccounts: 0,
      renewalsDue: 0,
      revenueSummary: 0
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 space-y-2">
            <span className="bg-white/20 text-white text-xs font-extrabold uppercase px-3 py-1 rounded-full backdrop-blur-md">
              {hi ? 'सास नियंत्रण केंद्र' : 'SaaS Control Center'}
            </span>
            <h1 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
              {hi ? `नमस्ते, ${user.name}!` : `Hello, ${user.name}!`}
            </h1>
            <p className="text-blue-100 max-w-xl text-sm sm:text-base font-medium">
              {hi 
                ? 'आपके सुपर एडमिन डैशबोर्ड पर आपका स्वागत है। सदस्यता ट्रैक करें, नवीनीकरण प्रबंधित करें और डेयरी ऑपरेटर विकास का विश्लेषण करें।'
                : 'Welcome back to your Super Admin dashboard. Track subscriptions, handle renewals, and analyze dairy operator growth.'}
            </p>
          </div>
          {/* Glassmorphic background shapes */}
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-blue-500/20 blur-xl" />
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Agents */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {hi ? 'कुल एजेंट' : 'Total Agents'}
                </p>
                <p className="text-3xl font-black text-slate-800">{stats.totalAgents}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-100">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-500" />
          </div>

          {/* Active Agents */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {hi ? 'सक्रिय सदस्य' : 'Active Subscribers'}
                </p>
                <p className="text-3xl font-black text-emerald-600">{stats.activeAgents}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500" />
          </div>

          {/* Expired Agents */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {hi ? 'समाप्त खाते' : 'Expired Accounts'}
                </p>
                <p className="text-3xl font-black text-rose-600">{stats.expiredAgents}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-rose-600 transition-colors group-hover:bg-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-rose-500" />
          </div>

          {/* Demo Accounts */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {hi ? 'डेमो / ट्रायल उपयोगकर्ता' : 'Demo / Trial Users'}
                </p>
                <p className="text-3xl font-black text-indigo-600">{stats.demoAccounts}</p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                <Play className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-500" />
          </div>

          {/* Renewals Due */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {hi ? 'नवीनीकरण देय (30 दिन)' : 'Renewals Due (30 Days)'}
                </p>
                <p className="text-3xl font-black text-amber-600">{stats.renewalsDue}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600 transition-colors group-hover:bg-amber-100">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-amber-500" />
          </div>

          {/* Revenue Summary */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-md hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {hi ? 'अनुबंध बुक मूल्य' : 'Contract Book Value'}
                </p>
                <p className="text-3xl font-black text-blue-700">₹{stats.revenueSummary.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700 transition-colors group-hover:bg-blue-100">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-700" />
          </div>
        </div>

        {/* Action Panel */}
        <div className="rounded-2xl border border-white bg-white/70 p-6 shadow-lg backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-6 items-center text-left">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {hi ? '⚡ सदस्यता और ऑपरेटर प्रबंधित करें' : '⚡ Manage Subscriptions & Operators'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {hi 
                ? 'ट्रायल खाते बनाएं, सदस्यता स्तरों को सक्रिय या निलंबित करें, मैन्युअल रूप से अनुबंधों का नवीनीकरण करें, और ऑडिट इतिहास लॉग की समीक्षा करें।'
                : 'Create trial accounts, activate or suspend subscription tiers, manually renew contracts, and review audit history logs.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
            <Link href="/agent-management">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 shadow-md flex items-center justify-center gap-2">
                {hi ? '📂 एजेंट प्रबंधन कंसोल' : '📂 Agent Management Console'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="w-full border-blue-200 hover:bg-blue-50 text-blue-700 font-bold bg-white/50">
                {hi ? '⚙️ सिस्टम सेटिंग्स' : '⚙️ System Settings'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Render Normal Agent Dairy Dashboard ───────────────────────────────────
  return <DashboardClient customers={customers} purchases={purchases} />
}
