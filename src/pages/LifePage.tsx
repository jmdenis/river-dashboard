import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { lifeApi, type LifeData, type Birthday, type Reminder, type CronJob, type CalendarEvent, type Activities } from '../services/lifeApi'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../components/ui/dialog'
import { Loader2, Plus, Trash2, Check, Clock, Calendar as CalendarIcon, MessageCircle, Gift, Copy, ExternalLink, Sparkles, Heart } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function daysUntilBirthday(mmdd: string): number {
  const [mm, dd] = mmdd.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thisYear = today.getFullYear()
  let next = new Date(thisYear, mm - 1, dd)
  if (next < today) next = new Date(thisYear + 1, mm - 1, dd)
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatBirthdayDate(mmdd: string): string {
  const [mm, dd] = mmdd.split('-').map(Number)
  return `${MONTHS[mm - 1]} ${dd}`
}

function getDayLabel(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(date)
  eventDate.setHours(0, 0, 0, 0)
  
  const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return dayNames[eventDate.getDay()]
}

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  const start = new Date(event.start)
  const hours = start.getHours().toString().padStart(2, '0')
  const minutes = start.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const ANNE_EMAILS = ['anne@denis.me', 'ptitscargot@gmail.com']

const CATEGORY_COLORS: Record<string, { dot: string; text: string }> = {
  work:     { dot: 'bg-violet-400', text: 'text-violet-400' },
  personal: { dot: 'bg-blue-400',   text: 'text-blue-400' },
  family:   { dot: 'bg-pink-400',   text: 'text-pink-400' },
  health:   { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  social:   { dot: 'bg-amber-400',  text: 'text-amber-400' },
  travel:   { dot: 'bg-cyan-400',   text: 'text-cyan-400' },
  finance:  { dot: 'bg-orange-400', text: 'text-orange-400' },
}

function getCategoryStyle(event: CalendarEvent) {
  // Anne's events get a special pink treatment regardless of category
  if (ANNE_EMAILS.includes(event.organizer)) {
    return CATEGORY_COLORS.family
  }
  return CATEGORY_COLORS[event.category] || CATEGORY_COLORS.personal
}

// --- Calendar Section ---
function CalendarSection({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-4 w-4 text-white/40" />
            <p className="text-xs uppercase tracking-widest text-white/40">This Week</p>
          </div>
          <p className="text-sm text-white/20 text-center py-8">Nothing scheduled</p>
        </CardContent>
      </Card>
    )
  }

  // Group events by day
  const eventsByDay: Record<string, CalendarEvent[]> = {}
  events.forEach(event => {
    const date = new Date(event.start)
    const dayLabel = getDayLabel(date)
    if (!eventsByDay[dayLabel]) eventsByDay[dayLabel] = []
    eventsByDay[dayLabel].push(event)
  })

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">This Week</p>
        </div>
        <div className="space-y-4">
          {Object.entries(eventsByDay).map(([dayLabel, dayEvents]) => {
            const isToday = dayLabel === 'Today'
            return (
              <div key={dayLabel}>
                <p className={`text-xs font-medium mb-2 ${isToday ? 'text-white' : 'text-white/40'}`}>
                  {dayLabel}
                </p>
                <div className="space-y-1">
                  {dayEvents.map((event, idx) => {
                    const style = getCategoryStyle(event)
                    return (
                      <div key={idx} className={`flex items-start gap-3 py-1 ${isToday ? 'text-white' : 'text-white/40'}`}>
                        <span className="text-xs font-mono shrink-0 w-12">{formatEventTime(event)}</span>
                        <span className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${style.dot}`} />
                        <span className={`text-sm flex-1 ${style.text}`}>{event.title}</span>
                        {event.location && (
                          <span className="text-xs text-white/30 truncate max-w-[200px]">{event.location}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Cron Jobs Section ---
function CronJobsSection({ cronJobs, onAdd, onDelete }: {
  cronJobs: CronJob[]
  onAdd: (line: string) => void
  onDelete: (line: string) => void
}) {
  const [newLine, setNewLine] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Cron Jobs</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs text-white/40 border-white/10 hover:bg-white/[0.03]">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
              <DialogHeader><DialogTitle className="text-white/90 font-medium">Add Cron Job</DialogTitle></DialogHeader>
              <Input
                placeholder="* * * * * /path/to/command"
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLine.trim()) {
                    onAdd(newLine.trim())
                    setNewLine('')
                    setOpen(false)
                  }
                }}
                className="bg-white/[0.03] border-white/10 text-white/80 font-mono text-xs"
              />
              <p className="text-xs text-white/25">Format: minute hour day month weekday command</p>
              <DialogFooter>
                <Button
                  onClick={() => { onAdd(newLine.trim()); setNewLine(''); setOpen(false) }}
                  disabled={!newLine.trim()}
                  className="bg-violet-500 hover:bg-violet-600 text-white"
                >
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {cronJobs.length === 0 ? (
          <p className="text-sm text-white/20 text-center py-8">No cron jobs configured</p>
        ) : (
          <div className="space-y-2">
            {cronJobs.map((job) => {
              const rawSchedule = job.raw.split(/\s+/).slice(0, 5).join(' ')
              return (
                <div key={job.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors duration-150">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${job.source === 'server' ? 'bg-violet-500/80' : 'bg-emerald-500/80'}`} />
                      <span className="text-sm text-white/80">{job.name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-white/40">{job.schedule}</span>
                      <code className="text-[10px] text-violet-400/60 font-mono">{rawSchedule}</code>
                    </div>
                  </div>
                  {job.source === 'crontab' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(job.raw)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Weekly Planner Section ---
function WeeklyPlannerSection({ planner, onUpdate }: {
  planner: Record<string, string[]>
  onUpdate: (planner: Record<string, string[]>) => void
}) {
  const [editDay, setEditDay] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')

  const addItem = (day: string) => {
    if (!newItem.trim()) return
    const updated = { ...planner, [day]: [...(planner[day] || []), newItem.trim()] }
    onUpdate(updated)
    setNewItem('')
  }

  const removeItem = (day: string, idx: number) => {
    const updated = { ...planner, [day]: (planner[day] || []).filter((_, i) => i !== idx) }
    onUpdate(updated)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-6">Weekly Planner</p>
        <div className="grid gap-3 md:grid-cols-7">
          {DAYS.map((day) => {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
            const isToday = day === today
            return (
              <div key={day} className={`rounded-xl border p-4 ${isToday ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs uppercase tracking-widest ${isToday ? 'text-violet-400' : 'text-white/30'}`}>
                    {day.slice(0, 3)}
                  </span>
                  {isToday && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                </div>
                <div className="space-y-1.5 min-h-[60px]">
                  {(planner[day] || []).map((item, idx) => (
                    <div key={idx} className="group flex items-center justify-between text-sm">
                      <span className="truncate text-white/60">{item}</span>
                      <button
                        onClick={() => removeItem(day, idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400/80"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {editDay === day ? (
                  <div className="mt-2">
                    <Input
                      placeholder="Add item..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { addItem(day); setEditDay(null) }
                        if (e.key === 'Escape') { setNewItem(''); setEditDay(null) }
                      }}
                      onBlur={() => { if (newItem.trim()) addItem(day); setEditDay(null); setNewItem('') }}
                      autoFocus
                      className="h-7 text-xs bg-transparent border-white/10"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setEditDay(day)}
                    className="mt-2 text-xs text-white/20 hover:text-white/40 transition-colors duration-150"
                  >
                    <Plus className="h-3 w-3 inline mr-1" />add
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Birthday Message Generator ---
function generateBirthdayMessage(b: Birthday): string {
  const firstName = b.name.split(' ')[0]
  const note = b.note || b.notes || ''
  const messages = [
    `Joyeux anniversaire ${firstName} ! J'espère que tu passes une belle journée entouré(e) de ceux que tu aimes. Gros bisous 🎂`,
    `Bon anniversaire ${firstName} ! Je te souhaite une journée remplie de bonheur et de belles surprises. À très vite ! 🎉`,
    `${firstName}, joyeux anniversaire ! Que cette nouvelle année t'apporte tout ce que tu mérites. Je pense bien à toi 🥳`,
    `Happy birthday ${firstName} ! J'espère que tu vas passer un super moment aujourd'hui. On se voit bientôt j'espère ! 🎂`,
  ]
  const msg = messages[Math.abs(firstName.charCodeAt(0)) % messages.length]
  if (note.includes('org:')) {
    return msg
  }
  return msg
}

// --- Gift Ideas Generator ---
function generateGiftIdeas(b: Birthday): { idea: string; searchQuery: string }[] {
  const note = b.note || b.notes || ''
  const defaults = [
    { idea: '📚 Un beau livre (roman, art, cuisine...)', searchQuery: 'idée cadeau livre Toulouse' },
    { idea: '🍷 Une bonne bouteille de vin du Sud-Ouest', searchQuery: 'cave vin cadeau Toulouse' },
    { idea: '🎟️ Un bon cadeau expérience (spa, restaurant, vol en montgolfière...)', searchQuery: 'bon cadeau expérience Toulouse' },
    { idea: '🧴 Un coffret bien-être / cosmétiques', searchQuery: 'coffret cadeau bien-être Toulouse' },
    { idea: '🎨 Un objet artisanal local', searchQuery: 'artisan cadeau Toulouse' },
  ]
  if (note.toLowerCase().includes('facebook') || note.toLowerCase().includes('meta') || note.toLowerCase().includes('google') || note.toLowerCase().includes('apple')) {
    defaults[0] = { idea: '🖥️ Un accessoire tech / gadget', searchQuery: 'accessoire tech cadeau Toulouse' }
  }
  return defaults
}

// --- Birthdays Section ---
function BirthdaysSection({ birthdays, onUpdate }: {
  birthdays: Birthday[]
  onUpdate: (birthdays: Birthday[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [messageModal, setMessageModal] = useState<Birthday | null>(null)
  const [giftModal, setGiftModal] = useState<Birthday | null>(null)
  const [copied, setCopied] = useState(false)

  // Separate living and deceased, sort living by upcoming date
  const living = birthdays.filter(b => !b.deceased)
  const deceased = birthdays.filter(b => b.deceased)
  const sortedLiving = [...living].sort((a, b) => daysUntilBirthday(a.date) - daysUntilBirthday(b.date))
  const upcoming = sortedLiving.filter(b => daysUntilBirthday(b.date) <= 30)
  const displayedLiving = showAll ? sortedLiving : upcoming

  const getCountdown = (days: number): string => {
    if (days === 0) return 'Today! 🎂'
    if (days === 1) return 'Tomorrow'
    return `in ${days} days`
  }

  const getAge = (dateStr: string, yearStr?: string): string | null => {
    if (!yearStr) return null
    const birthYear = parseInt(yearStr)
    const currentYear = new Date().getFullYear()
    const [mm, dd] = dateStr.split('-').map(Number)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let nextBirthday = new Date(currentYear, mm - 1, dd)
    if (nextBirthday < today) nextBirthday = new Date(currentYear + 1, mm - 1, dd)
    const age = nextBirthday.getFullYear() - birthYear
    return `Turns ${age}`
  }

  const addBirthday = () => {
    if (!name.trim() || !date) return
    const mmdd = date.slice(5)
    const newBday: Birthday = { id: Date.now().toString(), name: name.trim(), date: mmdd, note: note.trim() }
    onUpdate([...birthdays, newBday])
    setName(''); setDate(''); setNote(''); setOpen(false)
  }

  const removeBirthday = (id: string) => {
    onUpdate(birthdays.filter((b) => b.id !== id))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Birthdays</p>
            {birthdays.length > 0 && <Badge variant="secondary" className="bg-white/5 text-white/50 border-0 text-[10px]">{birthdays.length}</Badge>}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs text-white/40 border-white/10 hover:bg-white/[0.03]">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
              <DialogHeader><DialogTitle className="text-white/90 font-medium">Add Birthday</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/[0.03] border-white/10 text-white/80" />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/[0.03] border-white/10 text-white/80" />
                <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="bg-white/[0.03] border-white/10 text-white/80" />
              </div>
              <DialogFooter>
                <Button onClick={addBirthday} disabled={!name.trim() || !date} className="bg-violet-500 hover:bg-violet-600 text-white">Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {birthdays.length === 0 ? (
          <p className="text-sm text-white/20 text-center py-8">No birthdays added</p>
        ) : displayedLiving.length === 0 && deceased.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-white/20 mb-2">No birthdays in the next 30 days</p>
            <button onClick={() => setShowAll(true)} className="text-xs text-violet-400 hover:text-violet-300">Show all {birthdays.length} birthdays</button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {displayedLiving.map((b) => {
                const days = daysUntilBirthday(b.date)
                const isToday = days === 0
                const countdown = getCountdown(days)
                const age = getAge(b.date, b.year)
                return (
                  <div
                    key={b.id}
                    className={`group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors duration-150 ${isToday ? 'bg-violet-500/10 border border-violet-500/20' : ''}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${isToday ? 'text-violet-400' : 'text-white/80'}`}>{b.name}</span>
                        <span className="text-xs text-white/40">{formatBirthdayDate(b.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={isToday ? 'text-violet-300 animate-bounce-in' : 'text-white/50'}>{countdown}</span>
                        {age && <span className="text-white/30">· {age}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-violet-400 h-7 w-7"
                        onClick={() => setMessageModal(b)}
                        title="Birthday message"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-violet-400 h-7 w-7"
                        onClick={() => setGiftModal(b)}
                        title="Gift ideas"
                      >
                        <Gift className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400/80 h-7 w-7"
                        onClick={() => removeBirthday(b.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Deceased entries — dimmed, at bottom */}
            {(showAll || displayedLiving.length > 0) && deceased.length > 0 && (
              <div className="pt-3 mt-3 border-t border-white/[0.04]">
                {deceased.map((b) => (
                  <div key={b.id} className="flex items-center p-3 rounded-xl">
                    <span className="text-sm text-white/20">🕊️ {b.name}</span>
                  </div>
                ))}
              </div>
            )}
            {!showAll && sortedLiving.length > upcoming.length && (
              <button onClick={() => setShowAll(true)} className="text-xs text-white/30 hover:text-white/50 mt-3 w-full text-center">
                Show all {sortedLiving.length} birthdays
              </button>
            )}
            {showAll && (
              <button onClick={() => setShowAll(false)} className="text-xs text-white/30 hover:text-white/50 mt-3 w-full text-center">
                Show upcoming only
              </button>
            )}
          </>
        )}
      </CardContent>

      {/* Message Modal */}
      <Dialog open={!!messageModal} onOpenChange={(v) => { if (!v) setMessageModal(null) }}>
        <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-medium">
              💬 Message pour {messageModal?.name.split(' ')[0]}
            </DialogTitle>
          </DialogHeader>
          {messageModal && (
            <div className="space-y-4">
              <p className="text-sm text-white/70 bg-white/[0.03] rounded-xl p-4 leading-relaxed">
                {generateBirthdayMessage(messageModal)}
              </p>
              <Button
                onClick={() => copyToClipboard(generateBirthdayMessage(messageModal))}
                className="w-full bg-violet-500 hover:bg-violet-600 text-white"
              >
                <Copy className="h-3.5 w-3.5 mr-2" />
                {copied ? 'Copié !' : 'Copier le message'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Gift Ideas Modal */}
      <Dialog open={!!giftModal} onOpenChange={(v) => { if (!v) setGiftModal(null) }}>
        <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-medium">
              🎁 Idées cadeaux pour {giftModal?.name.split(' ')[0]}
            </DialogTitle>
          </DialogHeader>
          {giftModal && (
            <div className="space-y-2">
              {generateGiftIdeas(giftModal).map((gift, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                  <span className="text-sm text-white/70">{gift.idea}</span>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(gift.searchQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 shrink-0 ml-2"
                    title="Chercher près de Toulouse"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// --- Reminders Section ---
function RemindersSection({ reminders, onUpdate }: {
  reminders: Reminder[]
  onUpdate: (reminders: Reminder[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')

  const addReminder = () => {
    if (!title.trim()) return
    const newReminder: Reminder = { 
      id: `reminder-${Date.now()}`, 
      title: title.trim(), 
      due, 
      recurring: null,
      status: 'active' 
    }
    onUpdate([...reminders, newReminder])
    setTitle(''); setDue(''); setOpen(false)
  }

  const toggleDone = (id: string) => {
    onUpdate(reminders.map((r) => r.id === id ? { ...r, status: r.status === 'done' ? 'active' : 'done' } : r))
  }

  const removeReminder = (id: string) => {
    onUpdate(reminders.filter((r) => r.id !== id))
  }

  const active = reminders.filter((r) => r.status === 'active').sort((a, b) => a.due.localeCompare(b.due))
  const done = reminders.filter((r) => r.status === 'done')

  const isOverdue = (due: string) => {
    if (!due) return false
    const dueDate = new Date(due)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  const getCountdown = (due: string): string => {
    if (!due) return ''
    const dueDate = new Date(due)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `${Math.abs(days)} days overdue`
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return `in ${days} days`
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Reminders</p>
            {active.length > 0 && <Badge variant="secondary" className="bg-white/5 text-white/50 border-0 text-[10px]">{active.length}</Badge>}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs text-white/40 border-white/10 hover:bg-white/[0.03]">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
              <DialogHeader><DialogTitle className="text-white/90 font-medium">Add Reminder</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Reminder title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/[0.03] border-white/10 text-white/80" />
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-white/[0.03] border-white/10 text-white/80" />
              </div>
              <DialogFooter>
                <Button onClick={addReminder} disabled={!title.trim()} className="bg-violet-500 hover:bg-violet-600 text-white">Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {active.length === 0 && done.length === 0 ? (
          <p className="text-sm text-white/20 text-center py-8">No reminders</p>
        ) : (
          <div className="space-y-1">
            {active.map((r) => {
              const overdue = isOverdue(r.due)
              const countdown = getCountdown(r.due)
              return (
                <div 
                  key={r.id} 
                  className={`group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors duration-150 ${overdue ? 'bg-rose-500/5 border border-rose-500/20' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleDone(r.id)} className="h-4 w-4 rounded border border-white/[0.15] flex items-center justify-center hover:border-violet-400 transition-colors duration-150 shrink-0">
                    </button>
                    <div>
                      <p className={`text-sm ${overdue ? 'text-rose-400' : 'text-white/60'}`}>{r.title}</p>
                      {r.due && (
                        <p className={`text-xs flex items-center gap-1 mt-0.5 ${overdue ? 'text-rose-400/80' : 'text-white/25'}`}>
                          <Clock className="h-3 w-3" />
                          {countdown} · {new Date(r.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400/80 h-7 w-7"
                    onClick={() => removeReminder(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
              </div>
            )
            })}
            {done.length > 0 && (
              <div className="pt-3 mt-3 border-t border-white/[0.04]">
                <p className="text-xs text-white/20 mb-2 px-3">Completed</p>
                {done.map((r) => (
                  <div key={r.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors duration-150">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleDone(r.id)} className="h-4 w-4 rounded border border-violet-400/30 bg-violet-400/10 flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-violet-400" />
                      </button>
                      <span className="text-sm text-white/25 line-through">{r.title}</span>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400/80 h-7 w-7"
                      onClick={() => removeReminder(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Weekend Ideas Section ---
function WeekendIdeasSection({ content, lastUpdated }: { content: string; lastUpdated: string | null }) {
  // Extract the latest suggestions section from the markdown
  function getLatestSuggestions(md: string): string {
    if (!md.trim()) return ''
    // Find the last "### " heading (latest date entry) and everything after it until the next "## " heading
    const sections = md.split(/^## /m).filter(Boolean)
    // Find the "Weekend Ideas Archive" section which contains date-based suggestions
    const archiveSection = sections.find(s => s.startsWith('Weekend Ideas Archive'))
    if (archiveSection) {
      // Get the last ### entry (most recent suggestions)
      const entries = archiveSection.split(/^### /m).filter(Boolean)
      if (entries.length > 1) {
        // Last entry is the most recent
        const latest = entries[entries.length - 1]
        return '### ' + latest.trim()
      }
    }
    // Fallback: return everything after the first ## heading with suggestions
    return md
  }

  const latestContent = getLatestSuggestions(content)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Weekend Ideas</p>
          {lastUpdated && (
            <span className="text-[10px] text-white/20 ml-auto">Updated {lastUpdated}</span>
          )}
        </div>
        {latestContent ? (
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white/80 prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2 prose-headings:mt-0
            prose-p:text-white/50 prose-p:text-sm prose-p:leading-relaxed prose-p:my-1
            prose-li:text-white/50 prose-li:text-sm prose-li:my-0
            prose-strong:text-white/70 prose-strong:font-medium
            prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{latestContent}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-white/20 text-center py-8">
            No suggestions yet. Next update: Thursday 7pm.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// --- Date Ideas Section ---
function DateIdeasSection({ content, lastUpdated }: { content: string; lastUpdated: string | null }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Date Ideas</p>
          {lastUpdated && (
            <span className="text-[10px] text-white/20 ml-auto">Updated {lastUpdated}</span>
          )}
        </div>
        {content.trim() ? (
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white/80 prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2 prose-headings:mt-0
            prose-p:text-white/50 prose-p:text-sm prose-p:leading-relaxed prose-p:my-1
            prose-li:text-white/50 prose-li:text-sm prose-li:my-0
            prose-strong:text-white/70 prose-strong:font-medium
            prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-white/20 text-center py-8">
            No suggestions yet. Next update: Monday 9am.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// --- Main Life Page ---
export default function LifePage() {
  const [data, setData] = useState<LifeData | null>(null)
  const [calendar, setCalendar] = useState<CalendarEvent[]>([])
  const [activities, setActivities] = useState<Activities>({ weekend: { content: '', lastUpdated: null }, date: { content: '', lastUpdated: null } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      lifeApi.getData(),
      lifeApi.getCalendar(7), // Get next 7 days
      lifeApi.getReminders(),
      lifeApi.getActivities()
    ])
      .then(([lifeData, calendarData, remindersData, activitiesData]) => {
        setData({ ...lifeData, reminders: remindersData.length > 0 ? remindersData : lifeData.reminders })
        setCalendar(calendarData)
        setActivities(activitiesData)
      })
      .catch((e) => console.error('LifePage: Error loading data:', e))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-white/20 text-center py-12">Failed to load data</p>
  }

  const updateBirthdays = async (birthdays: Birthday[]) => {
    setData({ ...data, birthdays })
    await lifeApi.update({ birthdays })
  }

  const updateReminders = async (reminders: Reminder[]) => {
    setData({ ...data, reminders })
    await lifeApi.update({ reminders })
  }

  const updatePlanner = async (weeklyPlanner: Record<string, string[]>) => {
    setData({ ...data, weeklyPlanner })
    await lifeApi.update({ weeklyPlanner })
  }

  const addCron = async (line: string) => {
    const result = await lifeApi.cronAction('add', line)
    setData({ ...data, cronJobs: result.cronJobs })
  }

  const deleteCron = async (line: string) => {
    const result = await lifeApi.cronAction('delete', line)
    setData({ ...data, cronJobs: result.cronJobs })
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  }

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.div variants={sectionVariants}>
        <h1 className="text-2xl font-semibold text-white/90">Life</h1>
        <p className="text-sm text-white/50 mt-1">Schedule, reminders, and personal admin</p>
      </motion.div>

      <motion.div variants={sectionVariants}>
        <CalendarSection events={calendar} />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <WeekendIdeasSection content={activities.weekend.content} lastUpdated={activities.weekend.lastUpdated} />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <DateIdeasSection content={activities.date.content} lastUpdated={activities.date.lastUpdated} />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <RemindersSection reminders={data.reminders} onUpdate={updateReminders} />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <BirthdaysSection birthdays={data.birthdays} onUpdate={updateBirthdays} />
      </motion.div>

      <motion.div variants={sectionVariants}>
        <CronJobsSection cronJobs={data.cronJobs} onAdd={addCron} onDelete={deleteCron} />
      </motion.div>
    </motion.div>
  )
}
