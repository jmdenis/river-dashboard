import { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { opsApi, type Task, type SystemInfo } from '../services/opsApi'
import { Loader2, RotateCcw, ChevronDown, ChevronRight, Trash2, Check, X, ArrowDownToLine, Sparkles, Terminal, ToggleLeft, ToggleRight, Send, ChevronLeft } from 'lucide-react'

// --- Helpers ---
function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(ts: string): string {
  return new Date(ts).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type FilterTab = 'all' | 'running' | 'done' | 'failed'

// --- Animated counter ---
function AnimatedNumber({ value, prefix = '', decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
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

  return <>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>
}

// --- Status dot (compact, no label) ---
function StatusDot({ status }: { status: string }) {
  const dotColor: Record<string, string> = {
    running: 'var(--accent)',
    done: 'var(--success)',
    failed: 'var(--destructive)',
    queued: 'var(--text-3)',
    cancelled: 'var(--text-3)',
  }
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full shrink-0${status === 'running' ? ' animate-pulse' : ''}`}
      style={{ background: dotColor[status] || dotColor.queued }}
    />
  )
}

// --- Task Detail (Right Panel) ---
function TaskDetail({ task, onDelete, logContent, logLoading, logNotFound }: {
  task: Task
  onDelete: (e: React.MouseEvent, id: string) => void
  logContent: string | null
  logLoading: boolean
  logNotFound: boolean
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const costVal = parseFloat(task.cost || '0')
  const modelNames = task.model
    ? task.model.split(',').map(m => m.trim()).filter(Boolean).map(m => m.split('/').pop() || m)
    : []

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logContent])

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header */}
      <div className="shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-2">
          <StatusDot status={task.status} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] leading-snug" style={{ fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
              {task.title}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{task.status}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>&middot;</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{formatFullDate(task.created)}</span>
              {task.service && (
                <>
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>&middot;</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{task.service}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {costVal > 0 && (
            <span className="text-[11px] text-amber-400 tabular-nums">${costVal.toFixed(4)}</span>
          )}
          {(task.tokensIn != null && task.tokensIn > 0) && (
            <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>{(task.tokensIn / 1000).toFixed(1)}K in</span>
          )}
          {(task.tokensOut != null && task.tokensOut > 0) && (
            <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>{(task.tokensOut / 1000).toFixed(1)}K out</span>
          )}
          {modelNames.map(name => (
            <span key={name} className="text-[11px]" style={{ color: 'var(--text-2)' }}>
              {name === 'jm-direct' ? 'manual' : name}
            </span>
          ))}
          {task.result?.includes('[deployed]') && (
            <span className="text-[11px] text-emerald-400">deployed</span>
          )}
          {task.result?.includes('[not deployed]') && (
            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>not deployed</span>
          )}
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: 'rgba(0, 0, 0, 0.15)' }}>
        {logLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-3)' }} />
          </div>
        ) : logNotFound ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>No log file found for this task.</p>
          </div>
        ) : (
          <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>
            {logContent}
            <div ref={bottomRef} />
          </pre>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 px-6 py-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        {task.result && (
          <p className="text-[11px] truncate flex-1 min-w-0" style={{ color: 'var(--text-3)' }}>{task.result}</p>
        )}
        <button
          onClick={(e) => onDelete(e, task.id)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors shrink-0"
          style={{ color: 'var(--text-3)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  )
}


export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [gitStatus, setGitStatus] = useState<{ changedFiles: number; clean: boolean } | null>(null)
  const [commitState, setCommitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [oclawVersion, setOclawVersion] = useState<{ current: string; latest: string; upToDate: boolean } | null>(null)
  const [oclawUpdateState, setOclawUpdateState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cleanupState, setCleanupState] = useState<'idle' | 'loading'>('idle')
  const [cleanupCount, setCleanupCount] = useState<number | null>(null)
  const [quickTaskOpen, setQuickTaskOpen] = useState(false)
  const [quickTaskText, setQuickTaskText] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [quickTaskState, setQuickTaskState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])
  const toastIdRef = useRef(0)

  // Log panel state (inline in right panel)
  const [logContent, setLogContent] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [logNotFound, setLogNotFound] = useState(false)
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  const loadData = () => {
    Promise.all([opsApi.getTasks(), opsApi.getSystemInfo(), opsApi.getGitStatus()])
      .then(([tasksData, sysData, gitData]) => {
        setTasks(tasksData)
        setSystemInfo(sysData)
        setGitStatus(gitData)
      })
      .catch((error) => console.error('Failed to load data:', error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    opsApi.getOpenClawVersion().then(setOclawVersion).catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch log for selected task
  const fetchLog = async (taskId: string) => {
    const result = await opsApi.getTaskLog(taskId)
    if (result) {
      setLogContent(result.content)
      setLogNotFound(false)
    } else {
      setLogNotFound(true)
    }
    setLogLoading(false)
  }

  useEffect(() => {
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current)
      logIntervalRef.current = null
    }

    if (!selectedTaskId) {
      setLogContent(null)
      setLogNotFound(false)
      return
    }

    const task = tasks.find(t => t.id === selectedTaskId)
    if (!task) return

    setLogLoading(true)
    fetchLog(task.id)

    if (task.status === 'running') {
      logIntervalRef.current = setInterval(() => fetchLog(task.id), 3000)
    }

    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current)
        logIntervalRef.current = null
      }
    }
  }, [selectedTaskId, tasks])

  const filteredTasks = useMemo(() => {
    let result = [...tasks]
    if (filter === 'running') result = result.filter(t => t.status === 'running' || t.status === 'queued')
    else if (filter === 'done') result = result.filter(t => t.status === 'done')
    else if (filter === 'failed') result = result.filter(t => t.status === 'failed' || t.status === 'cancelled')
    return result.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [tasks, filter])

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

  const runningCount = tasks.filter(t => t.status === 'running').length
  const queuedCount = tasks.filter(t => t.status === 'queued').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const failedCount = tasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length
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
    if (selectedTaskId === taskId) setSelectedTaskId(null)
  }

  const handleGitCommit = async () => {
    setCommitState('loading')
    try {
      const result = await opsApi.gitCommit()
      setCommitState(result.ok ? 'success' : 'error')
      if (result.ok) loadData()
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

  const handleQuickTask = async () => {
    const text = quickTaskText.trim()
    if (!text) return
    setQuickTaskState('loading')
    try {
      if (batchMode) {
        const prompts = text.split(/\n---\n/).map(s => s.trim()).filter(Boolean)
        const result = await opsApi.batchTasks(prompts)
        if (result.ok) {
          addToast(`${result.count} task${result.count !== 1 ? 's' : ''} queued`)
          setQuickTaskText('')
          loadData()
        } else {
          addToast(result.error || 'Failed to queue', 'error')
        }
      } else {
        const result = await opsApi.queueTask(text)
        if (result.ok) {
          addToast('Task queued')
          setQuickTaskText('')
          loadData()
        } else {
          addToast(result.error || 'Failed to queue', 'error')
        }
      }
      setQuickTaskState('success')
    } catch {
      setQuickTaskState('error')
      addToast('Failed to queue task', 'error')
    }
    setTimeout(() => setQuickTaskState('idle'), 2000)
  }

  const batchCount = batchMode ? quickTaskText.trim().split(/\n---\n/).map(s => s.trim()).filter(Boolean).length : 0

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
  }

  const filters: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: tasks.length },
    { key: 'running', label: 'Running', count: runningCount + queuedCount },
    { key: 'done', label: 'Done', count: doneCount },
    { key: 'failed', label: 'Failed', count: failedCount },
  ]

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-5 w-72 rounded-lg" />
        <div className="skeleton h-10 w-full rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full mb-2 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Full-bleed two-panel layout */}
      <div
        className="flex flex-col md:flex-row"
        style={{
          height: 'calc(100vh - 48px)',
          background: 'var(--bg-surface)',
        }}
      >
        {/* Left Panel — fixed 400px */}
        <div
          className={`shrink-0 flex flex-col md:w-[400px] ${selectedTask ? 'hidden md:flex' : 'flex'}`}
          style={{ borderRight: '1px solid var(--border)', height: '100%' }}
        >
          {/* Page title */}
          <div className="shrink-0 px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
              <h1 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>Ops</h1>
            </div>
          </div>

          {/* System stats compact row */}
          {systemInfo && (
            <div className="shrink-0 px-4 pb-1.5">
              <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--text-3)' }}>
                {[
                  { label: 'CPU', value: `${systemInfo.cpu}%`, warn: systemInfo.cpu > 80 },
                  { label: 'Mem', value: `${systemInfo.mem}%`, warn: systemInfo.mem > 80 },
                  { label: 'Disk', value: `${systemInfo.disk}%`, warn: systemInfo.disk > 90 },
                  { label: 'Up', value: formatUptime(systemInfo.uptime) },
                ].map((s, i) => (
                  <span key={s.label} className="flex items-center gap-1">
                    <span>{s.label}</span>
                    <span className={s.warn ? 'text-amber-400' : 'tabular-nums'}>{s.value}</span>
                    {i < 3 && <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>}
                  </span>
                ))}
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                <span className="flex items-center gap-1">
                  <span className="text-amber-400 tabular-nums"><AnimatedNumber value={totalCost} prefix="$" decimals={2} /></span>
                  <button onClick={handleResetCosts} title="Reset costs" className="hover:text-amber-400 transition-colors duration-150 p-0.5" style={{ color: 'var(--text-3)' }}>
                    <RotateCcw className="h-2 w-2" />
                  </button>
                </span>
              </div>
            </div>
          )}

          {/* Quick Task collapsed bar */}
          <div className="shrink-0 px-4 pb-1.5">
            <div className="rounded-lg border border-[var(--border)] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <button
                onClick={() => setQuickTaskOpen(!quickTaskOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150 text-left"
              >
                <Terminal className="h-3 w-3" style={{ color: 'var(--accent)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>Quick Task</span>
                {quickTaskOpen
                  ? <ChevronDown className="h-3 w-3 ml-auto" style={{ color: 'var(--text-3)' }} />
                  : <ChevronRight className="h-3 w-3 ml-auto" style={{ color: 'var(--text-3)' }} />
                }
              </button>
              <AnimatePresence>
                {quickTaskOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2.5 pt-0.5 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBatchMode(!batchMode)}
                          className="flex items-center gap-1 text-[10px] transition-colors duration-150"
                          style={{ color: 'var(--text-2)' }}
                        >
                          {batchMode
                            ? <ToggleRight className="h-3.5 w-3.5 text-[var(--accent)]" />
                            : <ToggleLeft className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
                          }
                          <span className={batchMode ? 'text-[var(--accent)]' : ''}>Batch</span>
                        </button>
                        {batchMode && <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>Separate with ---</span>}
                      </div>
                      <textarea
                        value={quickTaskText}
                        onChange={e => setQuickTaskText(e.target.value)}
                        rows={batchMode ? 6 : 2}
                        placeholder="Describe what to build..."
                        className="w-full bg-transparent border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-1)] font-mono placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] resize-none transition-all duration-150"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault()
                            handleQuickTask()
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>
                          {batchMode && batchCount > 0 ? `${batchCount} task${batchCount !== 1 ? 's' : ''}` : '\u2318+Enter'}
                        </span>
                        <button
                          onClick={handleQuickTask}
                          disabled={!quickTaskText.trim() || quickTaskState === 'loading'}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent)] text-white text-[11px] font-medium hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                        >
                          {quickTaskState === 'loading' ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> :
                           quickTaskState === 'success' ? <Check className="h-2.5 w-2.5" /> :
                           <Send className="h-2.5 w-2.5" />}
                          {batchMode && batchCount > 1 ? `Queue ${batchCount}` : 'Queue'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Running/Queued/Done counts on one line */}
          <div className="shrink-0 px-4 pb-1.5">
            <div className="flex items-center gap-2.5 text-[10px]">
              <span className="flex items-center gap-1">
                <span style={{ color: 'var(--text-3)' }}>Running</span>
                <span className={`tabular-nums text-[var(--accent)]${runningCount > 0 ? ' animate-pulse' : ''}`}>{runningCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <span style={{ color: 'var(--text-3)' }}>Queued</span>
                <span className="tabular-nums" style={{ color: 'var(--text-3)' }}>{queuedCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <span style={{ color: 'var(--text-3)' }}>Done</span>
                <span className="tabular-nums text-emerald-400">{doneCount}</span>
              </span>
              <span className="ml-auto">
                <button
                  onClick={handleTaskCleanup}
                  disabled={cleanupState === 'loading'}
                  title="Clean up stale tasks"
                  className="relative hover:text-[var(--accent)] transition-colors duration-150 p-0.5 disabled:opacity-50"
                  style={{ color: 'var(--text-3)' }}
                >
                  {cleanupState === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {cleanupCount !== null && cleanupCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-[8px] rounded-full h-3 min-w-[12px] flex items-center justify-center px-0.5 animate-fade-in-fast text-white" style={{ background: 'var(--accent)' }}>
                      {cleanupCount}
                    </span>
                  )}
                </button>
              </span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="shrink-0 px-4 pb-2">
            <div className="flex gap-0.5 rounded-lg p-[2px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-all duration-200 flex-1 justify-center"
                  style={filter === f.key
                    ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-1)' }
                    : { color: 'var(--text-3)' }
                  }
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className="text-[9px] tabular-nums" style={{ color: filter === f.key ? 'var(--text-2)' : 'var(--text-3)' }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable task list */}
          <div className="flex-1 overflow-y-auto" style={{ borderTop: '1px solid var(--border)' }}>
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Terminal className="h-6 w-6 mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                  {tasks.length === 0 ? 'No tasks yet' : 'No matches'}
                </p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="w-full text-left flex items-center gap-2.5 px-4 transition-colors duration-100"
                  style={{
                    minHeight: 44,
                    background: selectedTaskId === task.id ? 'var(--accent-subtle)' : 'transparent',
                    borderLeft: selectedTaskId === task.id ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-3)' }}>
                    {formatTime(task.created)}
                  </span>
                  <span
                    className="text-[13px] truncate flex-1 min-w-0"
                    style={{ color: selectedTaskId === task.id ? 'var(--text-1)' : 'var(--text-2)', fontWeight: selectedTaskId === task.id ? 500 : 400 }}
                  >
                    {task.title}
                  </span>
                  <StatusDot status={task.status} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel (desktop) */}
        <div className={`flex-1 min-w-0 ${selectedTask ? 'hidden md:flex' : 'hidden md:flex'} flex-col`}>
          {selectedTask ? (
            <TaskDetail
              task={selectedTask}
              onDelete={handleDeleteTask}
              logContent={logContent}
              logLoading={logLoading}
              logNotFound={logNotFound}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Empty state */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Terminal className="h-8 w-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.06)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>Select a task to view details</p>
                </div>
              </div>

              {/* Git + Version footer */}
              <div className="shrink-0 px-6 py-3 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
                {gitStatus && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {gitStatus.clean ? (
                      <span className="text-emerald-400">Clean</span>
                    ) : (
                      <>
                        <span className="text-amber-400">{gitStatus.changedFiles} file{gitStatus.changedFiles !== 1 ? 's' : ''}</span>
                        <span style={{ color: 'var(--text-3)' }}>·</span>
                        <button
                          onClick={handleGitCommit}
                          disabled={commitState === 'loading'}
                          className="hover:text-[var(--accent)] transition-colors duration-150 disabled:opacity-50"
                          style={{ color: 'var(--text-2)' }}
                        >
                          {commitState === 'loading' ? <Loader2 className="h-3 w-3 animate-spin inline" /> :
                           commitState === 'success' ? <span className="text-emerald-400">Committed</span> :
                           commitState === 'error' ? <span className="text-rose-400">Failed</span> :
                           <span>Commit</span>}
                        </button>
                      </>
                    )}
                  </div>
                )}
                {oclawVersion && (
                  <>
                    <span style={{ color: 'var(--text-3)' }}>·</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full${oclawVersion.upToDate ? '' : ' animate-pulse'}`} style={{ background: oclawVersion.upToDate ? 'var(--success)' : 'var(--text-3)' }} />
                      <span style={{ color: 'var(--text-3)' }}>v{oclawVersion.current.replace(/^v/, '')}</span>
                      {!oclawVersion.upToDate && (
                        <button
                          onClick={handleOclawUpdate}
                          disabled={oclawUpdateState === 'loading'}
                          title={`Update to ${oclawVersion.latest}`}
                          className="text-amber-400 hover:text-amber-300 transition-colors duration-150 p-0.5 disabled:opacity-50"
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
            </div>
          )}
        </div>
      </div>

      {/* Mobile Detail Overlay (< 768px) */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 flex flex-col"
            style={{ background: 'var(--bg-surface)', top: 48 }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div
              className="shrink-0 flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => setSelectedTaskId(null)}
                className="flex items-center gap-1 text-[13px]"
                style={{ color: 'var(--accent)' }}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TaskDetail
                task={selectedTask}
                onDelete={handleDeleteTask}
                logContent={logContent}
                logLoading={logLoading}
                logNotFound={logNotFound}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`px-4 py-2 rounded-md text-xs ${
                toast.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
