// ─── Core domain types ─────────────────────────────────────────────────────

export type Plan = 'starter' | 'pro' | 'agence'
export type UserRole = 'admin' | 'manager' | 'agent'
export type VillaStatus = 'active' | 'maintenance' | 'disabled'
export type ReservationSource = 'airbnb' | 'booking' | 'direct' | 'whatsapp' | 'vrbo' | 'autre'
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'checkout'
export type TeamRole = 'manager' | 'cleaner' | 'maintenance' | 'inspector'
export type TaskType = 'full' | 'quick' | 'maintenance' | 'inspection'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'issue'
export type EmailTrigger = 'booking_confirmed' | 'reminder_checkin' | 'welcome' | 'review_request'
export type Lang = 'fr' | 'ar' | 'en'

// ─── Contact number ────────────────────────────────────────────────────────
export interface ContactNumber {
  name: string
  role: string
  phone: string
}

// ─── Extra ─────────────────────────────────────────────────────────────────
export interface Extra {
  id: string
  name: string
  price: number
  description?: string
  icon?: string
  enabled?: boolean  // undefined = true (actif par défaut)
  quantity?: number  // undefined = 1
}

// ─── Tenant ────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string
  name: string
  plan: Plan
  trial_ends: string | null
  created_at: string
  extras_config?: Extra[] | null
  property_types?: string[] | null
  slogan?: string | null
  founding_member?: boolean | null
  welcome_email_enabled?: boolean | null
  logo_url?: string | null
  currency?: string | null
}

// ─── Profile ───────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  tenant_id: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

// ─── Villa ─────────────────────────────────────────────────────────────────
export interface Amenity {
  id: string
  label: string
  icon: string
}

export interface Villa {
  id: string
  tenant_id: string
  name: string
  description: string | null
  address: string | null
  city: string
  capacity: number
  bedrooms: number
  bathrooms: number
  base_price: number
  status: VillaStatus
  amenities: string[]
  access_code: string | null
  arrival_info: string | null
  photos: string[]
  wifi_network?: string | null
  wifi_password: string | null
  contact_numbers?: ContactNumber[] | null
  property_type?: string | null
  color?: string | null
  slug?: string | null
  created_at: string
  updated_at: string
}

// ─── Blocked period ────────────────────────────────────────────────────────
export type BlockedReason = 'entretien' | 'usage_personnel' | 'autre'

export interface BlockedPeriod {
  id: string
  tenant_id: string
  villa_id: string | null
  start_date: string
  end_date: string
  start_time: string | null  // HH:MM, null = journée entière
  end_time: string | null    // HH:MM, null = journée entière
  reason: BlockedReason
  note: string | null
  created_at: string
}

// ─── Seasonal rate ─────────────────────────────────────────────────────────
export interface SeasonalRate {
  id: string
  tenant_id: string
  name: string
  start_date: string
  end_date: string
  multiplier: number
  created_at: string
}

// ─── Client ────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  tenant_id: string
  full_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  passport_number?: string | null
  preferred_lang: Lang
  created_at: string
}

// ─── Blacklist ─────────────────────────────────────────────────────────────
export interface BlacklistEntry {
  id: string
  tenant_id: string
  full_name: string | null
  phone: string | null
  email: string | null
  reason: string | null
  created_at: string
}

// ─── Reservation ───────────────────────────────────────────────────────────
export interface Reservation {
  id: string
  tenant_id: string
  villa_id: string
  client_id: string | null
  check_in: string
  check_out: string
  check_in_time?: string | null
  check_out_time?: string | null
  extras?: Extra[] | null
  adults?: number | null
  children?: number | null
  occasion?: string | null
  has_pets?: boolean | null
  guests: number
  total_amount: number
  currency: string
  source: ReservationSource
  status: ReservationStatus
  internal_note: string | null
  ical_uid: string | null
  deposit_amount?: number | null
  deposit_date?: string | null
  deposit_method?: string | null
  payment_status?: 'unpaid' | 'link_sent' | 'paid' | null
  stripe_payment_link?: string | null
  stripe_amount?: number | null
  paid_at?: string | null
  paid_method?: string | null
  created_at: string
  updated_at: string
  archived_at?: string | null
  reminder_j3_sent?: boolean
  reminder_j1_sent?: boolean
  receipt_number?: string | null
  invoice_number?: string | null
  // joined
  villa?: Villa
  client?: Client
}

// ─── Team member ───────────────────────────────────────────────────────────
export interface TeamMember {
  id: string
  tenant_id: string
  full_name: string
  role: TeamRole
  phone: string | null
  email: string | null
  assigned_villa_ids: string[]
  created_at: string
}

// ─── Cleaning task ─────────────────────────────────────────────────────────
export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface CleaningTask {
  id: string
  tenant_id: string
  villa_id: string
  reservation_id: string | null
  assigned_to: string | null
  task_type: TaskType
  scheduled_date: string
  status: TaskStatus
  checklist: ChecklistItem[]
  photos: string[]
  note: string | null
  created_at: string
  updated_at: string
  // joined
  villa?: Villa
  assignee?: TeamMember
}

// ─── Email template ────────────────────────────────────────────────────────
export interface EmailTemplate {
  id: string
  tenant_id: string
  trigger: EmailTrigger
  lang: Lang
  subject: string
  body: string
  is_active: boolean
  created_at: string
}

// ─── Dashboard KPIs ────────────────────────────────────────────────────────
export interface DashboardStats {
  revenue_current_month: number
  revenue_previous_month: number
  occupancy_rate: number
  checkins_today: number
  checkouts_today: number
  pending_reservations: number
  nights_sold_30d: number
  avg_price_per_night: number
  revpar: number
  by_source: { source: ReservationSource; count: number; amount: number }[]
  by_villa: { villa_id: string; villa_name: string; revenue: number; nights: number }[]
}
