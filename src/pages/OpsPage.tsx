import { useEffect, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { opsApi, type Task, type SystemInfo } from '../services/opsApi'
import { Card, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Loader2, RotateCcw, ChevronDown, ChevronRight, DollarSign } from 'lucide-react'
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
    running: 'bg-violet-500/10 text-violet-400/80',
    done: 'bg-emerald-500/10 text-emerald-400/80',
    failed: 'bg-rose-500/10 text-rose-400/80',
    queued: 'bg-white/5 text-white/50',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${styles[status] || styles.queued}`}>
      {status}
    </span>
  )
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

  const loadData = () => {
    Promise.all([opsApi.getTasks(), opsApi.getSystemInfo()])
      .then(([tasksData, sysData]) => {
        setTasks(tasksData)
        setSystemInfo(sysData)
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
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
      <div>
        <h1 className="text-2xl font-semibold text-white">Ops</h1>
        <p className="text-sm text-white/60 mt-1">Live task tracking and system overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'RUNNING', value: runningCount, color: 'text-violet-400' },
          { label: 'QUEUED', value: queuedCount, color: 'text-white/40' },
          { label: 'DONE', value: doneCount, color: 'text-emerald-400/80' },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card>
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-widest text-white/40">{stat.label}</p>
                <p className={`text-5xl font-light tracking-tight mt-1 ${stat.color}`}>
                  <AnimatedNumber value={stat.value} />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
          <Card>
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-widest text-white/40">TOTAL COST</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-5xl font-light tracking-tight text-amber-400/80">
                  <AnimatedNumber value={totalCost} prefix="$" decimals={2} />
                </p>
                <button onClick={handleResetCosts} title="Reset all costs" className="text-white/20 hover:text-amber-400/80 transition-colors duration-150 p-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* System info */}
      {systemInfo && (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'CPU', value: systemInfo.cpu, color: 'bg-violet-500/80' },
            { label: 'MEMORY', value: systemInfo.mem, color: 'bg-blue-500/80' },
            { label: 'DISK', value: systemInfo.disk, color: 'bg-emerald-500/80' },
          ].map((sys, i) => (
            <motion.div key={sys.label} custom={i + 4} variants={cardVariants} initial="hidden" animate="visible">
              <Card>
                <CardContent className="p-6">
                  <p className="text-xs uppercase tracking-widest text-white/40">{sys.label}</p>
                  <p className="text-5xl font-light tracking-tight text-white/90 mt-1">
                    <AnimatedNumber value={sys.value} suffix="%" />
                  </p>
                  <Progress value={sys.value} color={sys.color} className="mt-3 h-1" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
          <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible">
            <Card>
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-widest text-white/40">UPTIME</p>
                <p className="text-5xl font-light tracking-tight text-white/90 mt-1">{formatUptime(systemInfo.uptime)}</p>
                <p className="text-xs text-white/30 mt-2">{systemInfo.hostname}</p>
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
              <div key={group.date} className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#111111]">
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
                  <div className="border-t border-white/[0.04]">
                    {group.tasks.map((task) => {
                      const costVal = parseFloat(task.cost || '0')
                      const modelNames = task.model
                        ? task.model.split(',').map(m => m.trim()).filter(Boolean).map(m => m.split('/').pop() || m)
                        : []
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className="flex items-start gap-3 p-4 border-l-2 border-white/[0.04] ml-4 hover:bg-white/[0.03] cursor-pointer w-[calc(100%-1rem)] text-left transition-colors duration-150"
                          onClick={() => { setSelectedTask(task); setLogPanelOpen(true) }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs tabular-nums text-white/25">{formatTime(task.created)}</span>
                              <span className="text-sm font-medium text-white/80 truncate">{task.title}</span>
                              <StatusBadge status={task.status} />
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
                        </button>
                      )
                    })}
                  </div>
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
