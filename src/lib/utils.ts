import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'
import { fr, ar, enUS } from 'date-fns/locale'
import type { Lang, ReservationSource, ReservationStatus, TaskStatus, VillaStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDate(date: string | Date, lang: Lang = 'fr'): string {
  const locale = lang === 'ar' ? ar : lang === 'en' ? enUS : fr
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy', { locale })
}

export function fmtCurrency(amount: number, currency = 'TND'): string {
  return `${amount.toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${currency}`
}

export function nightCount(checkIn: string, checkOut: string): number {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn))
}

// ─── Color maps ────────────────────────────────────────────────────────────
export const SOURCE_COLORS: Record<ReservationSource, string> = {
  airbnb:   'bg-rose-100 text-rose-700',
  booking:  'bg-blue-100 text-blue-700',
  direct:   'bg-brand-100 text-brand-800',
  whatsapp: 'bg-green-100 text-green-700',
  vrbo:     'bg-purple-100 text-purple-700',
  autre:    'bg-gray-100 text-gray-600',
}

export const STATUS_COLORS: Record<ReservationStatus, string> = {
  confirmed: 'bg-success-100 text-success-800',
  pending:   'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  checkout:  'bg-gray-100 text-gray-600',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done:        'bg-success-100 text-success-800',
  issue:       'bg-red-100 text-red-700',
}

export const VILLA_STATUS_COLORS: Record<VillaStatus, string> = {
  active:      'bg-success-100 text-success-800',
  maintenance: 'bg-amber-100 text-amber-700',
  disabled:    'bg-gray-100 text-gray-500',
}

export const SOURCE_HEX: Record<ReservationSource, string> = {
  airbnb:   '#FF5A5F',
  booking:  '#003580',
  direct:   '#0C447C',
  whatsapp: '#25D366',
  vrbo:     '#4C3D8F',
  autre:    '#9CA3AF',
}

export const DEFAULT_CHECKLIST = [
  'Changer les draps et taies',
  'Nettoyer et désinfecter salle de bain',
  'Passer l\'aspirateur / balayer',
  'Nettoyer la cuisine et les appareils',
  'Vider les poubelles',
  'Réapprovisionner les produits d\'accueil',
  'Vérifier la piscine',
  'Nettoyer les vitres et portes vitrées',
  'Vérifier et signaler tout dommage',
  'Photo de validation finale',
].map((label, i) => ({ id: String(i + 1), label, done: false }))

export const AMENITY_OPTIONS = [
  { id: 'pool',    label: 'Piscine',      icon: '🏊' },
  { id: 'wifi',    label: 'WiFi',         icon: '📶' },
  { id: 'ac',      label: 'Climatisation',icon: '❄️' },
  { id: 'parking', label: 'Parking',      icon: '🚗' },
  { id: 'bbq',     label: 'Barbecue',     icon: '🔥' },
  { id: 'garden',  label: 'Jardin',       icon: '🌿' },
  { id: 'jacuzzi', label: 'Jacuzzi',      icon: '🛁' },
  { id: 'gym',     label: 'Salle de sport',icon: '💪' },
  { id: 'beach',   label: 'Accès plage',  icon: '🏖️' },
  { id: 'tv',      label: 'TV satellite', icon: '📺' },
  { id: 'kitchen', label: 'Cuisine équipée',icon: '🍳' },
  { id: 'terrace', label: 'Terrasse',     icon: '☀️' },
]

export const PLAN_LIMITS: Record<string, number> = {
  starter: 5,
  pro:     15,
  agence:  50,
}

export const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  pro:     79,
  agence:  149,
}
