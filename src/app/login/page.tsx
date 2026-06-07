import Image from 'next/image'
import { LoginForm } from '@/components/auth/login-form'
import { LanguageSelector } from '@/components/ui/language-selector'

export default async function LoginPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ 
    message?: string
    showLimitReached?: string
    userId?: string
    deviceId?: string
    email?: string
    tempToken?: string
  }> 
}) {
  const params = await searchParams;

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-[#f4f8fc] px-4 overflow-hidden font-sans select-none">
      {/* Isolated Style Tag to prevent html/body scrolling on Login Page ONLY */}
      <style dangerouslySetInnerHTML={{__html: `
        html, body {
          height: 100% !important;
          overflow: hidden !important;
        }
      `}} />
      
      {/* Background fluid vector shapes / waves */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        {/* Soft circle on the left */}
        <div className="absolute left-[8%] top-[45%] h-14 w-14 rounded-full border-2 border-white/60 opacity-60" />
        
        {/* Bottom waves */}
        <svg className="absolute bottom-0 left-0 w-full h-[30%] translate-y-[2px]" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,192C180,240,360,260,540,224C720,188,900,96,1080,85C1260,74,1420,144,1440,160L1440,320L0,320Z" fill="url(#wave-grad-1)"/>
          <path d="M0,224C160,260,320,280,480,256C640,232,800,160,960,138C1120,116,1280,144,1440,160L1440,320L0,320Z" fill="url(#wave-grad-2)" opacity="0.8"/>
          <defs>
            <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9cc5f8" />
              <stop offset="100%" stopColor="#5ea2f3" />
            </linearGradient>
            <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8dbcf6" />
              <stop offset="100%" stopColor="#3b8ef1" />
            </linearGradient>
          </defs>
        </svg>
 
        {/* Soft background blue shapes */}
        <div className="absolute left-[-10%] top-[20%] w-[45%] h-[60%] rounded-full bg-gradient-to-tr from-blue-300/10 to-blue-400/20 blur-[100px] pointer-events-none" />
        <div className="absolute right-[-10%] top-[30%] w-[40%] h-[50%] rounded-full bg-gradient-to-bl from-blue-300/10 to-blue-400/20 blur-[90px] pointer-events-none" />
      </div>
 
      {/* Main Content Area: High density alignment to prevent scrollbars */}
      <div className="relative z-10 w-full max-w-[520px] flex flex-col items-center justify-center">
        
        {/* Login Form Card: contains logo, title, phone, language selector, and login fields */}
        <div className="relative w-full rounded-[24px] bg-white p-6 shadow-[0_16px_48px_rgba(28,76,138,0.09)] border border-slate-100/50 transition-all duration-300">
          
          {/* Language selector aligned to the top right inside the card */}
          <div className="absolute right-6 top-6 z-20">
            <LanguageSelector />
          </div>

          {/* Logo centered */}
          <div className="flex justify-center mb-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white p-1.5 shadow-md border border-blue-50/50 flex items-center justify-center">
              <Image 
                src="/logo.png" 
                alt="Sharma Dairy Logo" 
                width={72} 
                height={72} 
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Title & Clickable Support Call Phone Number */}
          <div className="text-center mb-5">
            <h1 className="text-[22px] sm:text-[26px] md:text-[28px] font-extrabold tracking-tight text-[#162a45] leading-tight">
              Sharma Dairy <span className="text-[#0084FF]">Milk Collection</span>
            </h1>
            <p className="text-[12px] sm:text-xs text-slate-500 font-bold mt-1.5">
              <a href="tel:+919928653383" className="hover:underline hover:text-blue-600 inline-flex items-center gap-1 transition-colors">
                📞 +91 99286 53383
              </a>
            </p>
          </div>

          <LoginForm 
            message={params.message}
            showLimitReached={params.showLimitReached}
            userId={params.userId}
            deviceId={params.deviceId}
            email={params.email}
            tempToken={params.tempToken}
          />
        </div>
      </div>
    </div>
  )
}
