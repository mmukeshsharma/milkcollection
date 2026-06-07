import { sendPasswordReset } from '@/app/actions/auth'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/40 bg-white/80 p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
        <p className="text-sm text-slate-600">Enter your email to receive a password reset link.</p>
        {params.message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{params.message}</div>}
        <form action={sendPasswordReset} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="admin@sharmadairy.com"
            className="h-11 w-full rounded-xl border border-blue-100 px-3"
          />
          <button className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white">Send Reset Link</button>
        </form>
      </div>
    </div>
  )
}
