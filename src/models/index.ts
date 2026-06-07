import mongoose, { Schema, Document } from 'mongoose'

// --- 1. USER SCHEMA ---
export interface IUser extends Document {
  name: string
  email: string
  password?: string
  role: 'super_admin' | 'agent' | 'admin' | 'staff'
  active: boolean
  mobile?: string
  subscription_plan?: 'demo' | 'basic' | 'premium' | 'enterprise' | 'custom'
  subscription_start?: Date
  subscription_end?: Date
  grace_period_end?: Date
  subscription_status?: 'active' | 'inactive' | 'expired'
  active_sessions?: string[]
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'agent', 'admin', 'staff'], default: 'agent' },
  active: { type: Boolean, default: true },
  mobile: { type: String },
  subscription_plan: { type: String, enum: ['demo', 'basic', 'premium', 'enterprise', 'custom'], default: 'demo' },
  subscription_start: { type: Date, default: Date.now },
  subscription_end: { type: Date },
  grace_period_end: { type: Date },
  subscription_status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
  active_sessions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
})

// --- 1.3 USER SESSION SCHEMA ---
export interface IUserSession extends Document {
  user_id: mongoose.Types.ObjectId | string
  device_id: string
  device_name: string
  browser: string
  platform: string
  ip_address: string
  is_active: boolean
  last_active: Date
  token: string
  created_at: Date
}

export const UserSessionSchema = new Schema<IUserSession>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  device_id: { type: String, required: true },
  device_name: { type: String, required: true },
  browser: { type: String, required: true },
  platform: { type: String, required: true },
  ip_address: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  last_active: { type: Date, default: Date.now },
  token: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
})

// --- 1.2 ARCHIVED AGENT SCHEMA ---
export interface IArchivedAgent extends Document {
  original_id: string
  name: string
  email: string
  mobile?: string
  role: string
  subscription_plan?: string
  subscription_start?: Date
  subscription_end?: Date
  archived_at: Date
  reason: string
}

const ArchivedAgentSchema = new Schema<IArchivedAgent>({
  original_id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String },
  role: { type: String, required: true },
  subscription_plan: { type: String },
  subscription_start: { type: Date },
  subscription_end: { type: Date },
  archived_at: { type: Date, default: Date.now },
  reason: { type: String, default: 'Subscription expired and grace period passed' }
})


// --- 2. CUSTOMER SCHEMA ---
export interface ICustomer extends Document {
  customer_code: string
  name: string
  mobile: string
  address: string
  village: string
  aadhaar_number?: string
  joining_date?: string
  milk_type_preference: 'cow' | 'buffalo' | 'mixed'
  active_status: boolean
  notes?: string
  created_at: Date
  updated_at: Date
}

const CustomerSchema = new Schema<ICustomer>({
  customer_code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  village: { type: String, default: '' },
  aadhaar_number: { type: String, default: '' },
  joining_date: { type: String, default: '' },
  milk_type_preference: { type: String, enum: ['cow', 'buffalo', 'mixed'], required: true },
  active_status: { type: Boolean, default: true },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

// --- 3. MILK PURCHASE SCHEMA ---
export interface IMilkPurchase extends Document {
  customer_id: string | mongoose.Types.ObjectId
  purchase_date: string
  shift: 'morning' | 'evening'
  milk_type: 'cow' | 'buffalo' | 'mixed'
  quantity_liters: number
  fat_percentage: number
  snf_percentage: number
  rate_per_liter: number
  total_amount: number
  rate_chart_id?: string | mongoose.Types.ObjectId
  bonus_amount?: number
  penalty_amount?: number
  created_at: Date
}

const MilkPurchaseSchema = new Schema<IMilkPurchase>({
  customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  purchase_date: { type: String, required: true },
  shift: { type: String, enum: ['morning', 'evening'], required: true },
  milk_type: { type: String, enum: ['cow', 'buffalo', 'mixed'], required: true },
  quantity_liters: { type: Number, required: true },
  fat_percentage: { type: Number, required: true },
  snf_percentage: { type: Number, required: true },
  rate_per_liter: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  rate_chart_id: { type: Schema.Types.ObjectId, ref: 'RateChart', default: null },
  bonus_amount: { type: Number, default: 0 },
  penalty_amount: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
})

// --- 4. MILK SALE SCHEMA ---
export interface IMilkSale extends Document {
  customer_id?: string | mongoose.Types.ObjectId
  buyer_name: string
  sale_date: string
  milk_type: 'cow' | 'buffalo' | 'mixed'
  quantity_liters: number
  rate_per_liter: number
  total_amount: number
  created_at: Date
}

const MilkSaleSchema = new Schema<IMilkSale>({
  customer_id: { type: Schema.Types.ObjectId, ref: 'Customer' },
  buyer_name: { type: String, required: true, trim: true },
  sale_date: { type: String, required: true },
  milk_type: { type: String, enum: ['cow', 'buffalo', 'mixed'], required: true },
  quantity_liters: { type: Number, required: true },
  rate_per_liter: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
})

// --- 5. PAYMENT SCHEMA ---
export interface IPayment extends Document {
  customer_id: string | mongoose.Types.ObjectId
  payment_date: string
  payment_type: 'advance' | 'settlement'
  amount: number
  payment_method: 'cash' | 'upi' | 'bank' | 'gpay' | 'phonepe' | 'paytm'
  reference_no?: string
  notes?: string
  created_at: Date
}

const PaymentSchema = new Schema<IPayment>({
  customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  payment_date: { type: String, required: true },
  payment_type: { type: String, enum: ['advance', 'settlement'], required: true },
  amount: { type: Number, required: true },
  payment_method: { type: String, enum: ['cash', 'upi', 'bank', 'gpay', 'phonepe', 'paytm'], required: true },
  reference_no: { type: String, default: '' },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
})

// --- 6. PASSBOOK ENTRY SCHEMA ---
export interface IPassbookEntry extends Document {
  customer_id: string | mongoose.Types.ObjectId
  transaction_date: string
  transaction_type: 'purchase' | 'sale' | 'payment' | 'advance' | 'adjustment'
  reference_id?: string
  particulars: string
  credit_amount: number
  debit_amount: number
  running_balance: number
  created_at: Date
}

const PassbookEntrySchema = new Schema<IPassbookEntry>({
  customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  transaction_date: { type: String, required: true },
  transaction_type: { type: String, enum: ['purchase', 'sale', 'payment', 'advance', 'adjustment'], required: true },
  reference_id: { type: String, default: '' },
  particulars: { type: String, required: true },
  credit_amount: { type: Number, default: 0 },
  debit_amount: { type: Number, default: 0 },
  running_balance: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
})

// --- 7. MILK RATE MATRIX SCHEMA ---
export interface IMilkRateMatrix extends Document {
  milk_type: 'cow' | 'buffalo'
  fat_min: number
  fat_max: number
  snf_min: number
  snf_max: number
  rate_per_liter: number
  effective_from: string
  effective_to?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

const MilkRateMatrixSchema = new Schema<IMilkRateMatrix>({
  milk_type: { type: String, enum: ['cow', 'buffalo'], required: true },
  fat_min: { type: Number, required: true },
  fat_max: { type: Number, required: true },
  snf_min: { type: Number, required: true },
  snf_max: { type: Number, required: true },
  rate_per_liter: { type: Number, required: true },
  effective_from: { type: String, required: true },
  effective_to: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

// --- 8. PRODUCT SCHEMA ---
export interface IProduct extends Document {
  product_name: string
  description?: string
  price: number
  stock_quantity: number
  created_at: Date
  updated_at: Date
}

const ProductSchema = new Schema<IProduct>({
  product_name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  stock_quantity: { type: Number, required: true, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

// --- 9. INVENTORY TRANSACTION SCHEMA ---
export interface IInventoryTransaction extends Document {
  product_id: string | mongoose.Types.ObjectId
  transaction_type: 'in' | 'out'
  quantity: number
  reference?: string
  created_at: Date
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  transaction_type: { type: String, enum: ['in', 'out'], required: true },
  quantity: { type: Number, required: true },
  reference: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
})

// --- 10. ITEM SALE SCHEMA ---
export interface IItemSale extends Document {
  customer_id: string | mongoose.Types.ObjectId
  product_id: string | mongoose.Types.ObjectId
  quantity: number
  price_per_item: number
  total_amount: number
  sale_date: string
  created_at: Date
}

const ItemSaleSchema = new Schema<IItemSale>({
  customer_id: { type: String, required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price_per_item: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  sale_date: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
})

// --- 11. SETTING SCHEMA ---
export interface ISetting extends Document {
  key: string
  value: any
  created_at: Date
}

const SettingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
  created_at: { type: Date, default: Date.now }
})

// --- 12. AUDIT LOG SCHEMA ---
export interface IAuditLog extends Document {
  user_id?: string | mongoose.Types.ObjectId
  action: string
  details: string
  created_at: Date
}

const AuditLogSchema = new Schema<IAuditLog>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  details: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
})

// --- 13. RATE CHART SCHEMA ---
export interface IRateChartStep {
  min_val: number
  max_val: number
  rate: number
}

export interface IRateChartBonus {
  base_val: number
  bonus_rate: number
  penalty_rate: number
  step_size: number
}

export interface IRateChartCard {
  card_name: string
  fat_steps: IRateChartStep[]
  snf_steps: IRateChartStep[]
  fat_bonus: IRateChartBonus[]
  snf_bonus: IRateChartBonus[]
}

export interface IRateChart extends Document {
  chart_name: string
  milk_type: 'cow' | 'buffalo' | 'mixed'
  bonus_amount: number
  calculation_type: 'fat_based' | 'snf_based' | 'fat_snf' | 'fat_snf_base_rate'
  status: 'active' | 'inactive'
  is_default: boolean
  cards: IRateChartCard[]
  created_at: Date
  updated_at: Date
}

const RateChartStepSchema = new Schema<IRateChartStep>({
  min_val: { type: Number, required: true },
  max_val: { type: Number, required: true },
  rate: { type: Number, required: true }
})

const RateChartBonusSchema = new Schema<IRateChartBonus>({
  base_val: { type: Number, required: true },
  bonus_rate: { type: Number, required: true },
  penalty_rate: { type: Number, required: true },
  step_size: { type: Number, required: true, default: 0.1 }
})

const RateChartCardSchema = new Schema<IRateChartCard>({
  card_name: { type: String, required: true, default: 'Card 1' },
  fat_steps: [RateChartStepSchema],
  snf_steps: [RateChartStepSchema],
  fat_bonus: [RateChartBonusSchema],
  snf_bonus: [RateChartBonusSchema]
})

const RateChartSchema = new Schema<IRateChart>({
  chart_name: { type: String, required: true, unique: true, trim: true },
  milk_type: { type: String, enum: ['cow', 'buffalo', 'mixed'], required: true },
  bonus_amount: { type: Number, default: 0 },
  calculation_type: { type: String, enum: ['fat_based', 'snf_based', 'fat_snf', 'fat_snf_base_rate'], required: true, default: 'fat_snf_base_rate' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  is_default: { type: Boolean, default: false },
  cards: [RateChartCardSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
})

// Helper to make mongo documents automatically convert `_id` to standard `id` string for ease of migration
const cleanOptions = {
  virtuals: true,
  transform: (doc: any, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ''
    delete ret._id
    delete ret.__v
    return ret
  }
}

const schemas: any[] = [
  UserSchema, CustomerSchema, MilkPurchaseSchema, MilkSaleSchema, PaymentSchema,
  PassbookEntrySchema, MilkRateMatrixSchema, ProductSchema, InventoryTransactionSchema,
  ItemSaleSchema, SettingSchema, AuditLogSchema, RateChartSchema, ArchivedAgentSchema, UserSessionSchema
]

schemas.forEach(schema => {
  schema.set('toJSON', cleanOptions)
  schema.set('toObject', cleanOptions)
})

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export const UserSession = mongoose.models.UserSession || mongoose.model<IUserSession>('UserSession', UserSessionSchema)
export const ArchivedAgent = mongoose.models.ArchivedAgent || mongoose.model<IArchivedAgent>('ArchivedAgent', ArchivedAgentSchema)
export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)
export const MilkPurchase = mongoose.models.MilkPurchase || mongoose.model<IMilkPurchase>('MilkPurchase', MilkPurchaseSchema)
export const MilkSale = mongoose.models.MilkSale || mongoose.model<IMilkSale>('MilkSale', MilkSaleSchema)
export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)
export const PassbookEntry = mongoose.models.PassbookEntry || mongoose.model<IPassbookEntry>('PassbookEntry', PassbookEntrySchema)
export const MilkRateMatrix = mongoose.models.MilkRateMatrix || mongoose.model<IMilkRateMatrix>('MilkRateMatrix', MilkRateMatrixSchema)
// To keep matching names with supabase 'inventory' / 'item_sales':
export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
export const InventoryTransaction = mongoose.models.InventoryTransaction || mongoose.model<IInventoryTransaction>('InventoryTransaction', InventoryTransactionSchema)
if (mongoose.models.ItemSale) {
  try { delete mongoose.models.ItemSale } catch (e) {}
}
export const ItemSale = mongoose.models.ItemSale || mongoose.model<IItemSale>('ItemSale', ItemSaleSchema)
export const Setting = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema)
export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
export const RateChart = mongoose.models.RateChart || mongoose.model<IRateChart>('RateChart', RateChartSchema)
