const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = `${API_BASE_URL}/api`

export interface Task {
  id: string
  title: string
  service?: string
  model?: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled'
  created: string
  startTime?: string
  endTime?: string
  result?: string
  cost?: string
  tokensIn?: number
  tokensOut?: number
}

export interface SystemInfo {
  cpu: number
  mem: number
  disk: number
  uptime: number
  hostname: string
  cpus: number
  loadavg: number[]
}

export const opsApi = {
  async getTasks(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`)
    if (!res.ok) return []
    return res.json()
  },

  async getSystemInfo(): Promise<SystemInfo> {
    const res = await fetch(`${API_BASE}/stats`)
    if (!res.ok) return { cpu: 0, mem: 0, disk: 0, uptime: 0, hostname: 'N/A', cpus: 0, loadavg: [] }
    return res.json()
  },

  async deleteTask(id: string): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    return res.json()
  },

  async resetCosts(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks/reset-costs`, {
      method: 'POST',
    })
    return res.json()
  },

  async getTaskLog(taskId: string): Promise<{ content: string } | null> {
    const res = await fetch(`${API_BASE}/task-logs/${taskId}`)
    if (!res.ok) return null
    return res.json()
  },

  async getGitStatus(): Promise<{ changedFiles: number; clean: boolean }> {
    const res = await fetch(`${API_BASE}/git-status`)
    if (!res.ok) return { changedFiles: 0, clean: true }
    return res.json()
  },
}
