import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { enterDemoMode, setProfile, setTenant } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const userId = data.user?.id
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profile) {
          setProfile(profile)
          const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', profile.tenant_id)
            .single()
          setTenant(tenant ?? null)
        }
      }

      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleDemo() {
    enterDemoMode()
    navigate('/dashboard')
    toast.success('Mode démonstration activé — 15 villas chargées !')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-800 rounded-2xl mb-3 shadow-lg">
            <Home className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PMS Djerba</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion de villas saisonnières</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('auth.welcome_back')}</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={t('common.email')}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              left={<Mail className="h-4 w-4" />}
              required
            />
            <Input
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              left={<Lock className="h-4 w-4" />}
              required
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-brand-700 hover:underline">
                {t('auth.forgot_password')}
              </Link>
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('auth.login')}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">ou</span></div>
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={handleDemo}>
            🎯 Voir la démonstration
          </Button>
          <p className="text-center text-xs text-gray-400 mt-2">15 villas • 15 réservations • données fictives</p>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.no_account')}{' '}
            <Link to="/register" className="text-brand-700 font-medium hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
