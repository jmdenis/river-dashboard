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

export interface Idea {
  emoji: string
  title: string
  description: string
  fullDescription: string
  driveTime: string
  parking: string
  hotel: string
  indoor?: boolean
  mapQuery?: string
  lunchSpot?: string
  weatherIcon?: string
  eventLinked?: boolean
}

export interface WeatherDay {
  date: string
  tempMax: number
  tempMin: number
  precipitation: number
  weatherCode: number
  condition: string
  icon: string
}

export interface WeekendWeather {
  saturday: WeatherDay
  sunday: WeatherDay
  fetchedAt: string
}

export interface LocalEvent {
  title: string
  location: string
  date: string
  type?: string
  driveTime?: string
}

export interface Trip {
  id: string
  title: string
  location: string
  date: string
  rating: number | null
  notes: string
  coordinates: { lat: number; lng: number } | null
  createdAt: string
}

export interface ActivitySection {
  content: string
  ideas: Idea[]
  lastUpdated: string | null
}

export interface Activities {
  weekend: ActivitySection
  date: ActivitySection
}

export const lifeApi = {
  async getActivities(): Promise<Activities> {
    const res = await fetch(`${API_BASE_URL}/api/activities`)
    if (!res.ok) return { weekend: { content: '', ideas: [], lastUpdated: null }, date: { content: '', ideas: [], lastUpdated: null } }
    return res.json()
  },

  async shareIdea(idea: { type: 'weekend' | 'date'; title: string; description: string; driveTime?: string; emoji?: string }): Promise<{ success?: boolean; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/share-idea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(idea),
    })
    return res.json()
  },

  async refreshActivities(): Promise<{ success?: boolean; refreshed?: { weekend: boolean; date: boolean }; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/activities/refresh`, { method: 'POST' })
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
    const res = await fetch(`${API_BASE_URL}/api/birthdays/${id}/email`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return { error: data.error || res.statusText }
    return data
  },

  async getGiftIdeas(id: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/api/birthdays/${id}/gift-ideas`)
    if (!res.ok) return []
    const data = await res.json()
    return data.ideas || []
  },

  async getEmailConfig(): Promise<{ recipients: Record<string, string[]> }> {
    const res = await fetch(`${API_BASE_URL}/api/email-config`)
    if (!res.ok) return { recipients: {} }
    return res.json()
  },

  async updateEmailConfig(config: { recipients: Record<string, string[]> }): Promise<{ recipients: Record<string, string[]> }> {
    const res = await fetch(`${API_BASE_URL}/api/email-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!res.ok) throw new Error('Failed to update email config')
    return res.json()
  },

  async sendTestEmail(type: string): Promise<{ success?: boolean; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/email-test/${type}`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return { error: data.error || res.statusText }
    return data
  },

  async getFilesPaginated(page: number, limit: number): Promise<{ files: Array<{ name: string; size: number; sizeHuman: string; date: string }>; total: number; page: number; totalPages: number }> {
    const res = await fetch(`${API_BASE_URL}/api/files?page=${page}&limit=${limit}`)
    if (!res.ok) return { files: [], total: 0, page: 1, totalPages: 0 }
    return res.json()
  },

  async getWeekendWeather(): Promise<WeekendWeather | null> {
    const res = await fetch(`${API_BASE_URL}/api/weather/weekend`)
    if (!res.ok) return null
    return res.json()
  },

  async getLocalEvents(): Promise<LocalEvent[]> {
    const res = await fetch(`${API_BASE_URL}/api/events/local`)
    if (!res.ok) return []
    return res.json()
  },

  async getTrips(): Promise<Trip[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips`)
    if (!res.ok) return []
    return res.json()
  },

  async addTrip(trip: { title: string; location: string; date?: string; rating?: number; notes?: string }): Promise<Trip> {
    const res = await fetch(`${API_BASE_URL}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    })
    if (!res.ok) throw new Error('Failed to add trip')
    return res.json()
  },
}
