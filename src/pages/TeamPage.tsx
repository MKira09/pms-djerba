import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, CheckSquare, Square, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { useTeamStore } from '@/stores/team.store'
import { useVillasStore } from '@/stores/villas.store'
import { TASK_STATUS_COLORS, DEFAULT_CHECKLIST } from '@/lib/utils'
import type { TeamMember, CleaningTask, TeamRole, TaskType, TaskStatus } from '@/types'
import { cn } from '@/lib/utils'

// ─── Team member form ──────────────────────────────────────────────────────
function MemberForm({ open, member, onClose }: { open: boolean; member: TeamMember | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { addMember, updateMember } = useTeamStore()
  const { villas } = useVillasStore()
  const [form, setForm] = useState({ full_name: '', role: 'cleaner' as TeamRole, phone: '', email: '', assigned_villa_ids: [] as string[] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(member ? { full_name: member.full_name, role: member.role, phone: member.phone ?? '', email: member.email ?? '', assigned_villa_ids: member.assigned_villa_ids } : { full_name: '', role: 'cleaner', phone: '', email: '', assigned_villa_ids: [] })
  }, [member, open])

  function toggleVilla(id: string) {
    setForm(f => ({ ...f, assigned_villa_ids: f.assigned_villa_ids.includes(id) ? f.assigned_villa_ids.filter(v => v !== id) : [...f.assigned_villa_ids, id] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (member) { await updateMember(member.id, form); toast.success('Membre modifié.') }
      else { await addMember(form); toast.success('Membre ajouté !') }
      onClose()
    } catch { toast.error('Erreur.') }
    finally { setLoading(false) }
  }

  const roleOpts: { value: TeamRole; label: string }[] = [
    { value: 'manager', label: t('team.manager') },
    { value: 'cleaner', label: t('team.cleaner') },
    { value: 'maintenance', label: t('team.maintenance') },
    { value: 'inspector', label: t('team.inspector') },
  ]

  return (
    <Modal open={open} onClose={onClose} title={member ? t('team.edit_member') : t('team.add_member')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button form="member-form" type="submit" loading={loading}>{t('common.save')}</Button></>}>
      <form id="member-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('team.full_name')} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
        <Select label={t('team.role')} options={roleOpts} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as TeamRole }))} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label={t('team.phone')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label={t('common.email')} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('team.assigned_villas')}</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {villas.map(v => (
              <button key={v.id} type="button" onClick={() => toggleVilla(v.id)}
                className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs text-left transition-colors',
                  form.assigned_villa_ids.includes(v.id) ? 'border-brand-400 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                {form.assigned_villa_ids.includes(v.id) ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {v.name}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ─── Task form ─────────────────────────────────────────────────────────────
function TaskForm({ open, task, onClose }: { open: boolean; task: CleaningTask | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { addTask, updateTask, members } = useTeamStore()
  const { villas } = useVillasStore()
  const [form, setForm] = useState({ villa_id: '', assigned_to: '', task_type: 'full' as TaskType, scheduled_date: format(new Date(), 'yyyy-MM-dd'), status: 'todo' as TaskStatus, note: '', checklist: DEFAULT_CHECKLIST, photos: [] as string[] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(task ? { villa_id: task.villa_id, assigned_to: task.assigned_to ?? '', task_type: task.task_type, scheduled_date: task.scheduled_date, status: task.status, note: task.note ?? '', checklist: task.checklist, photos: task.photos } : { villa_id: '', assigned_to: '', task_type: 'full', scheduled_date: format(new Date(), 'yyyy-MM-dd'), status: 'todo', note: '', checklist: DEFAULT_CHECKLIST, photos: [] })
  }, [task, open])

  function toggleCheckItem(id: string) {
    setForm(f => ({ ...f, checklist: f.checklist.map(i => i.id === id ? { ...i, done: !i.done } : i) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (task) { await updateTask(task.id, form); toast.success('Tâche modifiée.') }
      else { await addTask({ ...form, assigned_to: form.assigned_to || null, reservation_id: null }); toast.success('Tâche créée !') }
      onClose()
    } catch { toast.error('Erreur.') }
    finally { setLoading(false) }
  }

  const villaOpts = villas.map(v => ({ value: v.id, label: v.name }))
  const memberOpts = [{ value: '', label: '— Non assigné —' }, ...members.map(m => ({ value: m.id, label: m.full_name }))]
  const typeOpts: { value: TaskType; label: string }[] = [{ value: 'full', label: t('team.full_clean') }, { value: 'quick', label: t('team.quick_clean') }, { value: 'maintenance', label: t('team.maintenance_task') }, { value: 'inspection', label: t('team.inspection') }]
  const statusOpts: { value: TaskStatus; label: string }[] = [{ value: 'todo', label: t('team.todo') }, { value: 'in_progress', label: t('team.in_progress') }, { value: 'done', label: t('team.done') }, { value: 'issue', label: t('team.issue') }]

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Modifier la tâche' : t('team.add_task')} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button form="task-form" type="submit" loading={loading}>{t('common.save')}</Button></>}>
      <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Villa" options={villaOpts} value={form.villa_id} onChange={e => setForm(f => ({ ...f, villa_id: e.target.value }))} placeholder="— Choisir —" required />
          <Select label={t('team.assigned_to')} options={memberOpts} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Select label={t('team.task_type')} options={typeOpts} value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value as TaskType }))} />
          <Input label={t('team.scheduled_date')} type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
          <Select label={t('common.status')} options={statusOpts} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))} />
        </div>
        {/* Checklist */}
        {form.checklist.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('team.checklist')}</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {form.checklist.map(item => (
                <button key={item.id} type="button" onClick={() => toggleCheckItem(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 text-sm text-left transition-colors">
                  {item.done ? <CheckSquare className="h-4 w-4 text-success-600 flex-shrink-0" /> : <Square className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                  <span className={cn(item.done && 'line-through text-gray-400')}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <Textarea label="Note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} />
      </form>
    </Modal>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { t } = useTranslation()
  const { members, tasks, fetch, removeMember, removeTask } = useTeamStore()
  const { fetch: fetchVillas } = useVillasStore()
  const [memberFormOpen, setMemberFormOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [editTask, setEditTask] = useState<CleaningTask | null>(null)
  const [tab, setTab] = useState<'members' | 'tasks'>('members')

  useEffect(() => { fetch(); fetchVillas() }, [])

  const ROLE_LABELS: Record<TeamRole, string> = { manager: t('team.manager'), cleaner: t('team.cleaner'), maintenance: t('team.maintenance'), inspector: t('team.inspector') }
  const ROLE_COLORS: Record<TeamRole, string> = { manager: 'bg-brand-100 text-brand-800', cleaner: 'bg-success-100 text-success-800', maintenance: 'bg-amber-100 text-amber-700', inspector: 'bg-purple-100 text-purple-700' }

  const upcomingTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  const doneTasks = tasks.filter(t => t.status === 'done')

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('team.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditTask(null); setTaskFormOpen(true) }}>
            {t('team.add_task')}
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditMember(null); setMemberFormOpen(true) }}>
            {t('team.add_member')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['members', 'tasks'] as const).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t2 ? 'border-brand-800 text-brand-800' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t2 === 'members' ? `${t('team.title')} (${members.length})` : `Tâches (${tasks.length})`}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {members.map(m => (
            <Card key={m.id} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold flex-shrink-0">
                {m.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">{m.full_name}</p>
                  <Badge className={ROLE_COLORS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                </div>
                {m.phone && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</p>}
                <p className="text-xs text-gray-400 mt-1">{m.assigned_villa_ids.length} villa(s) assignée(s)</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditMember(m); setMemberFormOpen(true) }} className="p-1 text-gray-400 hover:text-brand-700 rounded"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => removeMember(m.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-6">
          {/* Upcoming / active */}
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">À faire & En cours ({upcomingTasks.length})</h2>
            <div className="space-y-3">
              {upcomingTasks.map(task => (
                <TaskCard key={task.id} task={task} onEdit={() => { setEditTask(task); setTaskFormOpen(true) }} onDelete={() => removeTask(task.id)} />
              ))}
              {upcomingTasks.length === 0 && <p className="text-gray-400 text-sm text-center py-8">{t('team.no_tasks')}</p>}
            </div>
          </div>
          {/* Done */}
          {doneTasks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Terminées ({doneTasks.length})</h2>
              <div className="space-y-3">
                {doneTasks.slice(0, 5).map(task => (
                  <TaskCard key={task.id} task={task} onEdit={() => { setEditTask(task); setTaskFormOpen(true) }} onDelete={() => removeTask(task.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <MemberForm open={memberFormOpen} member={editMember} onClose={() => { setMemberFormOpen(false); setEditMember(null) }} />
      <TaskForm open={taskFormOpen} task={editTask} onClose={() => { setTaskFormOpen(false); setEditTask(null) }} />
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete }: { task: CleaningTask; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  const done = task.checklist.filter(i => i.done).length
  const total = task.checklist.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const TYPE_LABELS: Record<string, string> = { full: t('team.full_clean'), quick: t('team.quick_clean'), maintenance: t('team.maintenance_task'), inspection: t('team.inspection') }

  return (
    <Card className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900">{task.villa?.name ?? task.villa_id}</p>
          <Badge className="bg-gray-100 text-gray-600 text-xs">{TYPE_LABELS[task.task_type]}</Badge>
          <Badge className={TASK_STATUS_COLORS[task.status]} dot>{t(`team.${task.status}`)}</Badge>
        </div>
        {task.assignee && <p className="text-xs text-gray-500 mt-0.5">Assigné à {task.assignee.full_name}</p>}
        <p className="text-xs text-gray-400 mt-0.5">📅 {format(parseISO(task.scheduled_date), 'dd/MM/yyyy')}</p>
        {total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1"><span>Checklist</span><span>{done}/{total}</span></div>
            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-success-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
        {task.note && <p className="text-xs text-gray-500 mt-1.5 italic">"{task.note}"</p>}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-1 text-gray-400 hover:text-brand-700 rounded"><Pencil className="h-4 w-4" /></button>
        <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
      </div>
    </Card>
  )
}
