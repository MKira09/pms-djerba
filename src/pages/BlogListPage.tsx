import { Link } from 'react-router-dom'
import { ArrowRight, Home } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'

const ARTICLES = [
  {
    slug: 'louer-sa-villa-sans-commission',
    title: "Louer votre villa sans Airbnb : comment garder le contrôle (et jusqu'à 15-17% de plus dans votre poche)",
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
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-[#07BEB8] flex items-center justify-center">
              <Home className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base">VillaHub</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/blog" className="hover:text-gray-900 transition-colors font-medium text-[#07BEB8]">Blog</Link>
            <Link to="/plans" className="hover:text-gray-900 transition-colors">Tarifs</Link>
            <Link to="/login" className="hover:text-gray-900 transition-colors">Connexion</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-14">
        <div className="mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#07BEB8]">Blog</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Conseils & ressources</h1>
          <p className="text-gray-500 mt-2">Pour gérer vos locations de villa avec moins d'efforts et plus de revenus.</p>
        </div>

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
