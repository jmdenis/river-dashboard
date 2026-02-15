import { useEffect, useState } from 'react'
import { opsApi, type Task, type SystemInfo } from '../services/opsApi'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Loader2, Trash2 } from 'lucide-react'

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)

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
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const runningCount = tasks.filter((t) => t.status === 'running').length
  const queuedCount = tasks.filter((t) => t.status === 'queued').length
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const totalCost = tasks.reduce((sum, t) => sum + parseFloat(t.cost || '0'), 0)

  const sortedTasks = [...tasks].sort((a, b) => {
    const order = { running: 0, queued: 1, failed: 2, done: 3 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return new Date(b.created).getTime() - new Date(a.created).getTime()
  })

  const handleDelete = async (id: string) => {
    const updated = await opsApi.deleteTask(id)
    setTasks(updated)
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Ops Feed</h1>
        <p className="text-muted-foreground">Live task tracking and API usage</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Running</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-violet-600 dark:text-violet-400">{runningCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Queued</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-muted-foreground">{queuedCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Done</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-green-600 dark:text-green-400">{doneCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Total Cost</p></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">${totalCost.toFixed(2)}</p></CardContent>
        </Card>
      </div>

      {systemInfo && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">CPU</p></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{systemInfo.cpu}%</p>
              <Progress value={systemInfo.cpu} color="bg-violet-500" className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Memory</p></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{((1 - systemInfo.mem) * 100).toFixed(1)}%</p>
              <Progress value={(1 - systemInfo.mem) * 100} color="bg-blue-500" className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Disk</p></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{systemInfo.disk}%</p>
              <Progress value={systemInfo.disk} color="bg-emerald-500" className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><p className="text-sm text-muted-foreground">Uptime</p></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatUptime(systemInfo.uptime)}</p>
              <p className="text-sm text-muted-foreground">{systemInfo.hostname}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Task Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedTasks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No tasks yet</div>
            ) : (
              sortedTasks.map((task) => (
                <div key={task.id} className={`p-4 border rounded-lg transition-colors ${task.status === 'running' ? 'border-violet-500/50 bg-violet-500/5' : task.status === 'failed' ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium truncate">{task.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'running' ? 'bg-violet-500/20 text-violet-600 dark:text-violet-400' : task.status === 'done' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : task.status === 'failed' ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'}`}>{task.status}</span>
                        {task.service && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{task.service}</span>}
                      </div>
                      {task.cost && <div className="text-lg font-light text-amber-600 dark:text-amber-400 mb-1">${parseFloat(task.cost).toFixed(4)}</div>}
                      {(task.tokensIn || task.tokensOut) && (
                        <div className="text-xs text-muted-foreground mb-1">
                          ↗{((task.tokensIn || 0) / 1000).toFixed(1)}K ↙{((task.tokensOut || 0) / 1000).toFixed(1)}K tokens
                          {task.model && ` · ${task.model.split('/').pop()}`}
                        </div>
                      )}
                      {task.result && <div className="text-sm text-muted-foreground mt-2 truncate">{task.result}</div>}
                    </div>
                    <button onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Pricing</CardTitle>
          <p className="text-sm text-muted-foreground">Per 1 Million tokens (input / output)</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Claude Opus', in: '$15.00', out: '$75.00' },
              { name: 'Claude Sonnet', in: '$3.00', out: '$15.00' },
              { name: 'Claude Haiku', in: '$0.25', out: '$1.25' },
              { name: 'Gemini 2.5 Flash', in: '$0.15', out: '$0.60' },
              { name: 'Gemini 2.5 Pro', in: '~$0.20', out: '~$0.80' },
              { name: 'DeepSeek Chat', in: '$0.56', out: '$1.68' },
            ].map((model) => (
              <div key={model.name} className="p-3 border rounded-lg">
                <p className="font-medium text-sm mb-1">{model.name}</p>
                <div className="text-xs text-muted-foreground space-x-3"><span>In: {model.in}</span><span>Out: {model.out}</span></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
