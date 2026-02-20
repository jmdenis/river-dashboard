import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { opsApi, type Task, type SystemInfo } from '../services/opsApi'
import { Loading03Icon, Delete02Icon, Tick02Icon, SentIcon, Copy01Icon, ArrowDown01Icon, ArrowRight01Icon, CheckmarkCircle02Icon, CircleIcon, Cancel01Icon, UnfoldMoreIcon } from 'hugeicons-react'
import { TerminalIcon } from '../components/ui/terminal-icon'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { tokens } from '../designTokens'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
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
import { PanelToolbar, ToolbarAction } from '../components/PanelToolbar'
import { LogViewer } from '../components/LogViewer'

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

const statusDotColor: Record<string, string> = {
  running: tokens.colors.accent,
  done: tokens.colors.green,
  failed: tokens.colors.red,
  queued: tokens.colors.textSecondary,
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

// Reverse sub-groups that share the same `created` timestamp within an already-sorted list.
function reverseTimestampBatches(tasks: Task[]): Task[] {
  const result: Task[] = []
  let i = 0
  while (i < tasks.length) {
    let j = i + 1
    while (j < tasks.length && tasks[j].created === tasks[i].created) j++
    if (j - i > 1) {
      for (let k = j - 1; k >= i; k--) result.push(tasks[k])
    } else {
      result.push(tasks[i])
    }
    i = j
  }
  return result
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
      tasks: reverseTimestampBatches(dayTasks),
      doneCount,
      failedCount,
      runningCount,
      hasRunning: runningCount > 0,
    })
  }
  groups.sort((a, b) => b.key.localeCompare(a.key))
  return groups
}

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

type FilterTab = 'all' | 'running' | 'done' | 'failed'

// --- Task Row (iOS Mail style) ---

function TaskRow({
  task,
  isActive,
  editMode,
  isSelected,
  onSelect,
  onToggleSelect,
  onDelete,
  onKill,
}: {
  task: Task
  isActive: boolean
  editMode: boolean
  isSelected: boolean
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
  onDelete: (id: string) => void
  onKill: (id: string) => void
}) {
  const dotColor = statusDotColor[task.status] || statusDotColor.queued
  const isRunning = task.status === 'running'
  const isQueued = task.status === 'queued'
  const isKillable = isRunning || isQueued
  const duration = formatDuration(task)
  const modelNames = task.model
    ? task.model.split(',').map(m => m.trim()).filter(Boolean).map(m => m.split('/').pop() || m)
    : []

  const handleClick = () => {
    if (editMode) {
      onToggleSelect(task.id)
    } else {
      onSelect(task.id)
    }
  }

  return (
    <motion.div
      onClick={handleClick}
      whileTap={{ scale: 0.99 }}
      className="group relative overflow-hidden"
    >
      <div
        className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-150"
        style={{
          height: 72,
          borderLeft: `3px solid ${isActive && !editMode ? tokens.colors.accent : 'transparent'}`,
          background: isActive && !editMode
            ? tokens.colors.accentSubtle
            : isSelected && editMode
              ? tokens.colors.accentFaint
              : undefined,
        }}
      >
        {/* Edit mode checkbox */}
        {editMode && (
          <div className="shrink-0 flex items-center justify-center" style={{ width: 24 }}>
            {isSelected ? (
              <CheckmarkCircle02Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: tokens.colors.accent }} />
            ) : (
              <CircleIcon className="h-5 w-5" strokeWidth={1.5} style={{ color: tokens.colors.textQuaternary }} />
            )}
          </div>
        )}

        {/* Status dot */}
        {!editMode && (
          <div className="shrink-0">
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
        )}

        {/* Content block */}
        <div className="flex-1 min-w-0">
          <p
            className="truncate"
            style={{ fontSize: 13, fontWeight: 500, lineHeight: '18px', color: tokens.colors.textPrimary }}
          >
            {task.title}
          </p>
          <p
            className="truncate"
            style={{ fontSize: 12, lineHeight: '16px', color: tokens.colors.textTertiary, marginTop: 1 }}
          >
            {task.summary || modelNames.map(n => n === 'jm-direct' ? 'manual' : n).join(', ') || task.status}
          </p>
        </div>

        {/* Timestamp (right) */}
        <span className="shrink-0 text-[11px] tabular-nums" style={{ color: tokens.colors.textQuaternary }}>
          {formatTime(task.created)}
        </span>
      </div>

      {/* Indented divider */}
      <div style={{ marginLeft: 44, height: 1, background: tokens.colors.borderSubtle }} />
    </motion.div>
  )
}

// --- Task Detail (Right Panel) ---

function CommandBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(text.length <= 200)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="rounded-md overflow-hidden" style={{ background: tokens.colors.bg, border: '1px solid ' + tokens.colors.borderSubtle, borderRadius: 6 }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle, background: tokens.colors.surface }}>
        <span className="text-[11px] uppercase tracking-wider" style={{ color: tokens.colors.textTertiary }}>Command</span>
        <div className="flex items-center gap-1">
          {text.length > 200 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              style={{ color: tokens.colors.textTertiary }}
              onClick={() => setExpanded(!expanded)}
            >
              <AnimatedIcon icon={UnfoldMoreIcon} className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="ml-1 text-[11px]">{expanded ? 'Collapse' : 'Expand'}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            style={{ color: tokens.colors.textTertiary }}
            onClick={handleCopy}
          >
            {copied ? <AnimatedIcon icon={Tick02Icon} className="h-3.5 w-3.5" strokeWidth={1.5} noStroke /> : <AnimatedIcon icon={Copy01Icon} className="h-3.5 w-3.5" strokeWidth={1.5} />}
            <span className="ml-1 text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>
      </div>
      <div style={{ maxHeight: expanded ? 200 : 48, overflow: expanded ? 'auto' : 'hidden', position: 'relative' }}>
        <pre
          className="whitespace-pre-wrap break-words"
          style={{ ...tokens.typography.mono, fontSize: 12, color: tokens.colors.textSecondary, padding: 12 }}
        >
          {text}
        </pre>
        {!expanded && (
          <div
            className="absolute inset-x-0 bottom-0 h-8 cursor-pointer"
            style={{ background: `linear-gradient(transparent, ${tokens.colors.bg})` }}
            onClick={() => setExpanded(true)}
          />
        )}
      </div>
    </div>
  )
}

function TaskDetail({
  task,
  logContent,
  logLoading,
  logNotFound,
  onKill,
  onDelete,
  onBack,
}: {
  task: Task
  logContent: string | null
  logLoading: boolean
  logNotFound: boolean
  onKill: (id: string) => void
  onDelete: (id: string) => void
  onBack?: () => void
}) {
  const isRunning = task.status === 'running'
  const isKillable = isRunning || task.status === 'queued'
  const duration = formatDuration(task)
  const costVal = parseFloat(task.cost || '0')
  const modelNames = task.model
    ? task.model.split(',').map(m => m.trim()).filter(Boolean).map(m => m.split('/').pop() || m)
    : []
  const fullPrompt = task.prompt || task.title

  const handleCopyLog = async () => {
    if (!logContent) return
    try {
      await navigator.clipboard.writeText(logContent)
      toast.success('Log copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 1. Toolbar */}
      <PanelToolbar
        title={task.title}
        onBack={onBack}
        actions={
          <>
            {isKillable && (
              <ToolbarAction icon={Cancel01Icon} label="Kill" destructive onClick={() => onKill(task.id)} />
            )}
            {logContent && (
              <ToolbarAction icon={Copy01Icon} label="Copy log" onClick={handleCopyLog} />
            )}
            <ToolbarAction icon={Delete02Icon} label="Delete" destructive onClick={() => onDelete(task.id)} />
          </>
        }
      />

      {/* 2. Status row + 3. Tags — single inline row */}
      <div className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Badge variant="default" className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--accent-border)] text-[11px]">running</Badge>
          )}
          {task.status === 'done' && (
            <Badge variant="default" className="bg-success/10 text-success border-success/20 text-[11px]">done</Badge>
          )}
          {task.status === 'queued' && (
            <Badge variant="default" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[11px]">queued</Badge>
          )}
          {task.status === 'failed' && (
            <Badge variant="default" className="bg-destructive/10 text-destructive border-destructive/20 text-[11px]">failed</Badge>
          )}
          {task.status === 'cancelled' && (
            <Badge variant="default" className="text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', color: tokens.colors.textTertiary, borderColor: 'rgba(255,255,255,0.08)' }}>cancelled</Badge>
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
          {modelNames.map(name => (
            <Badge key={name} variant="secondary" className="text-[10px]">
              {name === 'jm-direct' ? 'manual' : name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Scrollable content area: 4. Command + 5. Output + 6. Exit code */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* 4. Command block */}
        <CommandBlock text={fullPrompt} />

        {/* 5. Output block */}
        <LogViewer
          content={logContent}
          loading={logLoading}
          notFound={logNotFound}
          autoScroll={isRunning}
          maxHeight="calc(100vh - 440px)"
        />

        {/* 6. Exit code / result */}
        {task.result && (
          <p className="text-[11px] truncate" style={{ color: tokens.colors.textTertiary }}>
            {task.result}
          </p>
        )}
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

  // Version
  const [oclawVersion, setOclawVersion] = useState<{ current: string; latest: string; upToDate: boolean } | null>(null)

  // Quick task
  const [quickTaskText, setQuickTaskText] = useState('')
  const [status, setStatus] = useState<'idle' | 'expanding' | 'queuing'>('idle')
  const lastSubmitRef = useRef<{ text: string; time: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputFocused, setInputFocused] = useState(false)

  // Composer helpers
  const isComposerLoading = status !== 'idle'

  const adjustComposerHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }, [])

  useEffect(() => {
    adjustComposerHeight()
  }, [quickTaskText, adjustComposerHeight])

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

  // Edit mode (multi-select)
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk action states
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkKilling, setBulkKilling] = useState(false)

  const loadData = () => {
    Promise.all([opsApi.getTasks(), opsApi.getSystemInfo()])
      .then(([tasksData, sysData]) => {
        setTasks(tasksData)
        setSystemInfo(sysData)
      })
      .catch((error) => console.error('Failed to load data:', error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    opsApi.getOpenClawVersion().then(setOclawVersion).catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

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

  // Pagination
  const TASKS_PAGE_SIZE = 50
  const [visibleCount, setVisibleCount] = useState(TASKS_PAGE_SIZE)

  // Reset visible count when filter changes
  useEffect(() => { setVisibleCount(TASKS_PAGE_SIZE) }, [filter])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]
    if (filter === 'done') result = result.filter(t => t.status === 'done')
    else if (filter === 'failed') result = result.filter(t => t.status === 'failed' || t.status === 'cancelled')
    else if (filter === 'running') result = result.filter(t => t.status === 'running' || t.status === 'queued')
    return result.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [tasks, filter])

  // Paginated visible tasks
  const visibleTasks = useMemo(() => filteredTasks.slice(0, visibleCount), [filteredTasks, visibleCount])
  const hasMoreTasks = filteredTasks.length > visibleCount

  // Grouped by day (only visible tasks)
  const dayGroups = useMemo(() => groupTasksByDay(visibleTasks), [visibleTasks])

  // Counts
  const doneCount = tasks.filter(t => t.status === 'done').length
  const failedCount = tasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length
  const runningCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

  // Edit mode helpers
  const toggleEditMode = useCallback(() => {
    setEditMode(prev => {
      if (prev) {
        setSelectedIds(new Set())
      }
      return !prev
    })
  }, [])

  const toggleSelectTask = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const allFilteredIds = filteredTasks.map(t => t.id)
    setSelectedIds(prev => {
      if (prev.size === allFilteredIds.length) return new Set()
      return new Set(allFilteredIds)
    })
  }, [filteredTasks])

  const selectedHasKillable = useMemo(() => {
    return tasks.some(t => selectedIds.has(t.id) && (t.status === 'running' || t.status === 'queued'))
  }, [tasks, selectedIds])

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const result = await opsApi.bulkDeleteTasks(Array.from(selectedIds))
      if (result.ok) {
        toast.success(`Deleted ${result.deleted} task${result.deleted !== 1 ? 's' : ''}`)
        setTasks(result.tasks)
        if (selectedTaskId && selectedIds.has(selectedTaskId)) setSelectedTaskId(null)
        setSelectedIds(new Set())
      } else {
        toast.error('Failed to delete tasks')
      }
    } catch {
      toast.error('Failed to delete tasks')
    }
    setBulkDeleting(false)
  }

  const handleBulkKill = async () => {
    const killableIds = tasks.filter(t => selectedIds.has(t.id) && (t.status === 'running' || t.status === 'queued')).map(t => t.id)
    if (killableIds.length === 0) return
    setBulkKilling(true)
    let killed = 0
    for (const id of killableIds) {
      try {
        const result = await opsApi.killTask(id)
        if (result.ok) killed++
      } catch { /* continue */ }
    }
    if (killed > 0) {
      toast.success(`Killed ${killed} task${killed !== 1 ? 's' : ''}`)
      loadData()
    }
    setBulkKilling(false)
  }


  const queueDirectly = async (text: string) => {
    const now = Date.now()
    if (lastSubmitRef.current && lastSubmitRef.current.text === text && now - lastSubmitRef.current.time < 10000) {
      toast.error('Duplicate — same task was just queued')
      setStatus('idle')
      return
    }
    lastSubmitRef.current = { text, time: now }

    try {
      const isBatch = text.includes('\n---\n') || text.includes(' --- ')
      if (isBatch) {
        const prompts = text.split(/\n---\n| --- /).map(s => s.trim()).filter(Boolean)
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
    } catch {
      toast.error('Failed to queue task')
    }
    setStatus('idle')
  }

  const handleQuickTask = async () => {
    const text = quickTaskText.trim()
    if (!text || status !== 'idle') return

    // If starts with 'rr ' — skip smart rewrite, queue directly
    if (text.toLowerCase().startsWith('rr ')) {
      setStatus('queuing')
      await queueDirectly(text)
      return
    }

    // Natural language — expand via Gemini then queue
    setStatus('expanding')
    try {
      const result = await opsApi.smartTask(text)
      if (result.ok && result.command) {
        setStatus('queuing')
        await queueDirectly(result.command)
      } else {
        toast.error(result.error || 'Failed to expand prompt')
        setStatus('idle')
      }
    } catch {
      toast.error('Failed to process task')
      setStatus('idle')
    }
  }

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    if (window.innerWidth < 768) {
      setMobileSheetOpen(true)
    }
  }

  // --- Uptime formatter ---
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    return { short: d > 0 ? `${d}d` : `${h}h`, long: `${d}d ${h}h` }
  }

  // --- Loading State ---

  if (loading) {
    return (
      <div
        className="h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]"
        style={{ background: tokens.colors.bg }}
      >
        <div className="h-full flex flex-col max-w-7xl mx-auto w-full md:px-6">
          {/* Composer placeholder — full width */}
          <div className="shrink-0" style={{ height: 52, background: tokens.colors.surface, borderBottom: '1px solid ' + tokens.colors.border, padding: '12px 24px' }} />
          <div className="flex-1 flex min-h-0">
            <div className="w-full md:w-[35%] md:max-w-[420px] shrink-0 flex flex-col" style={{ background: tokens.colors.surface, borderRight: '1px solid ' + tokens.colors.borderSubtle }}>
              {/* Filter bar placeholder */}
              <div style={{ height: 36 }} />
              {/* Skeleton rows */}
              {[...Array(5)].map((_, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 px-4 py-2" style={{ height: 72 }}>
                    <div className="shrink-0 rounded-full animate-pulse" style={{ width: 12, height: 12, background: 'rgba(255,255,255,0.1)' }} />
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="h-[12px] rounded animate-pulse" style={{ width: '60%', background: 'rgba(255,255,255,0.1)' }} />
                      <div className="h-[10px] rounded animate-pulse" style={{ width: '30%', background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    <div className="shrink-0 h-[10px] rounded animate-pulse" style={{ width: 36, background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <div style={{ marginLeft: 44, height: 1, background: tokens.colors.borderSubtle }} />
                </div>
              ))}
            </div>
            <div className="hidden md:flex flex-1" />
          </div>
        </div>
      </div>
    )
  }

  // --- Task List Panel (left side of two-panel area) ---

  const taskListPanel = (
    <>
      {/* System stats bar */}
      {systemInfo && (
        <div className="shrink-0 px-4 flex items-center gap-6" style={{ height: 24 }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            CPU {Math.round(systemInfo.cpu)}% · MEM {Math.round(systemInfo.mem)}% · Disk {Math.round(systemInfo.disk)}% · Up {formatUptime(systemInfo.uptime).short}
            {oclawVersion ? ` · v${oclawVersion.current}` : ''}
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="shrink-0 px-4 flex items-center gap-4 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide" style={{ height: 36, WebkitOverflowScrolling: 'touch' }}>
        {([
          { key: 'all' as const, label: 'All', count: tasks.length },
          { key: 'running' as const, label: 'Running', count: runningCount },
          { key: 'done' as const, label: 'Done', count: doneCount },
          { key: 'failed' as const, label: 'Failed', count: failedCount },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="whitespace-nowrap transition-colors duration-150"
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: filter === f.key ? tokens.colors.textPrimary : tokens.colors.textTertiary,
            }}
          >
            {f.label}{f.count > 0 ? ` ${f.count}` : ''}
          </button>
        ))}
        <button
          onClick={toggleEditMode}
          className="ml-auto whitespace-nowrap transition-colors duration-150"
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: editMode ? tokens.colors.accent : tokens.colors.textTertiary,
          }}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Select All bar (edit mode) */}
      {editMode && filteredTasks.length > 0 && (
        <div
          className="shrink-0 px-4 py-1.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}
        >
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 transition-colors"
            style={{ ...tokens.typography.caption, color: tokens.colors.accent }}
          >
            {selectedIds.size === filteredTasks.length ? (
              <><CheckmarkCircle02Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> Deselect All</>
            ) : (
              <><CircleIcon className="h-3.5 w-3.5" strokeWidth={1.5} /> Select All</>
            )}
          </button>
          {selectedIds.size > 0 && (
            <span style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Task list — scrollable, grouped by day */}
      <div className="flex-1 overflow-y-auto" style={editMode && selectedIds.size > 0 ? { paddingBottom: 64 } : undefined}>
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <TerminalIcon size={32} className="mb-3" style={{ color: tokens.colors.textQuaternary, opacity: 0.4 }} isAnimated={false} />
            <p className="text-[13px]" style={{ color: tokens.colors.textQuaternary }}>
              {tasks.length === 0 ? 'No tasks yet' : 'No matches'}
            </p>
          </div>
        ) : (
          <div key={filter}>
            {dayGroups.map((group, groupIdx) => {
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
                    className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 cursor-pointer select-none"
                    style={{
                      background: tokens.colors.surface,
                      borderBottom: '1px solid ' + tokens.colors.borderSubtle,
                    }}
                  >
                    {isExpanded
                      ? <AnimatedIcon icon={ArrowDown01Icon} className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: tokens.colors.textTertiary }} />
                      : <AnimatedIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color: tokens.colors.textTertiary }} />
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
                        {group.tasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            isActive={selectedTaskId === task.id}
                            editMode={editMode}
                            isSelected={selectedIds.has(task.id)}
                            onSelect={selectTask}
                            onToggleSelect={toggleSelectTask}
                            onDelete={(id) => setDeleteConfirmId(id)}
                            onKill={(id) => setKillConfirmId(id)}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}

            {/* Load more */}
            {hasMoreTasks && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + TASKS_PAGE_SIZE)}
                  className="px-4 py-2 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: tokens.colors.surface,
                    color: tokens.colors.textTertiary,
                    border: '1px solid ' + tokens.colors.borderSubtle,
                  }}
                >
                  Load more ({filteredTasks.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit mode bottom toolbar */}
      <AnimatePresence>
        {editMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 flex items-center gap-2 px-4"
            style={{
              height: 56,
              background: tokens.colors.surface,
              borderTop: '1px solid ' + tokens.colors.borderSubtle,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
              className="flex-1"
            >
              {bulkDeleting ? <Loading03Icon className="h-3.5 w-3.5 animate-spin mr-1" strokeWidth={1.5} /> : <AnimatedIcon icon={Delete02Icon} className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />}
              Delete {selectedIds.size}
            </Button>
            {selectedHasKillable && (
              <Button
                variant="default"
                size="sm"
                disabled={bulkKilling}
                onClick={handleBulkKill}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {bulkKilling ? <Loading03Icon className="h-3.5 w-3.5 animate-spin mr-1" strokeWidth={1.5} /> : <AnimatedIcon icon={Cancel01Icon} className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />}
                Kill Active
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  // --- Right Panel ---

  const handleMobileClose = () => {
    setMobileSheetOpen(false)
    setSelectedTaskId(null)
  }

  const rightPanel = selectedTask ? (
    <TaskDetail
      task={selectedTask}
      logContent={logContent}
      logLoading={logLoading}
      logNotFound={logNotFound}
      onKill={(id) => setKillConfirmId(id)}
      onDelete={(id) => setDeleteConfirmId(id)}
      onBack={handleMobileClose}
    />
  ) : null

  return (
    <>
      <div className="h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]" style={{ background: tokens.colors.bg }}>
        <div className="h-full flex flex-col max-w-7xl mx-auto w-full md:px-6">

        {/* Composer — premium chat-style input */}
        <div className="shrink-0 px-4 pt-3 pb-2 md:px-6">
          <div
            className={`composer-container flex items-center rounded-xl px-4 py-3${isComposerLoading ? ' composer-loading-border' : ''}`}
            style={{
              background: '#1a1a1a',
              border: `1px solid ${inputFocused && !isComposerLoading ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)'}`,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
              transition: 'border-color 0.2s ease',
            }}
          >
            {/* Terminal prompt icon */}
            <span
              className="shrink-0 mr-3 select-none"
              style={{
                fontFamily: 'JetBrains Mono, SF Mono, monospace',
                fontSize: 14,
                color: isComposerLoading ? 'rgba(255,255,255,0.15)' : inputFocused ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.20)',
                transition: 'color 0.2s ease',
              }}
            >
              {'>_'}
            </span>

            {/* Input area */}
            <div className="relative flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={quickTaskText}
                onChange={e => setQuickTaskText(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleQuickTask()
                  }
                }}
                placeholder={isComposerLoading ? '' : 'Ask River to build something...'}
                rows={1}
                disabled={isComposerLoading}
                className="w-full resize-none placeholder:italic placeholder:text-white/25 scrollbar-hide"
                style={{
                  background: 'transparent',
                  color: isComposerLoading ? 'transparent' : tokens.colors.textPrimary,
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14,
                  lineHeight: '20px',
                  maxHeight: 80, // ~4 lines
                  overflowY: 'auto',
                  padding: 0,
                }}
              />
              {isComposerLoading && (
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  <span className="text-sm italic" style={{ color: 'rgba(10,132,255,0.50)' }}>
                    {status === 'expanding' ? 'Expanding prompt...' : 'Queuing task...'}
                  </span>
                </div>
              )}
            </div>

            {/* Send button — appears only when there's content */}
            <AnimatePresence>
              {(quickTaskText.trim() || isComposerLoading) && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={handleQuickTask}
                  disabled={isComposerLoading || !quickTaskText.trim()}
                  className="shrink-0 ml-3 flex items-center justify-center rounded-md transition-colors duration-150"
                  style={{
                    width: 28,
                    height: 28,
                    background: isComposerLoading ? 'transparent' : '#0A84FF',
                  }}
                  whileHover={!isComposerLoading ? { background: 'rgba(10,132,255,0.80)' } : undefined}
                  whileTap={!isComposerLoading ? { scale: 0.92 } : undefined}
                >
                  {isComposerLoading ? (
                    <Loading03Icon className="h-4 w-4 animate-spin" strokeWidth={1.5} style={{ color: '#0A84FF' }} />
                  ) : (
                    <SentIcon className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Two-panel area — task list left, detail right */}
        <TwoPanelLayout
          leftPanel={taskListPanel}
          rightPanel={rightPanel}
          emptyState={{ icon: <TerminalIcon size={48} isAnimated={false} />, text: 'Select a task' }}
          selectedKey={selectedTask?.id}
          mobileOpen={mobileSheetOpen}
          onMobileClose={handleMobileClose}
          mobileTitle={selectedTask?.title || 'Task'}
        />
        </div>
      </div>

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
