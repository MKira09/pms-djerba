import { addDays, format, subDays } from 'date-fns'
import type { Villa, Reservation, TeamMember, Client, CleaningTask, SeasonalRate } from '@/types'
import { DEFAULT_CHECKLIST } from './utils'

const today = new Date()
const d = (offset: number) => format(addDays(today, offset), 'yyyy-MM-dd')
const past = (offset: number) => format(subDays(today, offset), 'yyyy-MM-dd')

const TENANT_ID = 'demo-tenant-1'

// ─── VILLAS ────────────────────────────────────────────────────────────────
export const DEMO_VILLAS: Villa[] = [
  { id: 'v1',  tenant_id: TENANT_ID, name: 'Villa Jasmin',       description: 'Villa spacieuse avec vue mer et piscine privée.', address: 'Zone Touristique, Houmt Souk', city: 'Djerba', capacity: 8,  bedrooms: 4, bathrooms: 3, base_price: 380, status: 'active',      amenities: ['pool','wifi','ac','parking','bbq','terrace'], access_code: '2580', arrival_info: 'Clé sous le pot de fleurs à gauche.', photos: [], wifi_password: 'Jasmin2024', created_at: past(60), updated_at: past(1) },
  { id: 'v2',  tenant_id: TENANT_ID, name: 'Villa Mimosa',        description: 'Villa calme avec jardin et vue sur les oliviers.', address: 'Midoun, Route de Houmt Souk', city: 'Djerba', capacity: 6,  bedrooms: 3, bathrooms: 2, base_price: 300, status: 'active',      amenities: ['pool','wifi','ac','garden','kitchen'], access_code: '1234', arrival_info: 'Boîte à clé sur portail. Code: 1234.', photos: [], wifi_password: 'Mimosa2024', created_at: past(55), updated_at: past(2) },
  { id: 'v3',  tenant_id: TENANT_ID, name: 'Villa Hibiscus',      description: 'Grande villa familiale, piscine chauffée.', address: 'Aghir, Bord de Mer', city: 'Djerba', capacity: 10, bedrooms: 5, bathrooms: 4, base_price: 480, status: 'active',      amenities: ['pool','wifi','ac','parking','bbq','gym','beach'], access_code: '4321', arrival_info: 'Accueil sur place de 14h à 18h.', photos: [], wifi_password: 'Hibiscus24', created_at: past(50), updated_at: past(3) },
  { id: 'v4',  tenant_id: TENANT_ID, name: 'Villa Palmier',       description: 'Villa moderne avec palmiers et terrasse panoramique.', address: 'Zone Touristique, Sidi Mahrez', city: 'Djerba', capacity: 6,  bedrooms: 3, bathrooms: 2, base_price: 300, status: 'active',      amenities: ['pool','wifi','ac','terrace','kitchen'], access_code: '8765', arrival_info: 'Check-in autonome, code sur l\'application.', photos: [], wifi_password: 'Palmier2024', created_at: past(48), updated_at: past(1) },
  { id: 'v5',  tenant_id: TENANT_ID, name: 'Villa Safran',        description: 'Cozy villa pour couples, ambiance andalouse.', address: 'Houmt Souk, Médina', city: 'Djerba', capacity: 4,  bedrooms: 2, bathrooms: 1, base_price: 220, status: 'active',      amenities: ['wifi','ac','terrace','kitchen'], access_code: '3698', arrival_info: 'Propriétaire présent à l\'arrivée.', photos: [], wifi_password: 'Safran2024', created_at: past(45), updated_at: past(4) },
  { id: 'v6',  tenant_id: TENANT_ID, name: 'Villa Bougainvillée', description: 'Villa avec bougainvillées en fleurs et piscine infinity.', address: 'Aghir, Impasse des Fleurs', city: 'Djerba', capacity: 8,  bedrooms: 4, bathrooms: 3, base_price: 360, status: 'active',      amenities: ['pool','wifi','ac','parking','bbq','jacuzzi','garden'], access_code: '7410', arrival_info: 'Clé chez le gardien Mohamed. Tel: +216 70 000 001.', photos: [], wifi_password: 'Bougain2024', created_at: past(42), updated_at: past(2) },
  { id: 'v7',  tenant_id: TENANT_ID, name: 'Villa Amandier',      description: 'Charme typique djerbien, patio avec amandier centenaire.', address: 'Midoun, Rue des Artisans', city: 'Djerba', capacity: 6,  bedrooms: 3, bathrooms: 2, base_price: 280, status: 'active',      amenities: ['wifi','ac','pool','kitchen','terrace'], access_code: '1597', arrival_info: 'Boîte à clé: code 1597.', photos: [], wifi_password: 'Amandier24', created_at: past(40), updated_at: past(5) },
  { id: 'v8',  tenant_id: TENANT_ID, name: 'Villa Figuier',       description: 'Havre de paix entouré de figuiers, piscine et BBQ.', address: 'Guellala, Route Côtière', city: 'Djerba', capacity: 8,  bedrooms: 4, bathrooms: 3, base_price: 350, status: 'active',      amenities: ['pool','wifi','ac','bbq','parking','garden'], access_code: '2468', arrival_info: 'Clé disponible à la réception de l\'agence.', photos: [], wifi_password: 'Figuier2024', created_at: past(38), updated_at: past(3) },
  { id: 'v9',  tenant_id: TENANT_ID, name: 'Villa Lavande',       description: 'Villa provençale avec lavandes et piscine naturelle.', address: 'Aghir, Lotissement Les Pins', city: 'Djerba', capacity: 6,  bedrooms: 3, bathrooms: 2, base_price: 290, status: 'active',      amenities: ['pool','wifi','ac','garden','kitchen','terrace'], access_code: '3579', arrival_info: 'Check-in à partir de 15h. Code porte: 3579.', photos: [], wifi_password: 'Lavande24', created_at: past(35), updated_at: past(1) },
  { id: 'v10', tenant_id: TENANT_ID, name: 'Villa Rose',          description: 'Petite villa intime, idéale pour séjour romantique.', address: 'Houmt Souk, Quartier des Roses', city: 'Djerba', capacity: 4,  bedrooms: 2, bathrooms: 1, base_price: 210, status: 'maintenance', amenities: ['wifi','ac','terrace'], access_code: '1111', arrival_info: 'Travaux prévus jusqu\'au 30 juin.', photos: [], wifi_password: 'Rose2024', created_at: past(33), updated_at: past(7) },
  { id: 'v11', tenant_id: TENANT_ID, name: 'Villa Grenadier',     description: 'Luxueuse villa de prestige, piscine Olympic et jacuzzi.', address: 'Sidi Mahrez, Avenue Centrale', city: 'Djerba', capacity: 10, bedrooms: 5, bathrooms: 4, base_price: 500, status: 'active',      amenities: ['pool','wifi','ac','parking','bbq','jacuzzi','gym','beach','tv'], access_code: '9876', arrival_info: 'Conciergerie disponible 24h/24.', photos: [], wifi_password: 'Grenadier24', created_at: past(30), updated_at: past(2) },
  { id: 'v12', tenant_id: TENANT_ID, name: 'Villa Olivier',       description: 'Authentique villa tunisienne dans une oliveraie.', address: 'Midoun, Oliveraie Royale', city: 'Djerba', capacity: 6,  bedrooms: 3, bathrooms: 2, base_price: 270, status: 'active',      amenities: ['wifi','ac','pool','garden','kitchen'], access_code: '6543', arrival_info: 'Appeler Mohamed 30 min avant arrivée.', photos: [], wifi_password: 'Olivier2024', created_at: past(28), updated_at: past(4) },
  { id: 'v13', tenant_id: TENANT_ID, name: 'Villa Citronnier',    description: 'Villa fraîche avec citronnier en cour intérieure.', address: 'Aghir, Impasse du Soleil', city: 'Djerba', capacity: 8,  bedrooms: 4, bathrooms: 3, base_price: 340, status: 'active',      amenities: ['pool','wifi','ac','parking','bbq','terrace','kitchen'], access_code: '7777', arrival_info: 'Clé avec le voisin M. Karim, maison bleue.', photos: [], wifi_password: 'Citron2024', created_at: past(25), updated_at: past(3) },
  { id: 'v14', tenant_id: TENANT_ID, name: 'Villa Magnolia',      description: 'Studio-villa tranquille, magnolia centenaire.', address: 'Houmt Souk, Rue du Port', city: 'Djerba', capacity: 4,  bedrooms: 2, bathrooms: 1, base_price: 200, status: 'active',      amenities: ['wifi','ac','terrace','kitchen'], access_code: '0000', arrival_info: 'Clé boîte: code 0000.', photos: [], wifi_password: 'Magnolia24', created_at: past(22), updated_at: past(6) },
  { id: 'v15', tenant_id: TENANT_ID, name: 'Villa Dauphin',       description: 'Villa grand standing avec accès plage privé.', address: 'Aghir, Front de Mer', city: 'Djerba', capacity: 12, bedrooms: 6, bathrooms: 5, base_price: 580, status: 'active',      amenities: ['pool','wifi','ac','parking','bbq','jacuzzi','beach','gym','tv','terrace'], access_code: '5555', arrival_info: 'Portail automatique. Badge fourni à l\'arrivée.', photos: [], wifi_password: 'Dauphin2024', created_at: past(20), updated_at: past(1) },
]

// ─── CLIENTS ───────────────────────────────────────────────────────────────
export const DEMO_CLIENTS: Client[] = [
  { id: 'c1',  tenant_id: TENANT_ID, full_name: 'Jean-Pierre Dupont',   email: 'jp.dupont@gmail.com',    phone: '+33 6 12 34 56 78', nationality: 'Française',  preferred_lang: 'fr', created_at: past(90) },
  { id: 'c2',  tenant_id: TENANT_ID, full_name: 'Ahmed Ben Salah',      email: 'ahmed.bs@hotmail.com',   phone: '+216 71 234 567',   nationality: 'Tunisienne', preferred_lang: 'ar', created_at: past(85) },
  { id: 'c3',  tenant_id: TENANT_ID, full_name: 'Giulia Rossi',         email: 'giulia.rossi@libero.it', phone: '+39 333 456 7890',  nationality: 'Italienne',  preferred_lang: 'en', created_at: past(80) },
  { id: 'c4',  tenant_id: TENANT_ID, full_name: 'Hamid Benali',         email: 'h.benali@outlook.com',   phone: '+213 555 123 456',  nationality: 'Algérienne', preferred_lang: 'fr', created_at: past(75) },
  { id: 'c5',  tenant_id: TENANT_ID, full_name: 'Sophie Marchand',      email: 'sophie.m@yahoo.fr',      phone: '+33 7 89 01 23 45', nationality: 'Française',  preferred_lang: 'fr', created_at: past(70) },
  { id: 'c6',  tenant_id: TENANT_ID, full_name: 'Khalid Al-Rashid',     email: 'k.rashid@gmail.com',     phone: '+971 50 123 4567',  nationality: 'Émiratie',   preferred_lang: 'ar', created_at: past(65) },
  { id: 'c7',  tenant_id: TENANT_ID, full_name: 'Emma Wilson',          email: 'emma.w@gmail.com',       phone: '+44 7700 900123',   nationality: 'Britannique',preferred_lang: 'en', created_at: past(60) },
  { id: 'c8',  tenant_id: TENANT_ID, full_name: 'Mohamed Trabelsi',     email: 'mtrabelsi@gmail.com',    phone: '+216 98 765 432',   nationality: 'Tunisienne', preferred_lang: 'ar', created_at: past(55) },
  { id: 'c9',  tenant_id: TENANT_ID, full_name: 'Marie-Claire Bonnet',  email: 'mcbonnet@orange.fr',     phone: '+33 6 45 67 89 01', nationality: 'Française',  preferred_lang: 'fr', created_at: past(50) },
  { id: 'c10', tenant_id: TENANT_ID, full_name: 'Lars Eriksson',        email: 'lars.e@gmail.com',       phone: '+46 70 123 4567',   nationality: 'Suédoise',   preferred_lang: 'en', created_at: past(45) },
  { id: 'c11', tenant_id: TENANT_ID, full_name: 'Nadia Khalil',         email: 'nadia.k@hotmail.com',    phone: '+961 71 234 567',   nationality: 'Libanaise',  preferred_lang: 'ar', created_at: past(40) },
  { id: 'c12', tenant_id: TENANT_ID, full_name: 'Pierre Fontaine',      email: 'p.fontaine@gmail.com',   phone: '+33 6 78 90 12 34', nationality: 'Française',  preferred_lang: 'fr', created_at: past(35) },
  { id: 'c13', tenant_id: TENANT_ID, full_name: 'Youssef Maghreb',      email: 'y.maghreb@gmail.com',    phone: '+212 612 345 678',  nationality: 'Marocaine',  preferred_lang: 'fr', created_at: past(30) },
  { id: 'c14', tenant_id: TENANT_ID, full_name: 'Ingrid Müller',        email: 'ingrid.m@gmail.com',     phone: '+49 170 1234567',   nationality: 'Allemande',  preferred_lang: 'en', created_at: past(25) },
  { id: 'c15', tenant_id: TENANT_ID, full_name: 'Fatima Zahrawi',       email: 'f.zahrawi@gmail.com',    phone: '+216 55 678 901',   nationality: 'Tunisienne', preferred_lang: 'ar', created_at: past(20) },
]

// ─── RESERVATIONS ──────────────────────────────────────────────────────────
export const DEMO_RESERVATIONS: Reservation[] = [
  // Airbnb (4)
  { id: 'r1',  tenant_id: TENANT_ID, villa_id: 'v1',  client_id: 'c1',  check_in: d(2),   check_out: d(9),   guests: 6, total_amount: 2660, currency: 'TND', source: 'airbnb',   status: 'confirmed', internal_note: 'VIP client — prévoir panier de bienvenue.', ical_uid: null, created_at: past(10), updated_at: past(10) },
  { id: 'r2',  tenant_id: TENANT_ID, villa_id: 'v3',  client_id: 'c3',  check_in: d(5),   check_out: d(12),  guests: 9, total_amount: 3360, currency: 'TND', source: 'airbnb',   status: 'confirmed', internal_note: null, ical_uid: null, created_at: past(8), updated_at: past(8) },
  { id: 'r3',  tenant_id: TENANT_ID, villa_id: 'v6',  client_id: 'c7',  check_in: d(15),  check_out: d(22),  guests: 7, total_amount: 2520, currency: 'TND', source: 'airbnb',   status: 'pending',   internal_note: 'Attendre confirmation paiement.', ical_uid: null, created_at: past(3), updated_at: past(3) },
  { id: 'r4',  tenant_id: TENANT_ID, villa_id: 'v11', client_id: 'c10', check_in: d(30),  check_out: d(40),  guests: 8, total_amount: 5000, currency: 'TND', source: 'airbnb',   status: 'confirmed', internal_note: 'Long séjour — remise 5% accordée.', ical_uid: null, created_at: past(5), updated_at: past(5) },
  // Booking.com (4)
  { id: 'r5',  tenant_id: TENANT_ID, villa_id: 'v2',  client_id: 'c4',  check_in: d(1),   check_out: d(5),   guests: 5, total_amount: 1200, currency: 'TND', source: 'booking',  status: 'confirmed', internal_note: null, ical_uid: null, created_at: past(12), updated_at: past(12) },
  { id: 'r6',  tenant_id: TENANT_ID, villa_id: 'v4',  client_id: 'c8',  check_in: d(8),   check_out: d(15),  guests: 4, total_amount: 2100, currency: 'TND', source: 'booking',  status: 'confirmed', internal_note: 'Client fidèle — 3ème séjour.', ical_uid: null, created_at: past(7), updated_at: past(7) },
  { id: 'r7',  tenant_id: TENANT_ID, villa_id: 'v8',  client_id: 'c14', check_in: d(20),  check_out: d(27),  guests: 6, total_amount: 2450, currency: 'TND', source: 'booking',  status: 'pending',   internal_note: null, ical_uid: null, created_at: past(2), updated_at: past(2) },
  { id: 'r8',  tenant_id: TENANT_ID, villa_id: 'v13', client_id: 'c9',  check_in: d(45),  check_out: d(52),  guests: 7, total_amount: 2380, currency: 'TND', source: 'booking',  status: 'confirmed', internal_note: null, ical_uid: null, created_at: past(6), updated_at: past(6) },
  // Direct (3)
  { id: 'r9',  tenant_id: TENANT_ID, villa_id: 'v5',  client_id: 'c2',  check_in: d(3),   check_out: d(8),   guests: 3, total_amount: 1100, currency: 'TND', source: 'direct',   status: 'confirmed', internal_note: 'Paiement par virement.', ical_uid: null, created_at: past(15), updated_at: past(15) },
  { id: 'r10', tenant_id: TENANT_ID, villa_id: 'v9',  client_id: 'c11', check_in: d(10),  check_out: d(17),  guests: 5, total_amount: 2030, currency: 'TND', source: 'direct',   status: 'confirmed', internal_note: null, ical_uid: null, created_at: past(9), updated_at: past(9) },
  { id: 'r11', tenant_id: TENANT_ID, villa_id: 'v15', client_id: 'c6',  check_in: d(25),  check_out: d(35),  guests: 10,total_amount: 5800, currency: 'TND', source: 'direct',   status: 'confirmed', internal_note: 'Famille royale — conciergerie VIP.', ical_uid: null, created_at: past(4), updated_at: past(4) },
  // WhatsApp (3)
  { id: 'r12', tenant_id: TENANT_ID, villa_id: 'v7',  client_id: 'c5',  check_in: d(0),   check_out: d(4),   guests: 4, total_amount: 1120, currency: 'TND', source: 'whatsapp', status: 'checkout',  internal_note: 'Départ ce matin, ménage à faire.', ical_uid: null, created_at: past(20), updated_at: today.toISOString() },
  { id: 'r13', tenant_id: TENANT_ID, villa_id: 'v12', client_id: 'c13', check_in: d(12),  check_out: d(18),  guests: 5, total_amount: 1620, currency: 'TND', source: 'whatsapp', status: 'confirmed', internal_note: null, ical_uid: null, created_at: past(3), updated_at: past(3) },
  { id: 'r14', tenant_id: TENANT_ID, villa_id: 'v14', client_id: 'c15', check_in: d(60),  check_out: d(65),  guests: 3, total_amount: 1000, currency: 'TND', source: 'whatsapp', status: 'pending',   internal_note: 'En attente d\'acompte 30%.', ical_uid: null, created_at: past(1), updated_at: past(1) },
  // VRBO (1)
  { id: 'r15', tenant_id: TENANT_ID, villa_id: 'v11', client_id: 'c12', check_in: d(70),  check_out: d(80),  guests: 9, total_amount: 5000, currency: 'TND', source: 'vrbo',     status: 'confirmed', internal_note: null, ical_uid: null, created_at: past(5), updated_at: past(5) },
]

// ─── TEAM MEMBERS ──────────────────────────────────────────────────────────
export const DEMO_TEAM: TeamMember[] = [
  { id: 't1', tenant_id: TENANT_ID, full_name: 'Fatma Ben Amor',   role: 'manager',     phone: '+216 71 100 001', email: 'fatma.ba@pms-djerba.tn',   assigned_villa_ids: ['v1','v2','v3','v4'],  created_at: past(60) },
  { id: 't2', tenant_id: TENANT_ID, full_name: 'Mariam Khelil',    role: 'cleaner',     phone: '+216 71 100 002', email: 'mariam.k@pms-djerba.tn',   assigned_villa_ids: ['v5','v6','v7','v8'],  created_at: past(55) },
  { id: 't3', tenant_id: TENANT_ID, full_name: 'Nour Triki',       role: 'cleaner',     phone: '+216 71 100 003', email: 'nour.t@pms-djerba.tn',     assigned_villa_ids: ['v9','v10','v11','v12'], created_at: past(50) },
  { id: 't4', tenant_id: TENANT_ID, full_name: 'Sami Romdhane',    role: 'maintenance', phone: '+216 71 100 004', email: 'sami.r@pms-djerba.tn',     assigned_villa_ids: ['v13','v14','v15'], created_at: past(45) },
]

// ─── CLEANING TASKS ────────────────────────────────────────────────────────
export const DEMO_TASKS: CleaningTask[] = [
  { id: 'tk1', tenant_id: TENANT_ID, villa_id: 'v7',  reservation_id: 'r12', assigned_to: 't2', task_type: 'full',     scheduled_date: d(0), status: 'in_progress', checklist: DEFAULT_CHECKLIST, photos: [], note: 'Départ ce matin. Arrivée à 15h.',                    created_at: today.toISOString(), updated_at: today.toISOString() },
  { id: 'tk2', tenant_id: TENANT_ID, villa_id: 'v1',  reservation_id: 'r1',  assigned_to: 't1', task_type: 'full',     scheduled_date: d(2), status: 'todo',       checklist: DEFAULT_CHECKLIST, photos: [], note: 'Préparer panier bienvenue.',                          created_at: past(1), updated_at: past(1) },
  { id: 'tk3', tenant_id: TENANT_ID, villa_id: 'v2',  reservation_id: 'r5',  assigned_to: 't1', task_type: 'quick',    scheduled_date: d(1), status: 'todo',       checklist: DEFAULT_CHECKLIST, photos: [], note: null,                                                   created_at: past(1), updated_at: past(1) },
  { id: 'tk4', tenant_id: TENANT_ID, villa_id: 'v10', reservation_id: null,  assigned_to: 't4', task_type: 'maintenance', scheduled_date: d(1), status: 'todo',    checklist: [], photos: [], note: 'Réparer la pompe de la piscine.',                          created_at: past(2), updated_at: past(2) },
  { id: 'tk5', tenant_id: TENANT_ID, villa_id: 'v5',  reservation_id: 'r9',  assigned_to: 't2', task_type: 'full',     scheduled_date: d(3), status: 'todo',       checklist: DEFAULT_CHECKLIST, photos: [], note: null,                                                   created_at: past(1), updated_at: past(1) },
  { id: 'tk6', tenant_id: TENANT_ID, villa_id: 'v3',  reservation_id: 'r2',  assigned_to: 't1', task_type: 'inspection', scheduled_date: d(5), status: 'todo',    checklist: DEFAULT_CHECKLIST, photos: [], note: 'Vérifier état avant arrivée famille italienne.',        created_at: past(1), updated_at: past(1) },
  { id: 'tk7', tenant_id: TENANT_ID, villa_id: 'v9',  reservation_id: null,  assigned_to: 't3', task_type: 'quick',    scheduled_date: past(1), status: 'done',    checklist: DEFAULT_CHECKLIST.map(i => ({ ...i, done: true })), photos: [], note: null, created_at: past(3), updated_at: past(1) },
  { id: 'tk8', tenant_id: TENANT_ID, villa_id: 'v13', reservation_id: null,  assigned_to: 't4', task_type: 'maintenance', scheduled_date: past(2), status: 'issue', checklist: [], photos: [], note: 'Problème électrique signalé — électricien à appeler.',  created_at: past(4), updated_at: past(2) },
]

// ─── SEASONAL RATES ────────────────────────────────────────────────────────
export const DEMO_SEASONAL_RATES: SeasonalRate[] = [
  { id: 'sr1', tenant_id: TENANT_ID, name: 'Basse saison',           start_date: '2025-10-01', end_date: '2026-03-31', multiplier: 0.6,  created_at: past(60) },
  { id: 'sr2', tenant_id: TENANT_ID, name: 'Moyenne saison',         start_date: '2026-04-01', end_date: '2026-05-31', multiplier: 0.8,  created_at: past(60) },
  { id: 'sr3', tenant_id: TENANT_ID, name: 'Haute saison',           start_date: '2026-06-01', end_date: '2026-08-31', multiplier: 1.0,  created_at: past(60) },
  { id: 'sr4', tenant_id: TENANT_ID, name: 'Haute saison (suite)',   start_date: '2025-06-01', end_date: '2025-08-31', multiplier: 1.0,  created_at: past(60) },
  { id: 'sr5', tenant_id: TENANT_ID, name: 'Moyenne saison (suite)', start_date: '2026-09-01', end_date: '2026-09-30', multiplier: 0.8,  created_at: past(60) },
  { id: 'sr6', tenant_id: TENANT_ID, name: 'Vacances & fêtes',       start_date: '2026-07-14', end_date: '2026-07-20', multiplier: 1.25, created_at: past(60) },
  { id: 'sr7', tenant_id: TENANT_ID, name: 'Last-minute J-3',        start_date: '2026-01-01', end_date: '2026-12-31', multiplier: 0.85, created_at: past(60) },
]

// ─── Helper: enrich reservations with joined data ──────────────────────────
export function enrichReservations(
  reservations: Reservation[],
  villas: Villa[],
  clients: Client[],
): Reservation[] {
  const villaMap = Object.fromEntries(villas.map(v => [v.id, v]))
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  return reservations.map(r => ({
    ...r,
    villa: villaMap[r.villa_id],
    client: r.client_id ? clientMap[r.client_id] : undefined,
  }))
}
