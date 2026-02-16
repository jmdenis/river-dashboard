const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = `${API_BASE_URL}/api/life`

export interface CalendarEvent {
  title: string
  start: string // ISO
  end: string // ISO
  location: string
  description: string
  allDay: boolean
  organizer: string // email
  category: 'work' | 'personal' | 'family' | 'health' | 'social' | 'travel' | 'finance'
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  raw: string
  source: 'crontab' | 'server'
}

export interface Birthday {
  id: string
  name: string
  date: string // MM-DD
  year?: string // Birth year (YYYY)
  note: string
  notes?: string // Alias for note (from birthdays.json)
  deceased?: boolean
}

export interface Reminder {
  id: string
  title: string
  due: string // YYYY-MM-DD
  recurring: string | null
  status: 'active' | 'done'
}

export type WeeklyPlanner = Record<string, string[]>

export interface LifeData {
  birthdays: Birthday[]
  reminders: Reminder[]
  weeklyPlanner: WeeklyPlanner
  cronJobs: CronJob[]
}

export interface Activities {
  weekend: { content: string; lastUpdated: string | null }
  date: { content: string; lastUpdated: string | null }
}

export const lifeApi = {
  async getActivities(): Promise<Activities> {
    const res = await fetch(`${API_BASE_URL}/api/activities`)
    if (!res.ok) return { weekend: { content: '', lastUpdated: null }, date: { content: '', lastUpdated: null } }
    return res.json()
  },

  async getCalendar(days: number = 14): Promise<CalendarEvent[]> {
    const res = await fetch(`${API_BASE_URL}/api/calendar?days=${days}`)
    if (!res.ok) return []
    return res.json()
  },

  async getData(): Promise<LifeData> {
    const res = await fetch(API_BASE)
    if (!res.ok) return { birthdays: [], reminders: [], weeklyPlanner: {}, cronJobs: [] }
    return res.json()
  },

  async update(data: Partial<Pick<LifeData, 'birthdays' | 'reminders' | 'weeklyPlanner'>>): Promise<LifeData> {
    const res = await fetch(API_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update life data')
    return res.json()
  },

  async cronAction(action: 'add' | 'delete', line: string): Promise<{ cronJobs: CronJob[] }> {
    const res = await fetch(`${API_BASE}/cron`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, line }),
    })
    if (!res.ok) throw new Error('Failed to update cron')
    return res.json()
  },

  async getReminders(): Promise<Reminder[]> {
    const res = await fetch(`${API_BASE_URL}/api/reminders`)
    if (!res.ok) return []
    return res.json()
  },

  async addReminder(title: string, due: string, recurring: string | null = null): Promise<Reminder[]> {
    const res = await fetch(`${API_BASE_URL}/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, due, recurring }),
    })
    if (!res.ok) throw new Error('Failed to add reminder')
    return res.json()
  },

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    const res = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update reminder')
    return res.json()
  },
}
