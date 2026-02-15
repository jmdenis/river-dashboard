import { useEffect, useState, useMemo } from 'react'
import { Card, Title, Text } from '@tremor/react'
import { Loader2, ChevronDown, ChevronRight, Clock, Zap, DollarSign } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface Task { id: string; title: string; service?: string; model?: string; status: 'queued' | 'running' | 'done' | 'failed'; created: string; result?: string; cost?: string; tokensIn?: number; tokensOut?: number }
interface DayGroup { date: string; label: string; tasks: Task[]; totalCost: number }

function formatTime(ts: string): string { return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
function getDateKey(ts: string): string { return new Date(ts).toISOString().split('T')[0] }
function getDateLabel(dateStr: string): string {
  const todayKey = new Date().toISOString().split('T')[0]
  const y = new Date(); y.setDate(y.getDate() - 1); const yesterdayKey = y.toISOString().split('T')[0]
  if (dateStr === todayKey) return 'Today'
  if (dateStr === yesterdayKey) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function Heatmap({ tasks }: { tasks: Task[] }) {
  const weeks = 12; const today = new Date(); today.setHours(0,0,0,0)
  const counts: Record<string, number> = {}
  tasks.forEach(t => { const k = getDateKey(t.created); counts[k] = (counts[k] || 0) + 1 })
  const maxCount = Math.max(1, ...Object.values(counts))
  const cells: { date: string; count: number }[] = []
  for (let i = weeks * 7 - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const k = d.toISOString().split('T')[0]; cells.push({ date: k, count: counts[k] || 0 }) }
  const getColor = (c: number) => { if (c === 0) return 'bg-muted/40'; const i = c / maxCount; if (i < 0.25) return 'bg-emerald-900/60'; if (i < 0.5) return 'bg-emerald-700/70'; if (i < 0.75) return 'bg-emerald-500/80'; return 'bg-emerald-400' }
  const columns: typeof cells[][] = []; for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7))
  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      <div className="flex flex-col gap-1 mr-1 shrink-0">{dayLabels.map((l, i) => <div key={i} className="h-3 text-[10px] text-muted-foreground leading-3 flex items-center">{i % 2 === 1 ? l : ''}</div>)}</div>
      {columns.map((week, wi) => <div key={wi} className="flex flex-col gap-1">{week.map((cell, di) => <div key={di} className={`w-3 h-3 rounded-sm ${getColor(cell.count)} transition-colors`} title={`${cell.date}: ${cell.count} tasks`} />)}</div>)}
    </div>
  )
}

export default function LogsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/tasks`).then(r => r.ok ? r.json() : []).then(data => { setTasks(data); setExpandedDays(new Set([new Date().toISOString().split('T')[0]])) }).catch(err => console.error('LogsPage error:', err)).finally(() => setLoading(false))
  }, [])

  const dayGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    tasks.forEach(t => { const k = getDateKey(t.created); if (!groups[k]) groups[k] = []; groups[k].push(t) })
    return Object.entries(groups).map(([date, dayTasks]): DayGroup => ({ date, label: getDateLabel(date), tasks: dayTasks.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()), totalCost: dayTasks.reduce((s, t) => s + parseFloat(t.cost || '0'), 0) })).sort((a, b) => b.date.localeCompare(a.date))
  }, [tasks])

  const totalCost = tasks.reduce((s, t) => s + parseFloat(t.cost || '0'), 0)
  const totalTokensIn = tasks.reduce((s, t) => s + (t.tokensIn || 0), 0)
  const totalTokensOut = tasks.reduce((s, t) => s + (t.tokensOut || 0), 0)
  const toggleDay = (d: string) => { setExpandedDays(prev => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n }) }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold">Logs</h1><p className="text-muted-foreground">Activity timeline and usage history</p></div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card"><Text>Total Tasks</Text><Title>{tasks.length}</Title></Card>
        <Card className="bg-card"><Text>Total Cost</Text><Title className="text-amber-600 dark:text-amber-400">${totalCost.toFixed(2)}</Title></Card>
        <Card className="bg-card"><Text>Tokens In</Text><Title>{(totalTokensIn / 1000).toFixed(0)}K</Title></Card>
        <Card className="bg-card"><Text>Tokens Out</Text><Title>{(totalTokensOut / 1000).toFixed(0)}K</Title></Card>
      </div>

      <Card className="bg-card">
        <Title>Activity (last 12 weeks)</Title>
        <div className="mt-4"><Heatmap tasks={tasks} /></div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground"><span>Less</span><div className="w-3 h-3 rounded-sm bg-muted/40" /><div className="w-3 h-3 rounded-sm bg-emerald-900/60" /><div className="w-3 h-3 rounded-sm bg-emerald-700/70" /><div className="w-3 h-3 rounded-sm bg-emerald-500/80" /><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span>More</span></div>
      </Card>

      <Card className="bg-card">
        <Title>Timeline</Title>
        <div className="mt-4 space-y-2">
          {dayGroups.length === 0 ? <div className="text-center text-muted-foreground py-8">No activity logged</div> : dayGroups.map((group) => (
            <div key={group.date} className="border rounded-lg overflow-hidden">
              <button onClick={() => toggleDay(group.date)} className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left">
                <div className="flex items-center gap-3">{expandedDays.has(group.date) ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}<span className="font-medium">{group.label}</span><span className="text-xs text-muted-foreground">{group.date}</span></div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Zap className="h-3 w-3" />{group.tasks.length} tasks</span>{group.totalCost > 0 && <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><DollarSign className="h-3 w-3" />{group.totalCost.toFixed(4)}</span>}</div>
              </button>
              {expandedDays.has(group.date) && <div className="border-t">{group.tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-muted/30">
                  <div className="mt-0.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">{formatTime(task.created)}</span>
                      <span className="text-sm font-medium truncate">{task.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${task.status === 'running' ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400' : task.status === 'done' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : task.status === 'failed' ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'}`}>{task.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.service && <span>{task.service}</span>}{task.model && <span>{task.model.split('/').pop()}</span>}{task.cost && <span className="text-amber-600 dark:text-amber-400">${parseFloat(task.cost).toFixed(4)}</span>}{(task.tokensIn || task.tokensOut) && <span>↗{((task.tokensIn || 0) / 1000).toFixed(1)}K ↙{((task.tokensOut || 0) / 1000).toFixed(1)}K</span>}
                    </div>
                    {task.result && <p className="text-xs text-muted-foreground mt-1 truncate">{task.result}</p>}
                  </div>
                </div>
              ))}</div>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
