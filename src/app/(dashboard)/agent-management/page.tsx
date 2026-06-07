'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  getAgentsList, createAgent, updateAgent, deleteAgent, 
  toggleAgentActivation, renewAgentSubscription,
  getAgentActiveSessions, forceLogoutSession, forceLogoutAllSessions
} from '@/app/actions/saas'
import { type SubscriptionPlan, PLAN_PRICES } from '@/lib/saas-constants'
import { 
  Search, Filter, ShieldAlert, Plus, Download, Edit2, 
  Trash2, RefreshCw, ToggleLeft, ToggleRight, X, Calendar, Check, Info, Monitor, Smartphone, Network, Clock
} from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function AgentManagementPage() {
  const { locale } = useLanguage()
  const hi = locale === 'hi'

  // State Management
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isRenewOpen, setIsRenewOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<any | null>(null)
  const [detailsAgent, setDetailsAgent] = useState<any | null>(null)

  // Status Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Form states
  const [createPlan, setCreatePlan] = useState<SubscriptionPlan>('demo')
  const [renewPlan, setRenewPlan] = useState<SubscriptionPlan>('basic')

  // Sessions State
  const [agentSessions, setAgentSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [searchQuery, statusFilter, planFilter])

  async function loadAgents() {
    setLoading(true)
    try {
      const data = await getAgentsList({
        search: searchQuery,
        status: statusFilter,
        plan: planFilter
      })
      setAgents(data)
    } catch (e: any) {
      triggerAlert('error', e.message || 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  function triggerAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 5000)
  }

  // Create Agent Submit handler
  async function handleCreateAgent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('plan', createPlan)

    try {
      const res = await createAgent(formData)
      if (res.success) {
        triggerAlert('success', hi ? 'एजेंट सफलतापूर्वक बनाया गया!' : 'Agent account created successfully!')
        setIsCreateOpen(false)
        loadAgents()
      } else {
        triggerAlert('error', res.error || 'Failed to create agent')
      }
    } catch (err: any) {
      triggerAlert('error', err.message || 'Operation failed')
    }
  }

  // Edit Agent Submit handler
  async function handleEditAgent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!currentAgent) return
    const formData = new FormData(e.currentTarget)

    try {
      const res = await updateAgent(currentAgent.id, formData)
      if (res.success) {
        triggerAlert('success', hi ? 'एजेंट विवरण अपडेट कर दिया गया!' : 'Agent details updated successfully!')
        setIsEditOpen(false)
        loadAgents()
      } else {
        triggerAlert('error', res.error || 'Failed to update agent')
      }
    } catch (err: any) {
      triggerAlert('error', err.message || 'Operation failed')
    }
  }

  // Toggle Activation Status handler
  async function handleToggleActivation(id: string) {
    try {
      const res = await toggleAgentActivation(id)
      if (res.success) {
        triggerAlert('success', res.active 
          ? (hi ? 'एजेंट खाता सक्रिय कर दिया गया!' : 'Agent account activated successfully!')
          : (hi ? 'एजेंट खाता निष्क्रिय कर दिया गया!' : 'Agent account suspended successfully!')
        )
        loadAgents()
      } else {
        triggerAlert('error', res.error || 'Failed to update activation status')
      }
    } catch (err: any) {
      triggerAlert('error', err.message || 'Operation failed')
    }
  }

  // Renew Subscription handler
  async function handleRenewSubscription(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!currentAgent) return
    const formData = new FormData(e.currentTarget)
    const plan = renewPlan
    const customExpiry = String(formData.get('customExpiry') || '')

    try {
      const res = await renewAgentSubscription(currentAgent.id, plan, customExpiry)
      if (res.success) {
        triggerAlert('success', hi ? 'सदस्यता सफलतापूर्वक नवीनीकृत की गई!' : 'Subscription renewed successfully!')
        setIsRenewOpen(false)
        loadAgents()
      } else {
        triggerAlert('error', res.error || 'Renewal failed')
      }
    } catch (err: any) {
      triggerAlert('error', err.message || 'Operation failed')
    }
  }

  // Force Delete handler
  async function handleDeleteAgent(id: string, name: string) {
    const confirmed = window.confirm(
      hi 
        ? `क्या आप वाकई "${name}" को हटाना चाहते हैं? हटाने से पहले सभी विवरण आर्काइव में बैकअप हो जाएंगे।`
        : `Are you sure you want to delete "${name}"? Details will be backed up to the archive before deletion.`
    )
    if (!confirmed) return

    try {
      const res = await deleteAgent(id)
      if (res.success) {
        triggerAlert('success', hi ? 'एजेंट खाता हटाया गया और आर्काइव किया गया!' : 'Agent deleted and archived successfully!')
        loadAgents()
      } else {
        triggerAlert('error', res.error || 'Failed to delete agent')
      }
    } catch (err: any) {
      triggerAlert('error', err.message || 'Operation failed')
    }
  }

  // Active Sessions Load & Telemetry handlers
  async function loadAgentSessions(agentId: string) {
    setLoadingSessions(true)
    try {
      const res = await getAgentActiveSessions(agentId)
      if (res.success) {
        setAgentSessions(res.sessions || [])
      } else {
        triggerAlert('error', res.error || 'Failed to fetch sessions')
      }
    } catch (e: any) {
      triggerAlert('error', e.message || 'Failed to load sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  async function handleForceLogoutSession(sessionId: string) {
    if (!detailsAgent) return
    const confirmed = window.confirm(
      hi 
        ? 'क्या आप इस डिवाइस सत्र को समाप्त करना चाहते हैं?' 
        : 'Are you sure you want to terminate this active device session?'
    )
    if (!confirmed) return

    try {
      const res = await forceLogoutSession(sessionId)
      if (res.success) {
        triggerAlert('success', hi ? 'सत्र सफलतापूर्वक समाप्त हो गया!' : 'Session terminated successfully!')
        loadAgentSessions(detailsAgent.id)
      } else {
        triggerAlert('error', res.error || 'Failed to terminate session')
      }
    } catch (e: any) {
      triggerAlert('error', e.message || 'Operation failed')
    }
  }

  async function handleForceLogoutAll(agentId: string) {
    const confirmed = window.confirm(
      hi 
        ? 'क्या आप इस एजेंट के सभी सक्रिय डिवाइस सत्रों को समाप्त करना चाहते हैं?' 
        : 'Are you sure you want to terminate all active sessions for this agent?'
    )
    if (!confirmed) return

    try {
      const res = await forceLogoutAllSessions(agentId)
      if (res.success) {
        triggerAlert('success', hi ? 'सभी सत्र सफलतापूर्वक समाप्त हो गए!' : 'All sessions terminated successfully!')
        loadAgentSessions(agentId)
      } else {
        triggerAlert('error', res.error || 'Failed to terminate all sessions')
      }
    } catch (e: any) {
      triggerAlert('error', e.message || 'Operation failed')
    }
  }

  // Export to Excel
  function exportAgents() {
    if (agents.length === 0) return
    const exportData = agents.map(a => ({
      'Name': a.name,
      'Email': a.email,
      'Mobile': a.mobile || 'N/A',
      'Plan': a.subscription_plan?.toUpperCase(),
      'Status': a.subscription_status?.toUpperCase(),
      'Is Active': a.active ? 'YES' : 'NO',
      'Subscription Start': new Date(a.subscription_start).toLocaleDateString(),
      'Subscription End': new Date(a.subscription_end).toLocaleDateString(),
      'Grace End Date': new Date(a.grace_period_end).toLocaleDateString(),
      'Pricing Tier (INR)': PLAN_PRICES[a.subscription_plan as SubscriptionPlan] || 0
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Agents')
    XLSX.writeFile(wb, `sharma_dairy_agents_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Calculated properties
  const plans: { value: SubscriptionPlan; label: string; desc: string }[] = [
    { value: 'demo', label: hi ? 'डेमो (7 दिन)' : 'Demo (7 Days)', desc: '₹0' },
    { value: 'basic', label: hi ? 'बेसिक (6 महीने)' : 'Basic (6 Months)', desc: '₹2,500' },
    { value: 'premium', label: hi ? 'प्रीमियम (1 वर्ष)' : 'Premium (1 Year)', desc: '₹4,500' },
    { value: 'enterprise', label: hi ? 'एंटरप्राइज (2 वर्ष)' : 'Enterprise (2 Years)', desc: '₹8,000' },
    { value: 'custom', label: hi ? 'कस्टम अवधि' : 'Custom Expiry', desc: '₹15,000' }
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight sm:text-3xl">
            👥 {hi ? 'एजेंट प्रबंधन' : 'Agent Management Console'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {hi ? 'डेयरी एजेंटों, उनकी योजनाओं, अवधियों और सक्रियता स्थिति को नियंत्रित करें।' : 'Provision dairy agents, configure subscription tiers, manage activation states, and handle renewals.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportAgents} variant="outline" className="border-slate-200 hover:bg-slate-50 font-semibold bg-white shadow-xs">
            <Download className="mr-2 h-4 w-4 text-slate-500" /> {hi ? 'एक्सपोर्ट' : 'Export Excel'}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md">
            <Plus className="mr-2 h-4 w-4" /> {hi ? 'नया एजेंट' : 'Create Agent'}
          </Button>
        </div>
      </div>

      {/* Alert Notice */}
      {alert && (
        <div className={`p-4 rounded-xl border text-sm font-bold shadow-sm animate-in fade-in duration-200 ${
          alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {alert.msg}
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="rounded-2xl border border-white bg-white/70 p-4 shadow-sm backdrop-blur-md grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <Input 
            placeholder={hi ? 'नाम, ईमेल या मोबाइल खोजें...' : 'Search by name, email or mobile number...'} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-slate-200 text-sm"
          />
        </div>

        {/* Plan Filter */}
        <div className="sm:col-span-3">
          <select 
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs focus:outline-none font-semibold text-slate-600"
          >
            <option value="">🎯 {hi ? 'सभी योजनाएं' : 'All Tiers'}</option>
            <option value="demo">Demo (7 Days)</option>
            <option value="basic">Basic (6 Months)</option>
            <option value="premium">Premium (1 Year)</option>
            <option value="enterprise">Enterprise (2 Years)</option>
            <option value="custom">Custom Tiers</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs focus:outline-none font-semibold text-slate-600"
          >
            <option value="">⚙️ {hi ? 'सभी स्थिति' : 'All Statuses'}</option>
            <option value="active">{hi ? 'सक्रिय' : 'Active'}</option>
            <option value="expired">{hi ? 'समाप्त' : 'Expired'}</option>
            <option value="inactive">{hi ? 'निलंबित / निष्क्रिय' : 'Suspended'}</option>
          </select>
        </div>
      </div>

      {/* Agents Table List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500 animate-pulse font-bold">{hi ? 'लोड हो रहा है...' : 'Refreshing Agent profiles...'}</div>
        ) : agents.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-medium">
            <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            {hi ? 'कोई एजेंट नहीं मिला।' : 'No agents matched your search query.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">{hi ? 'नाम / विवरण' : 'Name / Details'}</th>
                  <th className="px-6 py-4">{hi ? 'मोबाइल' : 'Mobile'}</th>
                  <th className="px-6 py-4">{hi ? 'योजना' : 'Plan'}</th>
                  <th className="px-6 py-4">{hi ? 'शुरुआत / समाप्ति' : 'Subscription Duration'}</th>
                  <th className="px-6 py-4">{hi ? 'आर्काइव की तारीख' : 'Grace Expiry'}</th>
                  <th className="px-6 py-4">{hi ? 'स्थिति' : 'Status'}</th>
                  <th className="px-6 py-4 text-right">{hi ? 'कार्य' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {agents.map((agent) => {
                  const isExpired = agent.subscription_status === 'expired'
                  const isSuspended = !agent.active

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4.5">
                        <div>
                          <p className="font-bold text-slate-800">{agent.name}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{agent.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 font-medium text-slate-500">{agent.mobile || '—'}</td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          agent.subscription_plan === 'demo' ? 'bg-indigo-50 text-indigo-700' :
                          agent.subscription_plan === 'basic' ? 'bg-blue-50 text-blue-700' :
                          agent.subscription_plan === 'premium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          agent.subscription_plan === 'enterprise' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {agent.subscription_plan?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="text-xs space-y-0.5 font-semibold text-slate-500">
                          <p>▶ {new Date(agent.subscription_start).toLocaleDateString()}</p>
                          <p className={isExpired ? 'text-rose-500 font-bold' : ''}>
                            🛑 {new Date(agent.subscription_end).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-xs font-bold text-slate-400">
                        {new Date(agent.grace_period_end).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isSuspended ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          isExpired ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isSuspended ? (hi ? 'निलंबित' : 'Suspended') :
                           isExpired ? (hi ? 'समाप्त' : 'Expired') :
                           (hi ? 'सक्रिय' : 'Active')}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2 md:gap-1.5">
                          {/* View Telemetry Details */}
                          <button 
                            onClick={() => {
                              setCurrentAgent(agent)
                              setDetailsAgent(agent)
                              setIsDetailsOpen(true)
                              loadAgentSessions(agent.id)
                            }}
                            title="View Telemetry & Active Devices"
                            className="p-2 md:p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                          >
                            <Info className="h-4.5 w-4.5" />
                          </button>

                          {/* Toggle Activation */}
                          <button 
                            onClick={() => handleToggleActivation(agent.id)}
                            title={agent.active ? 'Suspend Account' : 'Activate Account'}
                            className={`p-2 md:p-1.5 rounded-lg border transition ${
                              agent.active 
                                ? 'border-emerald-100 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100' 
                                : 'border-rose-100 text-rose-600 bg-rose-50/50 hover:bg-rose-100'
                            }`}
                          >
                            {agent.active ? <ToggleRight className="h-4.5 w-4.5" /> : <ToggleLeft className="h-4.5 w-4.5" />}
                          </button>

                          {/* Renew Subscription */}
                          <button 
                            onClick={() => {
                              setCurrentAgent(agent)
                              setIsRenewOpen(true)
                            }}
                            title="Renew Subscription"
                            className="p-2 md:p-1.5 rounded-lg border border-amber-100 text-amber-600 bg-amber-50/50 hover:bg-amber-100 transition"
                          >
                            <RefreshCw className="h-4.5 w-4.5" />
                          </button>

                          {/* Edit Details */}
                          <button 
                            onClick={() => {
                              setCurrentAgent(agent)
                              setIsEditOpen(true)
                            }}
                            title="Edit Agent Profile"
                            className="p-2 md:p-1.5 rounded-lg border border-blue-100 text-blue-600 bg-blue-50/50 hover:bg-blue-100 transition"
                          >
                            <Edit2 className="h-4.5 w-4.5" />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            title="Delete Agent & Archive Data"
                            className="p-2 md:p-1.5 rounded-lg border border-slate-100 text-slate-500 bg-slate-50 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE AGENT DIALOG ────────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent showCloseButton={false} className="max-w-md md:max-w-3xl w-full p-4 sm:p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 outline-none">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 mb-4 space-y-0">
            <DialogTitle className="text-xl font-bold text-slate-800">
              👤 {hi ? 'नया डेयरी एजेंट खाता' : 'Provision New Agent Account'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsCreateOpen(false)}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <form onSubmit={handleCreateAgent} className="space-y-4">
            {/* Scrollable container for fields on mobile */}
            <div className="max-h-[60vh] md:max-h-none overflow-y-auto md:overflow-visible pr-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create_name">{hi ? 'पूरा नाम' : 'Full Name'}</Label>
                  <Input id="create_name" name="name" required className="bg-slate-50 border-slate-200" placeholder="e.g. Ram Prasad" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create_email">{hi ? 'ईमेल' : 'Email Address'}</Label>
                  <Input id="create_email" type="email" name="email" required className="bg-slate-50 border-slate-200" placeholder="ram@dairy.com" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create_pass">{hi ? 'पासवर्ड' : 'Secure Password'}</Label>
                  <Input id="create_pass" type="password" name="password" required className="bg-slate-50 border-slate-200" placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create_mob">{hi ? 'मोबाइल नंबर (वैकल्पिक)' : 'Mobile Number (Optional)'}</Label>
                  <Input id="create_mob" name="mobile" className="bg-slate-50 border-slate-200" placeholder="+91 98765 43210" />
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label className="font-bold text-slate-700">{hi ? 'सदस्यता प्लान का चयन करें' : 'Select Subscription Plan'}</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {plans.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setCreatePlan(p.value)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                        createPlan === p.value 
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold ring-2 ring-blue-500/20' 
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="text-xs uppercase tracking-wide">{p.label}</span>
                      <span className="text-base font-black mt-1">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {createPlan === 'custom' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-3 duration-200">
                  <Label htmlFor="create_expiry" className="flex items-center gap-1.5 text-blue-700 font-bold">
                    <Calendar className="h-4 w-4" /> {hi ? 'कस्टम समाप्ति तिथि' : 'Custom Expiry Date'}
                  </Label>
                  <Input id="create_expiry" type="date" name="customExpiry" required className="bg-blue-50/30 border-blue-200" />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end border-t pt-4 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-200 hover:bg-slate-50 font-semibold bg-white hidden sm:inline-flex">
                {hi ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md w-full sm:w-auto">
                🚀 {hi ? 'खाता बनाएं' : 'Deploy Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT AGENT DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={isEditOpen && !!currentAgent} onOpenChange={(open) => { if (!open) setIsEditOpen(false) }}>
        <DialogContent showCloseButton={false} className="max-w-md w-full p-4 sm:p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 outline-none">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 mb-4 space-y-0">
            <DialogTitle className="text-xl font-bold text-slate-800">
              📝 {hi ? 'एजेंट खाता संपादित करें' : 'Edit Agent Profile'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsEditOpen(false)}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {currentAgent && (
            <form onSubmit={handleEditAgent} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit_name">{hi ? 'पूरा नाम' : 'Full Name'}</Label>
                <Input id="edit_name" name="name" defaultValue={currentAgent.name} required className="bg-slate-50 border-slate-200 font-bold" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_email">{hi ? 'ईमेल' : 'Email Address'}</Label>
                <Input id="edit_email" type="email" name="email" defaultValue={currentAgent.email} required className="bg-slate-50 border-slate-200" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_mob">{hi ? 'मोबाइल नंबर (वैकल्पिक)' : 'Mobile Number (Optional)'}</Label>
                <Input id="edit_mob" name="mobile" defaultValue={currentAgent.mobile || ''} className="bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit_status">{hi ? 'खाता स्थिति' : 'Account Activation State'}</Label>
                <select 
                  id="edit_status" 
                  name="active" 
                  defaultValue={currentAgent.active ? 'true' : 'false'}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm shadow-xs focus:outline-none font-bold text-slate-700"
                >
                  <option value="true">🟢 Active (Normal Operation)</option>
                  <option value="false">🔴 Suspended (Block Access)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end border-t pt-4 mt-6">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md w-full sm:w-auto">
                  ✓ {hi ? 'अपडेट सहेजें' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── RENEW SUBSCRIPTION DIALOG ─────────────────────────────────────── */}
      <Dialog open={isRenewOpen && !!currentAgent} onOpenChange={(open) => { if (!open) setIsRenewOpen(false) }}>
        <DialogContent showCloseButton={false} className="max-w-md w-full p-4 sm:p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 outline-none">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 mb-4 space-y-0">
            <DialogTitle className="text-xl font-bold text-slate-800">
              🔄 {hi ? 'सदस्यता नवीनीकरण' : 'Renew Subscription Plan'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsRenewOpen(false)}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {currentAgent && (
            <div>
              <p className="text-xs text-slate-500 mb-4 font-semibold">
                {hi ? 'एजेंट:' : 'Operator:'} <span className="text-blue-700">{currentAgent.name} ({currentAgent.email})</span>
              </p>

              <form onSubmit={handleRenewSubscription} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">{hi ? 'नया प्लान चुनें' : 'Select Renewal Plan'}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {plans.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setRenewPlan(p.value)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                          renewPlan === p.value 
                            ? 'border-amber-500 bg-amber-50/50 text-amber-800 font-bold ring-2 ring-amber-500/20' 
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wide">{p.label}</span>
                        <span className="text-base font-black mt-1">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {renewPlan === 'custom' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-3 duration-200">
                    <Label htmlFor="renew_expiry" className="flex items-center gap-1.5 text-amber-700 font-bold">
                      <Calendar className="h-4 w-4" /> {hi ? 'नवीनीकरण समाप्ति तिथि' : 'New Custom Expiry Date'}
                    </Label>
                    <Input id="renew_expiry" type="date" name="customExpiry" required className="bg-amber-50/30 border-amber-200" />
                  </div>
                )}

                <div className="flex gap-3 justify-end border-t pt-4 mt-6">
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 shadow-md w-full sm:w-auto">
                    ✓ {hi ? 'नवीनीकरण सक्रिय करें' : 'Process Renewal'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── AGENT DETAILS & SESSIONS TELEMETRY DIALOG ─────────────────────── */}
      <Dialog open={isDetailsOpen && !!detailsAgent} onOpenChange={(open) => { if (!open) setIsDetailsOpen(false) }}>
        <DialogContent showCloseButton={false} className="max-w-md lg:max-w-5xl w-full p-4 sm:p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 outline-none">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 mb-4 space-y-0">
            <DialogTitle className="text-xl font-bold text-slate-800 font-sans flex items-center gap-1">
              🛡️ {hi ? 'एजेंट विवरण और सक्रिय डिवाइस सत्र' : 'Agent Telemetry & Active Sessions'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsDetailsOpen(false)}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {detailsAgent && (
            // Scrollable wrapper on mobile/PWA
            <div className="max-h-[70vh] lg:max-h-none overflow-y-auto lg:overflow-visible pr-1 space-y-6 font-sans">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left side: Profile Overview and Control - stacked vertically */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Profile & Subscription Info */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                    <div className="text-[11px] font-bold text-[#3b4e66] uppercase tracking-wider">
                      {hi ? 'प्रोफाइल और सदस्यता विवरण' : 'Profile & Subscription'}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-800 text-base">{detailsAgent.name}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{detailsAgent.email}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">📱 {detailsAgent.mobile || 'No mobile'}</p>
                    </div>
                    
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500">{hi ? 'सदस्यता प्लान:' : 'Plan Tier:'}</span>
                        <span className="uppercase text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                          {detailsAgent.subscription_plan}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500">{hi ? 'प्रारंभ तिथि:' : 'Start Date:'}</span>
                        <span className="text-slate-700">{new Date(detailsAgent.subscription_start).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500">{hi ? 'समाप्ति तिथि:' : 'Expiry Date:'}</span>
                        <span className={`text-slate-700 ${detailsAgent.subscription_status === 'expired' ? 'text-rose-500 font-bold' : ''}`}>
                          {new Date(detailsAgent.subscription_end).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Operations & Status Control */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                    <div className="space-y-3 text-left">
                      <div className="text-[11px] font-bold text-[#3b4e66] uppercase tracking-wider">
                        {hi ? 'स्थिति और संचालन' : 'Status & Operations'}
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">{hi ? 'खाता स्थिति:' : 'Account State:'}</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          !detailsAgent.active ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          detailsAgent.subscription_status === 'expired' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {!detailsAgent.active ? (hi ? 'निलंबित' : 'Suspended') :
                           detailsAgent.subscription_status === 'expired' ? (hi ? 'समाप्त' : 'Expired') :
                           (hi ? 'सक्रिय' : 'Active')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500">{hi ? 'सक्रिय डिवाइस सीमा:' : 'Active Device Limit:'}</span>
                        <span className="text-slate-700 font-bold">2 Devices Max</span>
                      </div>
                    </div>

                    <div className="border-t pt-3 flex flex-col gap-1.5 mt-4">
                      {/* Deactivate/Activate Quick Toggle */}
                      <Button 
                        onClick={() => {
                          handleToggleActivation(detailsAgent.id).then(() => {
                            setDetailsAgent((prev: any) => prev ? { ...prev, active: !prev.active } : null)
                          })
                        }}
                        className={`w-full text-xs font-bold h-9 shadow-xs bg-white hover:bg-slate-50 border ${
                          detailsAgent.active 
                            ? 'border-rose-200 text-rose-700'
                            : 'border-emerald-200 text-emerald-700'
                        }`}
                      >
                        {detailsAgent.active ? (hi ? 'खाता निलंबित करें' : 'Suspend Account') : (hi ? 'खाता सक्रिय करें' : 'Activate Account')}
                      </Button>

                      <Button
                        onClick={() => handleForceLogoutAll(detailsAgent.id)}
                        className="w-full text-xs font-bold h-9 bg-slate-800 hover:bg-slate-900 text-white shadow-md"
                      >
                        🛑 {hi ? 'सभी लॉगआउट' : 'Logout all'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right side: Real-time Sessions Telemetry list */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#3b4e66] uppercase tracking-wider flex items-center gap-1.5">
                      <span>📡 {hi ? 'सक्रिय उपकरण सत्र' : 'Active Device Telemetry'}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {agentSessions.length} {hi ? 'सत्र' : 'Session(s)'}
                      </span>
                    </div>
                    <Button 
                      onClick={() => loadAgentSessions(detailsAgent.id)} 
                      variant="ghost" 
                      className="h-8 px-2.5 text-xs text-blue-600 hover:bg-blue-50 font-semibold bg-white border border-slate-100"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${loadingSessions ? 'animate-spin' : ''}`} />
                      {hi ? 'रिफ्रेश' : 'Refresh'}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[300px] lg:max-h-[340px] overflow-y-auto pr-1">
                    {loadingSessions ? (
                      [1, 2].map((i) => (
                        <div key={i} className="h-16 w-full rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />
                      ))
                    ) : agentSessions.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        {hi ? 'इस समय कोई सक्रिय सत्र नहीं है।' : 'No active sessions or logged-in devices detected.'}
                      </div>
                    ) : (
                      agentSessions.map((session, index) => {
                        const isOldest = index === agentSessions.length - 1
                        const isMobile = /android|iphone|ipad/i.test(session.platform)

                        return (
                          <div 
                            key={session.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition"
                          >
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 shrink-0">
                                {isMobile ? <Smartphone className="h-4.5 w-4.5" /> : <Monitor className="h-4.5 w-4.5" />}
                              </div>
                              
                              <div className="min-w-0 text-left flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800">{session.device_name}</span>
                                  {isOldest && agentSessions.length >= 2 && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
                                      Oldest
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5 font-mono flex-wrap">
                                  <span className="flex items-center gap-0.5">
                                    <Network className="h-3 w-3 shrink-0" /> {session.ip_address}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3 shrink-0" /> Active {new Date(session.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <Button
                              onClick={() => handleForceLogoutSession(session.id)}
                              className="h-8 px-3 text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-semibold w-full sm:w-auto"
                            >
                              {hi ? 'समाप्त करें' : 'Terminate'}
                            </Button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
