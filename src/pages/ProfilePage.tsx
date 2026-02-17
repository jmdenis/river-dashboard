import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Home, Check, Clock, Plus, Trash2, Mail, X, Shield, FileText, Settings, AlertTriangle, Key, Bug, Inbox, RefreshCw, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import { profileApi, type SecurityStatus, type DocFile } from '../services/profileApi'
import { lifeApi, type CronJob, type HomeSettings } from '../services/lifeApi'

// --- Segmented Control ---
type ProfileTabId = 'general' | 'notifications' | 'cron' | 'security' | 'docs'

const PROFILE_TABS: { id: ProfileTabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'cron', label: 'Cron Jobs' },
  { id: 'security', label: 'Security' },
  { id: 'docs', label: 'Docs' },
]

function ProfileTabControl({ active, onChange }: { active: ProfileTabId; onChange: (id: ProfileTabId) => void }) {
  return (
    <div className="inline-flex rounded-full bg-white/[0.06] p-1 border border-white/[0.06]">
      {PROFILE_TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-3.5 sm:px-5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
            active === tab.id
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// --- Toast Container ---
function ToastContainer({ toasts }: { toasts: { id: number; message: string }[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map(t => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white/10 backdrop-blur-xl border border-white/10 text-white/80 text-sm px-4 py-2.5 rounded-xl shadow-lg"
        >
          {t.message}
        </motion.div>
      ))}
    </div>
  )
}

// --- General Tab: Home Location ---
function HomeLocationSection({ toast }: { toast: (msg: string) => void }) {
  const [draft, setDraft] = useState({ homeAddress: '', homeCity: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    lifeApi.getSettings().then(s => {
      setDraft({ homeAddress: s.homeAddress, homeCity: s.homeCity })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleChange = (field: 'homeAddress' | 'homeCity', value: string) => {
    setDraft(d => ({ ...d, [field]: value }))
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const result = await lifeApi.updateSettings({ homeAddress: draft.homeAddress, homeCity: draft.homeCity })
      setDraft({ homeAddress: result.homeAddress, homeCity: result.homeCity })
      setDirty(false)
      toast('Home location saved')
    } catch {
      toast('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Home className="h-4 w-4 text-white/40 shrink-0" />
          <p className="text-xs uppercase tracking-widest text-white/40 shrink-0">Home</p>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/20 ml-auto" />
          ) : (
            <>
              <Input
                value={draft.homeAddress}
                onChange={e => handleChange('homeAddress', e.target.value)}
                className="h-8 text-xs bg-white/[0.03] border-white/[0.08] text-white/70 placeholder:text-white/20 flex-1 min-w-0"
                placeholder="Address"
              />
              <Input
                value={draft.homeCity}
                onChange={e => handleChange('homeCity', e.target.value)}
                className="h-8 text-xs bg-white/[0.03] border-white/[0.08] text-white/70 placeholder:text-white/20 w-32 shrink-0"
                placeholder="City"
              />
              <Button
                size="sm"
                onClick={save}
                disabled={saving || !dirty}
                className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 shrink-0 disabled:opacity-30"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- General Tab: Owner & Partner (read from settings) ---
function OwnerSection({ toast }: { toast: (msg: string) => void }) {
  const [settings, setSettings] = useState<HomeSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    lifeApi.getSettings().then(s => { setSettings(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return null

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Configuration</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Owner</p>
            <p className="text-xs text-white/60">Jean-Marc Denis</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Partner</p>
            <p className="text-xs text-white/60">Anne</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Notifications Tab ---
const EMAIL_TYPES: { id: string; label: string; testId?: string }[] = [
  { id: 'morning-digest', label: 'Morning Digest', testId: 'morning-digest' },
  { id: 'weekend-family', label: 'Weekend Family', testId: 'weekend-family' },
  { id: 'midweek-date', label: 'Midweek Date', testId: 'midweek-date' },
  { id: 'birthday-reminders', label: 'Birthday Reminders', testId: 'birthday-reminders' },
  { id: 'weekend-plans', label: 'Weekend Plans', testId: 'weekend-plans' },
  { id: 'article-summaries', label: 'Article Summaries' },
  { id: 'trip-packing', label: 'Trip Packing', testId: 'trip-packing' },
  { id: 'trip-anne-notification', label: 'Trip Anne', testId: 'trip-anne' },
  { id: 'trip-connection-summary', label: 'Trip Connection', testId: 'trip-connection' },
]

function EmailNotificationsSection({ toast }: { toast: (msg: string) => void }) {
  const [config, setConfig] = useState<{ recipients: Record<string, string[]> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newEmails, setNewEmails] = useState<Record<string, string>>({})
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [testState, setTestState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({})

  useEffect(() => {
    lifeApi.getEmailConfig().then(c => { setConfig(c); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const save = async (updated: { recipients: Record<string, string[]> }) => {
    setSaving(true)
    try {
      const result = await lifeApi.updateEmailConfig(updated)
      setConfig(result)
    } catch {
      toast('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const removeRecipient = (type: string, email: string) => {
    if (!config) return
    const updated = { ...config, recipients: { ...config.recipients, [type]: config.recipients[type].filter(e => e !== email) } }
    setConfig(updated)
    save(updated)
  }

  const addRecipient = (type: string) => {
    const email = (newEmails[type] || '').trim().toLowerCase()
    if (!email || !email.includes('@') || !config) return
    if (config.recipients[type]?.includes(email)) return
    const updated = { ...config, recipients: { ...config.recipients, [type]: [...(config.recipients[type] || []), email] } }
    setConfig(updated)
    setNewEmails(prev => ({ ...prev, [type]: '' }))
    setAddingFor(null)
    save(updated)
  }

  const sendTest = async (testId: string) => {
    setTestState(prev => ({ ...prev, [testId]: 'sending' }))
    try {
      const result = await lifeApi.sendTestEmail(testId)
      if (result.error) {
        toast(`Test failed: ${result.error}`)
        setTestState(prev => ({ ...prev, [testId]: 'idle' }))
      } else {
        setTestState(prev => ({ ...prev, [testId]: 'sent' }))
        toast('Test email sent!')
        setTimeout(() => setTestState(prev => ({ ...prev, [testId]: 'idle' })), 2000)
      }
    } catch {
      toast('Test failed')
      setTestState(prev => ({ ...prev, [testId]: 'idle' }))
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/20" /></div>

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Email Notifications</p>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-violet-400 ml-auto" />}
        </div>
        <div className="space-y-1">
          {EMAIL_TYPES.map(({ id, label, testId }) => {
            const recipients = config?.recipients[id] || []
            const tState = testId ? (testState[testId] || 'idle') : null
            return (
              <div key={id} className="group rounded-lg hover:bg-white/[0.02] transition-colors px-2 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-white/60 shrink-0 w-28 truncate" title={label}>{label}</span>
                  {testId && (
                    <button
                      onClick={() => sendTest(testId)}
                      disabled={tState !== 'idle'}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all border border-white/[0.08] hover:bg-white/[0.06] text-white/35 hover:text-white/55 disabled:opacity-50 shrink-0"
                    >
                      {tState === 'sending' ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : tState === 'sent' ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Mail className="h-2.5 w-2.5" />}
                      {tState === 'sent' ? 'Sent' : 'Test'}
                    </button>
                  )}
                  {!testId && <span className="w-[52px] shrink-0" />}
                  <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                    {recipients.map(email => (
                      <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/[0.05] text-white/50 border border-white/[0.06]">
                        {email}
                        <button onClick={() => removeRecipient(id, email)} className="text-white/25 hover:text-rose-400 transition-colors">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                    {addingFor === id ? (
                      <div className="inline-flex items-center gap-1">
                        <input
                          autoFocus
                          placeholder="email@..."
                          value={newEmails[id] || ''}
                          onChange={e => setNewEmails(prev => ({ ...prev, [id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addRecipient(id)
                            if (e.key === 'Escape') setAddingFor(null)
                          }}
                          onBlur={() => { if (!(newEmails[id] || '').trim()) setAddingFor(null) }}
                          className="h-5 w-32 text-[10px] bg-white/[0.04] border border-white/[0.1] rounded px-1.5 text-white/60 placeholder:text-white/20 outline-none focus:border-violet-500/40"
                        />
                        <button onClick={() => addRecipient(id)} className="text-white/30 hover:text-violet-400">
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingFor(id)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Cron Jobs Tab ---
function CronJobsSection({ cronJobs, onAdd, onDelete }: {
  cronJobs: CronJob[]
  onAdd: (line: string) => void
  onDelete: (line: string) => void
}) {
  const [newLine, setNewLine] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-white/40" />
            <p className="text-xs uppercase tracking-widest text-white/40">Cron Jobs</p>
            {cronJobs.length > 0 && <Badge variant="secondary" className="bg-white/5 text-white/40 border-0 text-[10px]">{cronJobs.length}</Badge>}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center h-7 text-[11px] text-white/40 border border-white/[0.08] hover:bg-white/[0.04] rounded-md px-2.5"
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </button>
            <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
              <DialogHeader><DialogTitle className="text-white/90 font-medium">Add Cron Job</DialogTitle></DialogHeader>
              <Input
                placeholder="* * * * * /path/to/command"
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLine.trim()) {
                    onAdd(newLine.trim())
                    setNewLine('')
                    setOpen(false)
                  }
                }}
                className="bg-white/[0.03] border-white/10 text-white/80 font-mono text-xs"
              />
              <p className="text-xs text-white/25">Format: minute hour day month weekday command</p>
              <DialogFooter>
                <Button
                  onClick={() => { onAdd(newLine.trim()); setNewLine(''); setOpen(false) }}
                  disabled={!newLine.trim()}
                  className="bg-violet-500 hover:bg-violet-600 text-white"
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {cronJobs.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-4">No cron jobs</p>
        ) : (
          <div className="space-y-0.5">
            {cronJobs.map((job) => {
              const rawSchedule = job.raw.split(/\s+/).slice(0, 5).join(' ')
              return (
                <div key={job.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors duration-150">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${job.source === 'server' ? 'bg-violet-500/80' : 'bg-emerald-500/80'}`} />
                  <span className="text-xs text-white/70 truncate flex-1 min-w-0">{job.name}</span>
                  <code className="text-[10px] text-white/30 font-mono shrink-0">{rawSchedule}</code>
                  <span className="text-[10px] text-white/20 shrink-0 hidden sm:inline">{job.schedule}</span>
                  {job.source === 'crontab' && (
                    <button
                      onClick={() => onDelete(job.raw)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400/80 shrink-0 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Security Tab: Env vars ---
function EnvVarsSection() {
  const [vars, setVars] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    profileApi.getEnvVars().then(v => { setVars(v); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-white/20" /></div>

  const entries = Object.entries(vars)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">API Keys & Secrets</p>
          <Badge variant="secondary" className="bg-white/5 text-white/40 border-0 text-[10px]">{entries.length}</Badge>
        </div>
        {entries.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-4">No environment variables found</p>
        ) : (
          <div className="space-y-0.5">
            {entries.map(([key, masked]) => (
              <div key={key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                <code className="text-xs text-white/60 font-mono flex-1 min-w-0 truncate">{key}</code>
                <code className="text-[11px] text-white/30 font-mono shrink-0">{masked}</code>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Security Tab: Connected Services ---
function ConnectedServicesSection() {
  const [status, setStatus] = useState<SecurityStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    profileApi.getSecurityStatus().then(s => { setStatus(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Connected Services</p>
        </div>
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-white/20" />
          <span className="text-xs text-white/30">Testing connections...</span>
        </div>
      </CardContent>
    </Card>
  )

  if (!status) return null

  const services = [
    { name: 'Gmail SMTP', connected: status.smtp.connected, detail: status.smtp.account || '', icon: Mail },
    { name: 'Gmail IMAP', connected: status.imap.connected, detail: '', icon: Inbox },
    { name: 'Gemini AI', connected: status.gemini.connected, detail: '', icon: RefreshCw },
    { name: 'Google Calendar', connected: status.calendar.connected, detail: '', icon: Clock },
    { name: 'Telegram', connected: status.telegram.connected, detail: status.telegram.username ? `@${status.telegram.username}` : '', icon: Mail },
    { name: 'GitHub', connected: status.github.connected, detail: '', icon: FileText },
  ]

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Connected Services</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {services.map(s => (
            <div key={s.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <span className={`h-2 w-2 rounded-full shrink-0 ${s.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-xs text-white/60 flex-1">{s.name}</span>
              {s.detail && <span className="text-[10px] text-white/30 truncate max-w-[140px]">{s.detail}</span>}
              <span className="text-[10px] font-medium shrink-0" style={{ color: s.connected ? 'rgb(52, 211, 153)' : 'rgb(251, 113, 133)' }}>
                {s.connected ? 'Connected' : 'Offline'}
              </span>
            </div>
          ))}
        </div>

        {/* Auth info */}
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-white/30" />
            <span className="text-[11px] text-white/40">Auth: {status.auth.method}</span>
            <span className="text-[10px] text-white/25">(user: {status.auth.user})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Security Tab: Danger Zone ---
function DangerZoneSection({ toast }: { toast: (msg: string) => void }) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const actions = [
    { id: 'rotate-token', label: 'Rotate Auth Token', description: 'Generate a new auth token. Requires service restart.', icon: Key },
    { id: 'clear-debug', label: 'Clear Debug Logs', description: 'Clear the server debug log file.', icon: Bug },
    { id: 'clear-inbox', label: 'Clear Inbox History', description: 'Delete all processed inbox analysis files.', icon: Inbox },
  ]

  const executeAction = async (id: string) => {
    setActionLoading(true)
    try {
      let result: { success?: boolean; error?: string; message?: string; cleared?: number }
      if (id === 'rotate-token') result = await profileApi.rotateToken()
      else if (id === 'clear-debug') result = await profileApi.clearDebugLogs()
      else result = await profileApi.clearInbox()

      if (result.error) {
        toast(`Error: ${result.error}`)
      } else {
        const msg = result.message || (id === 'clear-inbox' ? `Cleared ${result.cleared} files` : 'Done')
        toast(msg)
      }
    } catch {
      toast('Action failed')
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  return (
    <>
      <Card className="border-rose-500/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-rose-400/60" />
            <p className="text-xs uppercase tracking-widest text-rose-400/60">Danger Zone</p>
          </div>
          <div className="space-y-2">
            {actions.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/[0.06] hover:border-rose-500/20 transition-colors">
                <div className="flex items-center gap-2.5">
                  <a.icon className="h-3.5 w-3.5 text-white/30" />
                  <div>
                    <p className="text-xs text-white/60">{a.label}</p>
                    <p className="text-[10px] text-white/25">{a.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmAction(a.id)}
                  className="h-7 text-[11px] text-rose-400/60 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  Execute
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-medium">Confirm Action</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/50">
            Are you sure you want to {actions.find(a => a.id === confirmAction)?.label.toLowerCase()}? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="text-white/40 border-white/[0.08]">
              Cancel
            </Button>
            <Button
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Docs Tab ---
function DocsSection() {
  const [docs, setDocs] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [docContent, setDocContent] = useState<string>('')
  const [docModified, setDocModified] = useState<string>('')
  const [docLoading, setDocLoading] = useState(false)

  useEffect(() => {
    profileApi.getDocs().then(d => { setDocs(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const openDoc = async (name: string) => {
    setSelectedDoc(name)
    setDocLoading(true)
    try {
      const result = await profileApi.getDocContent(name)
      if (result) {
        setDocContent(result.content)
        setDocModified(result.modified)
      }
    } catch {
      setDocContent('Failed to load file')
    } finally {
      setDocLoading(false)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/20" /></div>

  if (selectedDoc) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => { setSelectedDoc(null); setDocContent('') }}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            Docs
          </button>
          <ChevronRight className="h-3 w-3 text-white/20" />
          <span className="text-xs text-white/70">{selectedDoc}</span>
        </div>
        <Card>
          <CardContent className="pt-6">
            {docLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/20" /></div>
            ) : (
              <>
                {docModified && (
                  <p className="text-xs text-white/25 mb-4">
                    Last modified: {new Date(docModified).toLocaleString()}
                  </p>
                )}
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white/90 prose-headings:font-medium prose-a:text-violet-400 prose-strong:text-white/80 prose-code:text-violet-400 prose-p:text-white/60 prose-li:text-white/60">
                  <ReactMarkdown>{docContent}</ReactMarkdown>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Markdown Files</p>
          <Badge variant="secondary" className="bg-white/5 text-white/40 border-0 text-[10px]">{docs.length}</Badge>
        </div>
        {docs.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-4">No .md files found</p>
        ) : (
          <div className="space-y-0.5">
            {docs.map(doc => (
              <button
                key={doc.name}
                onClick={() => openDoc(doc.name)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
              >
                <FileText className="h-3.5 w-3.5 text-white/25 shrink-0" />
                <span className="text-xs text-white/60 flex-1 truncate group-hover:text-white/80 transition-colors">{doc.name}</span>
                <span className="text-[10px] text-white/20 shrink-0">
                  {doc.size < 1024 ? `${doc.size}B` : `${(doc.size / 1024).toFixed(1)}KB`}
                </span>
                <span className="text-[10px] text-white/15 shrink-0">
                  {new Date(doc.modified).toLocaleDateString()}
                </span>
                <ChevronRight className="h-3 w-3 text-white/15 group-hover:text-white/30 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Main Profile Page ---
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('general')
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [cronLoading, setCronLoading] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])

  const addToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // Load cron jobs when cron tab is selected
  useEffect(() => {
    if (activeTab === 'cron' && cronJobs.length === 0 && !cronLoading) {
      setCronLoading(true)
      lifeApi.getData().then(d => { setCronJobs(d.cronJobs); setCronLoading(false) }).catch(() => setCronLoading(false))
    }
  }, [activeTab])

  const addCron = async (line: string) => {
    const result = await lifeApi.cronAction('add', line)
    setCronJobs(result.cronJobs)
  }

  const deleteCron = async (line: string) => {
    const result = await lifeApi.cronAction('delete', line)
    setCronJobs(result.cronJobs)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header + Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white/90">Profile</h1>
            <p className="text-sm text-white/50 mt-1">Settings, notifications, and security</p>
          </div>
          <ProfileTabControl active={activeTab} onChange={setActiveTab} />
        </div>

        {/* General */}
        {activeTab === 'general' && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <HomeLocationSection toast={addToast} />
            <OwnerSection toast={addToast} />
          </motion.div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <EmailNotificationsSection toast={addToast} />
          </motion.div>
        )}

        {/* Cron Jobs */}
        {activeTab === 'cron' && (
          <motion.div
            key="cron"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {cronLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/20" /></div>
            ) : (
              <CronJobsSection cronJobs={cronJobs} onAdd={addCron} onDelete={deleteCron} />
            )}
          </motion.div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <EnvVarsSection />
            <ConnectedServicesSection />
            <DangerZoneSection toast={addToast} />
          </motion.div>
        )}

        {/* Docs */}
        {activeTab === 'docs' && (
          <motion.div
            key="docs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <DocsSection />
          </motion.div>
        )}
      </div>
      <ToastContainer toasts={toasts} />
    </>
  )
}
