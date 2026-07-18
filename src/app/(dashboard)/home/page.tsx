'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { getSessionUser } from '@/app/actions/auth'
import { STORES, dbGetAll } from '@/lib/local-db'
import { 
  Users, Milk, TrendingUp, ShoppingBag, CreditCard, 
  BookOpen, BarChart3, Package, Settings, Star, Search, ShieldAlert, BadgeAlert
} from 'lucide-react'

// Define module type
type ModuleItem = {
  key: string
  titleEn: string
  titleHi: string
  descEn: string
  descHi: string
  icon: string
  link: string
  gradient: string
  adminOnly?: boolean
  lucideIcon: any
}

export default function HomePage() {
  const { locale } = useLanguage()
  const hi = locale === 'hi'

  const [user, setUser] = useState<{ role: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([])
  
  // Database stats
  const [stats, setStats] = useState({
    customers: 0,
    purchasesToday: 0,
    salesToday: 0,
    pendingPayments: 0,
    inventoryItems: 0,
  })

  // Load user session & local IndexedDB data
  useEffect(() => {
    async function initPage() {
      try {
        const currUser = await getSessionUser()
        setUser(currUser)

        // Load stats from IndexedDB/localStorage
        const [allCustomers, allPurchases, allSales, allProducts, allPayments] = await Promise.all([
          dbGetAll(STORES.customers),
          dbGetAll(STORES.purchases),
          dbGetAll(STORES.sales),
          dbGetAll(STORES.products),
          dbGetAll(STORES.payments),
        ])

        const todayIso = new Date().toISOString().slice(0, 10)
        
        // Count today's purchases entries
        const todayPurchases = allPurchases.filter(
          (p: any) => (p.created_at || p.purchase_date || '').slice(0, 10) === todayIso
        )

        // Count today's sales entries
        const todaySales = allSales.filter(
          (s: any) => (s.created_at || s.sale_date || '').slice(0, 10) === todayIso
        )

        // Count today's payments entries
        const todayPayments = allPayments.filter(
          (pay: any) => (pay.created_at || pay.payment_date || '').slice(0, 10) === todayIso
        )

        setStats({
          customers: allCustomers.length,
          purchasesToday: todayPurchases.length,
          salesToday: todaySales.length,
          pendingPayments: todayPayments.length,
          inventoryItems: allProducts.length,
        })
      } catch (err) {
        console.error('Failed to load local stats for launcher:', err)
      } finally {
        setLoading(false)
      }
    }

    // Load pinned modules from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sharma_dairy_pinned_modules')
      if (saved) {
        try {
          setPinnedKeys(JSON.parse(saved))
        } catch (e) {
          console.error(e)
        }
      }
    }

    initPage()
  }, [])

  // Toggle pin/favorite handler
  const togglePin = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    let updated: string[]
    if (pinnedKeys.includes(key)) {
      updated = pinnedKeys.filter(k => k !== key)
    } else {
      updated = [...pinnedKeys, key]
    }
    
    setPinnedKeys(updated)
    localStorage.setItem('sharma_dairy_pinned_modules', JSON.stringify(updated))
  }

  // All available modules
  const allModules: ModuleItem[] = [
    {
      key: 'customers',
      titleEn: 'Customers',
      titleHi: 'किसान / ग्राहक',
      descEn: 'Manage customer profiles',
      descHi: 'प्रोफाइल और विवरण प्रबंधित करें',
      icon: '👥',
      link: '/members',
      gradient: 'from-blue-600 to-[#0084FF]',
      lucideIcon: Users
    },
    {
      key: 'purchase',
      titleEn: 'Milk Purchase',
      titleHi: 'दूध खरीद',
      descEn: 'Record milk collection',
      descHi: 'दूध का संग्रह रिकॉर्ड करें',
      icon: '🥛',
      link: '/purchase',
      gradient: 'from-cyan-500 to-blue-600',
      lucideIcon: Milk
    },
    {
      key: 'rates',
      titleEn: 'Rate Chart',
      titleHi: 'दर चार्ट',
      descEn: 'Configure milk rates',
      descHi: 'दूध की दरें निर्धारित करें',
      icon: '📈',
      link: '/milk-rates',
      gradient: 'from-teal-500 to-emerald-600',
      lucideIcon: TrendingUp
    },
    {
      key: 'sales',
      titleEn: 'Milk Sales',
      titleHi: 'दूध बिक्री',
      descEn: 'Record milk sales',
      descHi: 'दूध की फुटकर बिक्री दर्ज करें',
      icon: '🛍️',
      link: '/sale',
      gradient: 'from-indigo-500 to-purple-600',
      lucideIcon: ShoppingBag
    },
    {
      key: 'payments',
      titleEn: 'Payments',
      titleHi: 'भुगतान',
      descEn: 'Record farmer payouts',
      descHi: 'किसानों के भुगतान पर्चे सहेजें',
      icon: '💸',
      link: '/payments',
      gradient: 'from-amber-500 to-orange-500',
      lucideIcon: CreditCard
    },
    {
      key: 'passbook',
      titleEn: 'Passbook',
      titleHi: 'पासबुक',
      descEn: 'View customer ledgers',
      descHi: 'ग्राहक बहीखाता (खाता) देखें',
      icon: '📖',
      link: '/passbook',
      gradient: 'from-violet-500 to-fuchsia-500',
      lucideIcon: BookOpen
    },
    {
      key: 'reports',
      titleEn: 'Reports',
      titleHi: 'रिपोर्ट',
      descEn: 'View business analytics',
      descHi: 'व्यावसायिक रिपोर्ट और विवरण',
      icon: '📊',
      link: '/reports',
      gradient: 'from-emerald-500 to-teal-600',
      lucideIcon: BarChart3
    },
    {
      key: 'inventory',
      titleEn: 'Inventory',
      titleHi: 'स्टॉक और स्टोर',
      descEn: 'Manage store items',
      descHi: 'कैटल फीड और सप्लीमेंट्स बेचें',
      icon: '📦',
      link: '/inventory',
      gradient: 'from-rose-500 to-pink-500',
      lucideIcon: Package
    },
    {
      key: 'settings',
      titleEn: 'Settings',
      titleHi: 'सेटिंग्स',
      descEn: 'Configure dairy settings',
      descHi: 'सिस्टम सेटिंग्स कॉन्फ़िगर करें',
      icon: '⚙️',
      link: '/settings',
      gradient: 'from-slate-500 to-slate-700',
      lucideIcon: Settings
    },
    {
      key: 'staff',
      titleEn: 'Staff Management',
      titleHi: 'स्टाफ प्रबंधन',
      descEn: 'Manage employees',
      descHi: 'ऑपरेटर और सहायकों को प्रबंधित करें',
      icon: '👔',
      link: '/staff',
      gradient: 'from-cyan-600 to-teal-600',
      adminOnly: true,
      lucideIcon: Users
    },
    {
      key: 'subscriptions',
      titleEn: 'Subscriptions',
      titleHi: 'सदस्यता प्लान',
      descEn: 'Manage subscription plans',
      descHi: 'योजनाएं और वैधता स्थिति',
      icon: '💳',
      link: '/subscriptions',
      gradient: 'from-amber-600 to-yellow-600',
      adminOnly: true,
      lucideIcon: CreditCard
    },
    {
      key: 'agents',
      titleEn: 'Agent Management',
      titleHi: 'एजेंट प्रबंधन',
      descEn: 'Manage dairy operators',
      descHi: 'डेयरी एजेंटों का खाता नियंत्रित करें',
      icon: '🏢',
      link: '/agent-management',
      gradient: 'from-blue-800 to-indigo-950',
      adminOnly: true,
      lucideIcon: Users
    }
  ]

  // Filter modules based on Search & Role-based visibility
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin'
  
  const visibleModules = allModules.filter(m => {
    // Role filter
    if (m.adminOnly && !isAdmin) return false
    
    // Search query filter
    const title = hi ? m.titleHi : m.titleEn
    const desc = hi ? m.descHi : m.descEn
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    return (
      title.toLowerCase().includes(query) || 
      desc.toLowerCase().includes(query) || 
      m.key.toLowerCase().includes(query)
    )
  })

  // Sort modules: Favorites first, then alphabetical/original order
  const sortedModules = [...visibleModules].sort((a, b) => {
    const aPinned = pinnedKeys.includes(a.key)
    const bPinned = pinnedKeys.includes(b.key)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })

  // Helper to resolve card metadata dynamic counts
  const getCardStat = (key: string) => {
    switch (key) {
      case 'customers':
        return hi ? `${stats.customers} पंजीकृत` : `${stats.customers} Registered`
      case 'purchase':
        return hi ? `${stats.purchasesToday} प्रविष्टियां` : `${stats.purchasesToday} Entries`
      case 'sales':
        return hi ? `${stats.salesToday} बिक्री` : `${stats.salesToday} Sales`
      case 'payments':
        return hi ? `${stats.pendingPayments} भुगतान` : `${stats.pendingPayments} Payments`
      case 'inventory':
        return hi ? `${stats.inventoryItems} आइटम` : `${stats.inventoryItems} Items`
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3 animate-pulse">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold text-sm">
            {hi ? 'एप्लीकेशन लॉन्चर लोड हो रहा है...' : 'Loading application launcher...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 select-none px-2 sm:px-4">
      
      {/* Search Header panel */}
      <div className="relative rounded-3xl border border-white/50 bg-white/70 p-6 sm:p-8 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
        
        {/* Brand/Gretting info */}
        <div className="text-center md:text-left space-y-1 sm:space-y-2 max-w-lg shrink-0">
          <span className="bg-blue-100/60 text-blue-700 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border border-blue-200">
            🐄 {hi ? 'शर्मा डेयरी परिवार' : 'Sharma Dairy Ecosystem'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1.5 leading-none">
            {hi ? `नमस्ते, ${user?.name?.split(' ')[0]}!` : `Welcome, ${user?.name?.split(' ')[0]}!`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {hi 
              ? 'कार्यों को तुरंत शुरू करने के लिए नीचे दिए गए किसी भी मॉड्यूल का चयन करें।' 
              : 'Launch any of the modules below to start recording daily operations.'}
          </p>
        </div>

        {/* Premium search input */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder={hi ? 'लॉन्चर खोजना शुरू करें... (उदा. खरीद)' : 'Type to search modules... (e.g. pay)'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full pl-12 pr-4 text-sm font-semibold rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-3.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Launcher Card Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 md:gap-6">
        {sortedModules.map((item) => {
          const isPinned = pinnedKeys.includes(item.key)
          const IconComponent = item.lucideIcon
          const dynamicStat = getCardStat(item.key)

          return (
            <Link
              key={item.key}
              href={item.link}
              className="group relative flex flex-col justify-between p-5 rounded-[24px] bg-gradient-to-br from-white to-slate-50/70 border border-slate-100 shadow-[0_4px_16px_rgba(28,76,138,0.03)] hover:shadow-[0_16px_36px_rgba(28,76,138,0.08)] hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 h-[150px] overflow-hidden select-none"
            >
              {/* Star/Pin & Stats Tag actions container */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
                <button
                  type="button"
                  onClick={(e) => togglePin(item.key, e)}
                  className={`p-1.5 rounded-full backdrop-blur-md border hover:scale-110 active:scale-95 transition-all duration-200 ${
                    isPinned 
                      ? 'bg-amber-500 text-white border-amber-400 shadow-md' 
                      : 'bg-white/80 text-slate-300 border-slate-100 hover:text-amber-400 group-hover:opacity-100 md:opacity-0'
                  }`}
                  title={isPinned ? 'Unpin module' : 'Pin module'}
                >
                  <Star size={13} className={isPinned ? 'fill-current stroke-[2.5]' : 'stroke-[2.5]'} />
                </button>

                {dynamicStat && (
                  <span className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase bg-slate-100/90 text-slate-500 border border-slate-200/45 shadow-3xs tracking-tight">
                    {dynamicStat}
                  </span>
                )}
              </div>

              {/* Icon Container with Gradient Border overlay */}
              <div className="flex items-center justify-between">
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-tr ${item.gradient} p-2.5 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300`}>
                  <IconComponent className="h-full w-full stroke-[2.2]" />
                </div>
              </div>

              {/* Title & Descriptions */}
              <div className="space-y-0.5 mt-3 text-left">
                <div className="flex items-center gap-1">
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                    {hi ? item.titleHi : item.titleEn}
                  </h3>
                </div>
                
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate max-w-[95%]">
                  {hi ? item.descHi : item.descEn}
                </p>
              </div>
            </Link>
          )
        })}

        {sortedModules.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white/70 backdrop-blur-md rounded-[24px] border border-dashed border-slate-200">
            <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-sm">{hi ? 'कोई मेल खाने वाला मॉड्यूल नहीं मिला।' : 'No matching modules found.'}</p>
          </div>
        )}
      </div>

    </div>
  )
}
