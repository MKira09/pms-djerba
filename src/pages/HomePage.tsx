import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const C = {
  dark:          '#0A2A35',
  teal:          '#0D9E8E',
  tealLight:     '#2DCFC5',
  textSecondary: '#4A6B70',
  border:        '#E8E5DF',
  bg:            '#FAFAF8',
  navyMid:       '#0D4F6C',
  beige:         '#FDF8EE',
  white:         '#FFFFFF',
}

const FEATURES = [
  { icon: '📅', title: 'Calendrier centralisé', desc: 'Visualisez toutes vos disponibilités et réservations en un coup d\'œil.' },
  { icon: '📋', title: 'Réservations fluides', desc: 'Gérez les arrivées, départs et paiements depuis une interface unique.' },
  { icon: '👥', title: 'Gestion des clients', desc: 'Fiches clients, historique des séjours, liste noire et documents.' },
  { icon: '📊', title: 'Tableau de bord', desc: 'Suivez vos revenus, taux d\'occupation et performances en temps réel.' },
  { icon: '📱', title: 'Mobile & PWA', desc: 'Installez l\'app sur iPhone ou Android — accessible hors ligne.' },
  { icon: '🏡', title: 'Multi-types de biens', desc: 'Villas, appartements, riads, chalets — gérez-les tous sur une plateforme.' },
  { icon: '✉️', title: 'Emails automatiques', desc: 'Confirmations, rappels et avis envoyés automatiquement à vos clients.' },
  { icon: '🔒', title: 'Données sécurisées', desc: 'Isolation multi-tenant et politiques RLS Supabase sur chaque donnée.' },
]

const ALT_BLOCKS = [
  {
    label: 'Pilotez en toute clarté',
    title: 'Votre portefeuille de biens, d\'un seul regard',
    body: 'Regroupez villas, appartements et riads dans un tableau de bord épuré. Suivez les disponibilités, les revenus et les statuts de chaque bien sans jamais vous perdre dans des tableurs.',
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80',
    imgRight: false,
  },
  {
    label: 'Des réservations sans friction',
    title: 'De la demande au check-out, tout est là',
    body: 'Enregistrez une réservation en moins de 30 secondes. Générez des confirmations, suivez les paiements et planifiez les ménages — le tout depuis votre téléphone.',
    img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80',
    imgRight: true,
  },
  {
    label: 'Expérience client mémorable',
    title: 'Soignez chaque séjour, fidélisez chaque client',
    body: 'Fiches clients complètes, historique de séjours, blacklist et communications personnalisées. VillaHub vous aide à offrir une expérience hôtelière irréprochable.',
    img: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=900&q=80',
    imgRight: false,
  },
]

const PLANS = [
  { name: 'Starter', price: 29, desc: 'Pour démarrer', features: ['3 biens', 'Réservations illimitées', 'Calendrier', 'Emails auto', '1 utilisateur'], highlight: false },
  { name: 'Pro', price: 59, desc: 'Le plus populaire', features: ['10 biens', 'Tout Starter', 'Analytics', 'Extras & services', '5 utilisateurs'], highlight: true },
  { name: 'Agence', price: 99, desc: 'Portefeuilles larges', features: ['Biens illimités', 'Tout Pro', 'Utilisateurs illimités', 'Accès API', 'Onboarding dédié'], highlight: false },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [foundingCount, setFoundingCount] = useState<number | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMsg, setContactMsg] = useState('')
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.rpc('get_founding_member_count').then(({ data }) => {
      if (typeof data === 'number') setFoundingCount(data)
    })
  }, [])

  const remaining = foundingCount !== null ? Math.max(0, 5 - foundingCount) : null

  function handleContact(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Demande de contact VillaHub — ${contactName}`)
    const body = encodeURIComponent(`Nom : ${contactName}\nEmail : ${contactEmail}\n\n${contactMsg}`)
    window.location.href = `mailto:contact@villahub.io?subject=${subject}&body=${body}`
  }

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", background: C.bg, color: C.dark, overflowX: 'hidden' }}>

      {/* ─── NAV ─── */}
      <nav
        className="lp-nav"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px',
          background: 'rgba(10,42,53,0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ fontFamily: "'Cormorant', serif", fontSize: 24, fontWeight: 600, color: C.white, letterSpacing: '0.04em' }}>
          VillaHub
        </span>
        <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {['Fonctionnalités', 'Tarifs', 'Contact'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.white)}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/login')}
            className="lp-btn-ghost"
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              color: C.white, padding: '8px 20px', borderRadius: 4,
              fontSize: 13, fontWeight: 400, letterSpacing: '0.06em', cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            Connexion
          </button>
          <button
            onClick={() => navigate('/plans')}
            style={{
              background: C.teal, border: 'none',
              color: C.white, padding: '8px 20px', borderRadius: 4,
              fontSize: 13, fontWeight: 500, letterSpacing: '0.06em', cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Essai gratuit
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <div
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex', alignItems: 'center',
          background: `linear-gradient(165deg, ${C.dark} 0%, #0D4F6C 60%, #0A3540 100%)`,
          overflow: 'hidden',
        }}
      >
        {/* Background image overlay */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?auto=format&fit=crop&w=1800&q=80)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.18,
          }}
        />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${C.dark}EE 40%, transparent 100%)` }} />

        {/* Watermark text */}
        <div
          className="lp-hero-watermark"
          style={{
            position: 'absolute', right: -40, bottom: 40,
            fontFamily: "'Cormorant', serif", fontSize: 220, fontWeight: 600,
            color: 'rgba(255,255,255,0.03)', lineHeight: 1, userSelect: 'none',
            pointerEvents: 'none', letterSpacing: '-0.04em',
          }}
        >
          VILLA
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, padding: '140px 48px 100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 32, height: 1, background: C.teal }} />
            <span style={{ color: C.teal, fontSize: 12, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Gestion de locations saisonnières
            </span>
          </div>

          <h1
            className="lp-hero-title"
            style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 68, fontWeight: 600,
              fontStyle: 'italic',
              color: C.white, lineHeight: 1.1,
              marginBottom: 28, letterSpacing: '-0.01em',
            }}
          >
            L'élégance de gérer<br />
            <span style={{ color: C.tealLight }}>sans effort</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 18, fontWeight: 300, lineHeight: 1.7, maxWidth: 540, marginBottom: 48 }}>
            VillaHub réunit réservations, clients et revenus dans une interface minimaliste conçue pour les propriétaires et agences exigeants.
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/plans')}
              style={{
                background: C.teal, color: C.white,
                padding: '16px 36px', border: 'none', borderRadius: 4,
                fontSize: 14, fontWeight: 500, letterSpacing: '0.08em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'opacity 0.2s', boxShadow: `0 8px 32px ${C.teal}44`,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Commencer gratuitement
            </button>
            <a
              href="#fonctionnalités"
              style={{
                background: 'transparent', color: C.white,
                padding: '16px 36px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 4,
                fontSize: 14, fontWeight: 400, letterSpacing: '0.08em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'border-color 0.2s', textDecoration: 'none', display: 'inline-block',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
            >
              Découvrir →
            </a>
          </div>

          {remaining !== null && remaining > 0 && (
            <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < (5 - remaining) ? C.teal : 'rgba(255,255,255,0.2)' }} />
                ))}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                <span style={{ color: C.tealLight, fontWeight: 500 }}>{remaining} place{remaining > 1 ? 's' : ''}</span> membre fondateur restante{remaining > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.2)', animation: 'lp-pulse 2s ease-in-out infinite' }} />
        </div>
      </div>

      {/* ─── CITATION ─── */}
      <section style={{ background: C.beige, padding: '96px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ width: 48, height: 2, background: C.teal, margin: '0 auto 40px' }} />
          <blockquote
            style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 36, fontWeight: 500, fontStyle: 'italic',
              color: C.dark, lineHeight: 1.4, margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            « La gestion de vos biens doit être aussi belle<br />que vos séjours. »
          </blockquote>
          <p style={{ color: C.textSecondary, fontSize: 13, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 32 }}>
            — VillaHub, 2024
          </p>
        </div>
      </section>

      {/* ─── CHIFFRES ─── */}
      <section style={{ background: C.dark, padding: '96px 48px' }}>
        <div
          className="lp-grid-4"
          style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}
        >
          {[
            { value: '< 30s', label: 'pour créer une réservation' },
            { value: '100%', label: 'données sécurisées et isolées' },
            { value: '3', label: 'types de plans adaptés' },
            { value: '7', label: 'types de biens supportés' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center', padding: '40px 24px',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <div style={{ fontFamily: "'Cormorant', serif", fontSize: 52, fontWeight: 600, color: C.tealLight, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 300, marginTop: 12, lineHeight: 1.5 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── BLOCS ALTERNÉS ─── */}
      <section id="fonctionnalités">
        {ALT_BLOCKS.map((block, i) => (
          <div
            key={i}
            className="lp-alt-section lp-grid-2"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              minHeight: 560,
            }}
          >
            {/* Image */}
            <div
              className="lp-alt-img"
              style={{
                order: block.imgRight ? 1 : 0,
                backgroundImage: `url(${block.img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: 400,
              }}
            />

            {/* Text */}
            <div
              className="lp-section-pad"
              style={{
                order: block.imgRight ? 0 : 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '80px 64px',
                background: i % 2 === 0 ? C.bg : C.beige,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 24, height: 1, background: C.teal }} />
                <span style={{ color: C.teal, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {block.label}
                </span>
              </div>
              <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: 36, fontWeight: 600, fontStyle: 'italic', color: C.dark, lineHeight: 1.2, marginBottom: 20 }}>
                {block.title}
              </h2>
              <p style={{ color: C.textSecondary, fontSize: 16, fontWeight: 300, lineHeight: 1.8 }}>
                {block.body}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ─── GRILLE FONCTIONNALITÉS ─── */}
      <section style={{ background: C.dark, padding: '112px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 1, background: C.teal }} />
              <span style={{ color: C.teal, fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Tout est inclus</span>
              <div style={{ width: 32, height: 1, background: C.teal }} />
            </div>
            <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: 44, fontWeight: 600, fontStyle: 'italic', color: C.white, lineHeight: 1.2 }}>
              Une plateforme complète,<br />zéro complexité
            </h2>
          </div>

          <div
            className="lp-feat-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}
          >
            {FEATURES.map((f, i) => {
              const col = i % 4
              const row = Math.floor(i / 4)
              const isLastRow = row === Math.floor((FEATURES.length - 1) / 4)
              return (
                <div
                  key={i}
                  className={col < 3 ? 'lp-feat-border-r' : ''}
                  style={{
                    padding: '40px 32px',
                    borderRight: col < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    borderBottom: !isLastRow ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                  <h3 style={{ color: C.white, fontSize: 15, fontWeight: 500, marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── BANDEAU MEMBRES FONDATEURS ─── */}
      {(remaining === null || remaining > 0) && (
        <section style={{ background: C.beige, padding: '80px 48px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              <span style={{ fontSize: 20 }}>★</span>
              <span style={{ color: C.dark, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Offre de lancement</span>
            </div>
            <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: 40, fontWeight: 600, fontStyle: 'italic', color: C.dark, lineHeight: 1.2, marginBottom: 16 }}>
              Devenez membre fondateur
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 16, fontWeight: 300, lineHeight: 1.7, marginBottom: 36 }}>
              Les <strong style={{ color: C.dark, fontWeight: 500 }}>5 premiers clients</strong> bénéficient de biens illimités à vie,
              quel que soit le plan choisi. Sans surcoût, sans condition.
            </p>

            {/* Seats indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 56, height: 8, borderRadius: 4,
                    background: foundingCount !== null && i < foundingCount ? C.teal : C.border,
                    transition: 'background 0.4s',
                  }}
                />
              ))}
            </div>

            <p style={{ color: C.textSecondary, fontSize: 14, marginBottom: 32 }}>
              {remaining !== null
                ? remaining > 0
                  ? <><span style={{ fontWeight: 500, color: C.dark }}>{remaining} place{remaining > 1 ? 's' : ''}</span> restante{remaining > 1 ? 's' : ''} sur 5</>
                  : 'Toutes les places ont été attribuées.'
                : 'Chargement…'}
            </p>

            <button
              onClick={() => navigate('/plans')}
              style={{
                background: C.dark, color: C.white,
                padding: '16px 40px', border: 'none', borderRadius: 4,
                fontSize: 13, fontWeight: 500, letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Réserver ma place →
            </button>
          </div>
        </section>
      )}

      {/* ─── TARIFS ─── */}
      <section id="tarifs" style={{ background: C.bg, padding: '112px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 1, background: C.teal }} />
              <span style={{ color: C.teal, fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Tarifs simples</span>
              <div style={{ width: 32, height: 1, background: C.teal }} />
            </div>
            <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: 44, fontWeight: 600, fontStyle: 'italic', color: C.dark, lineHeight: 1.2 }}>
              Choisissez votre plan
            </h2>
          </div>

          <div
            className="lp-grid-3"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className="lp-plan-pad"
                style={{
                  padding: '48px 32px',
                  background: plan.highlight ? C.dark : C.white,
                  border: plan.highlight ? `1px solid ${C.teal}` : `1px solid ${C.border}`,
                  position: 'relative',
                  transform: plan.highlight ? 'translateY(-8px)' : 'none',
                  boxShadow: plan.highlight ? `0 24px 64px rgba(10,42,53,0.18)` : 'none',
                }}
              >
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: C.teal, color: C.white, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '4px 16px',
                  }}>
                    Populaire
                  </div>
                )}

                <p style={{ color: plan.highlight ? 'rgba(255,255,255,0.5)' : C.textSecondary, fontSize: 12, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  {plan.desc}
                </p>
                <h3 style={{ fontFamily: "'Cormorant', serif", fontSize: 28, fontWeight: 600, color: plan.highlight ? C.white : C.dark, marginBottom: 20 }}>
                  {plan.name}
                </h3>
                <div style={{ marginBottom: 32 }}>
                  <span style={{ fontFamily: "'Cormorant', serif", fontSize: 52, fontWeight: 600, color: plan.highlight ? C.tealLight : C.dark }}>
                    {plan.price}€
                  </span>
                  <span style={{ color: plan.highlight ? 'rgba(255,255,255,0.4)' : C.textSecondary, fontSize: 14, marginLeft: 4 }}>/mois</span>
                </div>

                <div style={{ width: '100%', height: 1, background: plan.highlight ? 'rgba(255,255,255,0.08)' : C.border, marginBottom: 28 }} />

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 300, color: plan.highlight ? 'rgba(255,255,255,0.7)' : C.textSecondary }}>
                      <span style={{ color: C.teal, fontWeight: 600, fontSize: 16 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/plans')}
                  style={{
                    width: '100%', padding: '14px', border: 'none', borderRadius: 4,
                    background: plan.highlight ? C.teal : 'transparent',
                    color: plan.highlight ? C.white : C.dark,
                    outline: plan.highlight ? 'none' : `1px solid ${C.border}`,
                    fontSize: 13, fontWeight: 500, letterSpacing: '0.08em',
                    textTransform: 'uppercase', cursor: 'pointer', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Choisir {plan.name}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: C.textSecondary, fontSize: 13, fontWeight: 300, marginTop: 40 }}>
            Annulation à tout moment · Aucun engagement · Paiement mensuel
          </p>
        </div>
      </section>

      {/* ─── CTA + CONTACT ─── */}
      <section id="contact" style={{ background: C.dark, padding: '112px 48px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 32, height: 1, background: C.teal }} />
            <span style={{ color: C.teal, fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Contact</span>
            <div style={{ width: 32, height: 1, background: C.teal }} />
          </div>

          <h2 style={{ fontFamily: "'Cormorant', serif", fontSize: 44, fontWeight: 600, fontStyle: 'italic', color: C.white, lineHeight: 1.2, marginBottom: 16 }}>
            Une question ?<br />Écrivez-nous
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: 300, lineHeight: 1.7, marginBottom: 56 }}>
            Notre équipe vous répond sous 24h. Parlez-nous de votre activité et découvrez comment VillaHub peut vous aider.
          </p>

          <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <input
                className="lp-input"
                required
                placeholder="Votre nom"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: C.white, padding: '14px 18px', borderRadius: 4,
                  fontSize: 14, fontFamily: "'Jost', sans-serif", fontWeight: 300,
                  transition: 'border-color 0.2s',
                }}
              />
              <input
                className="lp-input"
                required
                type="email"
                placeholder="Votre email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: C.white, padding: '14px 18px', borderRadius: 4,
                  fontSize: 14, fontFamily: "'Jost', sans-serif", fontWeight: 300,
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            <textarea
              className="lp-input"
              required
              rows={5}
              placeholder="Votre message"
              value={contactMsg}
              onChange={e => setContactMsg(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: C.white, padding: '14px 18px', borderRadius: 4,
                fontSize: 14, fontFamily: "'Jost', sans-serif", fontWeight: 300,
                resize: 'vertical', transition: 'border-color 0.2s',
              }}
            />
            <button
              type="submit"
              style={{
                background: C.teal, color: C.white,
                padding: '16px', border: 'none', borderRadius: 4,
                fontSize: 13, fontWeight: 500, letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'opacity 0.2s', alignSelf: 'stretch',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Envoyer le message →
            </button>
          </form>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: '#040F13', padding: '32px 48px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="lp-footer"
          style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span style={{ fontFamily: "'Cormorant', serif", fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
            VillaHub
          </span>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 300 }}>
            © {new Date().getFullYear()} VillaHub. Tous droits réservés.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Connexion', 'S\'inscrire', 'Plans'].map(label => (
              <a
                key={label}
                onClick={() => navigate(label === 'Connexion' ? '/login' : label === 'S\'inscrire' ? '/register' : '/plans')}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 300, textDecoration: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
