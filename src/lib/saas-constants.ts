export type SubscriptionPlan = 'demo' | 'basic' | 'premium' | 'enterprise' | 'custom'

// Pricing structure for Revenue Summary calculations
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  demo: 0,
  basic: 2500, // INR
  premium: 4500, // INR
  enterprise: 8000, // INR
  custom: 15000 // INR
}
