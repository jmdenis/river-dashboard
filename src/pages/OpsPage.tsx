import { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { opsApi, type Task, type SystemInfo, type InboxItem } from '../services/opsApi'
import { Loader2, RotateCcw, ChevronDown, ChevronRight, DollarSign, Trash2, Check, X, ArrowDownToLine, Sparkles, Clock, Inbox, ExternalLink } from 'lucide-react'
import TaskLogPanel from '../components/TaskLogPanel'

// --- Helpers ---
function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function getDateKey(ts: string): string {
  return new Date(ts).toISOString().split('T')[0]
}
function getDateLabel(dateStr: string): string {
  const todayKey = new Date().toISOString().split('T')[0]
  const y = new Date(); y.setDate(y.getDate() - 1)
  const yesterdayKey = y.toISOString().split('T')[0]
  if (dateStr === todayKey) return 'Today'
  if (dateStr === yesterdayKey) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface DayGroup { date: string; label: string; tasks: Task[]; totalCost: number }

// --- Animated counter ---
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const diff = value - start
    if (diff === 0) return
    const duration = 250
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + diff * eased)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    prev.current = value
  }, [value])

  return <>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}{suffix}</>
}

// --- Status badge ---
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: 'bg-violet-500/10 text-violet-400/80 animate-status-pulse',
    done: 'bg-emerald-500/10 text-emerald-400/80 animate-fade-in-fast',
    failed: 'bg-rose-500/10 text-rose-400/80',
    queued: 'bg-white/5 text-white/50',
    cancelled: 'bg-gray-500/10 text-gray-400/80',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${styles[status] || styles.queued}`}>
      {status}
    </span>
  )
}

// --- Deploy status badge ---
function DeployBadge({ result }: { result?: string }) {
  if (!result) return null
  if (result.includes('[deployed]')) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/80">deployed</span>
  }
  if (result.includes('[not deployed]')) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80">not deployed</span>
  }
  return null
}

// --- Model badge ---
function ModelBadge({ name }: { name: string }) {
  const isManual = name === 'jm-direct'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isManual ? 'bg-violet-500/15 text-violet-400/90' : 'bg-white/5 text-white/50'}`}>
      {isManual ? 'manual' : name}
    </span>
  )
}

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const [gitStatus, setGitStatus] = useState<{ changedFiles: number; clean: boolean } | null>(null)
  const [commitState, setCommitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [oclawVersion, setOclawVersion] = useState<{ current: string; latest: string; upToDate: boolean } | null>(null)
  const [oclawUpdateState, setOclawUpdateState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cleanupState, setCleanupState] = useState<'idle' | 'loading'>('idle')
  const [cleanupCount, setCleanupCount] = useState<number | null>(null)
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [expandedInbox, setExpandedInbox] = useState<string | null>(null)

  const loadData = () => {
    Promise.all([opsApi.getTasks(), opsApi.getSystemInfo(), opsApi.getGitStatus(), opsApi.getInboxRecent(20)])
      .then(([tasksData, sysData, gitData, inboxData]) => {
        setTasks(tasksData)
        setSystemInfo(sysData)
        setGitStatus(gitData)
        setInboxItems(inboxData)
      })
      .catch((error) => console.error('Failed to load data:', error))
      .finally(() => setLoading(false))
  }

  // Load OpenClaw version on mount (not on interval — it's slow)
  useEffect(() => {
    opsApi.getOpenClawVersion().then(setOclawVersion).catch(() => {})
  }, [])

  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (!initialized && tasks.length > 0) {
      setExpandedDays(new Set([new Date().toISOString().split('T')[0]]))
      setInitialized(true)
    }
  }, [tasks, initialized])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const dayGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    tasks.forEach(t => { const k = getDateKey(t.created); if (!groups[k]) groups[k] = []; groups[k].push(t) })
    return Object.entries(groups)
      .map(([date, dayTasks]): DayGroup => ({
        date,
        label: getDateLabel(date),
        tasks: dayTasks.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()),
        totalCost: dayTasks.reduce((s, t) => s + parseFloat(t.cost || '0'), 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [tasks])

  const toggleDay = (d: string) => {
    setExpandedDays(prev => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-5 w-72 rounded-lg" />
        <div>
          <div className="skeleton h-5 w-20 mb-4 rounded-xl" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full mb-2 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const runningCount = tasks.filter((t) => t.status === 'running').length
  const queuedCount = tasks.filter((t) => t.status === 'queued').length
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const totalCost = tasks.reduce((sum, t) => sum + parseFloat(t.cost || '0'), 0)

  const handleResetCosts = async () => {
    const updated = await opsApi.resetCosts()
    setTasks(updated)
  }

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    if (!window.confirm('Delete this task?')) return
    const updated = await opsApi.deleteTask(taskId)
    setTasks(updated)
  }

  const handleGitCommit = async () => {
    setCommitState('loading')
    try {
      const result = await opsApi.gitCommit()
      setCommitState(result.ok ? 'success' : 'error')
      if (result.ok) loadData() // refresh git status
    } catch {
      setCommitState('error')
    }
    setTimeout(() => setCommitState('idle'), 3000)
  }

  const handleOclawUpdate = async () => {
    setOclawUpdateState('loading')
    try {
      const result = await opsApi.updateOpenClaw()
      setOclawUpdateState(result.ok ? 'success' : 'error')
      if (result.ok) opsApi.getOpenClawVersion().then(setOclawVersion)
    } catch {
      setOclawUpdateState('error')
    }
    setTimeout(() => setOclawUpdateState('idle'), 3000)
  }

  const handleTaskCleanup = async () => {
    setCleanupState('loading')
    try {
      const result = await opsApi.cleanupTasks()
      setCleanupCount(result.cleaned)
      if (result.ok) loadData()
    } catch {
      setCleanupCount(0)
    }
    setCleanupState('idle')
    setTimeout(() => setCleanupCount(null), 3000)
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
  }

  return (
    <div className="space-y-4">
      {/* Compact status bar — system metrics */}
      {systemInfo && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 px-4 py-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            {[
              { label: 'CPU', value: `${systemInfo.cpu}%`, warn: systemInfo.cpu > 80 },
              { label: 'Mem', value: `${systemInfo.mem}%`, warn: systemInfo.mem > 80 },
              { label: 'Disk', value: `${systemInfo.disk}%`, warn: systemInfo.disk > 90 },
              { label: 'Up', value: formatUptime(systemInfo.uptime) },
            ].map((s, i) => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-white/40">
                <span className="text-white/20">{s.label}</span>
                <span className={s.warn ? 'text-amber-400/80' : 'text-white/60 tabular-nums'}>{s.value}</span>
                {i < 3 && <span className="text-white/10 ml-1.5">·</span>}
              </span>
            ))}
            <span className="text-white/10 ml-auto">·</span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="text-white/20">Cost</span>
              <span className="text-amber-400/70 tabular-nums"><AnimatedNumber value={totalCost} prefix="$" decimals={2} /></span>
              <button onClick={handleResetCosts} title="Reset costs" className="text-white/15 hover:text-amber-400/80 transition-colors duration-150 p-0.5">
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
            </span>
          </div>
        </motion.div>
      )}

      {/* Task counts + git + version — one compact row */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-1">
        {/* Task counts */}
        <div className="flex items-center gap-3 text-xs">
          {[
            { label: 'Running', value: runningCount, color: 'text-violet-400', pulse: runningCount > 0 },
            { label: 'Queued', value: queuedCount, color: 'text-white/50' },
            { label: 'Done', value: doneCount, color: 'text-emerald-400/80' },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className="text-white/25">{s.label}</span>
              <span className={`font-medium tabular-nums ${s.color} ${s.pulse ? 'animate-pulse' : ''}`}>{s.value}</span>
            </span>
          ))}
        </div>

        <span className="text-white/10">·</span>

        {/* Git status */}
        {gitStatus && (
          <div className="flex items-center gap-1.5 text-xs">
            {gitStatus.clean ? (
              <span className="text-emerald-400/70">Clean ✓</span>
            ) : (
              <>
                <span className="text-amber-400/70">{gitStatus.changedFiles} file{gitStatus.changedFiles !== 1 ? 's' : ''}</span>
                <span className="text-white/20">→</span>
                <button
                  onClick={handleGitCommit}
                  disabled={commitState === 'loading'}
                  className="text-white/40 hover:text-violet-400 transition-colors duration-150 disabled:opacity-50"
                >
                  {commitState === 'loading' ? <Loader2 className="h-3 w-3 animate-spin inline" /> :
                   commitState === 'success' ? <span className="text-emerald-400">Committed ✓</span> :
                   commitState === 'error' ? <span className="text-rose-400">Failed</span> :
                   <span>Commit</span>}
                </button>
              </>
            )}
          </div>
        )}

        {/* Version */}
        {oclawVersion && (
          <>
            <span className="text-white/10">·</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`h-1.5 w-1.5 rounded-full ${oclawVersion.upToDate ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-white/35">v{oclawVersion.current.replace(/^v/, '')}</span>
              {!oclawVersion.upToDate && (
                <button
                  onClick={handleOclawUpdate}
                  disabled={oclawUpdateState === 'loading'}
                  title={`Update to ${oclawVersion.latest}`}
                  className="text-amber-400/70 hover:text-amber-400 transition-colors duration-150 p-0.5 disabled:opacity-50"
                >
                  {oclawUpdateState === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> :
                   oclawUpdateState === 'success' ? <Check className="h-3 w-3 text-emerald-400" /> :
                   oclawUpdateState === 'error' ? <X className="h-3 w-3 text-rose-400" /> :
                   <ArrowDownToLine className="h-3 w-3" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Timeline</p>
          <button
            onClick={handleTaskCleanup}
            disabled={cleanupState === 'loading'}
            title="Clean up stale tasks"
            className="relative text-white/20 hover:text-violet-400 transition-colors duration-150 p-1 disabled:opacity-50"
          >
            {cleanupState === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {cleanupCount !== null && cleanupCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-violet-500 text-white text-[9px] font-medium rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 animate-fade-in-fast">
                {cleanupCount}
              </span>
            )}
          </button>
          {cleanupCount !== null && cleanupCount === 0 && (
            <span className="text-xs text-white/30">No stale tasks</span>
          )}
        </div>
        <div className="space-y-2">
          {dayGroups.length === 0 ? (
            <p className="text-sm text-white/20 text-center py-12">No tasks yet</p>
          ) : (
            dayGroups.map((group) => (
              <div key={group.date} className="rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
                <button onClick={() => toggleDay(group.date)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors duration-150 text-left">
                  <div className="flex items-center gap-3">
                    {expandedDays.has(group.date) ? <ChevronDown className="h-4 w-4 text-white/20 shrink-0" /> : <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />}
                    <span className="text-sm font-medium text-white/80">{group.label}</span>
                    <span className="text-xs text-white/25">{group.date}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span>{group.tasks.length} tasks</span>
                    {group.totalCost > 0 && <span className="flex items-center gap-1 text-amber-400/60"><DollarSign className="h-3 w-3" />{group.totalCost.toFixed(4)}</span>}
                  </div>
                </button>
                {expandedDays.has(group.date) && (
                  <motion.div
                    className="border-t border-white/[0.04]"
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                  >
                    {group.tasks.map((task) => {
                      const costVal = parseFloat(task.cost || '0')
                      const modelNames = task.model
                        ? task.model.split(',').map(m => m.trim()).filter(Boolean).map(m => m.split('/').pop() || m)
                        : []
                      return (
                        <motion.div
                          key={task.id}
                          className="group flex items-start gap-3 p-4 border-l-2 border-white/[0.04] ml-4 hover:bg-white/[0.03] cursor-pointer w-[calc(100%-1rem)] text-left transition-colors duration-150"
                          onClick={() => { setSelectedTask(task); setLogPanelOpen(true) }}
                          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } } }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs tabular-nums text-white/25">{formatTime(task.created)}</span>
                              <span className="text-sm font-medium text-white/80 truncate">{task.title}</span>
                              <StatusBadge status={task.status} />
                              <DeployBadge result={task.result} />
                              {modelNames.map((name) => (
                                <ModelBadge key={name} name={name} />
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
                              {task.service && <span>{task.service}</span>}
                              {costVal > 0 && <span className="text-amber-400/60">${costVal.toFixed(4)}</span>}
                              {(task.tokensIn != null && task.tokensIn > 0) && <span>{(task.tokensIn / 1000).toFixed(1)}K in</span>}
                              {(task.tokensOut != null && task.tokensOut > 0) && <span>{(task.tokensOut / 1000).toFixed(1)}K out</span>}
                            </div>
                            {task.result && <p className="text-xs text-white/20 mt-1 truncate">{task.result}</p>}
                          </div>
                          <button
                            onClick={(e) => handleDeleteTask(e, task.id)}
                            className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400/80 transition-all duration-150 p-1 shrink-0 mt-0.5"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Inbox */}
      {inboxItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="h-4 w-4 text-white/40" />
            <p className="text-xs uppercase tracking-widest text-white/40">Inbox</p>
            <span className="text-xs text-white/25">{inboxItems.length}</span>
          </div>
          <div className="space-y-1.5">
            {inboxItems.map((item) => {
              const a = item.analysis
              const rel = a?.relevance || { openclaw: 0, claude: 0, ai: 0, meta: 0, webdev: 0 }
              const hasProposal = !!a?.integrationProposal
              const isExpanded = expandedInbox === item.id
              const categoryEmojis: Record<string, string> = {
                'youtube-video': '\u{1F3AC}', 'tech-news': '\u{1F4F0}', 'ai-research': '\u{1F9EA}',
                'tool-update': '\u{1F527}', 'tutorial': '\u{1F4DA}', 'business': '\u{1F4BC}',
              }
              const emoji = categoryEmojis[a?.category || ''] || '\u{1F4E8}'
              const relDot = (v: number) => v > 7 ? 'bg-emerald-400' : v >= 4 ? 'bg-amber-400' : 'bg-white/20'

              return (
                <div key={item.id}>
                  <button
                    onClick={() => setExpandedInbox(isExpanded ? null : item.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors duration-150 ${
                      hasProposal
                        ? 'border-cyan-500/20 bg-cyan-500/[0.04] hover:bg-cyan-500/[0.07]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{emoji}</span>
                      <span className="text-sm text-white/80 truncate flex-1">{item.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                        hasProposal ? 'bg-cyan-500/15 text-cyan-400/90' : 'bg-white/5 text-white/40'
                      }`}>
                        {a?.category || 'other'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {Object.values(rel).map((v, i) => (
                          <span key={i} className={`h-1.5 w-1.5 rounded-full ${relDot(v)}`} />
                        ))}
                      </div>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-white/20 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />}
                    </div>
                    {!isExpanded && a?.summary && (
                      <p className="text-xs text-white/30 mt-1 truncate pl-6">{a.summary}</p>
                    )}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={`mx-2 p-4 rounded-b-xl border border-t-0 ${
                          hasProposal ? 'border-cyan-500/20 bg-cyan-500/[0.02]' : 'border-white/[0.06] bg-white/[0.015]'
                        }`}>
                          <p className="text-xs text-white/20 mb-2">
                            From: {item.from} &bull; {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-white/60 leading-relaxed">{a?.summary}</p>

                          {a?.keyTakeaways && a.keyTakeaways.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs uppercase tracking-wider text-white/30 mb-1.5">Key Takeaways</p>
                              <ul className="space-y-1">
                                {a.keyTakeaways.map((t, i) => (
                                  <li key={i} className="text-xs text-white/50 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-violet-400/50">
                                    {t}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {a?.integrationProposal && (
                            <div className="mt-3 p-3 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/10">
                              <p className="text-xs uppercase tracking-wider text-cyan-400/60 mb-1">Integration Proposal</p>
                              <p className="text-xs text-cyan-300/70 leading-relaxed">{a.integrationProposal}</p>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-3 flex-wrap">
                            {Object.entries(rel).map(([k, v]) => (
                              <span key={k} className="flex items-center gap-1 text-[10px] text-white/30">
                                <span className={`h-1.5 w-1.5 rounded-full ${relDot(v)}`} />
                                {k}: {v}
                              </span>
                            ))}
                          </div>

                          {a?.videoVerdict && (
                            <p className="text-xs text-white/30 mt-2 italic">{a.videoVerdict}</p>
                          )}

                          {item.urls && item.urls.length > 0 && (
                            <a
                              href={item.urls[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-violet-400/70 hover:text-violet-400 mt-2 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open link
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TaskLogPanel
        task={selectedTask}
        open={logPanelOpen}
        onOpenChange={setLogPanelOpen}
      />
    </div>
  )
}
