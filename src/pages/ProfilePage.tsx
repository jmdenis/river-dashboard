import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Loading03Icon, Location01Icon, Tick02Icon, PlusSignIcon, Delete02Icon, Mail01Icon, Cancel01Icon, ShieldKeyIcon, Settings01Icon, Alert02Icon, Key01Icon, Bug01Icon, InboxIcon, RotateClockwiseIcon, Copy01Icon, Clock01Icon, ArtificialIntelligence01Icon, Note01Icon, Upload02Icon, CheckmarkCircle02Icon, Folder01Icon, ArrowRight01Icon, ArrowLeft01Icon, Download02Icon } from 'hugeicons-react'
import { AnimatedIcon } from '../components/AnimatedIcon'
import ReactMarkdown from 'react-markdown'

// shadcn/ui
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Switch } from '../components/ui/switch'
import { Separator } from '../components/ui/separator'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'

// ReUI
import { Alert, AlertTitle, AlertDescription } from '../components/reui/alert'

// APIs
import { profileApi, type SecurityStatus, type MemoryData } from '../services/profileApi'
import { lifeApi, type CronJob, type HomeSettings } from '../services/lifeApi'
import { tokens } from '../designTokens'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN = API_BASE_URL.split('/dash/')[1]?.split('/')[0] || ''

// ─── General Tab ─────────────────────────────────────────────────────────────

function GeneralTab() {
  const [draft, setDraft] = useState({ homeAddress: '', homeCity: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [settings, setSettings] = useState<HomeSettings | null>(null)
  const [timezone, setTimezone] = useState('Europe/Paris')

  useEffect(() => {
    lifeApi.getSettings().then(s => {
      setDraft({ homeAddress: s.homeAddress, homeCity: s.homeCity })
      setSettings(s)
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
      toast.success('Home location saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading03Icon strokeWidth={1.5} className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-[680px] space-y-4">
      {/* Location */}
      <Card className="md:py-6 py-4">
        <CardHeader className="md:px-6 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AnimatedIcon icon={Location01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
            Home Location
          </CardTitle>
          <CardDescription>Your home address for weather, commute, and location-based features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:px-6 px-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="flex items-center gap-2">
              <Input
                id="address"
                value={draft.homeAddress}
                onChange={e => handleChange('homeAddress', e.target.value)}
                placeholder="123 Main Street"
              />
              {dirty && (
                <Button onClick={save} disabled={saving} size="icon" variant="outline">
                  {saving ? <Loading03Icon strokeWidth={1.5} className="size-4 animate-spin" /> : <AnimatedIcon icon={Tick02Icon} strokeWidth={1.5} className="size-4" />}
                </Button>
              )}
            </div>
          </div>
          {draft.homeCity && (
            <div className="space-y-2">
              <Label>City</Label>
              <p className="text-sm text-muted-foreground">{draft.homeCity}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="md:py-6 py-4">
        <CardHeader className="md:px-6 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AnimatedIcon icon={Settings01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:px-6 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner</Label>
              <p className="text-sm text-foreground">Jean-Marc Denis</p>
            </div>
            <div className="space-y-2">
              <Label>Partner</Label>
              <p className="text-sm text-foreground">Anne</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los Angeles (PT)</SelectItem>
                <SelectItem value="America/New_York">America/New York (ET)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Notifications Tab ───────────────────────────────────────────────────────

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

function NotificationsTab() {
  const [config, setConfig] = useState<{ recipients: Record<string, string[]> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newEmails, setNewEmails] = useState<Record<string, string>>({})
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [testState, setTestState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({})
  const [cooldown, setCooldown] = useState<Record<string, number>>({})
  const cooldownRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    EMAIL_TYPES.forEach(t => { init[t.id] = true })
    return init
  })

  useEffect(() => {
    lifeApi.getEmailConfig().then(c => { setConfig(c); setLoading(false) }).catch(() => setLoading(false))
    return () => { Object.values(cooldownRefs.current).forEach(clearInterval) }
  }, [])

  const save = async (updated: { recipients: Record<string, string[]> }) => {
    setSaving(true)
    try {
      const result = await lifeApi.updateEmailConfig(updated)
      setConfig(result)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const removeRecipient = (type: string, email: string) => {
    if (!config) return
    const updated = { ...config, recipients: { ...config.recipients, [type]: config.recipients[type].filter(e => e !== email) } }
    setConfig(updated)
    save(updated)
    toast.success(`Removed ${email}`)
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
    toast.success(`Added ${email}`)
  }

  const sendTest = async (testId: string) => {
    setTestState(prev => ({ ...prev, [testId]: 'sending' }))
    try {
      const result = await lifeApi.sendTestEmail(testId)
      if (result.error) {
        toast.error(`Test failed: ${result.error}`)
        setTestState(prev => ({ ...prev, [testId]: 'idle' }))
      } else {
        setTestState(prev => ({ ...prev, [testId]: 'sent' }))
        toast.success('Test email sent!')
        // 30-second cooldown
        setCooldown(prev => ({ ...prev, [testId]: 30 }))
        if (cooldownRefs.current[testId]) clearInterval(cooldownRefs.current[testId])
        cooldownRefs.current[testId] = setInterval(() => {
          setCooldown(prev => {
            const next = (prev[testId] || 0) - 1
            if (next <= 0) {
              clearInterval(cooldownRefs.current[testId])
              delete cooldownRefs.current[testId]
              setTestState(p => ({ ...p, [testId]: 'idle' }))
              const { [testId]: _, ...rest } = prev
              return rest
            }
            return { ...prev, [testId]: next }
          })
        }, 1000)
      }
    } catch {
      toast.error('Test failed')
      setTestState(prev => ({ ...prev, [testId]: 'idle' }))
    }
  }

  const toggleEnabled = (id: string) => {
    setEnabled(prev => {
      const next = { ...prev, [id]: !prev[id] }
      toast.success(`${EMAIL_TYPES.find(t => t.id === id)?.label} ${next[id] ? 'enabled' : 'disabled'}`)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading03Icon strokeWidth={1.5} className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AnimatedIcon icon={Mail01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
              Email Notifications
            </CardTitle>
            {saving && <Loading03Icon strokeWidth={1.5} className="size-3.5 animate-spin text-primary ml-auto" />}
          </div>
          <CardDescription>Manage notification recipients and test delivery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {EMAIL_TYPES.map(({ id, label, testId }, index) => {
            const recipients = config?.recipients[id] || []
            const tState = testId ? (testState[testId] || 'idle') : null
            const isEnabled = enabled[id] ?? true

            return (
              <div key={id}>
                {index > 0 && <Separator className="my-0" />}
                <div className="flex items-center gap-3 py-3">
                  {/* Enable/disable switch */}
                  <Switch
                    size="sm"
                    checked={isEnabled}
                    onCheckedChange={() => toggleEnabled(id)}
                  />

                  {/* Name */}
                  <Label className="w-36 shrink-0 text-sm font-normal">{label}</Label>

                  {/* Recipient badges */}
                  <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                    {recipients.map(email => (
                      <Badge key={email} variant="secondary" className="gap-1 pr-1">
                        {email}
                        <button
                          onClick={() => removeRecipient(id, email)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                        >
                          <AnimatedIcon icon={Cancel01Icon} strokeWidth={1.5} className="size-3" />
                        </button>
                      </Badge>
                    ))}

                    {addingFor === id ? (
                      <div className="inline-flex items-center gap-1">
                        <Input
                          autoFocus
                          placeholder="email@..."
                          value={newEmails[id] || ''}
                          onChange={e => setNewEmails(prev => ({ ...prev, [id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addRecipient(id)
                            if (e.key === 'Escape') setAddingFor(null)
                          }}
                          onBlur={() => { if (!(newEmails[id] || '').trim()) setAddingFor(null) }}
                          className="h-7 w-40 text-xs"
                        />
                        <Button size="icon-xs" variant="ghost" onClick={() => addRecipient(id)}>
                          <AnimatedIcon icon={Tick02Icon} strokeWidth={1.5} className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setAddingFor(id)}
                        className="text-muted-foreground"
                      >
                        <AnimatedIcon icon={PlusSignIcon} strokeWidth={1.5} className="size-3" />
                      </Button>
                    )}
                  </div>

                  {/* Test button */}
                  {testId && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => sendTest(testId)}
                      disabled={tState !== 'idle' || (cooldown[testId] || 0) > 0}
                      className="shrink-0"
                    >
                      {tState === 'sending' ? (
                        <Loading03Icon strokeWidth={1.5} className="size-3 animate-spin" />
                      ) : (cooldown[testId] || 0) > 0 ? (
                        <AnimatedIcon icon={Tick02Icon} strokeWidth={1.5} className="size-3 text-emerald-400" noStroke />
                      ) : (
                        <AnimatedIcon icon={Mail01Icon} strokeWidth={1.5} className="size-3" />
                      )}
                      {tState === 'sending' ? 'Test' : (cooldown[testId] || 0) > 0 ? `${cooldown[testId]}s` : 'Test'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── System Jobs (static) ────────────────────────────────────────────────────

const systemJobs = [
  { id: 'backup', label: 'GitHub Backup', schedule: 'Daily 3:00 AM', cron: '0 3 * * *', enabled: true },
  { id: 'heartbeat', label: 'Heartbeat Check', schedule: 'Every 30 min', cron: '*/30 * * * *', enabled: true },
  { id: 'stats', label: 'Stats Polling', schedule: 'Every 60s', cron: '* * * * *', enabled: true },
  { id: 'logrotate', label: 'Log Rotation', schedule: 'Daily midnight', cron: '0 0 * * *', enabled: true },
]

// ─── Cron Jobs Tab ───────────────────────────────────────────────────────────

function CronJobsTab({ cronJobs, cronLoading, onAdd, onDelete }: {
  cronJobs: CronJob[]
  cronLoading: boolean
  onAdd: (line: string) => void
  onDelete: (line: string) => void
}) {
  const [newLine, setNewLine] = useState('')
  const [open, setOpen] = useState(false)
  const [cronEnabled, setCronEnabled] = useState<Record<string, boolean>>({})
  const [sysEnabled, setSysEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    systemJobs.forEach(j => { init[j.id] = j.enabled })
    return init
  })

  useEffect(() => {
    const init: Record<string, boolean> = {}
    cronJobs.forEach(j => { init[j.id] = true })
    setCronEnabled(init)
  }, [cronJobs])

  const toggleSystem = (id: string) => {
    setSysEnabled(prev => {
      const next = { ...prev, [id]: !prev[id] }
      const job = systemJobs.find(j => j.id === id)
      toast.success(`${job?.label || id} ${next[id] ? 'enabled' : 'disabled'}`)
      return next
    })
  }

  const toggleCron = (id: string) => {
    setCronEnabled(prev => {
      const next = { ...prev, [id]: !prev[id] }
      const job = cronJobs.find(j => j.id === id)
      toast.success(`${job?.name || id} ${next[id] ? 'enabled' : 'disabled'}`)
      return next
    })
  }

  if (cronLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loading03Icon strokeWidth={1.5} className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${tokens.colors.borderSubtle}` }}>
          <div className="flex items-center gap-2">
            <AnimatedIcon icon={Clock01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Cron Jobs</span>
            <Badge variant="secondary" className="ml-1">{systemJobs.length + cronJobs.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <AnimatedIcon icon={PlusSignIcon} strokeWidth={1.5} className="size-3.5" />
            Add
          </Button>
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: tokens.colors.borderSubtle }}>
                <TableHead className="w-14 h-8" style={tokens.typography.label}>On</TableHead>
                <TableHead className="h-8" style={tokens.typography.label}>Job</TableHead>
                <TableHead className="h-8" style={tokens.typography.label}>Schedule</TableHead>
                <TableHead className="h-8" style={tokens.typography.label}>Cron</TableHead>
                <TableHead className="w-10 h-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* SYSTEM group */}
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-2 px-4">
                  <span style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary }}>SYSTEM</span>
                </TableCell>
              </TableRow>
              {systemJobs.map(job => (
                <TableRow key={job.id} style={{ borderColor: tokens.colors.borderSubtle }}>
                  <TableCell className="px-4">
                    <Switch
                      size="sm"
                      checked={sysEnabled[job.id] ?? job.enabled}
                      onCheckedChange={() => toggleSystem(job.id)}
                    />
                  </TableCell>
                  <TableCell style={tokens.typography.body}>{job.label}</TableCell>
                  <TableCell style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>{job.schedule}</TableCell>
                  <TableCell>
                    <code style={{ fontSize: 12, fontFamily: 'JetBrains Mono, SF Mono, monospace', color: tokens.colors.textQuaternary }}>{job.cron}</code>
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}

              {/* SCHEDULED group */}
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-2 px-4" style={{ borderTop: `1px solid ${tokens.colors.borderSubtle}` }}>
                  <span style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary }}>SCHEDULED</span>
                </TableCell>
              </TableRow>
              {cronJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                    No scheduled jobs
                  </TableCell>
                </TableRow>
              ) : (
                cronJobs.map(job => {
                  const rawSchedule = job.raw.split(/\s+/).slice(0, 5).join(' ')
                  return (
                    <TableRow key={job.id} style={{ borderColor: tokens.colors.borderSubtle }}>
                      <TableCell className="px-4">
                        <Switch
                          size="sm"
                          checked={cronEnabled[job.id] ?? true}
                          onCheckedChange={() => toggleCron(job.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground truncate max-w-[300px] block">{job.name}</span>
                      </TableCell>
                      <TableCell style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>{job.schedule}</TableCell>
                      <TableCell>
                        <code style={{ fontSize: 12, fontFamily: 'JetBrains Mono, SF Mono, monospace', color: tokens.colors.textQuaternary }}>{rawSchedule}</code>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            onDelete(job.raw)
                            toast.success(`Deleted ${job.name}`)
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <AnimatedIcon icon={Delete02Icon} strokeWidth={1.5} className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: Card view */}
        <div className="md:hidden">
          {/* System jobs */}
          <div className="px-4 py-2">
            <span style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary }}>SYSTEM</span>
          </div>
          {systemJobs.map(job => (
            <div key={job.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${tokens.colors.borderSubtle}` }}>
              <Switch
                size="sm"
                checked={sysEnabled[job.id] ?? job.enabled}
                onCheckedChange={() => toggleSystem(job.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{job.label}</p>
                <p className="text-xs text-muted-foreground">{job.schedule}</p>
              </div>
            </div>
          ))}
          {/* Scheduled jobs */}
          <div className="px-4 py-2" style={{ borderTop: `1px solid ${tokens.colors.borderSubtle}` }}>
            <span style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary }}>SCHEDULED</span>
          </div>
          {cronJobs.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">No scheduled jobs</p>
          ) : (
            cronJobs.map(job => {
              const rawSchedule = job.raw.split(/\s+/).slice(0, 5).join(' ')
              return (
                <div key={job.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${tokens.colors.borderSubtle}` }}>
                  <Switch
                    size="sm"
                    checked={cronEnabled[job.id] ?? true}
                    onCheckedChange={() => toggleCron(job.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{job.name}</p>
                    <p className="text-xs text-muted-foreground">{job.schedule} · <code className="font-mono">{rawSchedule}</code></p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      onDelete(job.raw)
                      toast.success(`Deleted ${job.name}`)
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <AnimatedIcon icon={Delete02Icon} strokeWidth={1.5} className="size-3" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Add Cron Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cron Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="* * * * * /path/to/command"
              value={newLine}
              onChange={(e) => setNewLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newLine.trim()) {
                  onAdd(newLine.trim())
                  setNewLine('')
                  setOpen(false)
                  toast.success('Cron job added')
                }
              }}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Format: minute hour day month weekday command</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (newLine.trim()) {
                  onAdd(newLine.trim())
                  setNewLine('')
                  setOpen(false)
                  toast.success('Cron job added')
                }
              }}
              disabled={!newLine.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Security Tab ────────────────────────────────────────────────────────────

function SecurityTab() {
  const [vars, setVars] = useState<Record<string, string>>({})
  const [varsLoading, setVarsLoading] = useState(true)
  const [status, setStatus] = useState<SecurityStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    profileApi.getEnvVars().then(v => { setVars(v); setVarsLoading(false) }).catch(() => setVarsLoading(false))
    profileApi.getSecurityStatus().then(s => { setStatus(s); setStatusLoading(false) }).catch(() => setStatusLoading(false))
  }, [])

  const copyToClipboard = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${key} copied to clipboard`),
      () => toast.error('Failed to copy')
    )
  }

  const dangerActions = [
    { id: 'rotate-token', label: 'Rotate Auth Token', description: 'Generate a new auth token. Requires service restart.', icon: Key01Icon },
    { id: 'clear-debug', label: 'Clear Debug Logs', description: 'Clear the server debug log file.', icon: Bug01Icon },
    { id: 'clear-inbox', label: 'Clear Inbox History', description: 'Delete all processed inbox analysis files.', icon: InboxIcon },
  ]

  const executeAction = async (id: string) => {
    setActionLoading(true)
    try {
      let result: { success?: boolean; error?: string; message?: string; cleared?: number }
      if (id === 'rotate-token') result = await profileApi.rotateToken()
      else if (id === 'clear-debug') result = await profileApi.clearDebugLogs()
      else result = await profileApi.clearInbox()

      if (result.error) {
        toast.error(`Error: ${result.error}`)
      } else {
        const msg = result.message || (id === 'clear-inbox' ? `Cleared ${result.cleared} files` : 'Done')
        toast.success(msg)
      }
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  const services = status ? [
    { name: 'Gmail SMTP', connected: status.smtp.connected, detail: status.smtp.account || '' },
    { name: 'Gmail IMAP', connected: status.imap.connected, detail: '' },
    { name: 'Gemini AI', connected: status.gemini.connected, detail: '' },
    { name: 'Google Calendar', connected: status.calendar.connected, detail: '' },
    { name: 'Telegram', connected: status.telegram.connected, detail: status.telegram.username ? `@${status.telegram.username}` : '' },
    { name: 'GitHub', connected: status.github.connected, detail: '' },
  ] : []

  return (
    <div className="max-w-3xl space-y-4">
      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AnimatedIcon icon={Key01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
            API Keys & Secrets
            <Badge variant="secondary" className="ml-1">{Object.keys(vars).length}</Badge>
          </CardTitle>
          <CardDescription>Environment variables configured on the server. Values are masked.</CardDescription>
        </CardHeader>
        <CardContent>
          {varsLoading ? (
            <div className="flex justify-center py-6">
              <Loading03Icon strokeWidth={1.5} className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(vars).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No environment variables found</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(vars).map(([key, masked]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <Label className="sm:w-52 shrink-0 font-mono text-xs">{key}</Label>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      type="password"
                      value={masked}
                      readOnly
                      className="flex-1 font-mono text-xs h-8"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(key, masked)}
                      className="shrink-0"
                    >
                      <AnimatedIcon icon={Copy01Icon} strokeWidth={1.5} className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AnimatedIcon icon={ShieldKeyIcon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
            Connected Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loading03Icon strokeWidth={1.5} className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Testing connections...</span>
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(s => (
                  <div key={s.name} className="flex items-center gap-2.5 py-1.5">
                    <span className="text-sm text-foreground flex-1">{s.name}</span>
                    {s.detail && <span className="text-xs text-muted-foreground truncate max-w-[140px]">{s.detail}</span>}
                    <Badge variant={s.connected ? 'default' : 'destructive'}>
                      {s.connected ? 'Connected' : 'Offline'}
                    </Badge>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AnimatedIcon icon={ShieldKeyIcon} strokeWidth={1.5} className="size-3.5" />
                Auth: {status.auth.method}
                <span className="text-xs">(user: {status.auth.user})</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Alert variant="destructive">
        <AnimatedIcon icon={Alert02Icon} strokeWidth={1.5} className="size-4" />
        <AlertTitle>Danger Zone</AlertTitle>
        <AlertDescription>
          <p className="mb-3">These actions are irreversible. Proceed with caution.</p>
          <div className="space-y-2">
            {dangerActions.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <a.icon className="size-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmAction(a.id)}
                >
                  Execute
                </Button>
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {dangerActions.find(a => a.id === confirmAction)?.label.toLowerCase()}? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={actionLoading}
            >
              {actionLoading && <Loading03Icon strokeWidth={1.5} className="size-3.5 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


// ─── Memory Tab ──────────────────────────────────────────────────────────────

function MemoryTab() {
  const [memory, setMemory] = useState<MemoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    profileApi.getMemory().then(m => { setMemory(m); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const regenerate = async () => {
    setRegenerating(true)
    try {
      const result = await profileApi.regenerateMemory()
      if ('error' in result) {
        toast.error(`Failed: ${(result as any).error}`)
      } else {
        setMemory(result)
        toast.success('Memory regenerated')
      }
    } catch {
      toast.error('Regeneration failed')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading03Icon strokeWidth={1.5} className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!memory?.content) {
    return (
      <div className="max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <AnimatedIcon icon={ArtificialIntelligence01Icon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No memory file generated yet.</p>
            <Button onClick={regenerate} disabled={regenerating}>
              {regenerating ? <Loading03Icon strokeWidth={1.5} className="size-4 animate-spin" /> : <AnimatedIcon icon={RotateClockwiseIcon} strokeWidth={1.5} className="size-4" />}
              Generate Memory
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AnimatedIcon icon={ArtificialIntelligence01Icon} strokeWidth={1.5} className="size-4 text-muted-foreground" />
              Weekly Memory
            </CardTitle>
            <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
              {regenerating ? <Loading03Icon strokeWidth={1.5} className="size-3.5 animate-spin" /> : <AnimatedIcon icon={RotateClockwiseIcon} strokeWidth={1.5} className="size-3.5" />}
              Regenerate
            </Button>
          </div>
          {memory.generatedAt && (
            <CardDescription>
              Generated {new Date(memory.generatedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-medium prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-p:text-muted-foreground prose-li:text-muted-foreground">
            <ReactMarkdown>{memory.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Files Tab ──────────────────────────────────────────────────────────────

interface WorkspaceFile { name: string; size: number; mtime: number }
interface UploadStatus { name: string; status: 'uploading' | 'done' | 'error'; error?: string }
interface FolderInfo { key: string; label: string; dir?: string; files: WorkspaceFile[]; loading: boolean }

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const fileCardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' },
  }),
}

function FilesTab() {
  const [folders, setFolders] = useState<FolderInfo[]>([
    { key: 'files', label: 'files', dir: '', files: [], loading: true },
    { key: 'memory', label: 'memory', dir: 'memory', files: [], loading: true },
  ])
  const [rootFiles, setRootFiles] = useState<WorkspaceFile[]>([])
  const [rootLoading, setRootLoading] = useState(true)
  const [currentDir, setCurrentDir] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadStatus[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFolder = useCallback((key: string, dir: string) => {
    const url = dir ? `${API_BASE_URL}/api/files?dir=${dir}` : `${API_BASE_URL}/api/files`
    fetch(url).then(r => r.ok ? r.json() : [])
      .then(data => {
        setFolders(prev => prev.map(f => f.key === key ? { ...f, files: data, loading: false } : f))
      })
      .catch(() => {
        setFolders(prev => prev.map(f => f.key === key ? { ...f, loading: false } : f))
      })
  }, [])

  const loadRootFiles = useCallback(() => {
    fetch(`${API_BASE_URL}/api/profile`).then(r => r.ok ? r.json() : [])
      .then((data: { file: string; modified: string }[]) => {
        const mapped: WorkspaceFile[] = data.map(d => ({
          name: d.file,
          size: 0,
          mtime: new Date(d.modified).getTime(),
        }))
        setRootFiles(mapped)
        setRootLoading(false)
      })
      .catch(() => setRootLoading(false))
  }, [])

  useEffect(() => {
    folders.forEach(f => loadFolder(f.key, f.dir || ''))
    loadRootFiles()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reloadCurrentFolder = useCallback(() => {
    if (currentDir) {
      const folder = folders.find(f => f.key === currentDir)
      if (folder) loadFolder(folder.key, folder.dir || '')
    } else {
      folders.forEach(f => loadFolder(f.key, f.dir || ''))
      loadRootFiles()
    }
  }, [currentDir, folders, loadFolder, loadRootFiles])

  const uploadFile = async (file: File) => {
    setUploads(prev => [...prev, { name: file.name, status: 'uploading' }])
    try {
      const res = await fetch(`${API_BASE_URL}/api/files`, {
        method: 'POST',
        headers: { 'x-upload-token': TOKEN, 'x-file-name': file.name },
        body: file,
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'done' } : u))
      setTimeout(reloadCurrentFolder, 500)
    } catch (e: any) {
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', error: e.message } : u))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [reloadCurrentFolder]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(uploadFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isLoading = folders.some(f => f.loading) || rootLoading

  if (isLoading && !currentDir) return (
    <div className="flex items-center justify-center py-20">
      <Loading03Icon className="h-6 w-6 animate-spin text-[var(--text-3)]" strokeWidth={1.5} />
    </div>
  )

  const activeFolderData = currentDir ? folders.find(f => f.key === currentDir) : null

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      {currentDir && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDir(null)}
            className="flex items-center gap-1.5 text-[13px] transition-colors duration-150 hover:text-[var(--accent)]"
            style={{ color: 'var(--text-3)' }}
          >
            <ArrowLeft01Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            All folders
          </button>
          <ArrowRight01Icon className="h-3 w-3" strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
          <span className="text-[13px]" style={{ color: 'var(--text-1)' }}>{currentDir}/</span>
        </div>
      )}

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="px-6 py-8 text-center cursor-pointer transition-all duration-150"
        style={{
          borderRadius: '10px',
          border: dragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
          background: dragOver ? 'var(--accent-subtle)' : 'transparent',
        }}
      >
        <div className="flex justify-center mb-2"><AnimatedIcon icon={Upload02Icon} strokeWidth={1.5} className="h-5 w-5" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-3)' }} /></div>
        <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>{dragOver ? 'Drop files here' : 'Drag & drop files, or click to browse'}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>Up to 200 MB per file</p>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Upload status */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {uploads.map((u, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px] px-2 py-1.5">
                {u.status === 'uploading' && <Loading03Icon className="h-4 w-4 animate-spin text-[var(--accent)] shrink-0" strokeWidth={1.5} />}
                {u.status === 'done' && <CheckmarkCircle02Icon className="h-4 w-4 text-emerald-400/80 shrink-0" strokeWidth={1.5} />}
                {u.status === 'error' && <Alert02Icon className="h-4 w-4 text-rose-400/80 shrink-0" strokeWidth={1.5} />}
                <span className="truncate text-[var(--text-2)]">{u.name}</span>
                {u.error && <span className="text-[12px] text-rose-400/80">Error {u.error}</span>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {!currentDir ? (
          <motion.div
            key="root"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Folder cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {folders.map((folder, i) => {
                const latestMtime = folder.files.length > 0 ? Math.max(...folder.files.map(f => f.mtime)) : 0
                const totalSize = folder.files.reduce((sum, f) => sum + f.size, 0)
                return (
                  <motion.div
                    key={folder.key}
                    custom={i}
                    variants={fileCardVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Card
                      className="cursor-pointer transition-all duration-150 hover:border-[var(--accent)]/30"
                      style={{ background: 'var(--surface)' }}
                      onClick={() => setCurrentDir(folder.key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center w-9 h-9 rounded-md"
                              style={{ background: 'var(--accent-subtle)' }}
                            >
                              <Folder01Icon className="h-4.5 w-4.5" strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                              <p className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>
                                {folder.label}/
                              </p>
                              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                                {folder.loading ? '...' : (
                                  <>
                                    {folder.files.length} file{folder.files.length !== 1 ? 's' : ''}
                                    {totalSize > 0 && ` · ${formatFileSize(totalSize)}`}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <ArrowRight01Icon className="h-4 w-4 mt-1" strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
                        </div>
                        {latestMtime > 0 && (
                          <p className="text-[11px] mt-3 pl-12" style={{ color: 'var(--text-3)' }}>
                            Updated {relativeDate(latestMtime)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {/* Root .md files */}
            {rootFiles.length > 0 && (
              <div>
                <Card>
                  <CardContent className="p-0">
                    {rootFiles.map((f, i) => (
                      <motion.div
                        key={f.name}
                        custom={i}
                        variants={fileCardVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
                        style={{ borderBottom: i < rootFiles.length - 1 ? '1px solid var(--divider)' : 'none' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AnimatedIcon icon={Note01Icon} strokeWidth={1.5} className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                          <div className="min-w-0">
                            <p className="text-[13px] truncate" style={{ color: 'var(--text-1)' }}>{f.name}</p>
                            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{formatFileDate(f.mtime)}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={currentDir}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            {activeFolderData?.loading ? (
              <div className="flex items-center justify-center py-16">
                <Loading03Icon className="h-5 w-5 animate-spin text-[var(--text-3)]" strokeWidth={1.5} />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {(!activeFolderData?.files.length) ? (
                    <p className="text-[13px] text-[var(--text-3)] text-center py-12">No files in this folder</p>
                  ) : (
                    <div>
                      {activeFolderData.files.map((f, i) => (
                        <motion.div
                          key={f.name}
                          custom={i}
                          variants={fileCardVariants}
                          initial="hidden"
                          animate="visible"
                          className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
                          style={{ borderBottom: i < activeFolderData.files.length - 1 ? '1px solid var(--divider)' : 'none' }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AnimatedIcon icon={Note01Icon} strokeWidth={1.5} className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                            <div className="min-w-0">
                              <p className="text-[13px] truncate" style={{ color: 'var(--text-1)' }}>{f.name}</p>
                              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{formatFileSize(f.size)} · {formatFileDate(f.mtime)}</p>
                            </div>
                          </div>
                          <a
                            href={`${API_BASE_URL}/api/files/${encodeURIComponent(f.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150"
                            title="Download"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AnimatedIcon icon={Download02Icon} strokeWidth={1.5} className="h-4 w-4" />
                          </a>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Profile Page ───────────────────────────────────────────────────────

export default function ProfilePage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [cronLoading, setCronLoading] = useState(false)
  const [cronLoaded, setCronLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (activeTab === 'cron' && !cronLoaded && !cronLoading) {
      setCronLoading(true)
      lifeApi.getData().then(d => {
        setCronJobs(d.cronJobs)
        setCronLoading(false)
        setCronLoaded(true)
      }).catch(() => setCronLoading(false))
    }
  }, [activeTab, cronLoaded, cronLoading])

  const addCron = async (line: string) => {
    const result = await lifeApi.cronAction('add', line)
    setCronJobs(result.cronJobs)
  }

  const deleteCron = async (line: string) => {
    const result = await lifeApi.cronAction('delete', line)
    setCronJobs(result.cronJobs)
  }

  return (
    <div className="min-h-full max-w-7xl mx-auto px-4 md:px-8 pt-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border px-5 md:px-6 pt-2 pb-0">
          <div className="overflow-x-auto scrollbar-hide -mx-5 px-5 md:-mx-6 md:px-6">
            <TabsList variant="line" className="w-max">
              <TabsTrigger value="general" className="whitespace-nowrap">General</TabsTrigger>
              <TabsTrigger value="notifications" className="whitespace-nowrap">Notifications</TabsTrigger>
              <TabsTrigger value="cron" className="whitespace-nowrap">Cron Jobs</TabsTrigger>
              <TabsTrigger value="security" className="whitespace-nowrap">Security</TabsTrigger>
              <TabsTrigger value="memory" className="whitespace-nowrap">Memory</TabsTrigger>
              <TabsTrigger value="files" className="whitespace-nowrap">Files</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="general">
          <motion.div key="general" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="px-5 md:px-6 py-6">
            <GeneralTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications">
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="px-5 md:px-6 py-6">
            <NotificationsTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="cron">
          <motion.div key="cron" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="px-5 md:px-6 py-6">
            <CronJobsTab cronJobs={cronJobs} cronLoading={cronLoading} onAdd={addCron} onDelete={deleteCron} />
          </motion.div>
        </TabsContent>

        <TabsContent value="security">
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="px-5 md:px-6 py-6">
            <SecurityTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="memory">
          <motion.div key="memory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="px-5 md:px-6 py-6">
            <MemoryTab />
          </motion.div>
        </TabsContent>

        <TabsContent value="files">
          <motion.div key="files" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="px-5 md:px-6 py-6">
            <FilesTab />
          </motion.div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
