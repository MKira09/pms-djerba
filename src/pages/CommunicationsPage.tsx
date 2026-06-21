import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, CheckCircle, Clock, Bell, Star } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Textarea from '@/components/ui/Textarea'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'
import type { EmailTrigger } from '@/types'

const TRIGGERS: { key: EmailTrigger; icon: React.ElementType; label: string; timing: string; color: string }[] = [
  { key: 'booking_confirmed', icon: CheckCircle, label: 'Confirmation de réservation', timing: 'Envoyé à J+0', color: 'text-success-700' },
  { key: 'reminder_checkin',  icon: Clock,       label: 'Rappel arrivée',              timing: 'Envoyé à J-2',  color: 'text-brand-700' },
  { key: 'welcome',           icon: Bell,        label: 'Message de bienvenue',        timing: 'Jour d\'arrivée', color: 'text-amber-600' },
  { key: 'review_request',    icon: Star,        label: 'Demande d\'avis',             timing: 'J+1 après départ', color: 'text-purple-600' },
]

const DEFAULT_TEMPLATES: Record<EmailTrigger, { subject: string; body: string }> = {
  booking_confirmed: {
    subject: 'Votre réservation est confirmée — {villa}',
    body: `Bonjour {nom_client},\n\nVotre réservation à la {villa} est confirmée.\n\nDates : du {date_arrivee} au {date_depart}\nNombre de personnes : {voyageurs}\n\nNous vous ferons parvenir les instructions d'arrivée 2 jours avant votre séjour.\n\nÀ bientôt !\nL'équipe PMS Djerba`,
  },
  reminder_checkin: {
    subject: 'Dans 2 jours — Vos instructions d\'arrivée pour {villa}',
    body: `Bonjour {nom_client},\n\nVotre séjour à la {villa} commence dans 2 jours !\n\nCode d'accès : {code_acces}\nWiFi : {wifi}\n\nInstructions d'arrivée :\n{instructions}\n\nBonne route !\nL'équipe PMS Djerba`,
  },
  welcome: {
    subject: 'Bienvenue à la {villa} !',
    body: `Bonjour {nom_client},\n\nNous vous souhaitons la bienvenue à la {villa} !\n\nVoici votre livret d'accueil numérique : {lien_livret}\n\nWiFi : {wifi}\n\nN'hésitez pas à nous contacter pour tout besoin.\n\nBon séjour !\nL'équipe PMS Djerba`,
  },
  review_request: {
    subject: 'Comment s\'est passé votre séjour à la {villa} ?',
    body: `Bonjour {nom_client},\n\nNous espérons que votre séjour à la {villa} s'est bien passé !\n\nVotre avis nous est précieux — pouvez-vous prendre 2 minutes pour partager votre expérience ?\n\nMerci de votre confiance,\nL'équipe PMS Djerba`,
  },
}

export default function CommunicationsPage() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<EmailTrigger>('booking_confirmed')
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [active, setActive] = useState<Record<EmailTrigger, boolean>>({
    booking_confirmed: true, reminder_checkin: true, welcome: true, review_request: false,
  })

  const current = templates[selected]

  function saveTemplate() {
    toast.success('Template enregistré.')
  }

  const VARIABLES = ['{nom_client}', '{villa}', '{date_arrivee}', '{date_depart}', '{voyageurs}', '{code_acces}', '{wifi}', '{instructions}', '{lien_livret}']

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.communications')}</h1>
        <p className="text-sm text-gray-500">Automatisez les messages envoyés à vos clients</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Trigger list */}
        <div className="space-y-3">
          {TRIGGERS.map(({ key, icon: Icon, label, timing, color }) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selected === key ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setActive(a => ({ ...a, [key]: !a[key] }))}
                    className={`w-9 h-5 rounded-full transition-colors ${active[key] ? 'bg-success-600' : 'bg-gray-300'} relative`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${active[key] ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">{timing}</p>
            </button>
          ))}
        </div>

        {/* Template editor */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                <Mail className="h-4 w-4 inline mr-2 text-brand-700" />
                Template — {TRIGGERS.find(t => t.key === selected)?.label}
              </h2>
              <Badge className={active[selected] ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'} dot>
                {active[selected] ? 'Actif' : 'Inactif'}
              </Badge>
            </div>

            <div className="space-y-3">
              <Input
                label="Objet"
                value={current.subject}
                onChange={e => setTemplates(t => ({ ...t, [selected]: { ...t[selected], subject: e.target.value } }))}
              />
              <Textarea
                label="Corps du message"
                value={current.body}
                onChange={e => setTemplates(t => ({ ...t, [selected]: { ...t[selected], body: e.target.value } }))}
                rows={10}
              />

              {/* Variables */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Variables disponibles :</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setTemplates(t => ({ ...t, [selected]: { ...t[selected], body: t[selected].body + ' ' + v } }))
                      }}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-brand-100 hover:text-brand-800 text-gray-600 rounded text-xs font-mono transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={saveTemplate}>{t('common.save')}</Button>
                <Button variant="outline" onClick={() => toast.success('Email de test envoyé !')}>
                  Envoyer un test
                </Button>
              </div>
            </div>
          </Card>

          {/* WhatsApp note */}
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-medium text-green-800">WhatsApp Business API (v2)</p>
                <p className="text-sm text-green-700 mt-1">
                  L'intégration WhatsApp Business sera disponible dans la prochaine version.
                  Vos templates seront automatiquement adaptés.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
