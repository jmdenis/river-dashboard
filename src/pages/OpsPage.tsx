import { useEffect, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { opsApi, type Task, type SystemInfo } from '../services/opsApi'
import { Card, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Loader2, RotateCcw, ChevronDown, ChevronRight, DollarSign, GitBranch } from 'lucide-react'
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
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50">
      {name}
    </span>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' },
  }),
}

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [logPanelOpen, setLogPanelOpen] = useState(false)
  const [gitStatus, setGitStatus] = useState<{ changedFiles: number; clean: boolean } | null>(null)

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
      <div className="space-y-8">
        <div>
          <div className="skeleton h-8 w-24 rounded-xl" />
          <div className="skeleton h-4 w-56 mt-2 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="skeleton h-3 w-16 mb-3 rounded-xl" />
                <div className="skeleton h-12 w-24 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="skeleton h-3 w-16 mb-3 rounded-xl" />
                <div className="skeleton h-12 w-24 rounded-xl" />
                <div className="skeleton h-1 w-full mt-3 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90">Ops</h1>
          <p className="text-sm text-white/50 mt-1">Live task tracking and system overview</p>
        </div>
        {gitStatus && (
          <div className="flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${gitStatus.clean ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <GitBranch className="h-3.5 w-3.5 text-white/30" />
            <span className={gitStatus.clean ? 'text-emerald-400/80' : 'text-amber-400/80'}>
              {gitStatus.clean ? 'Git: Clean' : `Git: ${gitStatus.changedFiles} uncommitted file${gitStatus.changedFiles !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}
      </div>

      {/* Hero row — primary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'RUNNING', value: runningCount, color: 'text-violet-400' },
          { label: 'QUEUED', value: queuedCount, color: 'text-white/40' },
          { label: 'DONE', value: doneCount, color: 'text-emerald-400/80' },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className={stat.label === 'RUNNING' && stat.value > 0 ? 'animate-pulse-glow' : ''}>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-widest text-white/30">{stat.label}</p>
                <p className={`text-4xl font-light tracking-tight mt-1 ${stat.color}`}>
                  <AnimatedNumber value={stat.value} />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary row — compact system metrics */}
      {systemInfo && (
        <div className="grid gap-3 grid-cols-5">
          {[
            { label: 'CPU', value: systemInfo.cpu, suffix: '%', color: 'bg-violet-500/80', bar: true },
            { label: 'MEMORY', value: systemInfo.mem, suffix: '%', color: 'bg-blue-500/80', bar: true },
            { label: 'DISK', value: systemInfo.disk, suffix: '%', color: 'bg-emerald-500/80', bar: true },
          ].map((sys, i) => (
            <motion.div key={sys.label} custom={i + 3} variants={cardVariants} initial="hidden" animate="visible" className="min-w-0 w-full">
              <Card className="bg-white/[0.03]">
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/25">{sys.label}</p>
                  <p className="text-xl font-light tracking-tight text-white/70 mt-0.5">
                    <AnimatedNumber value={sys.value} suffix={sys.suffix} />
                  </p>
                  <Progress value={sys.value} color={sys.color} className="mt-2 h-0.5" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
          <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" className="min-w-0 w-full">
            <Card className="bg-white/[0.03]">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/25">UPTIME</p>
                <p className="text-xl font-light tracking-tight text-white/70 mt-0.5">{formatUptime(systemInfo.uptime)}</p>
                <div className="mt-2 h-0.5" />
              </CardContent>
            </Card>
          </motion.div>
          <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible" className="min-w-0 w-full">
            <Card className="bg-white/[0.03]">
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/25">TOTAL COST</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xl font-light tracking-tight text-amber-400/80">
                    <AnimatedNumber value={totalCost} prefix="$" decimals={2} />
                  </p>
                  <button onClick={handleResetCosts} title="Reset all costs" className="text-white/15 hover:text-amber-400/80 transition-colors duration-150 p-0.5">
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2 h-0.5" />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-lg font-medium text-white/90 mb-4">Timeline</h2>
        <div className="space-y-2">
          {dayGroups.length === 0 ? (
            <p className="text-sm text-white/20 text-center py-12">No tasks yet</p>
          ) : (
            dayGroups.map((group) => (
              <div key={group.date} className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03] backdrop-blur-lg">
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
                        <motion.button
                          key={task.id}
                          type="button"
                          className="flex items-start gap-3 p-4 border-l-2 border-white/[0.04] ml-4 hover:bg-white/[0.03] cursor-pointer w-[calc(100%-1rem)] text-left transition-colors duration-150"
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
                        </motion.button>
                      )
                    })}
                  </motion.div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <TaskLogPanel
        task={selectedTask}
        open={logPanelOpen}
        onOpenChange={setLogPanelOpen}
      />
    </div>
  )
}
