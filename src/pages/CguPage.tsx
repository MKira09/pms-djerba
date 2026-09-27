import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'

export default function CguPage() {
  usePageMeta({
    title: 'Conditions générales d\'utilisation et de vente | VillaHub',
    description:
      "Conditions générales d'utilisation et de vente (CGU/CGV) de VillaHub, la plateforme de gestion locative saisonnière.",
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
            <Link to="/register" className="hover:text-gray-900 transition-colors">Créer un compte</Link>
            <Link to="/login" className="hover:text-gray-900 transition-colors">Connexion</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>

        <article>
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
            <time dateTime="2026-09-27">27 septembre 2026</time>
            <span>·</span>
            <span>Dernière mise à jour</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-8">
            Conditions générales d'utilisation et de vente
          </h1>

          <div className="prose-article">
            <p className="italic text-gray-500">
              Ce document décrit les conditions dans lesquelles VillaHub met sa plateforme à disposition des
              agences et propriétaires ("le Client") et les conditions dans lesquelles le Client l'utilise. En
              créant un compte, vous confirmez avoir lu et accepté les présentes conditions.
            </p>

            <h2>Objet</h2>
            <p>
              VillaHub met à disposition du Client une plateforme logicielle en ligne (SaaS) permettant de gérer
              des locations saisonnières : gestion des biens, réservations, calendrier, communication avec les
              clients, encaissement des paiements et facturation.
            </p>
            <p>
              Les présentes CGU/CGV définissent les conditions dans lesquelles VillaHub met ce service à
              disposition et les conditions dans lesquelles le Client l'utilise. Elles ne régissent pas la relation
              entre le Client et ses propres clients (locataires) ou propriétaires, dont le Client reste seul
              responsable.
            </p>

            <h2>Inscription et accès au service</h2>
            <p>
              L'accès au service nécessite la création d'un compte, avec des informations exactes et à jour (nom
              de l'agence, coordonnées, moyens de paiement le cas échéant). Le Client est responsable de la
              confidentialité de ses identifiants et de toute action réalisée depuis son compte, y compris par les
              membres de son équipe qu'il invite sur la plateforme.
            </p>
            <p>
              VillaHub se réserve le droit de suspendre ou de refuser l'accès en cas d'informations manifestement
              fausses, d'usage frauduleux ou de non-respect des présentes conditions.
            </p>

            <h2>Conditions tarifaires</h2>
            <p>
              L'utilisation de VillaHub est facturée exclusivement sous forme de commission de 3% sur le chiffre
              d'affaires enregistré par le Client sur la plateforme (montant total des réservations non annulées).
              Aucun abonnement ni frais fixe n'est dû : un mois sans réservation n'entraîne aucune facturation.
            </p>
            <p>
              Une facture est générée automatiquement chaque mois, correspondant à la commission due sur les
              réservations du mois précédent. Elle est payable sous 30 jours à compter de son émission. À défaut
              de paiement dans ce délai, VillaHub peut suspendre l'accès au compte jusqu'à régularisation, après
              relance préalable par email.
            </p>
            <p>
              Pour les réservations encaissées via un lien de paiement Stripe proposé par VillaHub, la commission
              est prélevée automatiquement au moment du paiement et n'est pas facturée une seconde fois.
            </p>

            <h2>Utilisation loyale de la plateforme</h2>
            <p>
              Le « chiffre d'affaires enregistré », base de calcul de la commission, correspond au montant total
              des réservations confirmées et non annulées, quel que soit le mode de paiement utilisé par le client
              final (Stripe, virement, espèces...).
            </p>
            <p>
              Le Client s'engage à enregistrer sur VillaHub l'ensemble des réservations conclues avec des
              locataires mis en relation via la plateforme (catalogue en ligne, calendrier, échanges via
              VillaHub), y compris lorsque le paiement final est réalisé en dehors de la plateforme. Le fait de
              dissimuler une réservation pour éviter la commission constitue un manquement grave aux présentes
              conditions et peut entraîner la suspension immédiate du compte, sans préjudice d'une facturation
              rétroactive de la commission due.
            </p>

            <h2>Obligations des parties</h2>
            <p>
              VillaHub s'engage à fournir l'accès au service, un support pour toute difficulté d'utilisation, et à
              maintenir la plateforme en conditions raisonnables de fonctionnement.
            </p>
            <p>
              Le Client s'engage à fournir des informations exactes sur ses biens et réservations, à respecter la
              réglementation applicable à son activité de location saisonnière (déclarations, taxes de séjour,
              réglementations locales), et à gérer sa relation avec ses propres clients et propriétaires de
              manière autonome — VillaHub n'intervient pas dans ces relations et n'est pas partie aux contrats de
              location conclus par le Client.
            </p>

            <h2>Responsabilité et disponibilité</h2>
            <p>
              VillaHub met en œuvre des moyens raisonnables pour assurer la disponibilité et la sécurité du
              service, sans garantir une disponibilité continue ou sans interruption. Le service s'appuie sur des
              prestataires tiers (hébergement, paiement en ligne via Stripe) dont VillaHub ne maîtrise pas le
              fonctionnement ; sa responsabilité ne saurait être engagée en cas de dysfonctionnement imputable à
              ces prestataires.
            </p>
            <p>
              La responsabilité de VillaHub, si elle était retenue, serait limitée au montant des commissions
              perçues auprès du Client au cours des douze derniers mois. VillaHub ne saurait être tenu responsable
              des pertes indirectes (perte de chiffre d'affaires, de clientèle, d'image) ni des litiges entre le
              Client et ses propres clients ou propriétaires.
            </p>
            <p>
              Le Client garantit VillaHub contre toute réclamation, action ou condamnation résultant de son
              activité (contenu publié sur son catalogue, respect de la réglementation locale, relation avec ses
              locataires ou propriétaires), et s'engage à indemniser VillaHub des conséquences financières d'un
              tel litige dans lequel VillaHub ne serait pas directement en cause.
            </p>

            <h2>Données personnelles</h2>
            <p>
              Dans le cadre de l'utilisation du service, VillaHub traite des données personnelles pour le compte
              du Client (coordonnées de ses clients locataires, informations de réservation). Le Client reste
              responsable de traitement vis-à-vis de ses propres clients ; VillaHub agit en qualité de
              sous-traitant au sens de la réglementation applicable à la protection des données.
            </p>
            <p>
              VillaHub met en œuvre des mesures de sécurité raisonnables pour protéger ces données et ne les
              utilise pas à d'autres fins que la fourniture du service. Les données sont conservées pendant la
              durée d'utilisation du compte, puis supprimées ou anonymisées dans un délai raisonnable après
              résiliation, sauf obligation légale de conservation plus longue.
            </p>

            <h2>Propriété intellectuelle</h2>
            <p>
              Le logiciel VillaHub, son code, son design et sa marque restent la propriété exclusive de VillaHub.
              Le Client bénéficie d'un droit d'usage non exclusif, non transférable et limité à la durée du
              contrat, pour ses propres besoins de gestion locative.
            </p>
            <p>
              Le Client reste propriétaire des données qu'il saisit sur la plateforme (informations sur ses biens,
              ses réservations, ses clients).
            </p>

            <h2>Durée, résiliation et sort des données</h2>
            <p>
              Le contrat est conclu pour une durée indéterminée. Chaque partie peut y mettre fin à tout moment,
              sans préavis obligatoire, par email. La résiliation par le Client n'annule pas les commissions déjà
              dues sur les réservations enregistrées avant la date de résiliation.
            </p>
            <p>
              À la résiliation, le Client dispose de 30 jours pour exporter ses données ; passé ce délai, VillaHub
              peut supprimer définitivement les données du compte.
            </p>

            <h2>Dispositions diverses</h2>
            <p>
              <strong>Modification des CGU/CGV</strong> : VillaHub peut faire évoluer les présentes conditions,
              notamment pour refléter de nouvelles fonctionnalités ou obligations légales. Le Client en est
              informé par email au moins 15 jours avant leur entrée en vigueur ; la poursuite de l'utilisation du
              service après cette date vaut acceptation des nouvelles conditions.
            </p>
            <p>
              <strong>Force majeure</strong> : aucune des parties ne pourra être tenue responsable d'un
              manquement à ses obligations résultant d'un événement de force majeure (catastrophe naturelle,
              panne majeure d'un prestataire tiers, conflit, décision gouvernementale...).
            </p>
            <p>
              <strong>Intégralité de l'accord</strong> : les présentes CGU/CGV, acceptées par le Client lors de
              son inscription, constituent l'intégralité de l'accord entre les parties et remplacent tout échange
              ou accord antérieur sur le même objet.
            </p>
            <p>
              <strong>Nullité partielle</strong> : si une clause des présentes CGU/CGV était jugée invalide, les
              autres clauses resteraient pleinement applicables.
            </p>

            <h2>Droit applicable et litiges</h2>
            <p>
              Les présentes CGU/CGV sont soumises au droit tunisien. En cas de litige, les parties s'efforceront
              de trouver une solution amiable avant toute action judiciaire ; à défaut, les tribunaux compétents
              seront ceux du lieu du siège de VillaHub.
            </p>

            <p className="text-sm text-gray-400 mt-10">
              Pour toute question sur ces conditions, contactez-nous à{' '}
              <a href="mailto:contact.agencykira@gmail.com" className="text-brand-700 font-medium hover:underline">
                contact.agencykira@gmail.com
              </a>.
            </p>
          </div>
        </article>
      </main>
    </div>
  )
}
