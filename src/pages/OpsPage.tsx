import { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { TextMorph } from 'torph/react'
import { toast } from 'sonner'
import { opsApi, type Task, type SystemInfo } from '../services/opsApi'
import { Loader2, Trash2, Check, X, ArrowDownToLine, Sparkles, Send, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { TerminalIcon } from '../components/ui/terminal-icon'
import { tokens } from '../designTokens'
import { Skeleton } from '../components/ui/skeleton'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Switch } from '../components/ui/switch'
import { Label } from '../components/ui/label'
import { ScrollArea } from '../components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { TwoPanelLayout } from '../components/TwoPanelLayout'
import { DetailEmptyState } from '../components/DetailEmptyState'
import { LogViewer } from '../components/LogViewer'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

// --- Helpers ---

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(task: Task): string | null {
  const start = task.startTime || task.created
  const end = task.endTime || (task.status === 'running' ? new Date().toISOString() : null)
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return null
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function getStatColor(value: number) {
  if (value < 60) return { stroke: tokens.colors.green, fill: 'rgba(52,211,153,0.10)' }
  if (value < 80) return { stroke: tokens.colors.orange, fill: 'rgba(251,191,36,0.10)' }
  return { stroke: tokens.colors.red, fill: 'rgba(248,113,113,0.10)' }
}

const statusDotColor: Record<string, string> = {
  running: tokens.colors.accent,
  done: tokens.colors.green,
  failed: tokens.colors.red,
  queued: tokens.colors.textQuaternary,
  cancelled: tokens.colors.textQuaternary,
}

function getDayKey(ts: string): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000)

  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (diff === 0) return `Today — ${monthDay}`
  if (diff === 1) return `Yesterday — ${monthDay}`
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  return `${weekday} — ${monthDay}`
}

interface DayGroup {
  key: string
  label: string
  tasks: Task[]
  doneCount: number
  failedCount: number
  runningCount: number
  hasRunning: boolean
}

function groupTasksByDay(tasks: Task[]): DayGroup[] {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    const key = getDayKey(t.created)
    const arr = map.get(key)
    if (arr) arr.push(t)
    else map.set(key, [t])
  }
  const groups: DayGroup[] = []
  for (const [key, dayTasks] of map) {
    const doneCount = dayTasks.filter(t => t.status === 'done').length
    const failedCount = dayTasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length
    const runningCount = dayTasks.filter(t => t.status === 'running' || t.status === 'queued').length
    groups.push({
      key,
      label: getDayLabel(key),
      tasks: dayTasks,
      doneCount,
      failedCount,
      runningCount,
      hasRunning: runningCount > 0,
    })
  }
  // Sort newest day first
  groups.sort((a, b) => b.key.localeCompare(a.key))
  return groups
}

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

type FilterTab = 'all' | 'running' | 'done' | 'failed'

// --- Animated Counter ---

function AnimatedNumber({ value, prefix = '', decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const diff = value - start
    if (diff === 0) return
    const duration = 250
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setDisplay(start + diff * (1 - Math.pow(1 - p, 3)))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    prev.current = value
  }, [value])

  return <>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>
}

// --- Stagger Variants ---

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.02 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0 },
}

// --- Compact Stat Card ---

function CompactStatCard({
  label,
  value,
  history,
}: {
  label: string
  value: number
  history: { value: number }[]
}) {
  const colors = getStatColor(value)

  return (
    <Card className="p-3 gap-0" style={{ height: 72 }}>
      <div className="flex items-center justify-between">
        <span style={tokens.typography.label} className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-[15px] font-medium" style={{ color: colors.stroke }}>
          <AnimatedNumber value={value} />%
        </span>
      </div>
      {history.length > 1 && (
        <div className="mt-auto">
          <ResponsiveContainer width="100%" height={28}>
            <AreaChart data={history}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.stroke}
                fill={colors.fill}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// --- Task Detail (Right Panel) ---

function TaskDetail({
  task,
  logContent,
  logLoading,
  logNotFound,
  onKill,
  onDelete,
}: {
  task: Task
  logContent: string | null
  logLoading: boolean
  logNotFound: boolean
  onKill: (id: string) => void
  onDelete: (id: string) => void
}) {
  const isRunning = task.status === 'running'
  const duration = formatDuration(task)
  const costVal = parseFloat(task.cost || '0')
  const modelNames = task.model
    ? task.model.split(',').map(m => m.trim()).filter(Boolean).map(m => m.split('/').pop() || m)
    : []

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 py-5" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}>
        <h2 className="leading-tight mb-2" style={{ ...tokens.typography.title, color: tokens.colors.textPrimary }}>
          {task.title}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {isRunning && (
            <Badge variant="default" className="bg-info/10 text-info border-info/20 text-[11px]">running</Badge>
          )}
          {task.status === 'done' && (
            <Badge variant="default" className="bg-success/10 text-success border-success/20 text-[11px]">done</Badge>
          )}
          {(task.status === 'failed' || task.status === 'cancelled') && (
            <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20 text-[11px]">{task.status}</Badge>
          )}
          <span className="text-[11px] tabular-nums" style={{ color: tokens.colors.textTertiary }}>
            {formatTime(task.created)}
          </span>
          {duration && (
            <span className="text-[11px] tabular-nums" style={{ color: tokens.colors.textTertiary }}>{duration}</span>
          )}
          {costVal > 0 && (
            <span className="text-[11px] text-amber-400 tabular-nums">${costVal.toFixed(4)}</span>
          )}
        </div>
        {modelNames.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {modelNames.map(name => (
              <Badge key={name} variant="secondary" className="text-[10px]">
                {name === 'jm-direct' ? 'manual' : name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <LogViewer
          content={logContent}
          loading={logLoading}
          notFound={logNotFound}
          autoScroll={isRunning}
          maxHeight="calc(100vh - 280px)"
        />
        {task.result && (
          <p className="text-[11px] mt-3 truncate" style={{ color: tokens.colors.textTertiary }}>
            {task.result}
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="shrink-0 px-6 py-3 flex items-center gap-2" style={{ borderTop: '1px solid ' + tokens.colors.borderSubtle }}>
        {isRunning && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            onClick={() => onKill(task.id)}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Kill
          </Button>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="hover:text-rose-400"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// --- Main Component ---

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Stat history (rolling 20 points)
  const [cpuHistory, setCpuHistory] = useState<{ value: number }[]>([])
  const [memHistory, setMemHistory] = useState<{ value: number }[]>([])

  // Git & version
  const [gitStatus, setGitStatus] = useState<{ changedFiles: number; clean: boolean } | null>(null)
  const [commitState, setCommitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [oclawVersion, setOclawVersion] = useState<{ current: string; latest: string; upToDate: boolean } | null>(null)
  const [oclawUpdateState, setOclawUpdateState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Quick task
  const [quickTaskText, setQuickTaskText] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [quickTaskState, setQuickTaskState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const lastSubmitRef = useRef<{ text: string; time: number } | null>(null)

  // Cleanup
  const [cleanupState, setCleanupState] = useState<'idle' | 'loading'>('idle')
  const [cleanupCount, setCleanupCount] = useState<number | null>(null)

  // Confirm dialogs
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [killConfirmId, setKillConfirmId] = useState<string | null>(null)

  // Log
  const [logContent, setLogContent] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [logNotFound, setLogNotFound] = useState(false)
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mobile sheet
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  // Day group expand/collapse
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set([getTodayKey()]))

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

  // Update stat history when systemInfo changes
  useEffect(() => {
    if (!systemInfo) return
    setCpuHistory(prev => [...prev.slice(-19), { value: systemInfo.cpu }])
    setMemHistory(prev => [...prev.slice(-19), { value: systemInfo.mem }])
  }, [systemInfo])

  // Log fetching for selected task
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
      logIntervalRef.current = setInterval(() => fetchLog(task.id), 2000)
    }
    return () => {
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current)
        logIntervalRef.current = null
      }
    }
  }, [selectedTaskId, tasks])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]
    if (filter === 'done') result = result.filter(t => t.status === 'done')
    else if (filter === 'failed') result = result.filter(t => t.status === 'failed' || t.status === 'cancelled')
    else if (filter === 'running') result = result.filter(t => t.status === 'running' || t.status === 'queued')
    return result.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [tasks, filter])

  // Grouped by day
  const dayGroups = useMemo(() => groupTasksByDay(filteredTasks), [filteredTasks])

  // Counts
  const doneCount = tasks.filter(t => t.status === 'done').length
  const failedCount = tasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length
  const runningCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

  // --- Handlers ---

  const handleDeleteTask = async (taskId: string) => {
    const updated = await opsApi.deleteTask(taskId)
    setTasks(updated)
    if (selectedTaskId === taskId) setSelectedTaskId(null)
    setDeleteConfirmId(null)
  }

  const handleKillTask = async (taskId: string) => {
    try {
      const result = await opsApi.killTask(taskId)
      if (result.ok) {
        toast.success('Task killed')
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'cancelled' as const, endTime: new Date().toISOString(), result: 'Killed from dashboard' } : t
        ))
      } else {
        toast.error(result.error || 'Failed to kill task')
      }
    } catch {
      toast.error('Failed to kill task')
    }
    setKillConfirmId(null)
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
    if (!text || quickTaskState === 'loading') return

    const now = Date.now()
    if (lastSubmitRef.current && lastSubmitRef.current.text === text && now - lastSubmitRef.current.time < 10000) {
      toast.error('Duplicate — same task was just queued')
      return
    }

    setQuickTaskState('loading')
    lastSubmitRef.current = { text, time: now }

    const safetyTimeout = setTimeout(() => {
      setQuickTaskState(prev => prev === 'loading' ? 'idle' : prev)
    }, 3000)

    try {
      if (batchMode) {
        const prompts = text.split(/\n---\n/).map(s => s.trim()).filter(Boolean)
        const result = await opsApi.batchTasks(prompts)
        if (result.ok) {
          toast.success(`${result.count} task${result.count !== 1 ? 's' : ''} queued`)
          setQuickTaskText('')
          loadData()
        } else {
          toast.error(result.error || 'Failed to queue')
        }
      } else {
        const result = await opsApi.queueTask(text)
        if (result.ok) {
          toast.success('Task queued')
          setQuickTaskText('')
          loadData()
        } else {
          toast.error(result.error || 'Failed to queue')
        }
      }
      clearTimeout(safetyTimeout)
      setQuickTaskState('success')
    } catch {
      clearTimeout(safetyTimeout)
      setQuickTaskState('error')
      toast.error('Failed to queue task')
    }
    setTimeout(() => setQuickTaskState('idle'), 2000)
  }

  const batchCount = batchMode ? quickTaskText.trim().split(/\n---\n/).map(s => s.trim()).filter(Boolean).length : 0

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    // Open sheet on mobile
    setMobileSheetOpen(true)
  }

  // --- Loading State ---

  if (loading) {
    return (
      <div
        className="flex"
        style={{ height: 'calc(100vh - 48px)', background: tokens.colors.bg }}
      >
        <div className="w-[40%] max-w-[480px] shrink-0 p-4 space-y-3" style={{ borderRight: '1px solid ' + tokens.colors.borderSubtle }}>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[72px] rounded-xl" />
            <Skeleton className="h-[72px] rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[52px] w-full rounded-lg" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
          <Skeleton className="h-[300px] w-full rounded-md" />
        </div>
      </div>
    )
  }

  // --- Left Panel ---

  const leftPanel = (
    <>
      {/* Stat widgets — compact row */}
      {systemInfo && (
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <CompactStatCard label="CPU" value={systemInfo.cpu} history={cpuHistory} />
            <CompactStatCard label="Memory" value={systemInfo.mem} history={memHistory} />
          </div>
        </div>
      )}

      {/* Task input — sticky */}
      <div className="shrink-0 px-4 py-2">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={quickTaskText}
              onChange={e => setQuickTaskText(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleQuickTask()
                }
              }}
              rows={batchMode ? 4 : 1}
              placeholder="Enter a task..."
              className="text-[13px] font-mono resize-none flex-1"
            />
            <Button
              onClick={handleQuickTask}
              disabled={!quickTaskText.trim() || quickTaskState === 'loading'}
              className="shrink-0 self-end"
              size="sm"
            >
              {quickTaskState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> :
               quickTaskState === 'success' ? <Check className="h-4 w-4" /> :
               <Send className="h-4 w-4" />}
              {batchMode && batchCount > 1 ? `Queue ${batchCount}` : 'Queue'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              size="sm"
              checked={batchMode}
              onCheckedChange={setBatchMode}
              id="batch-mode"
            />
            <Label htmlFor="batch-mode" className="text-[10px] text-muted-foreground cursor-pointer" style={batchMode ? { color: tokens.colors.accent } : undefined}>Batch</Label>
            {batchMode && <span className="text-[10px] text-muted-foreground">Separate with ---</span>}
          </div>
        </div>
      </div>

      {/* Filter tabs — sticky below input */}
      <div className="shrink-0 px-4 pb-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'all' as const, label: 'All', count: tasks.length },
            { key: 'running' as const, label: 'Running', count: runningCount },
            { key: 'done' as const, label: 'Done', count: doneCount },
            { key: 'failed' as const, label: 'Failed', count: failedCount },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all duration-200"
              style={filter === f.key
                ? { ...tokens.typography.caption, background: tokens.colors.border, color: tokens.colors.textPrimary }
                : { ...tokens.typography.caption, color: tokens.colors.textQuaternary }
              }
            >
              {f.label}
              {f.count > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-[16px] min-w-[16px] justify-center">
                  {f.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleTaskCleanup}
          disabled={cleanupState === 'loading'}
          title="Clean up stale tasks"
          className="relative text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {cleanupState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {cleanupCount !== null && cleanupCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-1 -right-1 text-[8px] rounded-full h-3 min-w-[12px] flex items-center justify-center px-0.5 text-white"
              style={{ background: tokens.colors.accent }}
            >
              {cleanupCount}
            </motion.span>
          )}
        </button>
      </div>

      {/* Task list — scrollable, grouped by day */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <TerminalIcon size={32} className="mb-3" style={{ color: tokens.colors.textQuaternary, opacity: 0.4 }} isAnimated={false} />
            <p className="text-[13px]" style={{ color: tokens.colors.textQuaternary }}>
              {tasks.length === 0 ? 'No tasks yet' : 'No matches'}
            </p>
          </div>
        ) : (
          <div key={filter}>
            {dayGroups.map(group => {
              const isExpanded = expandedDays.has(group.key) || group.hasRunning

              const toggleDay = () => {
                setExpandedDays(prev => {
                  const next = new Set(prev)
                  if (next.has(group.key)) next.delete(group.key)
                  else next.add(group.key)
                  return next
                })
              }

              // Summary text
              const allDone = group.doneCount === group.tasks.length && group.failedCount === 0
              let summaryParts: string[] = []
              if (allDone) {
                summaryParts = [`${group.tasks.length} tasks`, 'all done']
              } else {
                summaryParts = [`${group.tasks.length} tasks`]
                if (group.doneCount > 0) summaryParts.push(`${group.doneCount} done`)
                if (group.failedCount > 0) summaryParts.push(`${group.failedCount} failed`)
                if (group.runningCount > 0) summaryParts.push(`${group.runningCount} running`)
              }
              const summaryText = summaryParts.join(' · ')

              return (
                <div key={group.key}>
                  {/* Day header — sticky */}
                  <div
                    onClick={toggleDay}
                    className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
                    style={{
                      background: tokens.colors.bg,
                      borderBottom: '1px solid ' + tokens.colors.borderSubtle,
                    }}
                  >
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: tokens.colors.textTertiary }} />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: tokens.colors.textTertiary }} />
                    }
                    <span style={{ ...tokens.typography.title, color: tokens.colors.textSecondary }} className="flex-1 truncate">
                      {group.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] shrink-0">
                      {group.tasks.length}
                    </Badge>
                  </div>

                  {/* Summary line when collapsed */}
                  {!isExpanded && (
                    <div
                      className="flex items-center gap-1.5 px-4 py-1.5"
                      style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}
                    >
                      {allDone && (
                        <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: tokens.colors.green }} />
                      )}
                      <span style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>
                        {summaryText}
                      </span>
                    </div>
                  )}

                  {/* Task rows with animated expand/collapse */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ overflow: 'hidden' }}
                      >
                        {group.tasks.map(task => {
                          const isActive = selectedTaskId === task.id
                          const dotColor = statusDotColor[task.status] || statusDotColor.queued
                          const isRunning = task.status === 'running'
                          const duration = formatDuration(task)
                          const modelNames = task.model
                            ? task.model.split(',').map(m => m.trim()).filter(Boolean).map(m => m.split('/').pop() || m)
                            : []

                          return (
                            <div
                              key={task.id}
                              onClick={() => selectTask(task.id)}
                              className={`flex items-start gap-3 px-4 cursor-pointer transition-colors hover:bg-[#1C1C1E] ${
                                isActive ? 'border-l-[3px] border-l-[#818CF8]' : 'border-l-[3px] border-l-transparent'
                              }`}
                              style={{
                                borderBottom: '1px solid ' + tokens.colors.borderSubtle,
                                background: isActive ? tokens.colors.overlay : undefined,
                                minHeight: 52,
                                paddingTop: 10,
                                paddingBottom: 10,
                              }}
                            >
                              {/* Status dot */}
                              <div className="shrink-0 mt-[7px]">
                                {isRunning ? (
                                  <motion.div
                                    className="rounded-full"
                                    style={{ width: 8, height: 8, background: dotColor }}
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  />
                                ) : (
                                  <div className="rounded-full" style={{ width: 8, height: 8, background: dotColor }} />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className="truncate"
                                  style={{ ...tokens.typography.body, color: isActive ? tokens.colors.textPrimary : 'rgba(255,255,255,0.85)' }}
                                >
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {modelNames.map(name => (
                                    <Badge key={name} variant="secondary" className="text-[10px] px-1 py-0">
                                      {name === 'jm-direct' ? 'manual' : name}
                                    </Badge>
                                  ))}
                                  {isRunning && (
                                    <Badge variant="default" className="bg-info/10 text-info border-info/20 text-[10px] px-1 py-0">running</Badge>
                                  )}
                                  {task.status === 'done' && (
                                    <Badge variant="default" className="bg-success/10 text-success border-success/20 text-[10px] px-1 py-0">done</Badge>
                                  )}
                                  {(task.status === 'failed' || task.status === 'cancelled') && (
                                    <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1 py-0">{task.status}</Badge>
                                  )}
                                  <span className="text-[11px] tabular-nums" style={{ color: tokens.colors.textQuaternary }}>
                                    {formatTime(task.created)}
                                  </span>
                                  {duration && (
                                    <span className="text-[11px] tabular-nums" style={{ color: tokens.colors.textQuaternary }}>{duration}</span>
                                  )}
                                </div>
                              </div>

                              {/* Kill button for running tasks */}
                              {isRunning && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 self-center"
                                  onClick={(e) => { e.stopPropagation(); setKillConfirmId(task.id) }}
                                >
                                  <X className="h-3 w-3 mr-0.5" /> Kill
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div
        className="shrink-0 px-4 py-2.5 flex items-center gap-3 flex-wrap"
        style={{ ...tokens.typography.caption, borderTop: '1px solid ' + tokens.colors.borderSubtle }}
      >
        {gitStatus && (
          <div className="flex items-center gap-1.5">
            {gitStatus.clean ? (
              <span className="text-emerald-400">Clean</span>
            ) : (
              <>
                <span className="text-amber-400">{gitStatus.changedFiles} file{gitStatus.changedFiles !== 1 ? 's' : ''}</span>
                <span className="text-muted-foreground">&middot;</span>
                <button
                  onClick={handleGitCommit}
                  disabled={commitState === 'loading'}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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
            <span className="text-muted-foreground">&middot;</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full${oclawVersion.upToDate ? '' : ' animate-pulse'}`}
                style={{ background: oclawVersion.upToDate ? tokens.colors.green : tokens.colors.textQuaternary }}
              />
              <span className="text-muted-foreground">v{oclawVersion.current.replace(/^v/, '')}</span>
              {!oclawVersion.upToDate && (
                <button
                  onClick={handleOclawUpdate}
                  disabled={oclawUpdateState === 'loading'}
                  title={`Update to ${oclawVersion.latest}`}
                  className="text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
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
        {systemInfo && (
          <>
            <span className="text-muted-foreground">&middot;</span>
            <span className="text-muted-foreground tabular-nums">
              Up <TextMorph as="span" className="inline-flex text-muted-foreground tabular-nums">
                {(() => {
                  const d = Math.floor(systemInfo.uptime / 86400)
                  const h = Math.floor((systemInfo.uptime % 86400) / 3600)
                  const m = Math.floor((systemInfo.uptime % 3600) / 60)
                  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
                })()}
              </TextMorph>
            </span>
          </>
        )}
      </div>
    </>
  )

  // --- Right Panel ---

  const rightPanel = (
    <AnimatePresence mode="wait">
      {selectedTask ? (
        <motion.div
          key={selectedTask.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          <TaskDetail
            task={selectedTask}
            logContent={logContent}
            logLoading={logLoading}
            logNotFound={logNotFound}
            onKill={(id) => setKillConfirmId(id)}
            onDelete={(id) => setDeleteConfirmId(id)}
          />
        </motion.div>
      ) : (
        <DetailEmptyState
          icon={<TerminalIcon size={48} isAnimated={false} />}
          text="Select a task"
        />
      )}
    </AnimatePresence>
  )

  return (
    <>
      <TwoPanelLayout left={leftPanel} right={rightPanel} />

      {/* Mobile bottom Sheet */}
      <Sheet open={mobileSheetOpen && !!selectedTask} onOpenChange={(open) => {
        setMobileSheetOpen(open)
        if (!open) setSelectedTaskId(null)
      }}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="md:hidden h-[85vh] rounded-t-2xl p-0 flex flex-col"
          style={{ background: tokens.colors.bg }}
        >
          {selectedTask && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{selectedTask.title}</SheetTitle>
                <SheetDescription>Task detail</SheetDescription>
              </SheetHeader>
              <TaskDetail
                task={selectedTask}
                logContent={logContent}
                logLoading={logLoading}
                logNotFound={logNotFound}
                onKill={(id) => setKillConfirmId(id)}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Task Confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the task. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteConfirmId && handleDeleteTask(deleteConfirmId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kill Task Confirm */}
      <AlertDialog open={!!killConfirmId} onOpenChange={(open) => { if (!open) setKillConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kill task</AlertDialogTitle>
            <AlertDialogDescription>This will forcefully terminate the running task.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => killConfirmId && handleKillTask(killConfirmId)}>Kill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
