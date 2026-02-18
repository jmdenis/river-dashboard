import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Home, Check, Clock, Plus, Trash2, Mail, X, Shield, FileText, Settings, AlertTriangle, Key, Bug, Inbox, RefreshCw, ChevronRight, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Progress } from '../components/ui/progress'
import ReactMarkdown from 'react-markdown'
import { profileApi, type SecurityStatus, type DocFile } from '../services/profileApi'
import { lifeApi, type CronJob, type HomeSettings } from '../services/lifeApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN = API_BASE_URL.split('/dash/')[1]?.split('/')[0] || ''

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
    <div className="segmented-control">
      {PROFILE_TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`segmented-control-item ${active === tab.id ? 'active' : ''}`}
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
          className="backdrop-blur-xl text-sm px-4 py-2.5 shadow-lg"
          style={{ background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', color: 'var(--text-1)', borderRadius: 'var(--glass-radius-sm)' }}
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
          <Home className="h-4 w-4 text-[var(--text-2)] shrink-0" />
          <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)] shrink-0">Home</p>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-3)] ml-auto" />
          ) : (
            <>
              <Input
                value={draft.homeAddress}
                onChange={e => handleChange('homeAddress', e.target.value)}
                className="h-8 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[var(--text-2)] placeholder:text-[var(--text-3)] flex-1 min-w-0"
                placeholder="Address"
              />
              <Input
                value={draft.homeCity}
                onChange={e => handleChange('homeCity', e.target.value)}
                className="h-8 text-xs bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] text-[var(--text-2)] placeholder:text-[var(--text-3)] w-32 shrink-0"
                placeholder="City"
              />
              <Button
                size="sm"
                onClick={save}
                disabled={saving || !dirty}
                className="h-8 px-3 text-xs shrink-0 disabled:opacity-30"
                style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-text)' }}
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
          <Settings className="h-4 w-4 text-[var(--text-2)]" />
          <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Configuration</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)]">
            <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-3)] mb-0.5">Owner</p>
            <p className="text-xs text-[var(--text-2)]">Jean-Marc Denis</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)]">
            <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-3)] mb-0.5">Partner</p>
            <p className="text-xs text-[var(--text-2)]">Anne</p>
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" /></div>

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-[var(--text-2)]" />
          <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Email Notifications</p>
          {saving && <Loader2 className="h-3 w-3 animate-spin ml-auto" style={{ color: 'var(--accent-text)' }} />}
        </div>
        <div className="space-y-1">
          {EMAIL_TYPES.map(({ id, label, testId }) => {
            const recipients = config?.recipients[id] || []
            const tState = testId ? (testState[testId] || 'idle') : null
            return (
              <div key={id} className="group rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors px-2 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--text-2)] shrink-0 w-28 truncate" title={label}>{label}</span>
                  {testId && (
                    <button
                      onClick={() => sendTest(testId)}
                      disabled={tState !== 'idle'}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-3)] hover:text-[var(--text-2)] disabled:opacity-50 shrink-0"
                    >
                      {tState === 'sending' ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : tState === 'sent' ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Mail className="h-2.5 w-2.5" />}
                      {tState === 'sent' ? 'Sent' : 'Test'}
                    </button>
                  )}
                  {!testId && <span className="w-[52px] shrink-0" />}
                  <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                    {recipients.map(email => (
                      <span key={email} className="inline-flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>
                        {email}
                        <button onClick={() => removeRecipient(id, email)} className="text-[var(--text-3)] hover:text-rose-400 transition-colors">
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
                          className="h-5 w-32 text-[10px] bg-[rgba(255,255,255,0.04)] border border-white/[0.1] rounded px-1.5 text-[var(--text-2)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent-border)]"
                        />
                        <button onClick={() => addRecipient(id)} className="text-[var(--text-3)] hover:text-[var(--accent-text)]">
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingFor(id)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
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
            <Clock className="h-4 w-4 text-[var(--text-2)]" />
            <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Cron Jobs</p>
            {cronJobs.length > 0 && <span className="text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>{cronJobs.length}</span>}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center h-7 text-[11px] text-[var(--text-2)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] rounded-md px-2.5"
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </button>
            <DialogContent className="">
              <DialogHeader><DialogTitle style={{ color: 'var(--text-1)', fontWeight: 600 }}>Add Cron Job</DialogTitle></DialogHeader>
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
                className="bg-[rgba(255,255,255,0.04)] border-white/10 text-[var(--text-1)] font-mono text-xs"
              />
              <p className="text-xs text-[var(--text-3)]">Format: minute hour day month weekday command</p>
              <DialogFooter>
                <Button
                  onClick={() => { onAdd(newLine.trim()); setNewLine(''); setOpen(false) }}
                  disabled={!newLine.trim()}
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-text)' }}
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {cronJobs.length === 0 ? (
          <p className="text-xs text-[var(--text-3)] text-center py-4">No cron jobs</p>
        ) : (
          <div className="space-y-0.5">
            {cronJobs.map((job) => {
              const rawSchedule = job.raw.split(/\s+/).slice(0, 5).join(' ')
              return (
                <div key={job.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: job.source === 'server' ? 'var(--accent)' : 'var(--success)' }} />
                  <span className="text-xs text-[var(--text-2)] truncate flex-1 min-w-0">{job.name}</span>
                  <code className="text-[10px] text-[var(--text-3)] font-mono shrink-0">{rawSchedule}</code>
                  <span className="text-[10px] text-[var(--text-3)] shrink-0 hidden sm:inline">{job.schedule}</span>
                  {job.source === 'crontab' && (
                    <button
                      onClick={() => onDelete(job.raw)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-3)] hover:text-rose-400/80 shrink-0 p-0.5"
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

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-[var(--text-3)]" /></div>

  const entries = Object.entries(vars)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-[var(--text-2)]" />
          <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">API Keys & Secrets</p>
          <span className="text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>{entries.length}</span>
        </div>
        {entries.length === 0 ? (
          <p className="text-xs text-[var(--text-3)] text-center py-4">No environment variables found</p>
        ) : (
          <div className="space-y-0.5">
            {entries.map(([key, masked]) => (
              <div key={key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                <code className="text-xs text-[var(--text-2)] font-mono flex-1 min-w-0 truncate">{key}</code>
                <code className="text-[11px] text-[var(--text-3)] font-mono shrink-0">{masked}</code>
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
          <RefreshCw className="h-4 w-4 text-[var(--text-2)]" />
          <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Connected Services</p>
        </div>
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--text-3)]" />
          <span className="text-xs text-[var(--text-3)]">Testing connections...</span>
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
          <Shield className="h-4 w-4 text-[var(--text-2)]" />
          <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Connected Services</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {services.map(s => (
            <div key={s.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)]">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.connected ? 'var(--success, #10b981)' : 'var(--destructive, #ef4444)' }} />
              <span className="text-xs text-[var(--text-2)] flex-1">{s.name}</span>
              {s.detail && <span className="text-[10px] text-[var(--text-3)] truncate max-w-[140px]">{s.detail}</span>}
              <span className="text-[10px] shrink-0" style={{ color: s.connected ? 'var(--success)' : 'var(--destructive)' }}>
                {s.connected ? 'Connected' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[var(--text-3)]" />
            <span className="text-[11px] text-[var(--text-2)]">Auth: {status.auth.method}</span>
            <span className="text-[10px] text-[var(--text-3)]">(user: {status.auth.user})</span>
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
            <p className="text-[11px] uppercase tracking-[0.05em] text-rose-400/60">Danger Zone</p>
          </div>
          <div className="space-y-2">
            {actions.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-rose-500/20 transition-colors">
                <div className="flex items-center gap-2.5">
                  <a.icon className="h-3.5 w-3.5 text-[var(--text-3)]" />
                  <div>
                    <p className="text-xs text-[var(--text-2)]">{a.label}</p>
                    <p className="text-[10px] text-[var(--text-3)]">{a.description}</p>
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
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-1)', fontWeight: 600 }}>Confirm Action</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-3)]">
            Are you sure you want to {actions.find(a => a.id === confirmAction)?.label.toLowerCase()}? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="text-[var(--text-2)] border-[rgba(255,255,255,0.1)]">
              Cancel
            </Button>
            <Button
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={actionLoading}
              className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.2)]"
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

// --- Docs Tab (with file upload) ---
interface UploadEntry {
  name: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

function DocsSection({ toast }: { toast: (msg: string) => void }) {
  const [docs, setDocs] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [docContent, setDocContent] = useState<string>('')
  const [docModified, setDocModified] = useState<string>('')
  const [docLoading, setDocLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    profileApi.getDocs().then(d => { setDocs(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    const entry: UploadEntry = { name: file.name, status: 'uploading', progress: 0 }
    setUploads(prev => [...prev, entry])
    try {
      const xhr = new XMLHttpRequest()
      const promise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploads(prev => prev.map(u => u.name === file.name ? { ...u, progress: pct } : u))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.open('POST', `${API_BASE_URL}/api/files`)
        xhr.setRequestHeader('x-upload-token', TOKEN)
        xhr.setRequestHeader('x-file-name', file.name)
        xhr.send(file)
      })
      await promise
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'done', progress: 100 } : u))
      toast(`${file.name} uploaded`)
    } catch (e: any) {
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', error: e.message } : u))
      toast(`Upload failed: ${e.message}`)
    }
  }, [toast])

  useEffect(() => {
    if (uploads.length === 0) return
    const allDone = uploads.every(u => u.status === 'done' || u.status === 'error')
    if (allDone) {
      const timer = setTimeout(() => setUploads([]), 3000)
      return () => clearTimeout(timer)
    }
  }, [uploads])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [uploadFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(uploadFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" /></div>

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
            className="text-xs text-[var(--text-2)] hover:text-[var(--text-2)] transition-colors"
          >
            Docs
          </button>
          <ChevronRight className="h-3 w-3 text-[var(--text-3)]" />
          <span className="text-xs text-[var(--text-2)]">{selectedDoc}</span>
        </div>
        <Card>
          <CardContent className="pt-6">
            {docLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" /></div>
            ) : (
              <>
                {docModified && (
                  <p className="text-xs text-[var(--text-3)] mb-4">
                    Last modified: {new Date(docModified).toLocaleString()}
                  </p>
                )}
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[var(--text-1)] prose-headings:font-medium prose-a:text-[var(--accent-text)] prose-strong:text-[var(--text-1)] prose-code:text-[var(--accent-text)] prose-p:text-[var(--text-2)] prose-li:text-[var(--text-2)]">
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
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-8 text-center cursor-pointer transition-all duration-150 rounded-xl"
        style={{
          border: dragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
          background: dragOver ? 'var(--accent-subtle)' : 'transparent',
        }}
      >
        <Upload className="h-5 w-5 mx-auto mb-2" style={{ color: dragOver ? 'var(--accent-text)' : 'var(--text-3)' }} />
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          {dragOver ? 'Drop files here' : 'Drop files here or click to browse'}
        </p>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {u.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: 'var(--accent-text)' }} />}
                {u.status === 'done' && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                {u.status === 'error' && <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />}
                <span className="truncate text-[var(--text-2)]">{u.name}</span>
                {u.status === 'uploading' && <span className="text-[var(--text-3)] ml-auto">{u.progress}%</span>}
              </div>
              {u.status === 'uploading' && <Progress value={u.progress} className="h-1" />}
            </div>
          ))}
        </div>
      )}

      {/* Docs list */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-[var(--text-2)]" />
            <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Markdown Files</p>
            <span className="text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>{docs.length}</span>
          </div>
          {docs.length === 0 ? (
            <p className="text-xs text-[var(--text-3)] text-center py-4">No .md files found</p>
          ) : (
            <div className="space-y-0.5">
              {docs.map(doc => (
                <button
                  key={doc.name}
                  onClick={() => openDoc(doc.name)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left group"
                >
                  <FileText className="h-3.5 w-3.5 text-[var(--text-3)] shrink-0" />
                  <span className="text-xs text-[var(--text-2)] flex-1 truncate group-hover:text-[var(--text-1)] transition-colors">{doc.name}</span>
                  <span className="text-[10px] text-[var(--text-3)] shrink-0">
                    {doc.size < 1024 ? `${doc.size}B` : `${(doc.size / 1024).toFixed(1)}KB`}
                  </span>
                  <span className="text-[10px] text-[rgba(255,255,255,0.15)] shrink-0">
                    {new Date(doc.modified).toLocaleDateString()}
                  </span>
                  <ChevronRight className="h-3 w-3 text-[rgba(255,255,255,0.15)] group-hover:text-[var(--text-3)] transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
      <div className="container mx-auto px-6 py-6 pb-20 md:px-8 md:pb-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>Settings</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Settings, notifications, and security</p>
          </div>
          <ProfileTabControl active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'general' && (
          <motion.div key="general" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
            <HomeLocationSection toast={addToast} />
            <OwnerSection toast={addToast} />
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            <EmailNotificationsSection toast={addToast} />
          </motion.div>
        )}

        {activeTab === 'cron' && (
          <motion.div key="cron" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            {cronLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" /></div>
            ) : (
              <CronJobsSection cronJobs={cronJobs} onAdd={addCron} onDelete={deleteCron} />
            )}
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
            <EnvVarsSection />
            <ConnectedServicesSection />
            <DangerZoneSection toast={addToast} />
          </motion.div>
        )}

        {activeTab === 'docs' && (
          <motion.div key="docs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            <DocsSection toast={addToast} />
          </motion.div>
        )}
      </div>
      <ToastContainer toasts={toasts} />
    </>
  )
}
