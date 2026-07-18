import { Link } from 'react-router-dom'
import { ArrowRight, Home } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'

const ARTICLES = [
  {
    slug: 'louer-sa-villa-sans-commission',
    title: "Louer votre villa sans intermédiaire : comment garder le contrôle (et jusqu'à 15-17% de plus dans votre poche)",
    excerpt:
      'Vous générez déjà des réservations par vous-même — WhatsApp, Instagram, clients fidèles. Alors pourquoi continuer à donner 15 à 17% de commission sur des réservations que vous auriez obtenues de toute façon ?',
    date: '18 juillet 2026',
    readTime: '5 min',
  },
]

export default function BlogListPage() {
  usePageMeta({
    title: 'Blog VillaHub – Conseils gestion locative de villas',
    description:
      'Découvrez nos articles pour mieux gérer vos locations de villa, réduire vos commissions et fidéliser vos clients directs.',
  })

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=1920&q=90)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Nav — verre givré sur la texture */}
      <header style={{
        background: 'rgba(13,31,45,0.35)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 24px',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 896, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#07BEB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={16} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>VillaHub</span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link to="/blog" style={{ fontSize: 14, color: 'white', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
            <Link to="/plans" style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', textDecoration: 'none' }}>Tarifs</Link>
            <Link to="/login" style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', textDecoration: 'none' }}>Connexion</Link>
          </nav>
        </div>
      </header>

      {/* Titre — carte blanche centrée */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 24px 40px' }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
          padding: '36px 52px',
          textAlign: 'center',
          maxWidth: 460,
          width: '100%',
        }}>
          <span style={{
            display: 'block',
            color: '#07BEB8',
            fontSize: 11, fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>Blog</span>
          <h1 style={{
            fontFamily: "'Cormorant', serif",
            fontSize: 36, fontWeight: 600, fontStyle: 'italic',
            color: '#0D1F2D', lineHeight: 1.2,
            margin: '10px 0 12px',
          }}>Conseils & ressources</h1>
          <p style={{ color: '#6B7A85', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Pour gérer vos locations de villa avec moins d'efforts et plus de revenus.
          </p>
        </div>
      </div>

      {/* Articles — cards blanches sur la texture */}
      <main style={{ maxWidth: 896, margin: '0 auto', padding: '0 24px 72px', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {ARTICLES.map(article => (
            <div key={article.slug} style={{
              background: 'white',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
              padding: '28px 32px',
              transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 36px rgba(0,0,0,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.14)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
                <time dateTime="2026-07-18">{article.date}</time>
                <span>·</span>
                <span>{article.readTime} de lecture</span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.4, marginBottom: 10 }}>
                <Link to={`/blog/${article.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {article.title}
                </Link>
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65, marginBottom: 16 }}>{article.excerpt}</p>
              <Link
                to={`/blog/${article.slug}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#07BEB8', textDecoration: 'none' }}
              >
                Lire l'article <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        background: 'rgba(13,31,45,0.35)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '24px',
      }}>
        <div style={{ maxWidth: 896, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>© 2026 VillaHub</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Accueil</Link>
            <Link to="/plans" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Tarifs</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
