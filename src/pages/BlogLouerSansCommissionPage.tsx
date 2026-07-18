import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'

export default function BlogLouerSansCommissionPage() {
  usePageMeta({
    title: 'Louer sa villa sans intermédiaire : gardez le contrôle et vos revenus | VillaHub',
    description:
      'Découvrez comment gérer vos locations de villa sans payer 15 à 17% de commission aux plateformes de réservation, tout en gardant le contrôle sur vos clients et vos prix.',
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
            <Link to="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
            <Link to="/plans" className="hover:text-gray-900 transition-colors">Tarifs</Link>
            <Link to="/login" className="hover:text-gray-900 transition-colors">Connexion</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Retour */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" /> Blog
        </Link>

        <article>
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2026-07-18">18 juillet 2026</time>
            <span>·</span>
            <span>5 min de lecture</span>
          </div>

          {/* H1 */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-8">
            Louer votre villa sans intermédiaire : comment garder le contrôle (et jusqu'à 15-17% de plus dans votre poche)
          </h1>

          {/* Contenu */}
          <div className="prose-article">
            <p>
              Vous recevez déjà des demandes de réservation. Sur WhatsApp, sur Instagram, par le bouche-à-oreille d'anciens clients satisfaits. Ce n'est pas qu'une plateforme de réservation ne vous serait d'aucune utilité — c'est que vous générez déjà une partie de vos réservations par vous-même, sans avoir besoin d'un intermédiaire pour ces clients-là.
            </p>
            <p>
              Alors pourquoi continuer à donner 15 à 17% de commission sur des réservations que vous auriez obtenues de toute façon ?
            </p>

            <h2>Le vrai problème n'est pas seulement de trouver des clients</h2>
            <p>
              Beaucoup de propriétaires de villas pensent qu'il faut être sur une plateforme de réservation pour exister. Et c'est vrai que ces plateformes aident à toucher de nouveaux clients. Mais si vous gérez déjà vos locations depuis un moment, vous savez qu'une partie non négligeable de vos réservations vient aussi de canaux que vous contrôlez déjà — les réseaux sociaux, les recommandations, les clients qui reviennent d'une année sur l'autre.
            </p>
            <p>
              Pour ces réservations-là, le vrai problème n'est pas l'acquisition de clients. C'est l'organisation derrière.
            </p>

            <h2>Ce qui vous manque, ce n'est pas une marketplace — c'est un outil</h2>
            <p>Quand une demande arrive sur Instagram ou WhatsApp, plusieurs questions se posent immédiatement :</p>
            <ul>
              <li>
                <strong>Qui est cette personne ?</strong> Contrairement à une plateforme qui vous impose ses clients, vous voulez pouvoir choisir avec qui vous travaillez.
              </li>
              <li>
                <strong>La villa est-elle vraiment disponible à ces dates ?</strong> Sans calendrier centralisé, un simple oubli peut mener à une double réservation — la pire chose qui puisse arriver à votre réputation.
              </li>
              <li>
                <strong>Comment formaliser la réservation proprement</strong>, sans écrire le même message à la main pour la dixième fois cette semaine ?
              </li>
            </ul>
            <p>
              C'est exactement là qu'un logiciel comme VillaHub change la donne — pas en vous apportant des clients à leur place, mais en vous donnant les outils pour gérer <em>vos</em> clients, ceux que vous avez déjà, sans perdre de temps ni d'argent.
            </p>

            <h2>Zéro commission, contrôle total</h2>
            <p>Avec VillaHub :</p>
            <ul>
              <li><strong>Vous fixez vos propres prix</strong>, sans qu'une plateforme prenne 15 à 17% au passage</li>
              <li><strong>Vous choisissez vos clients</strong>, plutôt que de les subir via un système de réservation automatique</li>
              <li><strong>Vous centralisez votre calendrier</strong>, pour ne plus jamais confondre deux réservations</li>
              <li><strong>Vous partagez un lien catalogue professionnel</strong> (comme celui de Kira Agency) à vos propres contacts, pour qu'ils réservent directement chez vous</li>
            </ul>
            <p>
              Vous gardez la relation directe avec vos clients — celle qui fait qu'ils reviennent l'année suivante, et qu'ils vous recommandent à leurs proches.
            </p>

            <h2>Le calcul est simple</h2>
            <p>
              Sur une villa louée 75€ la nuit, une commission de 15 à 17% (le taux désormais appliqué côté hôte sur la plupart des grandes plateformes de réservation) représente 11 à 13€ perdus <em>par nuit</em>, avant même de compter les frais de service côté voyageur qui font parfois fuir les clients directs que vous auriez pu garder gratuitement.
            </p>
            <p>
              Sur une saison entière, la différence se compte en milliers d'euros — de l'argent qui reste dans votre poche plutôt que dans celle d'une plateforme.
            </p>

            <h2>Vous gérez déjà tout ça à la main. Autant bien le faire.</h2>
            <p>
              Si vous recevez vos demandes par message et que vous notez vos dates sur un carnet ou un fichier Excel, vous faites déjà tout le travail difficile — celui de convaincre le client. Il ne manque que l'outil pour éviter les erreurs, gagner du temps, et présenter une image professionnelle à vos clients, sans jamais sacrifier le contrôle que vous avez sur votre propre activité.
            </p>
            <p>
              C'est exactement pour ça que VillaHub existe.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 p-6 rounded-2xl bg-[#F5F0E8] border border-[#07BEB8]/20">
            <p className="font-semibold text-gray-900 mb-1">Prêt à reprendre le contrôle ?</p>
            <p className="text-sm text-gray-500 mb-4">Essayez VillaHub gratuitement — aucune carte bancaire requise.</p>
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 bg-[#07BEB8] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              Voir les tarifs →
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>© 2026 VillaHub</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-gray-600 transition-colors">Accueil</Link>
            <Link to="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
            <Link to="/plans" className="hover:text-gray-600 transition-colors">Tarifs</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
