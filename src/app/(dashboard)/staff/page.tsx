import { redirect } from 'next/navigation'

export default async function StaffPage() {
  // Staff page work is fully covered by Agent Management in the SaaS Super Admin Panel
  redirect('/dashboard')
}
