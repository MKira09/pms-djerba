import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, User, Building, Home, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

const PLAN_LABELS: Record<string, { label: string; price: string; color: string }> = {
  starter: { label: 'Starter', price: '29€/mois', color: 'bg-blue-100 text-blue-700' },
  pro:     { label: 'Pro',     price: '59€/mois', color: 'bg-purple-100 text-purple-700' },
  agence:  { label: 'Agence', price: '99€/mois', color: 'bg-amber-100 text-amber-700' },
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan') ?? 'starter'
  const planInfo = PLAN_LABELS[selectedPlan] ?? PLAN_LABELS.starter
  const { setProfile, setTenant } = useAuthStore()
  const [form, setForm] = useState({ full_name: '', company_name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function showError(error: unknown, prefix = 'Erreur') {
    const e = error as any
    const status = e?.status ? ` [${e.status}]` : ''
    const msg = e?.message || e?.error_description || (typeof e?.toString === 'function' ? e.toString() : '') || 'inconnue'
    toast.error(prefix + status + ': ' + msg, { duration: 8000 })
    console.error(prefix, error)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      // Étape 1 : créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authError) { showError(authError, 'Erreur inscription'); return }
      if (!authData.user) { toast.error('Erreur : utilisateur non créé', { duration: 8000 }); return }

      // Étape 2 : créer le tenant + profil via la fonction SQL
      const { error: rpcError } = await supabase.rpc('create_tenant_and_profile', {
        p_full_name: form.full_name,
        p_company_name: form.company_name || 'Mon agence',
        p_plan: selectedPlan,
      })
      if (rpcError) { showError(rpcError, 'Erreur profil'); return }

      // Charger le profil et le tenant dans le store
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
      if (profile) {
        setProfile(profile)
        const { data: tenant } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single()
        setTenant(tenant ?? null)
      }

      toast.success('Compte créé ! Bienvenue 🎉', { duration: 4000 })
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Erreur réseau : ' + (msg || 'connexion impossible'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-800 rounded-2xl mb-3 shadow-lg">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VillaHub</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{t('auth.create_account')}</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planInfo.color}`}>
                {planInfo.label} · {planInfo.price}
              </span>
              <button onClick={() => navigate('/plans')} className="text-gray-400 hover:text-gray-600" title="Changer de plan">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <Input label={t('auth.full_name')} value={form.full_name} onChange={e => set('full_name', e.target.value)} left={<User className="h-4 w-4" />} required placeholder="Votre nom" />
            <Input label={t('auth.company_name')} value={form.company_name} onChange={e => set('company_name', e.target.value)} left={<Building className="h-4 w-4" />} placeholder="Agence Djerba Villas" />
            <Input label={t('common.email')} type="email" value={form.email} onChange={e => set('email', e.target.value)} left={<Mail className="h-4 w-4" />} placeholder={t('auth.email_placeholder')} required />
            <Input label={t('auth.password')} type="password" value={form.password} onChange={e => set('password', e.target.value)} left={<Lock className="h-4 w-4" />} placeholder="Min. 8 caractères" required />
            <Input label={t('auth.confirm_password')} type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} left={<Lock className="h-4 w-4" />} placeholder="••••••••" required />

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.already_account')}{' '}
            <Link to="/login" className="text-brand-700 font-medium hover:underline">{t('auth.login')}</Link>
          </p>

        </div>
      </div>
    </div>
  )
}
