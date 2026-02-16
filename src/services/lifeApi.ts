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
  hidden?: boolean
  emailSentYear?: number
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

  async deleteReminder(id: string): Promise<Reminder[]> {
    const res = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete reminder')
    return res.json()
  },

  async patchBirthday(id: string, updates: Partial<Birthday>): Promise<Birthday> {
    const res = await fetch(`${API_BASE_URL}/api/birthdays/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update birthday')
    return res.json()
  },

  async sendBirthdayEmail(id: string): Promise<{ success?: boolean; alreadySent?: boolean; error?: string }> {
    const res = await fetch(`/api/birthdays/${id}/email`, {
      method: 'POST',
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`sendBirthdayEmail failed: ${res.status} ${res.statusText}`, text)
      return { error: `HTTP ${res.status}: ${res.statusText}` }
    }
    return res.json()
  },

  async getGiftIdeas(id: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/api/birthdays/${id}/gift-ideas`)
    if (!res.ok) return []
    const data = await res.json()
    return data.ideas || []
  },

  async getFilesPaginated(page: number, limit: number): Promise<{ files: Array<{ name: string; size: number; sizeHuman: string; date: string }>; total: number; page: number; totalPages: number }> {
    const res = await fetch(`${API_BASE_URL}/api/files?page=${page}&limit=${limit}`)
    if (!res.ok) return { files: [], total: 0, page: 1, totalPages: 0 }
    return res.json()
  },
}
