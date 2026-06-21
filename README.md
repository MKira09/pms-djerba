# PMS Djerba 🏖️

> SaaS de gestion de villas de location saisonnière — marché tunisien

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS |
| État | Zustand |
| Backend/Auth/DB | Supabase (PostgreSQL + Auth + Storage) |
| Emails | Resend / Brevo |
| Paiements | Stripe + Konnect |
| i18n | i18next (FR / AR RTL / EN) |

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer Supabase
cp .env.example .env
# → Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 3. Appliquer le schéma SQL
# → Copier supabase/migrations/001_initial_schema.sql dans l'éditeur SQL Supabase

# 4. Lancer en dev
npm run dev
```

## Mode démonstration

Cliquez sur **"Voir la démonstration"** sur l'écran de connexion pour charger automatiquement :
- 15 villas fictives (Djerba)
- 15 réservations réparties sur 90 jours
- 4 membres d'équipe
- Tarification saisonnière

Aucune base de données requise — tout fonctionne en mémoire.

## Modules

| Module | Statut |
|--------|--------|
| Auth multi-tenant | ✅ |
| CRUD Villas | ✅ |
| Calendrier mensuel | ✅ |
| Réservations (CRUD + conflits) | ✅ |
| Dashboard KPIs + graphiques | ✅ |
| Gestion équipe ménage | ✅ |
| Tâches & checklist | ✅ |
| Tarification saisonnière | ✅ |
| Templates email | ✅ |
| i18n FR / AR / EN | ✅ |
| Abonnements (Starter/Pro/Agence) | ✅ |
| iCal sync Airbnb/Booking | 🔜 v2 |
| WhatsApp Business API | 🔜 v2 |
| App mobile (PWA) | 🔜 v2 |

## Plans tarifaires

| Plan | Prix | Villas |
|------|------|--------|
| Starter | 29 TND/mois | 5 |
| Pro | 79 TND/mois | 15 |
| Agence | 149 TND/mois | 50 |

## Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** → coller `supabase/migrations/001_initial_schema.sql`
3. Copier l'URL et la clé anonyme dans `.env`

## Structure du projet

```
src/
├── components/
│   ├── layout/        # Sidebar, Header, BottomNav
│   ├── ui/            # Button, Input, Modal, Card…
│   ├── villas/        # VillaForm
│   ├── reservations/  # ReservationForm
│   └── (team, pricing…)
├── pages/             # Une page par route
├── stores/            # Zustand : auth, villas, reservations, team, pricing
├── lib/               # Supabase client, utils, demo-data
├── i18n/              # Traductions FR / AR / EN
└── types/             # TypeScript interfaces
supabase/
└── migrations/        # Schema SQL
```
