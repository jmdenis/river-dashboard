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
  homeCity?: string
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

export interface HomeSettings {
  homeAddress: string
  homeCity: string
  homeCoords: { lat: number; lng: number }
}

// Raw types from /api/trips/upcoming
interface RawFlight {
  number: string
  from: string
  to: string
  depart: string
  arrive: string
}

interface RawHotel {
  name: string
  address: string | null
  checkIn: string
  checkOut: string
  confirmationNumber: string | null
}

interface RawHotelInfo {
  hasGym: boolean
  hasPool: boolean
  hasBreakfast: boolean
  nearestMetro: string
  walkScore: string
  neighborhood: string
}

interface RawTrip {
  id: string
  flights: RawFlight[]
  returnFlights?: RawFlight[]
  destination: string
  dates: { depart: string; arrive?: string; return?: string }
  status: 'upcoming' | 'active'
  hotel?: RawHotel
  hotelInfo?: RawHotelInfo
  context: {
    weather?: { forecast: { date: string; tempMax: number; tempMin: number; precipitation: number; condition: string }[] }
    timezone?: { description: string }
    currency?: { description: string }
  }
}

export interface UpcomingTripHotel {
  name: string
  checkIn: string         // "Feb 23"
  checkOut: string        // "Feb 28"
  confirmationNumber: string | null
  hasGym: boolean
  hasPool: boolean
  hasBreakfast: boolean
  nearestMetro: string
  neighborhood: string
}

export interface UpcomingTripFlight {
  number: string
  from: string
  to: string
  depart: string          // ISO or time string
  arrive: string          // ISO or time string
}

export interface UpcomingTrip {
  id: string
  destination: string
  emoji: string
  dateRange: string       // "Feb 23-28"
  route: string           // "TLS → CDG → SFO"
  daysUntil: number
  weather: string         // "18°C"
  weatherIcon: string     // "☀️"
  timezone: string        // "-9h"
  currency: string        // "=€0.92"
  status: 'upcoming' | 'active'
  hotel?: UpcomingTripHotel
  flights?: UpcomingTripFlight[]
}

export interface TripQuestion {
  id: string
  question: string
  answer: string
  asked: boolean
}

export interface TripPreferencesResponse {
  preferences: Record<string, string | string[] | number>
  questions: TripQuestion[]
  walkTime: { estimate: boolean; note: string } | null
}

export type EquipmentType = 'none' | 'dumbbells' | 'kettlebells'

export interface TravelWorkoutExercise {
  name: string
  sets?: number
  reps_or_duration: string
  rest_seconds: number
  description: string
  imageQuery: string
  muscleGroups?: string[]
}

export interface TravelWorkout {
  title?: string
  duration?: string
  duration_min?: number
  equipment?: EquipmentType
  weight_suggestion?: string
  rounds?: number
  exercises: TravelWorkoutExercise[]
  generatedAt?: string
}

export interface DayPlanStep {
  time: string
  action: string
  type?: 'drive' | 'arrive' | 'activity' | 'lunch'
  notes?: string
  place?: string
  cuisine?: string
  price?: string
  parking?: string
  duration?: string
  mapQuery?: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  birthday: string // MM-DD
  birthYear?: string // YYYY
  phone: string
  email: string
  notes: string
  tags: string[]
  relationship: string
  deceased?: boolean
  hidden?: boolean
  photo?: string
  lastContact?: string // YYYY-MM-DD
  giftHistory: string[]
  // Legacy fields kept for birthday compatibility
  emailSentYear?: number
}

export interface DayPlan {
  id?: string
  title: string
  day: string
  steps: DayPlanStep[]
  createdAt?: string
}

export interface PackingItem {
  name: string
  quantity: number
  packed: boolean
  weatherNote: string | null
}

export interface PackingCategory {
  name: string
  items: PackingItem[]
}

export interface PackingList {
  categories: PackingCategory[]
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

  async refreshWeekendActivities(): Promise<{ success?: boolean; refreshed?: { weekend: boolean; date: boolean }; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/activities/refresh/weekend`, { method: 'POST' })
    return res.json()
  },

  async refreshDateActivities(): Promise<{ success?: boolean; refreshed?: { weekend: boolean; date: boolean }; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/activities/refresh/date`, { method: 'POST' })
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

  async getSettings(): Promise<HomeSettings> {
    const res = await fetch(`${API_BASE_URL}/api/settings`)
    if (!res.ok) return { homeAddress: '', homeCity: '', homeCoords: { lat: 0, lng: 0 } }
    return res.json()
  },

  async updateSettings(settings: Partial<HomeSettings>): Promise<HomeSettings> {
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!res.ok) throw new Error('Failed to update settings')
    return res.json()
  },

  async getUpcomingTrip(): Promise<UpcomingTrip | null> {
    const res = await fetch(`${API_BASE_URL}/api/trips/upcoming`)
    if (!res.ok) return null
    const data = await res.json()
    const trips = Array.isArray(data) ? data : []
    const trip = trips.find((t: RawTrip) => t.destination !== 'Toulouse')
    if (!trip) return null

    // Build route from flights: extract airport codes from city names
    const airportCodes: Record<string, string> = {
      'toulouse': 'TLS', 'paris cdg': 'CDG', 'paris': 'CDG',
      'san francisco': 'SFO', 'new york': 'JFK', 'los angeles': 'LAX',
      'london': 'LHR', 'tokyo': 'NRT', 'barcelona': 'BCN',
    }
    const toCode = (city: string) => airportCodes[city.toLowerCase()] || city.slice(0, 3).toUpperCase()
    const route = trip.flights?.length
      ? [toCode(trip.flights[0].from), ...trip.flights.map((f: RawFlight) => toCode(f.to))].join(' → ')
      : trip.destination

    // Format date range: "Feb 23-28" — use return date from merged trip
    const depart = new Date(trip.dates.depart + 'T00:00:00')
    const returnDateStr = trip.dates.return || trip.dates.arrive
    const returnDate = returnDateStr ? new Date(returnDateStr + 'T00:00:00') : null
    const monthShort = depart.toLocaleDateString('en-US', { month: 'short' })
    const dateRange = returnDate && returnDate.getTime() !== depart.getTime()
      ? `${monthShort} ${depart.getDate()}-${returnDate.getDate()}`
      : `${monthShort} ${depart.getDate()}`

    // Days until departure
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const daysUntil = Math.max(0, Math.round((depart.getTime() - todayMidnight.getTime()) / 86400000))

    // Weather mapping
    const forecast = trip.context?.weather?.forecast?.[0]
    const conditionLower = (forecast?.condition || '').toLowerCase()
    const weatherIcon = conditionLower.includes('snow') ? '🌨️'
      : conditionLower.includes('rain') || conditionLower.includes('drizzle') || conditionLower.includes('shower') ? '🌧️'
      : conditionLower.includes('cloud') || conditionLower.includes('overcast') ? '⛅'
      : conditionLower.includes('fog') || conditionLower.includes('mist') ? '🌫️'
      : conditionLower.includes('thunder') || conditionLower.includes('storm') ? '⛈️'
      : '☀️'

    // Build hotel info if available
    const formatHotelDate = (iso: string) => {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    const hotel = trip.hotel ? {
      name: trip.hotel.name,
      checkIn: formatHotelDate(trip.hotel.checkIn),
      checkOut: formatHotelDate(trip.hotel.checkOut),
      confirmationNumber: trip.hotel.confirmationNumber || null,
      hasGym: trip.hotelInfo?.hasGym ?? false,
      hasPool: trip.hotelInfo?.hasPool ?? false,
      hasBreakfast: trip.hotelInfo?.hasBreakfast ?? false,
      nearestMetro: trip.hotelInfo?.nearestMetro || '',
      neighborhood: trip.hotelInfo?.neighborhood || '',
    } : undefined

    // Map flights for display
    const flights = trip.flights?.map((f: RawFlight) => ({
      number: f.number,
      from: toCode(f.from),
      to: toCode(f.to),
      depart: f.depart || '',
      arrive: f.arrive || '',
    })) || undefined

    return {
      id: trip.id,
      destination: trip.destination,
      emoji: '✈️',
      dateRange,
      route,
      daysUntil,
      status: trip.status,
      weatherIcon,
      weather: forecast ? `${Math.round(forecast.tempMax)}°C` : '',
      timezone: trip.context?.timezone?.description || '',
      currency: trip.context?.currency?.description || '',
      hotel,
      flights,
    }
  },

  async getTravelWorkout(equipment: EquipmentType = 'none'): Promise<TravelWorkout> {
    const res = await fetch(`${API_BASE_URL}/api/workouts/travel?equipment=${equipment}`)
    if (!res.ok) return { exercises: [] }
    return res.json()
  },

  async refreshWorkout(equipment: EquipmentType = 'none'): Promise<TravelWorkout> {
    const res = await fetch(`${API_BASE_URL}/api/workouts/refresh?equipment=${equipment}`, { method: 'POST' })
    if (!res.ok) return { exercises: [] }
    return res.json()
  },

  async emailWorkout(workout: TravelWorkout): Promise<{ success?: boolean; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/workouts/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || res.statusText }
    return data
  },

  async notifyAnne(id: string): Promise<{ success?: boolean; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${id}/notify-anne`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return { error: data.error || res.statusText }
    return data
  },

  async getTripPreferences(id: string): Promise<TripPreferencesResponse> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${id}/preferences`)
    if (!res.ok) return { preferences: {}, questions: [], walkTime: null }
    return res.json()
  },

  async updateTripPreference(id: string, data: { key?: string; value?: string; questionId?: string; answer?: string }): Promise<TripPreferencesResponse> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${id}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update preferences')
    return res.json()
  },

  async planDay(params: { title: string; location?: string; day: 'Saturday' | 'Sunday'; weather?: string }): Promise<DayPlan> {
    const res = await fetch(`${API_BASE_URL}/api/plan-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to generate plan')
    }
    return res.json()
  },

  async sharePlan(plan: DayPlan): Promise<{ success?: boolean; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/plan-day/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || res.statusText }
    return data
  },

  async getContacts(): Promise<Contact[]> {
    const res = await fetch(`${API_BASE_URL}/api/contacts`)
    if (!res.ok) return []
    return res.json()
  },

  async createContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    const res = await fetch(`${API_BASE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    })
    if (!res.ok) throw new Error('Failed to create contact')
    return res.json()
  },

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
    const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update contact')
    return res.json()
  },

  async deleteContact(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/contacts/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete contact')
  },

  async downloadIcs(plan: DayPlan, date?: string): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/api/plan-day/ics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, date }),
    })
    if (!res.ok) throw new Error('Failed to generate ICS')
    return res.blob()
  },

  async generatePackingList(tripId: string): Promise<PackingList> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/packing-list`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to generate packing list')
    return res.json()
  },

  async getPackingList(tripId: string): Promise<PackingList | null> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/packing-list`)
    if (!res.ok) return null
    return res.json()
  },

  async savePackingList(tripId: string, packingList: PackingList): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/packing-list`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packingList),
    })
    if (!res.ok) throw new Error('Failed to save packing list')
  },
}
