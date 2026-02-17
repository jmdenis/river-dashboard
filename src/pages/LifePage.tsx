import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { lifeApi, type LifeData, type Birthday, type Reminder, type CronJob, type CalendarEvent, type Activities, type Idea, type WeekendWeather, type LocalEvent, type Trip } from '../services/lifeApi'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../components/ui/dialog'
import { Loader2, Plus, Trash2, Check, Clock, Calendar as CalendarIcon, MessageCircle, Gift, Copy, ExternalLink, Sparkles, Heart, Pencil, X, Eye, EyeOff, Mail, RefreshCw, Car, Share2, MapPin, ParkingSquare, Hotel, Search, ChevronDown, Star, UtensilsCrossed, History, CloudRain, Sun, CloudSun, Cloud, Snowflake, CloudDrizzle, Zap, Wind } from 'lucide-react'

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
  if (ANNE_EMAILS.includes(event.organizer)) {
    return CATEGORY_COLORS.family
  }
  return CATEGORY_COLORS[event.category] || CATEGORY_COLORS.personal
}

// --- French name gender mapping ---
const FEMALE_NAMES = new Set([
  'alexandra','alice','alison','amelie','amélie','amy','anais','anaïs','andrea','anne','aurelie','aurélie',
  'brigitte','camille','carol','caroline','catherine','charlotte','christelle','christine','claire','claudine',
  'colette','corinne','danièle','delphine','dominique','edith','elise','emilie','emma','estelle','eve',
  'fabienne','florence','francine','françoise','gabrielle','genevieve','geneviève','hélène','isabelle',
  'jacqueline','jeanne','jeanine','jennifer','josiane','judith','julie','juliette','justine',
  'laëtitia','laetitia','laure','laurence','lea','léa','liliane','louise','lucie','lydia',
  'madeleine','magalie','manon','marguerite','marie','marilou','marine','martine','mathilde','michele','michèle','monique',
  'nathalie','nicole','odette','patricia','pauline','raphaelle','roxane','sandrine','sarah','simone',
  'sophie','stéphanie','stephanie','sylvie','thérèse','valérie','valerie','véronique','virginie','yvette','yvonne',
])
const MALE_NAMES = new Set([
  'alain','alexandre','alexis','anthony','antoine','arnaud','aurelien','aurélien','bart','benjamin','benoit','benoît',
  'bernard','bruno','charles','christophe','claude','daniel','david','denis','didier','dominique',
  'edouard','emmanuel','eric','étienne','fabien','fabrice','florian','francois','françois','frederic','frédéric',
  'gabriel','geoffrey','georges','gérard','guillaume','guy','henri','hervé','hoa','hugo',
  'jacques','jean','jean-baptiste','jean-claude','jean-marc','jean-yves','jérôme','jeroen',
  'laurent','louis','luc','marc','marcel','mathieu','maxime','michel','mozam','nicolas',
  'oliver','olivier','pascal','patrice','patrick','paul','philippe','pierre',
  'raphael','raphaël','raymond','robert','robin','roger','roland','ronald','roy',
  'samuel','sébastien','sebastien','serge','stéphane','stephane','sylvain','thierry','thomas','vincent','xavier','yves',
])

function inferGender(firstName: string): 'M' | 'F' | null {
  const lower = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const lowerRaw = firstName.toLowerCase()
  if (FEMALE_NAMES.has(lower) || FEMALE_NAMES.has(lowerRaw)) return 'F'
  if (MALE_NAMES.has(lower) || MALE_NAMES.has(lowerRaw)) return 'M'
  return null
}

function getAgeNumber(dateStr: string, yearStr?: string): number | null {
  if (!yearStr) return null
  const birthYear = parseInt(yearStr)
  const currentYear = new Date().getFullYear()
  const [mm, dd] = dateStr.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let nextBirthday = new Date(currentYear, mm - 1, dd)
  if (nextBirthday < today) nextBirthday = new Date(currentYear + 1, mm - 1, dd)
  return nextBirthday.getFullYear() - birthYear
}

// --- Segmented Tab Control ---
type TabId = 'dashboard' | 'ideas' | 'settings'

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'settings', label: 'Settings' },
]

function TabControl({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <div className="inline-flex rounded-full bg-white/[0.06] p-1 border border-white/[0.06]">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
            active === tab.id
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
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
                    const isAnne = ANNE_EMAILS.includes(event.organizer)
                    return (
                      <div key={idx} className={`flex items-start gap-3 py-1 ${isAnne ? 'opacity-40' : isToday ? 'text-white' : 'text-white/40'}`}>
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

// --- Birthday Message Generator ---
function generateBirthdayMessage(b: Birthday): string {
  const firstName = b.name.split(' ')[0]
  const messages = [
    `Joyeux anniversaire ${firstName} ! J'espère que tu passes une belle journée entouré(e) de ceux que tu aimes. Gros bisous`,
    `Bon anniversaire ${firstName} ! Je te souhaite une journée remplie de bonheur et de belles surprises. À très vite !`,
    `${firstName}, joyeux anniversaire ! Que cette nouvelle année t'apporte tout ce que tu mérites. Je pense bien à toi`,
    `Happy birthday ${firstName} ! J'espère que tu vas passer un super moment aujourd'hui. On se voit bientôt j'espère !`,
  ]
  return messages[Math.abs(firstName.charCodeAt(0)) % messages.length]
}

// --- Birthdays Section (Full) ---
function BirthdaysSection({ birthdays, onUpdate, onPatchBirthday, onSendEmail, toast }: {
  birthdays: Birthday[]
  onUpdate: (birthdays: Birthday[]) => void
  onPatchBirthday: (id: string, updates: Partial<Birthday>) => Promise<void>
  onSendEmail: (b: Birthday) => Promise<void>
  toast: (msg: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [messageModal, setMessageModal] = useState<Birthday | null>(null)
  const [giftModal, setGiftModal] = useState<Birthday | null>(null)
  const [giftIdeas, setGiftIdeas] = useState<string[]>([])
  const [giftLoading, setGiftLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch gift ideas from API when modal opens
  useEffect(() => {
    if (!giftModal) { setGiftIdeas([]); return }
    let cancelled = false
    setGiftLoading(true)
    lifeApi.getGiftIdeas(giftModal.id).then(ideas => {
      if (!cancelled) { setGiftIdeas(ideas); setGiftLoading(false) }
    }).catch(() => {
      if (!cancelled) { setGiftIdeas([]); setGiftLoading(false) }
    })
    return () => { cancelled = true }
  }, [giftModal])

  // Separate categories
  const hidden = birthdays.filter(b => b.hidden && !b.deceased)
  const living = birthdays.filter(b => !b.deceased && !b.hidden)
  const deceased = birthdays.filter(b => b.deceased)
  const sortedLiving = [...living].sort((a, b) => daysUntilBirthday(a.date) - daysUntilBirthday(b.date))
  const upcoming = sortedLiving.filter(b => daysUntilBirthday(b.date) <= 30)
  const displayedLiving = showAll ? sortedLiving : upcoming

  const getCountdown = (days: number): string => {
    if (days === 0) return 'Today!'
    if (days === 1) return 'Tomorrow'
    return `in ${days} days`
  }

  const getAge = (dateStr: string, yearStr?: string): string | null => {
    const age = getAgeNumber(dateStr, yearStr)
    if (age === null) return null
    return `Turns ${age}`
  }

  const addBirthday = () => {
    if (!name.trim() || !date) return
    const mmdd = date.slice(5)
    const newBday: Birthday = { id: Date.now().toString(), name: name.trim(), date: mmdd, note: note.trim() }
    onUpdate([...birthdays, newBday])
    setName(''); setDate(''); setNote(''); setOpen(false)
  }

  const hideBirthday = async (id: string) => {
    await onPatchBirthday(id, { hidden: true })
  }

  const unhideBirthday = async (id: string) => {
    await onPatchBirthday(id, { hidden: false })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const giftModalTitle = giftModal ? (() => {
    const firstName = giftModal.name.split(' ')[0]
    const age = getAgeNumber(giftModal.date, giftModal.year)
    const gender = inferGender(firstName)
    const genderLabel = gender === 'M' ? 'H' : gender === 'F' ? 'F' : '?'
    const parts = [firstName]
    if (age !== null) parts.push(`${age} ans`)
    parts.push(genderLabel)
    return parts.join(', ')
  })() : ''

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Birthdays</p>
            {living.length > 0 && <Badge variant="secondary" className="bg-white/5 text-white/50 border-0 text-[10px]">{living.length}</Badge>}
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
        {living.length === 0 && deceased.length === 0 && hidden.length === 0 ? (
          <p className="text-sm text-white/20 text-center py-8">No birthdays added</p>
        ) : displayedLiving.length === 0 && deceased.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-white/20 mb-2">No birthdays in the next 30 days</p>
            <button onClick={() => setShowAll(true)} className="text-xs text-violet-400 hover:text-violet-300">Show all {living.length} birthdays</button>
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
                        {age && <span className="text-white/30">&middot; {age}</span>}
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
                        className={`transition-opacity text-white/30 hover:text-violet-400 h-7 w-7 ${sendingEmailId === b.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        disabled={sendingEmailId === b.id}
                        onClick={async () => { setSendingEmailId(b.id); await onSendEmail(b); setSendingEmailId(null) }}
                        title="Send email reminder"
                      >
                        {sendingEmailId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      </Button>
                      <button
                        onClick={() => hideBirthday(b.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/50 h-7 w-7 flex items-center justify-center"
                        title="Hide"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Deceased entries */}
            {(showAll || displayedLiving.length > 0) && deceased.length > 0 && (
              <div className="pt-3 mt-3 border-t border-white/[0.04]">
                {deceased.map((b) => (
                  <div key={b.id} className="flex items-center p-3 rounded-xl">
                    <span className="text-sm text-white/20">&#x1F54A;&#xFE0F; {b.name}</span>
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
        {/* Hidden entries toggle */}
        {hidden.length > 0 && (
          <div className="pt-3 mt-3 border-t border-white/[0.04]">
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1.5"
            >
              {showHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showHidden ? 'Hide' : 'Show'} hidden ({hidden.length})
            </button>
            {showHidden && (
              <div className="space-y-1 mt-2">
                {hidden.map((b) => (
                  <div key={b.id} className="group flex items-center justify-between p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/20">{b.name}</span>
                      <span className="text-xs text-white/10">{formatBirthdayDate(b.date)}</span>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="text-white/20 hover:text-white/50 h-7 w-7"
                      onClick={() => unhideBirthday(b.id)}
                      title="Unhide"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Message Modal */}
      <Dialog open={!!messageModal} onOpenChange={(v) => { if (!v) setMessageModal(null) }}>
        <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white/90 font-medium">
              Message pour {messageModal?.name.split(' ')[0]}
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
              Idées cadeaux pour {giftModalTitle}
            </DialogTitle>
          </DialogHeader>
          {giftLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Génération en cours...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {giftIdeas.map((idea, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                  <span className="text-sm text-white/70">{idea}</span>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(idea.replace(/^\S+\s/, '') + ' cadeau Toulouse')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 shrink-0 ml-2"
                    title="Chercher près de Toulouse"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
              {giftIdeas.length === 0 && (
                <p className="text-sm text-white/30 text-center py-4">Aucune suggestion disponible</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// --- Reminders Section ---
function RemindersSection({ reminders, onUpdate, onRefresh }: {
  reminders: Reminder[]
  onUpdate: (reminders: Reminder[]) => void
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [editModal, setEditModal] = useState<Reminder | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editRecurring, setEditRecurring] = useState<string>('none')
  const [editStatus, setEditStatus] = useState<string>('active')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const addReminder = async () => {
    if (!title.trim()) return
    await lifeApi.addReminder(title.trim(), due, null)
    setTitle(''); setDue(''); setOpen(false)
    onRefresh()
  }

  const toggleDone = async (id: string) => {
    const r = reminders.find(r => r.id === id)
    if (!r) return
    await lifeApi.updateReminder(id, { status: r.status === 'done' ? 'active' : 'done' })
    onRefresh()
  }

  const openEdit = (r: Reminder) => {
    setEditModal(r)
    setEditTitle(r.title)
    setEditDue(r.due)
    setEditRecurring(r.recurring || 'none')
    setEditStatus(r.status)
    setDeleteConfirm(false)
  }

  const saveEdit = async () => {
    if (!editModal) return
    await lifeApi.updateReminder(editModal.id, {
      title: editTitle,
      due: editDue,
      recurring: editRecurring === 'none' ? null : editRecurring,
      status: editStatus as 'active' | 'done',
    })
    setEditModal(null)
    onRefresh()
  }

  const deleteReminder = async () => {
    if (!editModal) return
    await lifeApi.deleteReminder(editModal.id)
    setEditModal(null)
    onRefresh()
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
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${overdue ? 'text-rose-400' : 'text-white/60'}`}>{r.title}</p>
                        {r.recurring && <span className="text-[10px] text-violet-400/60 px-1.5 py-0.5 rounded bg-violet-500/10">{r.recurring}</span>}
                      </div>
                      {r.due && (
                        <p className={`text-xs flex items-center gap-1 mt-0.5 ${overdue ? 'text-rose-400/80' : 'text-white/25'}`}>
                          <Clock className="h-3 w-3" />
                          {countdown} &middot; {new Date(r.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-violet-400 h-7 w-7"
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
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
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-violet-400 h-7 w-7"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Edit Reminder Modal */}
      <Dialog open={!!editModal} onOpenChange={(v) => { if (!v) setEditModal(null) }}>
        <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
          <DialogHeader><DialogTitle className="text-white/90 font-medium">Edit Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-white/[0.03] border-white/10 text-white/80" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Due date</label>
              <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="bg-white/[0.03] border-white/10 text-white/80" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Recurring</label>
              <select
                value={editRecurring}
                onChange={(e) => setEditRecurring(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-white/[0.03] text-white/80 text-sm px-3"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-white/[0.03] text-white/80 text-sm px-3"
              >
                <option value="active">Active</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {!deleteConfirm ? (
              <Button variant="ghost" onClick={() => setDeleteConfirm(true)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            ) : (
              <Button variant="ghost" onClick={deleteReminder} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Confirm delete
              </Button>
            )}
            <Button onClick={saveEdit} className="bg-violet-500 hover:bg-violet-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// --- Idea Card (compact + expandable) ---
function IdeaCard({ idea, type, toast, onDidThis }: { idea: Idea; type: 'weekend' | 'date'; toast: (msg: string) => void; onDidThis: (idea: Idea) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [sharing, setSharing] = useState(false)

  const query = idea.mapQuery || idea.title
  const mapsQuery = encodeURIComponent(query.includes('Toulouse') ? query : `${query} Toulouse`)
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`
  const parkingLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`parking near ${query}`)}`
  const hotelLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hotels near ${query}`)}`
  const lunchLink = idea.lunchSpot
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(idea.lunchSpot)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants near ${query}`)}`

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setSharing(true)
    try {
      const result = await lifeApi.shareIdea({
        type,
        title: idea.title,
        description: idea.fullDescription || idea.description,
        driveTime: idea.driveTime,
        emoji: idea.emoji,
      })
      toast(result.success ? 'Shared with Anne!' : 'Failed to share')
    } catch {
      toast('Failed to share')
    } finally {
      setSharing(false)
    }
  }

  const handleDidThis = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDidThis(idea)
  }

  return (
    <div
      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Compact view */}
      <div className="flex items-center gap-3 p-3.5">
        <span className="text-lg shrink-0">{idea.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white/80 truncate">{idea.title}</p>
            {idea.indoor !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${idea.indoor ? 'bg-blue-500/10 text-blue-400/60' : 'bg-emerald-500/10 text-emerald-400/60'}`}>
                {idea.indoor ? 'Indoor' : 'Outdoor'}
              </span>
            )}
          </div>
          <p className="text-xs text-white/40 truncate mt-0.5">{idea.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 text-[11px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
            <Car className="h-3 w-3" />
            {idea.driveTime}
          </span>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="p-1.5 rounded-lg text-white/20 hover:text-violet-400 hover:bg-white/[0.06] transition-colors"
            title="Share with Anne"
          >
            {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleDidThis}
            className="p-1.5 rounded-lg text-white/20 hover:text-emerald-400 hover:bg-emerald-500/[0.08] transition-colors"
            title="We did this!"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <ChevronDown className={`h-3.5 w-3.5 text-white/20 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-white/[0.06]"
        >
          <div className="p-4 space-y-3">
            <p className="text-sm text-white/50 leading-relaxed">{idea.fullDescription}</p>

            <div className="flex flex-wrap gap-2">
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-violet-400/80 hover:text-violet-300 bg-violet-500/[0.08] hover:bg-violet-500/[0.15] px-3 py-1.5 rounded-lg transition-colors"
              >
                <MapPin className="h-3 w-3" /> Google Maps
              </a>
              <a
                href={parkingLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
              >
                <ParkingSquare className="h-3 w-3" /> Parking
              </a>
              <a
                href={hotelLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
              >
                <Hotel className="h-3 w-3" /> Hotels
              </a>
              <a
                href={lunchLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
              >
                <UtensilsCrossed className="h-3 w-3" /> Lunch
              </a>
            </div>

            {(idea.parking || idea.hotel || idea.lunchSpot) && (
              <div className="flex flex-col gap-1.5 pt-1">
                {idea.lunchSpot && (
                  <p className="text-[11px] text-white/25"><span className="text-white/35">Lunch:</span> {idea.lunchSpot}</p>
                )}
                {idea.parking && (
                  <p className="text-[11px] text-white/25"><span className="text-white/35">Parking:</span> {idea.parking}</p>
                )}
                {idea.hotel && (
                  <p className="text-[11px] text-white/25"><span className="text-white/35">Stay:</span> {idea.hotel}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <button
                onClick={handleShare}
                disabled={sharing}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-violet-400 bg-white/[0.04] hover:bg-violet-500/[0.1] px-3 py-1.5 rounded-lg transition-colors"
              >
                {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                Share with Anne
              </button>
              <button
                onClick={handleDidThis}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-emerald-400 bg-white/[0.04] hover:bg-emerald-500/[0.1] px-3 py-1.5 rounded-lg transition-colors"
              >
                <Check className="h-3 w-3" /> We did this!
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// --- Weather Icon Helper ---
function WeatherIcon({ code, className }: { code: number; className?: string }) {
  // WMO weather codes: 0=clear, 1-3=partly cloudy, 45-48=fog, 51-57=drizzle, 61-67=rain, 71-77=snow, 80-82=showers, 95-99=thunderstorm
  if (code === 0) return <Sun className={className} />
  if (code <= 3) return <CloudSun className={className} />
  if (code <= 48) return <Cloud className={className} />
  if (code <= 57) return <CloudDrizzle className={className} />
  if (code <= 67) return <CloudRain className={className} />
  if (code <= 77) return <Snowflake className={className} />
  if (code <= 82) return <CloudRain className={className} />
  if (code <= 99) return <Zap className={className} />
  return <Wind className={className} />
}

// --- Weather Bar (3C) ---
function WeatherBar({ weather }: { weather: WeekendWeather | null }) {
  if (!weather) return null

  const { saturday, sunday, homeCity } = weather

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className="text-xs uppercase tracking-widest text-white/30 shrink-0">This weekend{homeCity ? ` — ${homeCity}` : ''}</span>
      <div className="flex items-center gap-6 ml-auto">
        <div className="flex items-center gap-2">
          <WeatherIcon code={saturday.weatherCode} className="h-4 w-4 text-amber-400/80" />
          <span className="text-sm text-white/60">Sat</span>
          <span className="text-sm font-medium text-white/80">{Math.round(saturday.tempMax)}°</span>
          <span className="text-xs text-white/30">{Math.round(saturday.tempMin)}°</span>
          {saturday.precipitation > 0 && (
            <span className="text-[10px] text-blue-400/60">{saturday.precipitation}mm</span>
          )}
        </div>
        <div className="w-px h-4 bg-white/[0.08]" />
        <div className="flex items-center gap-2">
          <WeatherIcon code={sunday.weatherCode} className="h-4 w-4 text-amber-400/80" />
          <span className="text-sm text-white/60">Sun</span>
          <span className="text-sm font-medium text-white/80">{Math.round(sunday.tempMax)}°</span>
          <span className="text-xs text-white/30">{Math.round(sunday.tempMin)}°</span>
          {sunday.precipitation > 0 && (
            <span className="text-[10px] text-blue-400/60">{sunday.precipitation}mm</span>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Local Events Horizontal Scroll (3D) ---
function LocalEventsScroll({ events }: { events: LocalEvent[] }) {
  if (events.length === 0) return null

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-white/30 mb-2 px-1">Local Events</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {events.map((event, i) => (
          <a
            key={i}
            href={`https://www.google.com/search?q=${encodeURIComponent(event.title + ' ' + (event.location || 'Toulouse'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors group"
          >
            <span className="text-sm">🎭</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/60 group-hover:text-white/80 truncate max-w-[180px]">{event.title}</p>
              <p className="text-[10px] text-white/30 truncate max-w-[180px]">
                {event.location}{event.driveTime ? ` · ${event.driveTime}` : ''}
              </p>
            </div>
            <ExternalLink className="h-3 w-3 text-white/20 group-hover:text-white/40 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}

// --- Trip History Section (3E) ---
function TripHistorySection({ trips, expanded, onToggle }: { trips: Trip[]; expanded: boolean; onToggle: () => void }) {
  if (trips.length === 0 && !expanded) return null

  const sortedTrips = [...trips].sort((a, b) => b.date.localeCompare(a.date))
  const displayTrips = expanded ? sortedTrips : sortedTrips.slice(0, 3)

  return (
    <div className="mt-6">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 mb-3 group"
      >
        <History className="h-3.5 w-3.5 text-white/30" />
        <span className="text-xs uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">
          Trip History
        </span>
        {trips.length > 0 && (
          <Badge variant="secondary" className="bg-white/5 text-white/40 border-0 text-[10px]">{trips.length}</Badge>
        )}
        <ChevronDown className={`h-3 w-3 text-white/20 transition-transform duration-200 ml-auto ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {(expanded || trips.length > 0) && (
        <div className="space-y-1">
          {displayTrips.map((trip) => (
            <div key={trip.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
              <span className="text-xs text-white/25 font-mono w-20 shrink-0">
                {new Date(trip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-sm text-white/60 flex-1 truncate">{trip.title}</span>
              {trip.location && (
                <span className="text-xs text-white/25 truncate max-w-[120px]">{trip.location}</span>
              )}
              {trip.rating && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: trip.rating }).map((_, j) => (
                    <Star key={j} className="h-2.5 w-2.5 fill-amber-400/60 text-amber-400/60" />
                  ))}
                </div>
              )}
            </div>
          ))}
          {!expanded && trips.length > 3 && (
            <button onClick={onToggle} className="text-xs text-white/30 hover:text-white/50 w-full text-center py-1">
              Show all {trips.length} trips
            </button>
          )}
          {expanded && trips.length > 3 && (
            <button onClick={onToggle} className="text-xs text-white/30 hover:text-white/50 w-full text-center py-1">
              Show less
            </button>
          )}
          {trips.length === 0 && (
            <p className="text-xs text-white/20 text-center py-4">No trips recorded yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// --- Ideas Section (weekend or date) ---
function IdeasSection({ type, ideas, content, lastUpdated, refreshing, toast, onDidThis }: {
  type: 'weekend' | 'date'
  ideas: Idea[]
  content: string
  lastUpdated: string | null
  refreshing: boolean
  toast: (msg: string) => void
  onDidThis: (idea: Idea) => void
}) {
  const isWeekend = type === 'weekend'
  const Icon = isWeekend ? Sparkles : Heart
  const label = isWeekend ? 'Weekend Ideas' : 'Date Ideas'
  const fallbackMsg = isWeekend ? 'No suggestions yet. Next update: Thursday 7pm.' : 'No suggestions yet. Next update: Monday 9am.'

  // Fallback: if backend returned ideas=[] but content is JSON, parse client-side
  const parsedIdeas = useMemo(() => {
    if (ideas.length > 0) return ideas
    if (!content.trim()) return []
    try {
      const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed)) return parsed as Idea[]
    } catch { /* not valid JSON */ }
    return []
  }, [ideas, content])

  const hasIdeas = parsedIdeas.length > 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`h-4 w-4 text-white/40 ${refreshing ? 'animate-spin' : ''}`} />
          <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
          {lastUpdated && (
            <span className="text-[10px] text-white/20 ml-auto">Updated {lastUpdated}</span>
          )}
        </div>
        {refreshing ? (
          <p className="text-sm text-white/20 text-center py-8">Generating suggestions...</p>
        ) : hasIdeas ? (
          <div className="space-y-2">
            {parsedIdeas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} type={type} toast={toast} onDidThis={onDidThis} />
            ))}
          </div>
        ) : content.trim() ? (
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:text-white/80 prose-headings:text-sm prose-headings:font-medium prose-headings:mb-2 prose-headings:mt-0
            prose-p:text-white/50 prose-p:text-sm prose-p:leading-relaxed prose-p:my-1
            prose-li:text-white/50 prose-li:text-sm prose-li:my-0
            prose-strong:text-white/70 prose-strong:font-medium
            prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-white/20 text-center py-8">{fallbackMsg}</p>
        )}
      </CardContent>
    </Card>
  )
}

// --- Email Settings Section ---
const NOTIFICATION_LABELS: Record<string, string> = {
  'birthday-reminders': 'Birthday Reminders',
  'weekend-family': 'Weekend Family Ideas',
  'midweek-date': 'Midweek Date Ideas',
  'morning-digest': 'Morning Digest',
  'article-summaries': 'Article Summaries',
  'trip-packing': 'Trip Packing Checklist',
  'trip-anne-notification': 'Trip Anne Notification',
  'trip-connection-summary': 'Trip Connection Summary',
}

const TEST_TYPES = new Set(['birthday-reminders', 'weekend-family', 'midweek-date', 'morning-digest', 'trip-packing', 'trip-anne', 'trip-connection'])

function EmailSettingsSection({ toast }: { toast: (msg: string) => void }) {
  const [config, setConfig] = useState<{ recipients: Record<string, string[]> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newEmails, setNewEmails] = useState<Record<string, string>>({})
  const [testState, setTestState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({})

  useEffect(() => {
    lifeApi.getEmailConfig().then(c => { setConfig(c); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const save = async (updated: { recipients: Record<string, string[]> }) => {
    setSaving(true)
    try {
      const result = await lifeApi.updateEmailConfig(updated)
      setConfig(result)
      toast('Email settings saved')
    } catch {
      toast('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const removeRecipient = (type: string, email: string) => {
    if (!config) return
    const updated = { ...config, recipients: { ...config.recipients, [type]: config.recipients[type].filter(e => e !== email) } }
    setConfig(updated)
    save(updated)
  }

  const addRecipient = (type: string) => {
    const email = (newEmails[type] || '').trim().toLowerCase()
    if (!email || !email.includes('@') || !config) return
    if (config.recipients[type]?.includes(email)) return
    const updated = { ...config, recipients: { ...config.recipients, [type]: [...(config.recipients[type] || []), email] } }
    setConfig(updated)
    setNewEmails(prev => ({ ...prev, [type]: '' }))
    save(updated)
  }

  const sendTest = async (type: string) => {
    setTestState(prev => ({ ...prev, [type]: 'sending' }))
    try {
      const result = await lifeApi.sendTestEmail(type)
      if (result.error) {
        toast(`Test failed: ${result.error}`)
        setTestState(prev => ({ ...prev, [type]: 'idle' }))
      } else {
        setTestState(prev => ({ ...prev, [type]: 'sent' }))
        toast(`Test email sent!`)
        setTimeout(() => setTestState(prev => ({ ...prev, [type]: 'idle' })), 2000)
      }
    } catch {
      toast('Test failed')
      setTestState(prev => ({ ...prev, [type]: 'idle' }))
    }
  }

  if (loading) return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Email Settings</p>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-violet-400 ml-auto" />}
        </div>
        <div className="space-y-5">
          {Object.entries(NOTIFICATION_LABELS).map(([type, label]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-white/70">{label}</p>
                {TEST_TYPES.has(type) && (
                  <button
                    onClick={() => sendTest(type)}
                    disabled={(testState[type] || 'idle') !== 'idle'}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all border border-white/10 hover:bg-white/[0.06] text-white/40 hover:text-white/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testState[type] === 'sending' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : testState[type] === 'sent' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    {testState[type] === 'sent' ? 'Sent' : 'Test'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(config?.recipients[type] || []).map(email => (
                  <span key={email} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white/[0.06] text-white/60 border border-white/[0.08]">
                    {email}
                    <button onClick={() => removeRecipient(type, email)} className="text-white/30 hover:text-rose-400 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add email..."
                  value={newEmails[type] || ''}
                  onChange={e => setNewEmails(prev => ({ ...prev, [type]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addRecipient(type)}
                  className="h-8 text-xs bg-white/[0.03] border-white/[0.08] text-white/60 placeholder:text-white/20"
                />
                <Button variant="outline" size="sm" onClick={() => addRecipient(type)} className="h-8 px-3 text-xs text-white/40 border-white/10 hover:bg-white/[0.03]">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Email Test Buttons (compact for Settings tab) ---
function EmailTestButtons({ toast }: { toast: (msg: string) => void }) {
  const [testState, setTestState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({})

  const tests = [
    { id: 'morning-digest', label: 'Morning Digest' },
    { id: 'weekend-family', label: 'Weekend Family' },
    { id: 'midweek-date', label: 'Midweek Date' },
    { id: 'birthday-reminders', label: 'Birthday Reminders' },
    { id: 'trip-packing', label: 'Trip Packing' },
    { id: 'trip-anne', label: 'Trip Anne' },
    { id: 'trip-connection', label: 'Trip Connection' },
  ]

  const sendTest = async (type: string) => {
    setTestState(prev => ({ ...prev, [type]: 'sending' }))
    try {
      const result = await lifeApi.sendTestEmail(type)
      if (result.error) {
        toast(`Test failed: ${result.error}`)
        setTestState(prev => ({ ...prev, [type]: 'idle' }))
      } else {
        setTestState(prev => ({ ...prev, [type]: 'sent' }))
        toast(`Test email sent!`)
        setTimeout(() => setTestState(prev => ({ ...prev, [type]: 'idle' })), 2000)
      }
    } catch {
      toast('Test failed')
      setTestState(prev => ({ ...prev, [type]: 'idle' }))
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-white/40" />
          <p className="text-xs uppercase tracking-widest text-white/40">Test Emails</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tests.map(t => {
            const state = testState[t.id] || 'idle'
            return (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                onClick={() => sendTest(t.id)}
                disabled={state !== 'idle'}
                className="text-xs text-white/50 border-white/10 hover:bg-white/[0.03] justify-start gap-2"
              >
                {state === 'sending' ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : state === 'sent' ? (
                  <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                ) : (
                  <Mail className="h-3 w-3 shrink-0" />
                )}
                {t.label}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Toast component ---
function ToastContainer({ toasts }: { toasts: { id: number; message: string }[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto px-4 py-2.5 rounded-2xl text-sm shadow-lg shadow-black/20 backdrop-blur-xl animate-in slide-in-from-right-5 fade-in duration-200 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          {t.message}
        </div>
      ))}
    </div>
  )
}

// --- Main Life Page ---
export default function LifePage() {
  const [data, setData] = useState<LifeData | null>(null)
  const [calendar, setCalendar] = useState<CalendarEvent[]>([])
  const [activities, setActivities] = useState<Activities>({ weekend: { content: '', ideas: [], lastUpdated: null }, date: { content: '', ideas: [], lastUpdated: null } })
  const [weather, setWeather] = useState<WeekendWeather | null>(null)
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripHistoryExpanded, setTripHistoryExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshingWeekend, setRefreshingWeekend] = useState(false)
  const [refreshingDates, setRefreshingDates] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  const addToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [lifeData, calendarData, remindersData, activitiesData, weatherData, eventsData, tripsData] = await Promise.all([
        lifeApi.getData(),
        lifeApi.getCalendar(7),
        lifeApi.getReminders(),
        lifeApi.getActivities(),
        lifeApi.getWeekendWeather(),
        lifeApi.getLocalEvents(),
        lifeApi.getTrips()
      ])
      setData({ ...lifeData, reminders: remindersData.length > 0 ? remindersData : lifeData.reminders })
      setCalendar(calendarData)
      setActivities(activitiesData)
      setWeather(weatherData)
      setLocalEvents(eventsData)
      setTrips(tripsData)
    } catch (e) {
      console.error('LifePage: Error loading data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const refreshWeekend = async () => {
    setRefreshingWeekend(true)
    try {
      const result = await lifeApi.refreshWeekendActivities()
      if (result.success) {
        addToast('Weekend ideas refreshed')
        const activitiesData = await lifeApi.getActivities()
        setActivities(activitiesData)
      } else {
        addToast('Refresh failed: ' + (result.error || 'Unknown'))
      }
    } catch (err: unknown) {
      addToast('Refresh failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setRefreshingWeekend(false)
    }
  }

  const refreshDates = async () => {
    setRefreshingDates(true)
    try {
      const result = await lifeApi.refreshDateActivities()
      if (result.success) {
        addToast('Date ideas refreshed')
        const activitiesData = await lifeApi.getActivities()
        setActivities(activitiesData)
      } else {
        addToast('Refresh failed: ' + (result.error || 'Unknown'))
      }
    } catch (err: unknown) {
      addToast('Refresh failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setRefreshingDates(false)
    }
  }

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

  const patchBirthday = async (id: string, updates: Partial<Birthday>) => {
    await lifeApi.patchBirthday(id, updates)
    const lifeData = await lifeApi.getData()
    setData(prev => prev ? { ...prev, birthdays: lifeData.birthdays } : prev)
  }

  const sendBirthdayEmail = async (b: Birthday) => {
    const currentYear = new Date().getFullYear()
    if (b.emailSentYear === currentYear) {
      if (!window.confirm('Already sent — resend?')) return
    }
    try {
      const result = await lifeApi.sendBirthdayEmail(b.id)
      if (result.success) {
        addToast('Email envoyé')
        const lifeData = await lifeApi.getData()
        setData(prev => prev ? { ...prev, birthdays: lifeData.birthdays } : prev)
      } else {
        addToast('Erreur: ' + (result.error || 'Unknown'))
      }
    } catch (err: unknown) {
      addToast('Erreur envoi email: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const updateReminders = async (reminders: Reminder[]) => {
    setData({ ...data, reminders })
    await lifeApi.update({ reminders })
  }

  const refreshReminders = async () => {
    const remindersData = await lifeApi.getReminders()
    setData(prev => prev ? { ...prev, reminders: remindersData } : prev)
  }

  const addCron = async (line: string) => {
    const result = await lifeApi.cronAction('add', line)
    setData({ ...data, cronJobs: result.cronJobs })
  }

  const deleteCron = async (line: string) => {
    const result = await lifeApi.cronAction('delete', line)
    setData({ ...data, cronJobs: result.cronJobs })
  }

  const handleDidThis = async (idea: Idea) => {
    try {
      const trip = await lifeApi.addTrip({
        title: idea.title,
        location: idea.mapQuery || idea.title,
        notes: idea.description,
      })
      setTrips(prev => [...prev, trip])
      addToast('Trip logged!')
    } catch {
      addToast('Failed to log trip')
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header + Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white/90">Life</h1>
            <p className="text-sm text-white/50 mt-1">Schedule, reminders, and personal admin</p>
          </div>
          <TabControl active={activeTab} onChange={setActiveTab} />
        </div>

        {/* TAB 1 — Dashboard */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Left column: Calendar + Reminders */}
            <div className="space-y-6">
              <CalendarSection events={calendar} />
              <RemindersSection reminders={data.reminders} onUpdate={updateReminders} onRefresh={refreshReminders} />
            </div>
            {/* Right column: Birthdays */}
            <div className="space-y-6">
              <BirthdaysSection birthdays={data.birthdays} onUpdate={updateBirthdays} onPatchBirthday={patchBirthday} onSendEmail={sendBirthdayEmail} toast={addToast} />
            </div>
          </motion.div>
        )}

        {/* TAB 2 — Ideas */}
        {activeTab === 'ideas' && (
          <motion.div
            key="ideas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Weather Bar */}
            <WeatherBar weather={weather} />

            {/* Local Events */}
            <LocalEventsScroll events={localEvents} />

            {/* Refresh buttons */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshWeekend}
                disabled={refreshingWeekend || refreshingDates}
                className="text-xs text-white/40 border-white/10 hover:bg-white/[0.03]"
              >
                {refreshingWeekend ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Refresh Weekend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDates}
                disabled={refreshingDates || refreshingWeekend}
                className="text-xs text-white/40 border-white/10 hover:bg-white/[0.03]"
              >
                {refreshingDates ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Refresh Dates
              </Button>
            </div>

            {/* Idea cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <IdeasSection type="weekend" ideas={activities.weekend.ideas} content={activities.weekend.content} lastUpdated={activities.weekend.lastUpdated} refreshing={refreshingWeekend} toast={addToast} onDidThis={handleDidThis} />
              <IdeasSection type="date" ideas={activities.date.ideas} content={activities.date.content} lastUpdated={activities.date.lastUpdated} refreshing={refreshingDates} toast={addToast} onDidThis={handleDidThis} />
            </div>

            {/* Trip History */}
            <TripHistorySection trips={trips} expanded={tripHistoryExpanded} onToggle={() => setTripHistoryExpanded(!tripHistoryExpanded)} />
          </motion.div>
        )}

        {/* TAB 3 — Settings */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <CronJobsSection cronJobs={data.cronJobs} onAdd={addCron} onDelete={deleteCron} />
            <div className="space-y-6">
              <EmailTestButtons toast={addToast} />
              <EmailSettingsSection toast={addToast} />
            </div>
          </motion.div>
        )}
      </div>
      <ToastContainer toasts={toasts} />
    </>
  )
}
