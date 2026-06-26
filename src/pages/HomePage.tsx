import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/* ─────── Palette ─────── */
const C = {
  teal:   '#07BEB8',
  tealDk: '#059B95',
  navy:   '#0C447C',
  sand:   '#F5F0E8',
  sandDk: '#EDE8DF',
  white:  '#FFFFFF',
  dark:   '#0D1F2D',
  grey:   '#6B7A85',
}

/* ─────── Gallery images ─────── */
const GALLERY = [
  {
    src: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=900&q=85',
    label: 'Piscine à débordement',
    span: 'row',
  },
  {
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=85',
    label: 'Mer turquoise',
    span: 'normal',
  },
  {
    src: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=700&q=85',
    label: 'Volets méditerranéens',
    span: 'normal',
  },
  {
    src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=85',
    label: 'Salon extérieur',
    span: 'normal',
  },
  {
    src: 'https://images.unsplash.com/photo-1495841674395-62e7a42b00a9?auto=format&fit=crop&w=700&q=85',
    label: 'Fleurs de jasmin',
    span: 'normal',
  },
  {
    src: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=900&q=85',
    label: 'Galets de mer',
    span: 'col',
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
  { name: 'Starter', price: 29, detail: '3 biens · 1 utilisateur', cta: false },
  { name: 'Pro', price: 59, detail: '10 biens · 5 utilisateurs', cta: true },
  { name: 'Agence', price: 99, detail: 'Biens illimités · Équipe illimitée', cta: false },
]

/* ─────── Component ─────── */
export default function HomePage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [foundingCount, setFoundingCount] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

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

  const remaining = foundingCount !== null ? Math.max(0, 5 - foundingCount) : null

  function handleContact(e: React.FormEvent) {
    e.preventDefault()
    const s = encodeURIComponent(`VillaHub — contact de ${name}`)
    const b = encodeURIComponent(`Nom : ${name}\nEmail : ${email}\n\n${msg}`)
    window.location.href = `mailto:contact@villahub.io?subject=${s}&body=${b}`
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
        <span style={{
          fontFamily: "'Cormorant', serif",
          fontSize: 22, fontWeight: 600, letterSpacing: '0.06em',
          color: scrolled ? C.navy : C.white,
          transition: 'color 0.4s', cursor: 'default',
        }}>
          VillaHub
        </span>

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
      <section style={{
        position: 'relative',
        height: '100vh', minHeight: 640,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Background sea */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=1920&q=90)',
          backgroundSize: 'cover', backgroundPosition: 'center 40%',
        }} />
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(12,68,124,0.38) 0%, rgba(7,190,184,0.18) 50%, rgba(12,68,124,0.55) 100%)',
        }} />

        {/* Central card */}
        <div style={{
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
          <div style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 72, fontWeight: 600,
            color: C.white, lineHeight: 1,
            letterSpacing: '0.04em', marginBottom: 20,
          }}>
            VillaHub
          </div>

          {/* Tagline */}
          <p style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 22, fontWeight: 400, fontStyle: 'italic',
            color: 'rgba(255,255,255,0.88)',
            lineHeight: 1.4, marginBottom: 36,
            letterSpacing: '0.01em',
          }}>
            L'élégance de gérer sans effort
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
              Démarrer gratuitement
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
            Pilotez vos villas, appartements et riads depuis une interface pensée pour l'excellence.
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
              L'art de vivre méditerranéen
            </span>
            <h2 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 42, fontWeight: 600, fontStyle: 'italic',
              color: C.navy, lineHeight: 1.2, marginTop: 12,
            }}>
              Djerba, à votre portée
            </h2>
          </div>

          {/* Grid — editorial layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr',
            gridTemplateRows: '300px 300px',
            gap: 12,
          }}>
            {/* 1 — tall left (pool) */}
            <GalleryImg
              src={GALLERY[0].src}
              label={GALLERY[0].label}
              style={{ gridColumn: '1', gridRow: '1 / 3' }}
            />
            {/* 2 — top middle (mer) */}
            <GalleryImg
              src={GALLERY[1].src}
              label={GALLERY[1].label}
              style={{ gridColumn: '2', gridRow: '1' }}
            />
            {/* 3 — top right (volets) */}
            <GalleryImg
              src={GALLERY[2].src}
              label={GALLERY[2].label}
              style={{ gridColumn: '3', gridRow: '1' }}
            />
            {/* 4 — bottom middle (salon extérieur) */}
            <GalleryImg
              src={GALLERY[3].src}
              label={GALLERY[3].label}
              style={{ gridColumn: '2', gridRow: '2' }}
            />
            {/* 5 — bottom right spanning: fleurs */}
            <GalleryImg
              src={GALLERY[4].src}
              label={GALLERY[4].label}
              style={{ gridColumn: '3', gridRow: '2' }}
            />
          </div>

          {/* 6th image — full width cinematic strip */}
          <div style={{ marginTop: 12, position: 'relative', height: 240, overflow: 'hidden' }}>
            <img
              src={GALLERY[5].src}
              alt={GALLERY[5].label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(12,68,124,0.5) 0%, transparent 40%, transparent 60%, rgba(12,68,124,0.5) 100%)',
              display: 'flex', alignItems: 'flex-end', padding: '20px 28px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                {GALLERY[5].label}
              </span>
            </div>
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
              La plateforme
            </span>
            <h2 style={{
              fontFamily: "'Cormorant', serif",
              fontSize: 42, fontWeight: 600, fontStyle: 'italic',
              color: C.navy, lineHeight: 1.2, marginTop: 12,
            }}>
              Tout ce dont vous avez besoin,<br />rien de superflu
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            border: `1px solid ${C.sandDk}`,
          }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
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
          TARIFS
      ════════════════════════════════ */}
      <section id="tarifs" style={{ background: C.sand, padding: '112px 48px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {PLANS.map((plan, i) => (
              <div
                key={i}
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

                <div style={{
                  fontFamily: "'Cormorant', serif",
                  fontSize: 56, fontWeight: 600,
                  color: plan.cta ? C.teal : C.navy,
                  lineHeight: 1, marginBottom: 4,
                }}>
                  {plan.price}€
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

          <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
            <input
              required
              placeholder="Votre nom"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle()}
            />
            <input
              required type="email"
              placeholder="Votre adresse email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle()}
            />
            <textarea
              required rows={5}
              placeholder="Votre message"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              style={{ ...inputStyle(), resize: 'vertical' }}
            />
            <button
              type="submit"
              style={{
                background: C.navy, color: C.white, border: 'none',
                padding: '16px', borderRadius: 2,
                fontSize: 11, fontWeight: 500, letterSpacing: '0.14em',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.teal)}
              onMouseLeave={e => (e.currentTarget.style.background = C.navy)}
            >
              Envoyer →
            </button>
          </form>
        </div>
      </section>

      {/* ════════════════════════════════
          FOOTER
      ════════════════════════════════ */}
      <footer style={{
        background: C.navy, padding: '32px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <span style={{ fontFamily: "'Cormorant', serif", fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
          VillaHub
        </span>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 300 }}>
          © {new Date().getFullYear()} VillaHub — Tous droits réservés
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

function GalleryImg({ src, label, style }: { src: string; label: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <img
        src={src}
        alt={label}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s ease' }}
        onMouseEnter={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)')}
        onMouseLeave={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(12,68,124,0.55) 0%, transparent 60%)',
        padding: '24px 20px 14px',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 300, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
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
