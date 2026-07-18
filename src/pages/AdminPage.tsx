import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Home, Users, Building, TrendingUp, Star } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import toast from 'react-hot-toast'

interface TenantStat {
  tenant_id: string
  tenant_name: string
  plan: string
  created_at: string
  owner_email: string
  owner_name: string
  villa_count: number
}

interface FoundingMap { [id: string]: boolean }

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-100 text-blue-700',
  pro:     'bg-purple-100 text-purple-700',
  agence:  'bg-amber-100 text-amber-700',
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<TenantStat[]>([])
  const [founding, setFounding] = useState<FoundingMap>({})
  const [toggling, setToggling] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [statsRes, foundingRes] = await Promise.all([
        supabase.rpc('get_admin_stats'),
        supabase.from('tenants').select('id, founding_member'),
      ])
      if (statsRes.error) { setError(statsRes.error.message); setLoading(false); return }
      setTenants(statsRes.data ?? [])
      const map: FoundingMap = {}
      for (const row of (foundingRes.data ?? [])) map[row.id] = !!row.founding_member
      setFounding(map)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleFounding(tenantId: string, current: boolean) {
    setToggling(tenantId)
    const { error } = await supabase
      .from('tenants')
      .update({ founding_member: !current })
      .eq('id', tenantId)
    if (error) {
      toast.error('Erreur : ' + error.message)
    } else {
      setFounding(prev => ({ ...prev, [tenantId]: !current }))
      toast.success(!current ? 'Membre fondateur activé ✓' : 'Statut fondateur retiré')
    }
    setToggling(null)
  }

  const foundingCount = Object.values(founding).filter(Boolean).length
  const totalVillas = tenants.reduce((s, t) => s + (t.villa_count ?? 0), 0)
  const byPlan = (p: string) => tenants.filter(t => t.plan === p).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 font-medium">Accès refusé</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-800 rounded-xl flex items-center justify-center">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VillaHub — Admin</h1>
            <p className="text-sm text-gray-500">Tableau de bord super-administrateur</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-brand-100 rounded-xl mx-auto mb-2">
              <Users className="h-5 w-5 text-brand-700" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            <p className="text-xs text-gray-500">Clients actifs</p>
          </Card>
          <Card className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl mx-auto mb-2">
              <Building className="h-5 w-5 text-blue-700" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalVillas}</p>
            <p className="text-xs text-gray-500">Biens total</p>
          </Card>
          <Card className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl mx-auto mb-2">
              <TrendingUp className="h-5 w-5 text-purple-700" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{byPlan('pro') + byPlan('agence')}</p>
            <p className="text-xs text-gray-500">Plans payants</p>
          </Card>
          <Card className="text-center">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl mx-auto mb-2">
              <Star className="h-5 w-5 text-amber-600 fill-amber-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{foundingCount} / 3</p>
            <p className="text-xs text-gray-500">Membres fondateurs</p>
          </Card>
        </div>

        {/* Table */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Tous les tenants</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-500">Agence</th>
                  <th className="px-5 py-3 font-semibold text-gray-500">Propriétaire</th>
                  <th className="px-5 py-3 font-semibold text-gray-500">Plan</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-right">Biens</th>
                  <th className="px-5 py-3 font-semibold text-gray-500">Inscrit le</th>
                  <th className="px-5 py-3 font-semibold text-gray-500">Fondateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenants.map(t => {
                  const isFounder = !!founding[t.tenant_id]
                  const isToggling = toggling === t.tenant_id
                  return (
                    <tr key={t.tenant_id} className={`hover:bg-gray-50 transition-colors ${isFounder ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {t.tenant_name}
                        {isFounder && <span className="ml-2 text-amber-500" title="Membre fondateur">★</span>}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-700">{t.owner_name || '—'}</p>
                        <p className="text-xs text-gray-400">{t.owner_email || '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={PLAN_COLORS[t.plan] ?? 'bg-gray-100 text-gray-600'}>
                          {t.plan}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">{t.villa_count ?? 0}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {t.created_at ? format(parseISO(t.created_at), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleFounding(t.tenant_id, isFounder)}
                          disabled={isToggling}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            isFounder
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <Star className={`h-3 w-3 ${isFounder ? 'fill-amber-500 text-amber-500' : ''}`} />
                          {isToggling ? '…' : isFounder ? 'Fondateur' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {tenants.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Aucun tenant</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
