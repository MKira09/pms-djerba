const C = {
  sand:   '#F5F0E8',
  sandDk: '#EDE8DF',
  olive:  '#3D5A3E',
  oliveL: '#6B7C5E',
  text:   '#0D1F2D',
  muted:  '#6B7A85',
  pale:   '#B5AFA5',
}

export default function MaintenancePage() {
  return (
    <div style={{
      background: C.sand,
      minHeight: '100svh',
      display: 'grid',
      placeItems: 'center',
      padding: '2rem',
      fontFamily: "'Cormorant', Georgia, 'Times New Roman', serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>

        {/* Badge pulsant */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.75rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: C.olive,
            color: C.sand,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            padding: '5px 14px',
            borderRadius: 999,
          }}>
            <span style={{
              width: 6, height: 6,
              background: '#A8C09A',
              borderRadius: '50%',
              animation: 'vh-pulse 2s ease-in-out infinite',
              flexShrink: 0,
            }} />
            En maintenance
          </span>
        </div>

        {/* Logo */}
        <div style={{
          fontSize: '1.75rem',
          fontWeight: 400,
          letterSpacing: '.1em',
          color: C.olive,
          textTransform: 'uppercase',
          marginBottom: '.35rem',
        }}>
          VillaHub
        </div>

        {/* Tagline */}
        <div style={{
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: '1rem',
          color: C.muted,
          letterSpacing: '.03em',
          marginBottom: '3rem',
        }}>
          Gestion de villas, simplifiée
        </div>

        {/* Divider */}
        <div style={{
          width: 48, height: 1,
          background: C.olive,
          opacity: .25,
          margin: '0 auto 3rem',
        }} />

        {/* Titre */}
        <h1 style={{
          fontSize: 'clamp(2rem, 6vw, 2.75rem)',
          fontWeight: 300,
          lineHeight: 1.2,
          color: C.olive,
          marginBottom: '1.25rem',
        }}>
          Nous travaillons<br/>pour vous
        </h1>

        {/* Corps */}
        <p style={{
          fontSize: '1.2rem',
          fontWeight: 300,
          color: C.muted,
          lineHeight: 1.85,
        }}>
          Nous améliorons votre expérience.<br/>
          De retour très bientôt.
        </p>
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed',
        bottom: '1.75rem',
        left: 0, right: 0,
        textAlign: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 10,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: C.pale,
      }}>
        © 2025 VillaHub &nbsp;·&nbsp; agencykira.com
      </div>

      {/* Keyframe inlinée */}
      <style>{`
        @keyframes vh-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
