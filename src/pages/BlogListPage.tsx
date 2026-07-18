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
    <div className="min-h-screen bg-white">

      {/* ── Hero : photo pleine largeur + carte blanche ── */}
      <section style={{
        position: 'relative',
        height: 380,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Photo de fond */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=1920&q=90)',
          backgroundSize: 'cover', backgroundPosition: 'center 30%',
        }} />
        {/* Voile sombre */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(13,31,45,0.52)',
        }} />

        {/* Nav superposée */}
        <header style={{ position: 'relative', zIndex: 10, padding: '20px 24px' }}>
          <div style={{ maxWidth: 896, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#07BEB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={16} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>VillaHub</span>
            </Link>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Link to="/blog" style={{ fontSize: 14, color: 'white', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
              <Link to="/plans" style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Tarifs</Link>
              <Link to="/login" style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Connexion</Link>
            </nav>
          </div>
        </header>

        {/* Carte blanche centrée */}
        <div style={{
          position: 'relative', zIndex: 10,
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px 28px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            padding: '36px 56px',
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
      </section>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8" />

        <div className="space-y-6">
          {ARTICLES.map(article => (
            <article key={article.slug} className="group border border-gray-100 rounded-2xl p-6 hover:border-[#07BEB8]/40 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <time dateTime="2026-07-18">{article.date}</time>
                <span>·</span>
                <span>{article.readTime} de lecture</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#07BEB8] transition-colors leading-snug">
                <Link to={`/blog/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{article.excerpt}</p>
              <Link
                to={`/blog/${article.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#07BEB8] hover:gap-2.5 transition-all"
              >
                Lire l'article <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>© 2026 VillaHub</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
            <Link to="/plans" className="hover:text-gray-600 transition-colors">Tarifs</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
