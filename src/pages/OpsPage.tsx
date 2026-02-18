import { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TextMorph } from 'torph/react'
import { opsApi, type Task, type SystemInfo } from '../services/opsApi'
import { Loader2, RotateCcw, Trash2, Check, X, ArrowDownToLine, Sparkles, ToggleLeft, ToggleRight, Send, ChevronLeft } from 'lucide-react'
import { TerminalIcon } from '../components/ui/terminal-icon'

// --- Helpers ---
function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatFullDate(ts: string): string {
  return new Date(ts).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type FilterTab = 'all' | 'done' | 'failed'

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

  const statusColor: Record<string, string> = {
    running: '#0A84FF',
    done: '#30D158',
    failed: '#FF453A',
    queued: 'rgba(255,255,255,0.30)',
    cancelled: 'rgba(255,255,255,0.30)',
  }

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logContent])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-5">
        {/* Status + time row */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-block h-2 w-2 rounded-full shrink-0${task.status === 'running' ? ' animate-pulse' : ''}`}
            style={{ background: statusColor[task.status] || statusColor.queued }}
          />
          <TextMorph as="span" className="inline-flex text-[13px] font-medium capitalize" style={{ color: statusColor[task.status] || 'rgba(255,255,255,0.30)' }}>
            {task.status}
          </TextMorph>
          <span className="text-[13px] text-white/30">&middot;</span>
          <span className="text-[13px] text-white/30 tabular-nums">{formatFullDate(task.created)}</span>
        </div>

        {/* Title */}
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white">
          {task.title}
        </h2>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-3 flex-wrap text-[14px] text-white/55">
          {task.service && <span>{task.service}</span>}
          {costVal > 0 && <span className="text-amber-400 tabular-nums">${costVal.toFixed(4)}</span>}
          {(task.tokensIn != null && task.tokensIn > 0) && (
            <span>{(task.tokensIn / 1000).toFixed(1)}K in</span>
          )}
          {(task.tokensOut != null && task.tokensOut > 0) && (
            <span>{(task.tokensOut / 1000).toFixed(1)}K out</span>
          )}
          {modelNames.map(name => (
            <span key={name} className="bg-[#1C1C1E] rounded-lg px-2.5 py-1 text-[14px] text-white/55">
              {name === 'jm-direct' ? 'manual' : name}
            </span>
          ))}
          {task.result?.includes('[deployed]') && (
            <span className="text-emerald-400 text-[13px]">deployed</span>
          )}
          {task.result?.includes('[not deployed]') && (
            <span className="text-white/30 text-[13px]">not deployed</span>
          )}
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-6 py-4 border-t border-white/[0.08]" style={{ background: 'rgba(0, 0, 0, 0.15)' }}>
        {logLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        ) : logNotFound ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-white/30">No log file found for this task.</p>
          </div>
        ) : (
          <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'rgba(34, 197, 94, 0.8)' }}>
            {logContent}
            <div ref={bottomRef} />
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-3 border-t border-white/[0.08] flex items-center gap-2">
        {task.result && (
          <p className="text-[13px] truncate flex-1 min-w-0 text-white/30">{task.result}</p>
        )}
        <button
          onClick={(e) => onDelete(e, task.id)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors shrink-0 text-white/30 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]"
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
  const [quickTaskFocused, setQuickTaskFocused] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([])
  const toastIdRef = useRef(0)

  // Log panel state
  const [logContent, setLogContent] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [logNotFound, setLogNotFound] = useState(false)
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const placeholderSuggestions = [
    'Fix the navbar layout...',
    'Deploy to production...',
    'Update API endpoints...',
    'Run database migration...',
    'Check error logs...',
  ]

  useEffect(() => {
    if (quickTaskFocused || quickTaskOpen) return
    const interval = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % placeholderSuggestions.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [quickTaskFocused, quickTaskOpen])

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
    if (filter === 'done') result = result.filter(t => t.status === 'done')
    else if (filter === 'failed') result = result.filter(t => t.status === 'failed' || t.status === 'cancelled')
    return result.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [tasks, filter])

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

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
          height: 'calc(100vh - 52px)',
          background: '#000',
        }}
      >
        {/* Left Panel — 380px */}
        <div
          className={`shrink-0 flex flex-col md:w-[380px] ${selectedTask ? 'hidden md:flex' : 'flex'}`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.08)', height: '100%' }}
        >
          {/* System stats — single line */}
          {systemInfo && (
            <div className="shrink-0 px-5 pt-3 pb-2">
              <div className="text-[11px] text-white/30 tabular-nums">
                CPU <TextMorph as="span" className="inline-flex text-[11px] text-white/30 tabular-nums">{`${systemInfo.cpu}%`}</TextMorph>{' '}&middot;{' '}
                Mem <TextMorph as="span" className="inline-flex text-[11px] text-white/30 tabular-nums">{`${systemInfo.mem}%`}</TextMorph>{' '}&middot;{' '}
                Disk <TextMorph as="span" className="inline-flex text-[11px] text-white/30 tabular-nums">{`${systemInfo.disk}%`}</TextMorph>{' '}&middot;{' '}
                Up <TextMorph as="span" className="inline-flex text-[11px] text-white/30 tabular-nums">{formatUptime(systemInfo.uptime)}</TextMorph>{' '}&middot;{' '}
                <span className="text-amber-400"><AnimatedNumber value={totalCost} prefix="$" decimals={2} /></span>
                <button onClick={handleResetCosts} title="Reset costs" className="ml-1 hover:text-amber-400 transition-colors duration-150 text-white/30 align-middle">
                  <RotateCcw className="h-2.5 w-2.5 inline" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Task bar */}
          <div className="shrink-0 px-5 pb-3">
            <button
              onClick={() => setQuickTaskOpen(!quickTaskOpen)}
              className="w-full flex items-center gap-2.5 bg-[#1C1C1E] rounded-[10px] px-3.5 py-2.5 text-left transition-colors hover:bg-[#2C2C2E]"
            >
              <TerminalIcon size={16} className="text-white/40" />
              <TextMorph as="span" className="inline-flex text-[14px] text-white/40">{placeholderSuggestions[placeholderIndex]}</TextMorph>
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
                  <div className="pt-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBatchMode(!batchMode)}
                        className="flex items-center gap-1 text-[11px] transition-colors duration-150 text-white/55"
                      >
                        {batchMode
                          ? <ToggleRight className="h-3.5 w-3.5 text-[#0A84FF]" />
                          : <ToggleLeft className="h-3.5 w-3.5 text-white/30" />
                        }
                        <span className={batchMode ? 'text-[#0A84FF]' : ''}>Batch</span>
                      </button>
                      {batchMode && <span className="text-[10px] text-white/30">Separate with ---</span>}
                    </div>
                    <textarea
                      value={quickTaskText}
                      onChange={e => setQuickTaskText(e.target.value)}
                      rows={batchMode ? 6 : 2}
                      placeholder={quickTaskFocused ? 'Enter a task...' : placeholderSuggestions[placeholderIndex]}
                      className="w-full bg-[#1C1C1E] rounded-[10px] px-3.5 py-2.5 text-[13px] text-white font-mono placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#0A84FF]/50 resize-none transition-all duration-150"
                      onFocus={() => setQuickTaskFocused(true)}
                      onBlur={() => setQuickTaskFocused(false)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault()
                          handleQuickTask()
                        }
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30">
                        {batchMode && batchCount > 0 ? `${batchCount} task${batchCount !== 1 ? 's' : ''}` : '\u2318+Enter'}
                      </span>
                      <button
                        onClick={handleQuickTask}
                        disabled={!quickTaskText.trim() || quickTaskState === 'loading'}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A84FF] text-white text-[13px] font-medium hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                      >
                        {quickTaskState === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> :
                         quickTaskState === 'success' ? <Check className="h-3 w-3" /> :
                         <Send className="h-3 w-3" />}
                        {batchMode && batchCount > 1 ? `Queue ${batchCount}` : 'Queue'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter chips */}
          <div className="shrink-0 px-5 pb-2.5 flex items-center gap-1.5">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-[13px] font-medium px-3 py-1 rounded-full transition-all duration-200"
                style={filter === f.key
                  ? { background: 'rgba(255,255,255,0.10)', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.30)' }
                }
              >
                {f.label}{' '}<TextMorph as="span" className="inline-flex">{f.count > 0 ? `${f.count}` : ''}</TextMorph>
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={handleTaskCleanup}
              disabled={cleanupState === 'loading'}
              title="Clean up stale tasks"
              className="relative hover:text-white/55 transition-colors duration-150 p-0.5 disabled:opacity-50 text-white/30"
            >
              {cleanupState === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {cleanupCount !== null && cleanupCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] rounded-full h-3 min-w-[12px] flex items-center justify-center px-0.5 animate-fade-in-fast text-white bg-[#0A84FF]">
                  {cleanupCount}
                </span>
              )}
            </button>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <TerminalIcon size={24} className="mb-3 text-white/[0.08]" isAnimated={false} />
                <p className="text-[13px] text-white/30">
                  {tasks.length === 0 ? 'No tasks yet' : 'No matches'}
                </p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isSelected = selectedTaskId === task.id
                const dotColor: Record<string, string> = {
                  running: '#0A84FF',
                  done: '#30D158',
                  failed: '#FF453A',
                  queued: 'rgba(255,255,255,0.30)',
                  cancelled: 'rgba(255,255,255,0.30)',
                }
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="w-full text-left flex items-center gap-3 py-3 px-5 transition-colors duration-100 border-b border-white/[0.08]"
                    style={{
                      background: isSelected ? 'rgba(10, 132, 255, 0.12)' : 'transparent',
                    }}
                  >
                    <span className="text-[13px] tabular-nums shrink-0 w-10 text-white/30">
                      {formatTime(task.created)}
                    </span>
                    <span
                      className="text-[14px] truncate flex-1 min-w-0"
                      style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)', fontWeight: isSelected ? 500 : 400 }}
                    >
                      {task.title}
                    </span>
                    <span
                      className={`inline-block h-2 w-2 rounded-full shrink-0${task.status === 'running' ? ' animate-pulse' : ''}`}
                      style={{ background: dotColor[task.status] || dotColor.queued }}
                    />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Panel */}
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
                  <TerminalIcon size={40} className="mx-auto mb-3" style={{ opacity: 0.20, color: '#fff' }} isAnimated={false} />
                  <p className="text-[14px] text-white/30">Select a task to view details</p>
                </div>
              </div>

              {/* Git + Version footer */}
              <div className="shrink-0 px-6 py-3 border-t border-white/[0.08] flex items-center gap-3 flex-wrap">
                {gitStatus && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {gitStatus.clean ? (
                      <span className="text-emerald-400">Clean</span>
                    ) : (
                      <>
                        <span className="text-amber-400">{gitStatus.changedFiles} file{gitStatus.changedFiles !== 1 ? 's' : ''}</span>
                        <span className="text-white/30">&middot;</span>
                        <button
                          onClick={handleGitCommit}
                          disabled={commitState === 'loading'}
                          className="hover:text-[#0A84FF] transition-colors duration-150 disabled:opacity-50 text-white/55"
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
                    <span className="text-white/30">&middot;</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full${oclawVersion.upToDate ? '' : ' animate-pulse'}`} style={{ background: oclawVersion.upToDate ? '#30D158' : 'rgba(255,255,255,0.30)' }} />
                      <span className="text-white/30">v{oclawVersion.current.replace(/^v/, '')}</span>
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

      {/* Mobile Detail Overlay */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 flex flex-col"
            style={{ background: '#000', top: 52 }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/[0.08]">
              <button
                onClick={() => setSelectedTaskId(null)}
                className="flex items-center gap-1 text-[13px] text-[#0A84FF]"
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
