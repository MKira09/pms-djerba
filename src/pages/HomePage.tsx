import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

/* ─────── Palette ─────── */
const C = {
  teal:   '#07BEB8',
  tealDk: '#059B95',
  navy:   '#3D5A3E',
  sand:   '#F5F0E8',
  sandDk: '#EDE8DF',
  white:  '#FFFFFF',
  dark:   '#0D1F2D',
  grey:   '#6B7A85',
}

/* ─────── Gallery images ─────── */
const GALLERY = [
  {
    src: 'https://images.unsplash.com/photo-1580596090683-f4711170117b?auto=format&fit=crop&w=900&q=85',
    label: 'FLEURS',
    span: 'row',
  },
  {
    src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=700&q=85',
    label: 'TERRASSE & PISCINE',
    span: 'normal',
  },
  {
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=85',
    label: 'MER TURQUOISE',
    span: 'normal',
  },
  {
    src: 'https://plus.unsplash.com/premium_photo-1712736395967-b2a9bf7dfba4?auto=format&fit=crop&w=700&q=85',
    label: 'CHAISE',
    span: 'normal',
  },
  {
    src: 'https://images.unsplash.com/photo-1657521756507-03b02c8ead16?auto=format&fit=crop&w=700&q=85',
    label: 'ENTRÉE',
    span: 'normal',
  },
]

const FEATURES = [
  {
    num: '01',
    title: 'Réservations fluides',
    body: 'Enregistrez une réservation en 30 secondes. Calendrier, paiements et documents — tout au même endroit.',
    icon: '📅',
  },
  {
    num: '02',
    title: 'Vos biens, tous les types',
    body: 'Villas, riads, appartements, bungalows. Gérez l\'ensemble de votre portefeuille depuis une interface unique.',
    icon: '🏡',
  },
  {
    num: '03',
    title: 'Expérience client soignée',
    body: 'Fiches clients, historique de séjours et emails automatiques pour un accueil hôtelier irréprochable.',
    icon: '✉️',
  },
]

const PLANS = [
  { name: 'Starter',      price: 29,  detail: '5 biens · 2 utilisateurs',         cta: false },
  { name: 'Pro',          price: 59,  detail: '10 biens · 5 utilisateurs',         cta: true  },
  { name: 'Agence',       price: 99,  detail: 'Biens illimités · Équipe illimitée', cta: false },
  {
    name: 'CLÉS EN MAIN',
    isQuote: true,
    detail: 'Service clé en main',
    description: 'Vous n\'avez rien à faire. Nous configurons tout, vous gérez.',
    cta: false,
    features: [
      'Invitation et configuration de votre espace',
      'Ajout de toutes vos villas (photos, tarifs, description)',
      'Configuration de vos extras et services',
      'Ajout de votre équipe',
      'Code WiFi et contacts configurés',
      'Formation d\'1h en visio incluse',
      'Livré 100% prêt à l\'emploi',
    ],
  },
]

/* ─────── Component ─────── */
export default function HomePage() {
  const navigate = useNavigate()
  const { tenant: authTenant } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [foundingCount, setFoundingCount] = useState<number | null>(null)
  const [agencyName, setAgencyName] = useState('')
  const [agencyLogo, setAgencyLogo] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [contactError, setContactError] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.rpc('get_founding_member_count').then(({ data }) => {
      if (typeof data === 'number') setFoundingCount(data)
    })
  }, [])

  // Load agency name + logo: auth store first, then Supabase anon query as fallback
  useEffect(() => {
    if (authTenant) {
      setAgencyName(authTenant.name)
      setAgencyLogo(authTenant.logo_url ?? '')
      return
    }
    supabase
      .from('tenants')
      .select('name, logo_url')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAgencyName(data.name ?? '')
          setAgencyLogo(data.logo_url ?? '')
        }
      })
  }, [authTenant])

  const remaining = foundingCount !== null ? Math.max(0, 5 - foundingCount) : null

  async function handleContact(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setContactError('')
    try {
      const { error } = await supabase.functions.invoke('send-contact-form', {
        body: { name, email, phone: phone || undefined, message: msg },
      })
      if (error) throw error
      setSent(true)
      setName(''); setEmail(''); setPhone(''); setMsg('')
    } catch {
      setContactError("Une erreur est survenue. Veuillez réessayer ou nous écrire directement.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", background: C.white, color: C.dark, overflowX: 'hidden' }}>

      {/* ════════════════════════════════
          NAV
      ════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 72,
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
        borderBottom: scrolled ? `1px solid ${C.sandDk}` : 'none',
        transition: 'background 0.4s, border-color 0.4s',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {agencyLogo ? (
            <img
              src={agencyLogo}
              alt="Logo"
              style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <span style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: scrolled ? C.sandDk : 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'background 0.4s',
            }}>🏠</span>
          )}
          <span style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 22, fontWeight: 600, letterSpacing: '0.06em',
            color: scrolled ? C.navy : C.white,
            transition: 'color 0.4s', cursor: 'default',
          }}>
            {agencyName || 'VillaHub'}
          </span>
        </div>

        {/* Links — hidden on mobile via CSS */}
        <div className="lp-nav-links" style={{ display: 'flex', gap: 40 }}>
          {['Fonctionnalités', 'Tarifs', 'Contact'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              style={{
                color: scrolled ? C.grey : 'rgba(255,255,255,0.75)',
                fontSize: 12, fontWeight: 400,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = scrolled ? C.navy : C.white)}
              onMouseLeave={e => (e.currentTarget.style.color = scrolled ? C.grey : 'rgba(255,255,255,0.75)')}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/plans')}
          style={{
            background: C.teal, color: C.white,
            border: 'none', borderRadius: 2,
            padding: '10px 26px',
            fontSize: 12, fontWeight: 500, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Commencer
        </button>
      </nav>

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <section className="lp-hero-section" style={{
        position: 'relative',
        height: '100vh', minHeight: 640,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Background sea */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=1920&q=90)',
          backgroundSize: 'cover', backgroundPosition: 'center 30%',
        }} />
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(12,68,124,0.38) 0%, rgba(7,190,184,0.18) 50%, rgba(12,68,124,0.55) 100%)',
        }} />

        {/* Central card */}
        <div className="lp-hero-card" style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(2px)',
          border: '1px solid rgba(255,255,255,0.30)',
          padding: '64px 80px',
          textAlign: 'center',
          maxWidth: 560,
          width: '90%',
        }}>
          {/* Overline */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.6)' }} />
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Gestion de locations saisonnières
            </span>
            <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.6)' }} />
          </div>

          {/* Brand name */}
          <div className="lp-hero-brand" style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 72, fontWeight: 600,
            color: C.white, lineHeight: 1,
            letterSpacing: '0.04em', marginBottom: 20,
          }}>
            {agencyName ? `${agencyName} Agency` : 'VillaHub'}
          </div>

          {/* Tagline */}
          <p className="lp-hero-tagline" style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 22, fontWeight: 400, fontStyle: 'italic',
            color: 'rgba(255,255,255,0.88)',
            lineHeight: 1.4, marginBottom: 16,
            letterSpacing: '0.01em',
          }}>
            L'élégance de gérer sans effort
          </p>

          {/* Subtitle for clarity */}
          <p style={{
            fontSize: 16, fontWeight: 600,
            color: C.white,
            lineHeight: 1.6, marginBottom: 36,
            letterSpacing: '0.02em',
            textShadow: '0 2px 8px rgba(0,0,0,0.45)',
          }}>
            Le logiciel pensé pour les agences et propriétaires<br />de locations saisonnières.
          </p>

          {/* Divider */}
          <div style={{ width: 48, height: 1, background: C.teal, margin: '0 auto 36px' }} />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/plans')}
              style={{
                background: C.teal, color: C.white,
                border: 'none', padding: '14px 36px', borderRadius: 2,
                fontSize: 12, fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'opacity 0.2s',
                boxShadow: `0 8px 32px rgba(7,190,184,0.35)`,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Commencer
            </button>
            <a
              href="#galerie"
              style={{
                background: 'transparent', color: C.white,
                border: '1px solid rgba(255,255,255,0.45)',
                padding: '14px 36px', borderRadius: 2,
                fontSize: 12, fontWeight: 400, letterSpacing: '0.12em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'border-color 0.2s', textDecoration: 'none', display: 'inline-block',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.85)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)')}
            >
              Découvrir
            </a>
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{
          position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Défiler</span>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.3)' }} />
        </div>
      </section>

      {/* ════════════════════════════════
          INTRO PHRASE
      ════════════════════════════════ */}
      <section style={{ background: C.white, padding: '96px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ width: 40, height: 2, background: C.teal, margin: '0 auto 40px' }} />
          <p style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 34, fontWeight: 500, fontStyle: 'italic',
            color: C.navy, lineHeight: 1.5, letterSpacing: '-0.01em',
          }}>
            Gérez vos biens, choisissez vos clients, gardez 100% de vos revenus.
          </p>
          <div style={{ width: 40, height: 2, background: C.teal, margin: '40px auto 0' }} />
        </div>
      </section>

      {/* ════════════════════════════════
          GALERIE
      ════════════════════════════════ */}
      <section id="galerie" style={{ background: C.sand, padding: '96px 48px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              color: C.teal, fontSize: 11, fontWeight: 400,
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              Votre portefeuille, en un coup d'œil
            </span>
            <h2 className="lp-gallery-h2" style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 42, fontWeight: 600, fontStyle: 'italic',
              color: C.navy, lineHeight: 1.2, marginTop: 12,
            }}>
              Villas, appartements, riads — gérés depuis une seule interface.
            </h2>
          </div>

          {/* Grid — editorial layout */}
          <div className="lp-gallery-grid">
            <GalleryImg src={GALLERY[0].src} label={GALLERY[0].label} className="lp-gi-0" />
            <GalleryImg src={GALLERY[1].src} label={GALLERY[1].label} className="lp-gi-1" />
            <GalleryImg src={GALLERY[2].src} label={GALLERY[2].label} className="lp-gi-2" />
            <GalleryImg src={GALLERY[3].src} label={GALLERY[3].label} className="lp-gi-3" />
            <GalleryImg src={GALLERY[4].src} label={GALLERY[4].label} className="lp-gi-4" />
          </div>


        </div>
      </section>

      {/* ════════════════════════════════
          FONCTIONNALITÉS
      ════════════════════════════════ */}
      <section id="fonctionnalités" style={{ background: C.white, padding: '112px 48px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ color: C.teal, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              ZÉRO COMPLICATION
            </span>
            <h2 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 42, fontWeight: 600, fontStyle: 'italic',
              color: C.navy, lineHeight: 1.2, marginTop: 12,
            }}>
              Réservations, clients, revenus — tout au même endroit.
            </h2>
          </div>

          <div className="lp-feat-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            border: `1px solid ${C.sandDk}`,
          }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="lp-feat-item"
                style={{
                  padding: '56px 44px',
                  background: C.white,
                  borderRight: i < 2 ? `1px solid ${C.sandDk}` : 'none',
                  transition: 'background 0.3s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = C.sand)}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = C.white)}
              >
                <div style={{ fontSize: 32, marginBottom: 24 }}>{f.icon}</div>
                <div style={{
                  fontFamily: "'Cormorant', serif",
                  fontSize: 11, fontWeight: 400, letterSpacing: '0.2em',
                  color: C.teal, textTransform: 'uppercase', marginBottom: 14,
                }}>
                  {f.num}
                </div>
                <h3 style={{
                  fontFamily: "'Cormorant', serif",
                  fontSize: 26, fontWeight: 600, color: C.navy,
                  lineHeight: 1.2, marginBottom: 16,
                }}>
                  {f.title}
                </h3>
                <p style={{ color: C.grey, fontSize: 15, fontWeight: 300, lineHeight: 1.8 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          FOUNDING MEMBER BAND
      ════════════════════════════════ */}
      {(remaining === null || remaining > 0) && (
        <section style={{
          background: C.navy,
          padding: '72px 48px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <span style={{ color: C.teal, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Offre de lancement
            </span>
            <h2 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 36, fontWeight: 600, fontStyle: 'italic',
              color: C.white, lineHeight: 1.3, margin: '16px 0 12px',
            }}>
              Devenez membre fondateur
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
              Les 5 premiers clients bénéficient de <span style={{ color: C.teal, fontWeight: 500 }}>biens illimités à vie</span>,
              quel que soit le plan choisi.
            </p>
            {/* Dots */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  width: 48, height: 6, borderRadius: 3,
                  background: foundingCount !== null && i < foundingCount
                    ? C.teal : 'rgba(255,255,255,0.12)',
                }} />
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 32 }}>
              {remaining !== null
                ? <><span style={{ color: C.white, fontWeight: 500 }}>{remaining} place{remaining > 1 ? 's' : ''}</span> restante{remaining > 1 ? 's' : ''} sur 5</>
                : '…'}
            </p>
            <button
              onClick={() => navigate('/plans')}
              style={{
                background: C.teal, color: C.white, border: 'none',
                padding: '14px 40px', borderRadius: 2,
                fontSize: 12, fontWeight: 500, letterSpacing: '0.12em',
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

      {/* ════════════════════════════════
          NOTRE HISTOIRE
      ════════════════════════════════ */}
      <section style={{ background: C.white, padding: '96px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            display: 'flex', gap: 48, alignItems: 'flex-start',
            background: C.white,
            border: '1px solid #E0D8CC',
            borderRadius: 16,
            padding: '48px 56px',
          }}>
            {/* Initial circle */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: C.navy,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Cormorant', serif",
                fontSize: 36, fontWeight: 600, color: C.white,
                letterSpacing: '0.02em',
              }}>
                K
              </div>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Label */}
              <p style={{
                fontFamily: "'Tenor Sans', sans-serif",
                fontSize: 10, fontWeight: 400,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: C.grey, marginBottom: 12,
              }}>
                Notre histoire
              </p>

              {/* Subtitle in pivoine */}
              <p style={{
                fontFamily: "'Cormorant', serif",
                fontSize: 14, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#C2185B', marginBottom: 10,
              }}>
                Pourquoi Agency Kira ?
              </p>

              {/* Title */}
              <h2 style={{
                fontFamily: "'Cormorant', serif",
                fontSize: 30, fontWeight: 600, lineHeight: 1.25,
                color: C.dark, marginBottom: 20,
                letterSpacing: '0.01em',
              }}>
                Née d'un besoin réel,<br />pas d'une idée abstraite.
              </h2>

              {/* Body */}
              <p style={{
                fontFamily: "'Cormorant', serif",
                fontSize: 17, fontWeight: 400, lineHeight: 1.75,
                color: C.grey,
              }}>
                Formée en développement d'entreprise et management stratégique,
                j'ai créé Agency Kira pour une raison simple — aider une proche
                à gérer ses villas à Djerba sans se perdre dans des tableurs.
                En observant autour de moi, j'ai réalisé que beaucoup de propriétaires
                peinent à s'organiser faute d'un outil vraiment adapté à leur réalité.{' '}
                <span style={{ fontStyle: 'italic' }}>Parce que vous méritez mieux qu'Excel.</span>
              </p>

              {/* Signature */}
              <p style={{
                fontFamily: "'Cormorant', serif",
                fontSize: 20, fontWeight: 600, fontStyle: 'italic',
                color: C.dark, marginTop: 24,
                letterSpacing: '0.02em',
              }}>
                — Kira
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          TARIFS
      ════════════════════════════════ */}
      <section id="tarifs" style={{ background: C.sand, padding: '112px 48px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ color: C.teal, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Tarifs
            </span>
            <h2 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 42, fontWeight: 600, fontStyle: 'italic',
              color: C.navy, lineHeight: 1.2, marginTop: 12,
            }}>
              Simple. Transparent. Sans surprise.
            </h2>
          </div>

          <div className="lp-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={plan.cta ? 'lp-plan-featured' : undefined}
                style={{
                  background: plan.cta ? C.navy : C.white,
                  padding: '52px 36px',
                  border: plan.cta ? 'none' : `1px solid ${C.sandDk}`,
                  position: 'relative',
                  transform: plan.cta ? 'translateY(-10px)' : 'none',
                  boxShadow: plan.cta ? '0 24px 60px rgba(12,68,124,0.22)' : 'none',
                  transition: 'transform 0.3s',
                }}
              >
                {plan.cta && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: C.teal, color: C.white,
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
                    textTransform: 'uppercase', padding: '5px 18px', borderRadius: 2,
                    whiteSpace: 'nowrap',
                  }}>
                    Le plus populaire
                  </div>
                )}

                <p style={{
                  color: plan.cta ? 'rgba(255,255,255,0.5)' : C.teal,
                  fontSize: 11, fontWeight: 400, letterSpacing: '0.16em',
                  textTransform: 'uppercase', marginBottom: 20,
                }}>
                  {plan.detail}
                </p>

                {'isQuote' in plan ? (
                  /* ── CLÉS EN MAIN : Sur devis ── */
                  <>
                    <div style={{
                      fontFamily: "'Cormorant', serif",
                      fontSize: 38, fontWeight: 600,
                      color: C.navy, lineHeight: 1, marginBottom: 4,
                    }}>
                      Sur devis
                    </div>
                    <p style={{ color: C.grey, fontSize: 13, fontWeight: 300, marginBottom: 32 }}>
                      {(plan as { description: string }).description}
                    </p>

                    <div style={{ width: '100%', height: 1, background: C.sandDk, marginBottom: 24 }} />

                    <div style={{
                      fontFamily: "'Cormorant', serif",
                      fontSize: 22, fontWeight: 600,
                      color: C.navy, marginBottom: 20,
                    }}>
                      {plan.name}
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(plan as { features: string[] }).features.map((f, j) => (
                        <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.grey, fontWeight: 300, lineHeight: 1.5 }}>
                          <span style={{ color: C.teal, flexShrink: 0, marginTop: 1 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <a
                      href="#contact"
                      style={{
                        display: 'block', width: '100%', padding: '14px',
                        background: 'transparent',
                        color: C.navy,
                        border: `1px solid ${C.sandDk}`,
                        borderRadius: 2,
                        fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
                        textTransform: 'uppercase', cursor: 'pointer',
                        textDecoration: 'none', textAlign: 'center',
                        transition: 'border-color 0.2s, color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = C.teal
                        e.currentTarget.style.color = C.teal
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = C.sandDk
                        e.currentTarget.style.color = C.navy
                      }}
                    >
                      Nous contacter
                    </a>
                  </>
                ) : (
                  /* ── Plans standards ── */
                  <>
                    <div style={{
                      fontFamily: "'Cormorant', serif",
                      fontSize: 56, fontWeight: 600,
                      color: plan.cta ? C.teal : C.navy,
                      lineHeight: 1, marginBottom: 4,
                    }}>
                      {(plan as { price: number }).price}€
                    </div>
                    <p style={{ color: plan.cta ? 'rgba(255,255,255,0.4)' : C.grey, fontSize: 13, fontWeight: 300, marginBottom: 32 }}>
                      par mois
                    </p>

                    <div style={{ width: '100%', height: 1, background: plan.cta ? 'rgba(255,255,255,0.08)' : C.sandDk, marginBottom: 32 }} />

                    <div style={{
                      fontFamily: "'Cormorant', serif",
                      fontSize: 28, fontWeight: 600,
                      color: plan.cta ? C.white : C.navy,
                      marginBottom: 32,
                    }}>
                      {plan.name}
                    </div>

                    <button
                      onClick={() => navigate('/plans')}
                      style={{
                        width: '100%', padding: '14px',
                        background: plan.cta ? C.teal : 'transparent',
                        color: plan.cta ? C.white : C.navy,
                        border: plan.cta ? 'none' : `1px solid ${C.sandDk}`,
                        borderRadius: 2,
                        fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
                        textTransform: 'uppercase', cursor: 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      Choisir ce plan
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: C.grey, fontSize: 13, fontWeight: 300, marginTop: 40 }}>
            Annulation à tout moment · Aucun engagement
          </p>
        </div>
      </section>

      {/* ════════════════════════════════
          CONTACT
      ════════════════════════════════ */}
      <section id="contact" style={{ background: C.white, padding: '112px 48px' }}>
        <div style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ color: C.teal, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Contact
          </span>
          <h2 style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 42, fontWeight: 600, fontStyle: 'italic',
            color: C.navy, lineHeight: 1.2, margin: '12px 0 16px',
          }}>
            Une question ?
          </h2>
          <p style={{ color: C.grey, fontSize: 15, fontWeight: 300, lineHeight: 1.7, marginBottom: 52 }}>
            Parlez-nous de votre activité. Notre équipe vous répond sous 24 heures.
          </p>

          {sent ? (
            <div style={{
              background: '#F0FAF0', border: '1px solid #B7DFB9', borderRadius: 8,
              padding: '32px 24px', textAlign: 'center',
            }}>
              <p style={{ color: '#2D6A2F', fontSize: 16, fontWeight: 500, margin: 0 }}>
                ✓ Votre message a bien été envoyé, nous vous répondrons dans les plus brefs délais.
              </p>
            </div>
          ) : (
            <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
              <input
                required
                placeholder="Votre nom *"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle()}
              />
              <input
                required type="email"
                placeholder="Votre adresse email *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle()}
              />
              <input
                type="tel"
                placeholder="Téléphone (optionnel)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={inputStyle()}
              />
              <textarea
                required rows={5}
                placeholder="Votre message *"
                value={msg}
                onChange={e => setMsg(e.target.value)}
                style={{ ...inputStyle(), resize: 'vertical' }}
              />
              {contactError && (
                <p style={{ color: '#C0392B', fontSize: 13, margin: 0 }}>{contactError}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                style={{
                  background: sending ? C.grey : C.navy, color: C.white, border: 'none',
                  padding: '16px', borderRadius: 2,
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.14em',
                  textTransform: 'uppercase', cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (!sending) e.currentTarget.style.background = C.teal }}
                onMouseLeave={e => { if (!sending) e.currentTarget.style.background = C.navy }}
              >
                {sending ? 'Envoi en cours…' : 'Envoyer →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ════════════════════════════════
          FOOTER
      ════════════════════════════════ */}
      <footer className="lp-footer" style={{
        background: C.navy, padding: '32px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{ fontFamily: "'Cormorant', serif", fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
          {agencyName || 'VillaHub'}
        </span>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 300 }}>
          © {new Date().getFullYear()} {agencyName || 'VillaHub'} — Tous droits réservés
        </p>
        <div style={{ display: 'flex', gap: 28 }}>
          {[
            { label: 'Connexion', path: '/login' },
            { label: 'S\'inscrire', path: '/register' },
          ].map(({ label, path }) => (
            <span
              key={label}
              onClick={() => navigate(path)}
              style={{
                color: 'rgba(255,255,255,0.35)', fontSize: 11,
                fontWeight: 300, letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              {label}
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}

/* ─── Sub-components ─── */

function GalleryImg({ src, label, style, className }: { src: string; label: string; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <img
        src={src}
        alt={label}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s ease' }}
        onMouseEnter={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)')}
        onMouseLeave={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
      />
    </div>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    background: C.sand,
    border: `1px solid ${C.sandDk}`,
    color: C.dark,
    padding: '14px 18px',
    borderRadius: 2,
    fontSize: 14,
    fontFamily: "'Jost', sans-serif",
    fontWeight: 300,
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
  }
}
