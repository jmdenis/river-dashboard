import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { TextMorph } from 'torph/react'
import { lifeApi, type LifeData, type Birthday, type Reminder, type CronJob, type CalendarEvent, type Activities, type Idea, type WeekendWeather, type LocalEvent, type Trip, type HomeSettings, type UpcomingTrip, type TravelWorkout, type EquipmentType, type DayPlan, type DayPlanStep, type Contact, type TripQuestion, type TripPreferencesResponse, type PackingList, type Briefing } from '../services/lifeApi'
import ReactMarkdown from 'react-markdown'
import { tokens, styles } from '../designTokens'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../components/ui/dialog'
import { Loading03Icon, PlusSignIcon, Delete02Icon, Tick02Icon, Clock01Icon, Calendar01Icon, MessageMultiple01Icon, GiftIcon, Copy01Icon, LinkSquare02Icon, SparklesIcon, FavouriteIcon, PencilEdit02Icon, Cancel01Icon, ViewIcon, ViewOffSlashIcon, Mail01Icon, RotateClockwiseIcon, Car01Icon, Share01Icon, Location01Icon, ParkingAreaCircleIcon, Hotel01Icon, Search01Icon, ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, StarIcon, CookBookIcon, WorkHistoryIcon, CloudBigRainIcon, Sun01Icon, SunCloud01Icon, CloudIcon, SnowIcon, CloudLittleRainIcon, ZapIcon, WindPower01Icon, Home01Icon, Airplane01Icon, Dumbbell01Icon, SentIcon, Download02Icon, SmartPhone01Icon, UserMultiple02Icon, UserAdd01Icon, Tag01Icon, ArrowUp01Icon, Luggage01Icon } from 'hugeicons-react'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { PlaneIcon, type PlaneIconHandle } from '../components/ui/plane-icon'
import { CalendarIcon } from '../components/ui/calendar-icon'
import { GiftIcon } from '../components/ui/gift-icon'
import { ClockIcon } from '../components/ui/clock-icon'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Checkbox } from '../components/ui/checkbox'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Skeleton } from '../components/ui/skeleton'
import { Timeline, TimelineItem, TimelineIndicator, TimelineSeparator, TimelineHeader, TimelineTitle, TimelineDate, TimelineContent } from '../components/reui/timeline'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../components/ui/sheet'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Separator } from '../components/ui/separator'
import { TwoPanelLayout } from '../components/TwoPanelLayout'
import { PanelToolbar, ToolbarAction } from '../components/PanelToolbar'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Autocomplete, AutocompleteInput, AutocompleteContent, AutocompleteList, AutocompleteItem, AutocompleteEmpty } from '../components/reui/autocomplete'
import { DataGrid, DataGridContainer } from '../components/reui/data-grid/data-grid'
import { DataGridTable } from '../components/reui/data-grid/data-grid-table'
import { DataGridPagination } from '../components/reui/data-grid/data-grid-pagination'
import { DataGridColumnHeader } from '../components/reui/data-grid/data-grid-column-header'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, type ColumnDef, type SortingState } from '@tanstack/react-table'

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
 const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
 const dateSuffix = ` — ${monthNames[eventDate.getMonth()]} ${eventDate.getDate()}`

 if (diffDays === 0) return 'Today' + dateSuffix
 if (diffDays === 1) return 'Tomorrow' + dateSuffix

 const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
 return dayNames[eventDate.getDay()] + dateSuffix
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
 work: { dot: 'bg-[var(--text-3,rgba(255,255,255,0.3))]', text: 'text-[var(--text-2)]' },
 personal: { dot: 'bg-[var(--text-3,rgba(255,255,255,0.3))]', text: 'text-[var(--text-2)]' },
 family: { dot: 'bg-[var(--text-3,rgba(255,255,255,0.3))]', text: 'text-[var(--text-2)]' },
 health: { dot: 'bg-[var(--text-3,rgba(255,255,255,0.3))]', text: 'text-[var(--text-2)]' },
 social: { dot: 'bg-[var(--text-3,rgba(255,255,255,0.3))]', text: 'text-[var(--text-2)]' },
 travel: { dot: 'bg-[var(--text-3,rgba(255,255,255,0.3))]', text: 'text-[var(--text-2)]' },
 finance: { dot: 'bg-[var(--text-3,rgba(255,255,255,0.3))]', text: 'text-[var(--text-2)]' },
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
type TabId = 'dashboard' | 'ideas' | 'contacts'

// --- Exercise emoji mapping ---
const MUSCLE_EMOJIS: Record<string, string> = {
 push: '💪', chest: '💪', press: '💪',
 squat: '🦵', lunge: '🦵', leg: '🦵', calf: '🦵', goblet: '🦵',
 plank: '🧘', core: '🧘', crunch: '🧘', ab: '🧘', sit: '🧘', halo: '🧘', windmill: '🧘',
 burpee: '❤️‍🔥', jump: '❤️‍🔥', cardio: '❤️‍🔥', run: '❤️‍🔥', mountain: '❤️‍🔥', jack: '❤️‍🔥',
 swing: '🔥', snatch: '🔥', clean: '🔥', thruster: '🔥',
 row: '🏋️', pull: '🏋️', back: '🏋️', shoulder: '🏋️', dip: '🏋️', tricep: '🏋️',
 'get-up': '🏋️', 'turkish': '🏋️', renegade: '🏋️',
}

// --- Equipment toggle pills ---
const EQUIPMENT_OPTIONS: { id: EquipmentType; label: string }[] = [
 { id: 'none', label: 'No equipment' },
 { id: 'dumbbells', label: 'Dumbbells' },
 { id: 'kettlebells', label: 'Kettlebells' },
]

function getExerciseEmoji(name: string): string {
 const lower = name.toLowerCase()
 for (const [key, emoji] of Object.entries(MUSCLE_EMOJIS)) {
 if (lower.includes(key)) return emoji
 }
 return '🏋️'
}

const MUSCLE_GROUP_EMOJIS: Record<string, string> = {
 chest: '💪', push: '💪', legs: '🦵', squat: '🦵',
 core: '🧘', abs: '🧘', cardio: '❤️‍🔥', 'full body': '❤️‍🔥',
 back: '🏋️', pull: '🏋️', shoulders: '🏋️', arms: '💪',
}

function getMuscleGroupEmoji(mg: string): string {
 const lower = mg.toLowerCase()
 for (const [key, emoji] of Object.entries(MUSCLE_GROUP_EMOJIS)) {
 if (lower.includes(key)) return emoji
 }
 return '🏋️'
}

// --- Workout Modal ---
function WorkoutModal({ workout, open, onClose, toast, equipment, onEquipmentChange, loading }: {
 workout: TravelWorkout
 open: boolean
 onClose: () => void
 toast: (msg: string) => void
 equipment: EquipmentType
 onEquipmentChange: (eq: EquipmentType) => void
 loading: boolean
}) {
 const [emailing, setEmailing] = useState(false)

 if (!open) return null

 const handleEmail = async () => {
 setEmailing(true)
 try {
 const result = await lifeApi.emailWorkout(workout)
 toast(result.success ? 'Workout emailed!' : `Failed: ${result.error || 'Unknown'}`)
 } catch {
 toast('Failed to send email')
 } finally {
 setEmailing(false)
 }
 }

 const equipmentLabel = equipment === 'kettlebells' ? 'Kettlebells' : equipment === 'dumbbells' ? 'Dumbbells' : 'No equipment'

 return (
 <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
 <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0" showCloseButton={true}>
 {/* Equipment toggle pills */}
 <div className="px-6 pt-6 pb-3">
 <div className="inline-flex rounded-lg p-[3px]" style={{ background: tokens.colors.surfaceHover }}>
 {EQUIPMENT_OPTIONS.map(opt => (
 <button
 key={opt.id}
 onClick={() => onEquipmentChange(opt.id)}
 disabled={loading}
 className="px-3.5 py-1.5 text-[11px] rounded-md transition-all duration-200 disabled:opacity-50"
 style={equipment === opt.id
 ? { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
 : { color: 'var(--text-3)', border: '1px solid transparent' }
 }
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>

 {/* Header */}
 <DialogHeader className="px-6 pb-4">
 <DialogTitle className="flex items-center gap-3">
 <AnimatedIcon icon={Dumbbell01Icon} strokeWidth={1.5} className="h-5 w-5 text-[var(--accent)]" />
 {workout.title || 'Travel Workout'}
 </DialogTitle>
 <div className="flex items-center gap-2 ml-8 flex-wrap">
 <span className="text-[12px] text-muted-foreground">{workout.duration || '25 min'}</span>
 <span className="text-[12px] text-muted-foreground">{equipmentLabel}</span>
 {workout.weight_suggestion && (
 <span className="text-[12px] text-muted-foreground">⚖️ {workout.weight_suggestion}</span>
 )}
 {workout.rounds && (
 <span className="text-[12px] text-muted-foreground">🔄 {workout.rounds} rounds</span>
 )}
 </div>
 </DialogHeader>

 {/* Loading overlay */}
 {loading ? (
 <div className="px-6 pb-6 flex items-center justify-center py-12 gap-2 text-muted-foreground">
 <Loading03Icon strokeWidth={1.5} className="h-5 w-5 animate-spin text-[var(--accent)]" />
 <span className="text-[13px]">Generating {equipmentLabel.toLowerCase()} workout...</span>
 </div>
 ) : (
 <>
 {/* Exercises */}
 <div className="px-6 pb-4 space-y-3">
 {workout.exercises.map((ex, i) => (
 <div key={i} className="rounded-lg border border-[var(--border)] p-4" style={{ background: tokens.colors.surfaceHover }}>
 <div className="flex items-start gap-3">
 <span className="text-[20px] mt-0.5 shrink-0">{getExerciseEmoji(ex.name)}</span>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{ex.name}</p>
 <a
 href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' form tutorial')}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-0.5 text-[10px] text-[var(--accent-muted)] hover:text-[var(--accent-text)] transition-colors shrink-0"
 >
 <AnimatedIcon icon={LinkSquare02Icon} strokeWidth={1.5} className="h-2.5 w-2.5" />
 Form
 </a>
 </div>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-[12px] text-[var(--accent-text)] font-mono">{ex.sets ? `${ex.sets} × ` : ''}{ex.reps_or_duration}</span>
 <span className="w-px h-3 bg-white/[0.08]" />
 <span className="text-[12px] text-[var(--text-3)]">{ex.rest_seconds}s rest</span>
 </div>
 {ex.description && (
 <p className="text-[13px] text-[var(--text-2)] mt-1.5 leading-relaxed">{ex.description}</p>
 )}
 {ex.muscleGroups && ex.muscleGroups.length > 0 && (
 <div className="flex items-center gap-1.5 mt-2 flex-wrap">
 {ex.muscleGroups.map((mg, j) => (
 <span key={j} className="text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>
 {getMuscleGroupEmoji(mg)} {mg}
 </span>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </>
 )}

 {/* Footer actions */}
 <DialogFooter className="p-6 pt-2 border-t border-[var(--border)] sm:justify-start">
 <Button variant="outline" size="sm" onClick={handleEmail} disabled={emailing || loading}>
 {emailing ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={Mail01Icon} className="h-3.5 w-3.5" />}
 Email to me
 </Button>
 <Button variant="outline" size="sm" onClick={onClose}>
 Close
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 )
}

// --- Packing List Modal ---
function PackingListModal({ tripId, open, onClose, toast }: {
 tripId: string
 open: boolean
 onClose: () => void
 toast: (msg: string) => void
}) {
 const [packingList, setPackingList] = useState<PackingList | null>(null)
 const [loading, setLoading] = useState(false)
 const [generating, setGenerating] = useState(false)

 useEffect(() => {
 if (!open) return
 setLoading(true)
 lifeApi.getPackingList(tripId).then(data => {
 setPackingList(data)
 }).catch(() => {}).finally(() => setLoading(false))
 }, [open, tripId])

 const handleGenerate = async () => {
 setGenerating(true)
 try {
 const data = await lifeApi.generatePackingList(tripId)
 setPackingList(data)
 toast('Packing list generated')
 } catch {
 toast('Failed to generate packing list')
 } finally {
 setGenerating(false)
 }
 }

 const togglePacked = async (catIdx: number, itemIdx: number) => {
 if (!packingList) return
 const updated = {
 categories: packingList.categories.map((cat, ci) => ({
 ...cat,
 items: cat.items.map((item, ii) => ({
 ...item,
 packed: ci === catIdx && ii === itemIdx ? !item.packed : item.packed,
 })),
 })),
 }
 setPackingList(updated)
 try {
 await lifeApi.savePackingList(tripId, updated)
 } catch {
 toast('Failed to save')
 }
 }

 const totalItems = packingList?.categories.reduce((s, c) => s + c.items.length, 0) ?? 0
 const packedItems = packingList?.categories.reduce((s, c) => s + c.items.filter(i => i.packed).length, 0) ?? 0

 return (
 <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
 <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0" showCloseButton={true}>
 {/* Header */}
 <DialogHeader className="p-5 pb-3" style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
 <DialogTitle className="flex items-center gap-2.5">
 <AnimatedIcon icon={Luggage01Icon} strokeWidth={1.5} className="h-4 w-4 text-[var(--accent-muted)]" />
 Packing List
 {packingList && (
 <Badge variant="secondary" className="text-[10px] font-mono">{packedItems}/{totalItems}</Badge>
 )}
 </DialogTitle>
 </DialogHeader>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-5 space-y-4">
 {loading && (
 <div className="flex items-center justify-center py-12">
 <Loading03Icon strokeWidth={1.5} className="h-5 w-5 animate-spin text-muted-foreground" />
 </div>
 )}

 {!loading && !packingList && (
 <div className="text-center py-10">
 <AnimatedIcon icon={Luggage01Icon} strokeWidth={1.5} className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
 <p className="text-[13px] text-muted-foreground mb-4">No packing list yet</p>
 <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
 {generating ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={SparklesIcon} className="h-3.5 w-3.5" />}
 Generate with AI
 </Button>
 </div>
 )}

 {!loading && packingList && packingList.categories.map((cat, catIdx) => (
 <div key={cat.name}>
 <p className="text-[11px] uppercase tracking-[0.05em] mb-2" style={{ fontWeight: 500, color: 'var(--text-3)' }}>{cat.name}</p>
 <div className="space-y-1">
 {cat.items.map((item, itemIdx) => (
 <div
 key={`${cat.name}-${itemIdx}`}
 className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
 onClick={() => togglePacked(catIdx, itemIdx)}
 >
 <Checkbox checked={item.packed} onCheckedChange={() => togglePacked(catIdx, itemIdx)} />
 <span className={`text-[13px] flex-1 ${item.packed ? 'text-muted-foreground line-through' : ''}`}>
 {item.name}
 </span>
 {item.quantity > 1 && (
 <span className="text-[12px] font-mono text-muted-foreground">×{item.quantity}</span>
 )}
 {item.weatherNote && (
 <span className="text-[12px] max-w-[140px] truncate text-muted-foreground">{item.weatherNote}</span>
 )}
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>

 {/* Footer */}
 {packingList && (
 <DialogFooter className="p-4 pt-2 border-t border-[var(--border)] sm:justify-start">
 <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
 {generating ? <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin" /> : <AnimatedIcon icon={RotateClockwiseIcon} className="h-3 w-3" />}
 Regenerate
 </Button>
 <span className="flex-1" />
 <span className="text-[10px] text-muted-foreground">
 {packedItems === totalItems && totalItems > 0 ? 'All packed!' : `${totalItems - packedItems} items left`}
 </span>
 </DialogFooter>
 )}
 </DialogContent>
 </Dialog>
 )
}

// --- Trip Helper Section ---
function TripHelper({ trip, toast }: { trip: UpcomingTrip; toast: (msg: string) => void }) {
 const [workout, setWorkout] = useState<TravelWorkout | null>(null)
 const [loadingWorkout, setLoadingWorkout] = useState(false)
 const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
 const [notifying, setNotifying] = useState(false)
 const [packingModalOpen, setPackingModalOpen] = useState(false)
 const [equipment, setEquipment] = useState<EquipmentType>('none')
 const [workoutsByEquipment, setWorkoutsByEquipment] = useState<Partial<Record<EquipmentType, TravelWorkout>>>({})
 const [tripQuestions, setTripQuestions] = useState<TripQuestion[]>([])
 const [walkTime, setWalkTime] = useState<{ estimate: boolean; note: string } | null>(null)
 const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
 const [savingQuestion, setSavingQuestion] = useState<string | null>(null)

 useEffect(() => {
 lifeApi.getTripPreferences(trip.id).then(data => {
 setTripQuestions(data.questions || [])
 setWalkTime(data.walkTime)
 }).catch(() => {})
 }, [trip.id])

 const handleAnswerSubmit = async (questionId: string) => {
 const answer = questionAnswers[questionId]
 if (!answer?.trim()) return
 setSavingQuestion(questionId)
 try {
 const result = await lifeApi.updateTripPreference(trip.id, { questionId, answer: answer.trim() })
 setTripQuestions(result.questions)
 setWalkTime(result.walkTime)
 toast('Answer saved')
 } catch {
 toast('Failed to save answer')
 } finally {
 setSavingQuestion(null)
 }
 }

 const unansweredQuestions = tripQuestions.filter(q => !q.asked)

 const fetchWorkout = async (equip: EquipmentType) => {
 if (workoutsByEquipment[equip]) {
 setWorkout(workoutsByEquipment[equip]!)
 return
 }
 setLoadingWorkout(true)
 try {
 const data = await lifeApi.getTravelWorkout(equip)
 setWorkout(data)
 setWorkoutsByEquipment(prev => ({ ...prev, [equip]: data }))
 } catch { setWorkout({ exercises: [] }) }
 finally { setLoadingWorkout(false) }
 }

 const openWorkout = async () => {
 setWorkoutModalOpen(true)
 if (!workoutsByEquipment[equipment]) {
 await fetchWorkout(equipment)
 } else {
 setWorkout(workoutsByEquipment[equipment]!)
 }
 }

 const handleEquipmentChange = async (equip: EquipmentType) => {
 setEquipment(equip)
 await fetchWorkout(equip)
 }

 const handleNotify = async () => {
 setNotifying(true)
 try {
 const result = await lifeApi.notifyAnne(trip.id)
 toast(result.success ? 'Anne notified!' : `Failed: ${result.error || 'Unknown'}`)
 } catch {
 toast('Failed to notify Anne')
 } finally {
 setNotifying(false)
 }
 }

 const daysLabel = trip.status === 'active' ? 'now' : trip.daysUntil === 0 ? 'today' : trip.daysUntil === 1 ? 'tomorrow' : `in ${trip.daysUntil} days`

 const formatFlightTime = (iso: string) => {
 if (!iso) return 'TBD'
 const d = new Date(iso)
 if (isNaN(d.getTime())) return iso
 return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
 }

 const formatFlightDuration = (depart: string, arrive: string) => {
 if (!depart || !arrive) return ''
 const d = new Date(depart)
 const a = new Date(arrive)
 if (isNaN(d.getTime()) || isNaN(a.getTime())) return ''
 const diffMin = Math.round((a.getTime() - d.getTime()) / 60000)
 if (diffMin <= 0) return ''
 const h = Math.floor(diffMin / 60)
 const m = diffMin % 60
 return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`
 }

 const getLayover = (prevArrive: string, nextDepart: string) => {
 if (!prevArrive || !nextDepart) return ''
 const a = new Date(prevArrive)
 const d = new Date(nextDepart)
 if (isNaN(a.getTime()) || isNaN(d.getTime())) return ''
 const diffMin = Math.round((d.getTime() - a.getTime()) / 60000)
 if (diffMin <= 0) return ''
 const h = Math.floor(diffMin / 60)
 const m = diffMin % 60
 return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`
 }

 const flights = trip.flights || []

 // Context line: weather · timezone · currency
 const contextParts = [trip.weather, trip.timezone, trip.currency].filter(Boolean)

 // Build timeline items for flights + layovers
 const timelineItems: { type: 'flight' | 'layover'; flight?: typeof flights[0]; layoverAirport?: string; layoverDuration?: string; step: number }[] = []
 let stepCounter = 1
 flights.forEach((flight, i) => {
 timelineItems.push({ type: 'flight', flight, step: stepCounter++ })
 if (i < flights.length - 1) {
  const lay = getLayover(flight.arrive, flights[i + 1].depart)
  if (lay) {
  timelineItems.push({ type: 'layover', layoverAirport: flights[i + 1].from, layoverDuration: lay, step: stepCounter++ })
  }
 }
 })

 return (
 <div>
 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
 <Card className="rounded-md py-0" style={{ background: tokens.colors.surface, borderColor: tokens.colors.border }}>
 <CardHeader className="pb-0 pt-6">
  <div className="flex items-center gap-2 mb-1">
  <AnimatedIcon icon={Airplane01Icon} strokeWidth={1.5} size={16} style={{ color: tokens.colors.textTertiary }} />
  <CardTitle className="text-[20px] font-semibold leading-7" style={{ color: tokens.colors.textPrimary }}>{trip.destination}</CardTitle>
  </div>
  <div className="flex items-center gap-2">
  <span className="text-[12px] font-medium leading-4" style={{ color: tokens.colors.textTertiary }}>{trip.dateRange}</span>
  <Badge variant="secondary" className="border-transparent" style={{ background: tokens.colors.accentSubtle, color: tokens.colors.accent }}>{daysLabel}</Badge>
  </div>
 </CardHeader>
 <CardContent className="pt-3 pb-6">
  {/* Context line */}
  {contextParts.length > 0 && (
  <p className="text-[12px] font-medium leading-4 mb-4" style={{ color: tokens.colors.textTertiary }}>
   {contextParts.join(' · ')}
  </p>
  )}

  {/* Flights timeline */}
  {flights.length > 0 ? (
  <div className="mb-5">
   <Timeline defaultValue={stepCounter}>
   {timelineItems.map((item, i) => {
    if (item.type === 'flight' && item.flight) {
    const fl = item.flight
    const dur = formatFlightDuration(fl.depart, fl.arrive)
    const timeParts = [
     `${formatFlightTime(fl.depart)} → ${formatFlightTime(fl.arrive)}`,
     dur,
     fl.number,
    ].filter(Boolean).join(' · ')
    return (
     <TimelineItem key={i} step={item.step}>
     <TimelineIndicator className="!size-[6px] !border-0" style={{ background: tokens.colors.accent }} />
     <TimelineSeparator style={{ background: tokens.colors.borderSubtle }} />
     <TimelineHeader>
      <TimelineTitle className="text-[13px]" style={{ color: tokens.colors.textPrimary }}>{fl.from} → {fl.to}</TimelineTitle>
      <TimelineDate className="text-[12px]" style={{ color: tokens.colors.textTertiary }}>{timeParts}</TimelineDate>
     </TimelineHeader>
     </TimelineItem>
    )
    }
    return (
    <TimelineItem key={i} step={item.step}>
     <TimelineIndicator className="!size-[6px] bg-transparent !border !border-dashed !border-[rgba(255,255,255,0.15)]" />
     <TimelineSeparator style={{ background: tokens.colors.borderSubtle }} />
     <TimelineContent className="text-[10px] font-medium" style={{ color: tokens.colors.textTertiary }}>
     {item.layoverAirport} Layover {item.layoverDuration}
     </TimelineContent>
    </TimelineItem>
    )
   })}
   </Timeline>
  </div>
  ) : (
  <p className="text-[13px] mb-5" style={{ color: tokens.colors.textTertiary }}>{trip.route}</p>
  )}

  {/* Accommodation */}
  {trip.hotel && (
  <div className="mb-5">
   <p className="text-[11px] font-medium uppercase tracking-[0.05em] mb-1.5" style={{ color: tokens.colors.textTertiary }}>Accommodation</p>
   <p className="text-[13px]" style={{ color: tokens.colors.textPrimary }}>{trip.hotel.name}</p>
   {trip.hotel.confirmationNumber && (
   <p className="text-[12px] mt-0.5" style={{ color: tokens.colors.textTertiary }}>{trip.hotel.confirmationNumber}</p>
   )}
  </div>
  )}

  {/* Action chips — horizontal scroll on mobile, no wrap */}
  <div className="flex items-center gap-2 flex-nowrap overflow-x-auto md:flex-wrap mt-4">
  <Button variant="ghost" size="sm" className="rounded-full text-[12px] hover:bg-[rgba(255,255,255,0.04)]" style={{ border: `1px solid ${tokens.colors.border}`, color: tokens.colors.textSecondary }} onClick={() => setPackingModalOpen(true)}>
   Packing list
  </Button>
  <Button variant="ghost" size="sm" className="rounded-full text-[12px] hover:bg-[rgba(255,255,255,0.04)]" style={{ border: `1px solid ${tokens.colors.border}`, color: tokens.colors.textSecondary }} onClick={openWorkout} disabled={loadingWorkout}>
   {loadingWorkout && <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin" />}
   Workout
  </Button>
  <Button variant="ghost" size="sm" className="rounded-full text-[12px] hover:bg-[rgba(255,255,255,0.04)]" style={{ border: `1px solid ${tokens.colors.border}`, color: tokens.colors.textSecondary }} onClick={handleNotify} disabled={notifying}>
   {notifying && <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin" />}
   Notify Anne
  </Button>
  </div>

  {/* Trip questions */}
  {unansweredQuestions.length > 0 && (
  <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${tokens.colors.borderSubtle}` }}>
   <p className="flex items-center gap-1.5 text-[12px] font-medium mb-3" style={{ color: tokens.colors.textSecondary }}>
   <AnimatedIcon icon={SparklesIcon} strokeWidth={1.5} className="h-3 w-3" style={{ color: tokens.colors.textTertiary }} />
   Help River plan better
   </p>
   <div className="flex flex-col gap-2">
   {unansweredQuestions.map(q => (
    <div key={q.id} className="flex items-center gap-2">
    <Input
     placeholder={q.question}
     value={questionAnswers[q.id] || ''}
     onChange={e => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
     onKeyDown={e => e.key === 'Enter' && handleAnswerSubmit(q.id)}
     className="h-8 text-[12px] border-[var(--border)] placeholder:text-white/30 flex-1"
     style={{ background: tokens.colors.surfaceHover }}
    />
    <Button variant="ghost" size="icon" className="h-8 w-8" style={{ color: tokens.colors.accent, border: `1px solid ${tokens.colors.accentSubtle}`, background: tokens.colors.accentSubtle }} onClick={() => handleAnswerSubmit(q.id)} disabled={!questionAnswers[q.id]?.trim() || savingQuestion === q.id}>
     {savingQuestion === q.id ? <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin" /> : <AnimatedIcon icon={Tick02Icon} className="h-3 w-3" />}
    </Button>
    </div>
   ))}
   </div>
  </div>
  )}
 </CardContent>
 </Card>
 </motion.div>

 {/* Workout modal */}
 {workoutModalOpen && (
 <WorkoutModal
 workout={workout || { exercises: [] }}
 open={workoutModalOpen}
 onClose={() => setWorkoutModalOpen(false)}
 toast={toast}
 equipment={equipment}
 onEquipmentChange={handleEquipmentChange}
 loading={loadingWorkout}
 />
 )}

 {/* Packing list modal */}
 {packingModalOpen && (
 <PackingListModal
 tripId={trip.id}
 open={packingModalOpen}
 onClose={() => setPackingModalOpen(false)}
 toast={toast}
 />
 )}
 </div>
 )
}

// --- Calendar Section ---
function CalendarSection({ events }: { events: CalendarEvent[] }) {
 if (events.length === 0) {
 return (
 <Card className="h-full rounded-md" style={{ background: tokens.colors.surface, borderColor: tokens.colors.border }}>
 <CardHeader>
  <CardTitle className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: tokens.colors.textTertiary }}>This Week</CardTitle>
 </CardHeader>
 <CardContent>
  <p className="text-[13px] text-center py-8" style={{ color: tokens.colors.textTertiary }}>Nothing scheduled</p>
 </CardContent>
 </Card>
 )
 }

 const now = new Date()
 now.setHours(0, 0, 0, 0)

 const eventsByDay: Record<string, CalendarEvent[]> = {}
 events.forEach(event => {
 const date = new Date(event.start)
 const dayLabel = getDayLabel(date)
 if (!eventsByDay[dayLabel]) eventsByDay[dayLabel] = []
 eventsByDay[dayLabel].push(event)
 })

 const isEventPast = (event: CalendarEvent) => {
 const eventDate = new Date(event.start)
 if (event.allDay) {
 const ed = new Date(event.start)
 ed.setHours(0, 0, 0, 0)
 return ed < now
 }
 return eventDate < new Date()
 }

 const staggerParent = { show: { transition: { staggerChildren: 0.03 } }, hidden: {} }
 const staggerChild = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }

 return (
 <Card className="h-full rounded-md" style={{ background: tokens.colors.surface, borderColor: tokens.colors.border }}>
 <CardHeader>
  <CardTitle className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: tokens.colors.textTertiary }}>This Week</CardTitle>
 </CardHeader>
 <CardContent>
  {Object.entries(eventsByDay).map(([dayLabel, dayEvents], dayIdx) => (
  <div key={dayLabel} className={dayIdx > 0 ? 'mt-6 pt-4' : ''} style={dayIdx > 0 ? { borderTop: `1px solid ${tokens.colors.borderSubtle}` } : undefined}>
   <p className="text-[15px] font-medium leading-5 mb-4 sticky top-0 z-10 py-1" style={{ color: tokens.colors.textPrimary, background: tokens.colors.surface }}>{dayLabel}</p>
   <motion.div variants={staggerParent} initial="hidden" animate="show">
   {dayEvents.map((event, idx) => {
    const past = isEventPast(event)
    const isAnne = ANNE_EMAILS.includes(event.organizer)
    const catStyle = getCategoryStyle(event)
    return (
    <motion.div
     key={idx}
     variants={staggerChild}
     className="flex items-center gap-3"
     style={{ minHeight: 36, paddingTop: 6, paddingBottom: 6, opacity: isAnne ? 0.4 : 1 }}
    >
     <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${catStyle.dot}`} />
     <span className="flex-1 min-w-0 text-[13px] leading-5 truncate" style={{ color: past ? tokens.colors.textTertiary : tokens.colors.textPrimary }}>{event.title}</span>
     <span className="shrink-0 text-[12px] font-medium leading-4" style={{ color: past ? tokens.colors.textQuaternary : tokens.colors.textSecondary }}>{formatEventTime(event)}</span>
     {event.location && (
     <span className="hidden md:inline shrink-0 text-[12px] font-medium leading-4 max-w-[160px] truncate" style={{ color: tokens.colors.textTertiary }}>{event.location}</span>
     )}
    </motion.div>
    )
   })}
   </motion.div>
  </div>
  ))}
 </CardContent>
 </Card>
 )
}

// --- Home Location Section (compact single row) ---
function HomeLocationSection({ toast }: { toast: (msg: string) => void }) {
 const [draft, setDraft] = useState({ homeAddress: '', homeCity: '' })
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [dirty, setDirty] = useState(false)

 useEffect(() => {
 lifeApi.getSettings().then(s => {
 setDraft({ homeAddress: s.homeAddress, homeCity: s.homeCity })
 setLoading(false)
 }).catch(() => setLoading(false))
 }, [])

 const handleChange = (field: 'homeAddress' | 'homeCity', value: string) => {
 setDraft(d => ({ ...d, [field]: value }))
 setDirty(true)
 }

 const save = async () => {
 setSaving(true)
 try {
 const result = await lifeApi.updateSettings({ homeAddress: draft.homeAddress, homeCity: draft.homeCity })
 setDraft({ homeAddress: result.homeAddress, homeCity: result.homeCity })
 setDirty(false)
 toast('Home location saved')
 } catch {
 toast('Failed to save')
 } finally {
 setSaving(false)
 }
 }

 return (
 <div className="py-4 border-b border-white/[0.08]">
 <div className="flex items-center gap-3">
 <AnimatedIcon icon={Home01Icon} strokeWidth={1.5} className="h-4 w-4 text-[var(--text-2)]" />
 <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)] shrink-0">Home</p>
 {loading ? (
 <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin text-[var(--text-3)] ml-auto" />
 ) : (
 <>
 <Input
 value={draft.homeAddress}
 onChange={e => handleChange('homeAddress', e.target.value)}
 className="h-8 text-[12px] bg-[rgba(255,255,255,0.04)] border-[var(--border)] text-[var(--text-2)] placeholder:text-[var(--text-3)] flex-1 min-w-0"
 placeholder="Address"
 />
 <Input
 value={draft.homeCity}
 onChange={e => handleChange('homeCity', e.target.value)}
 className="h-8 text-[12px] bg-[rgba(255,255,255,0.04)] border-[var(--border)] text-[var(--text-2)] placeholder:text-[var(--text-3)] w-32 shrink-0"
 placeholder="City"
 />
 <Button
 size="sm"
 onClick={save}
 disabled={saving || !dirty}
 className="h-8 px-3 text-[12px] bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)] shrink-0 disabled:opacity-30"
 >
 {saving ? <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin" /> : <AnimatedIcon icon={Tick02Icon} className="h-3 w-3" />}
 </Button>
 </>
 )}
 </div>
 </div>
 )
}

// --- Cron Jobs Section (compact grid) ---
function CronJobsSection({ cronJobs, onAdd, onDelete }: {
 cronJobs: CronJob[]
 onAdd: (line: string) => void
 onDelete: (line: string) => void
}) {
 const [newLine, setNewLine] = useState('')
 const [open, setOpen] = useState(false)

 return (
 <div className="py-4 border-b border-white/[0.08]">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <AnimatedIcon icon={Clock01Icon} strokeWidth={1.5} className="h-4 w-4 text-[var(--text-3)]" />
 <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Cron Jobs</p>
 {cronJobs.length > 0 && <span className="text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>{cronJobs.length}</span>}
 </div>
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger asChild>
 <Button variant="outline" size="sm" className="h-7 text-[11px] text-[var(--text-2)] border-[var(--border)] hover:bg-[rgba(255,255,255,0.04)]">
 <AnimatedIcon icon={PlusSignIcon} strokeWidth={1.5} className="h-3 w-3 mr-1" /> Add
 </Button>
 </DialogTrigger>
 <DialogContent className="">
 <DialogHeader><DialogTitle className="text-[var(--text-1)] ">Add Cron Job</DialogTitle></DialogHeader>
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
 className="bg-[rgba(255,255,255,0.04)] border-[var(--border)] text-[var(--text-1)] font-mono text-[12px]"
 />
 <p className="text-[12px] text-[var(--text-3)]">Format: minute hour day month weekday command</p>
 <DialogFooter>
 <Button
 onClick={() => { onAdd(newLine.trim()); setNewLine(''); setOpen(false) }}
 disabled={!newLine.trim()}
 className="bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
 >
 Add
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 {cronJobs.length === 0 ? (
 <p className="text-[12px] text-[var(--text-3)] text-center py-4">No cron jobs</p>
 ) : (
 <div className="space-y-0.5">
 {cronJobs.map((job) => {
 const rawSchedule = job.raw.split(/\s+/).slice(0, 5).join(' ')
 return (
 <div key={job.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150">
 <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: job.source === 'server' ? 'var(--accent, #06b6d4)' : 'var(--success, #10b981)' }} />
 <span className="text-[13px] text-[var(--text-2)] truncate flex-1 min-w-0">{job.name}</span>
 <code className="text-[12px] font-medium text-[var(--text-3)] font-mono shrink-0">{rawSchedule}</code>
 <span className="text-[12px] font-medium text-[var(--text-3)] shrink-0 hidden sm:inline">{job.schedule}</span>
 {job.source === 'crontab' && (
 <button
 onClick={() => onDelete(job.raw)}
 className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-3)] hover:text-rose-400/80 shrink-0 p-0.5"
 >
 <AnimatedIcon icon={Delete02Icon} strokeWidth={1.5} className="h-3 w-3" />
 </button>
 )}
 </div>
 )
 })}
 </div>
 )}
 </div>
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

 const getInitials = (name: string) => {
 const parts = name.split(' ').filter(Boolean)
 if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
 return parts[0]?.[0]?.toUpperCase() || '?'
 }

 return (
 <Card className="rounded-md" style={{ background: tokens.colors.surface, borderColor: tokens.colors.border }}>
 {/* Header: label + count + Add */}
 <div className="flex items-center justify-between px-6 pt-6 pb-0">
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: tokens.colors.textTertiary }}>Birthdays</span>
 {living.length > 0 && (
  <Badge variant="secondary" className="border-transparent" style={{ color: tokens.colors.textSecondary }}>{living.length}</Badge>
 )}
 </div>
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogTrigger asChild>
  <button className="text-[12px] font-medium bg-transparent border-none cursor-pointer" style={{ color: tokens.colors.accent }}>Add</button>
 </DialogTrigger>
 <DialogContent className="">
  <DialogHeader><DialogTitle className="text-[var(--text-1)]">Add Birthday</DialogTitle></DialogHeader>
  <div className="space-y-3">
  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="border-[var(--border)] text-[var(--text-1)]" style={{ background: tokens.colors.surfaceHover }} />
  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-[var(--border)] text-[var(--text-1)]" style={{ background: tokens.colors.surfaceHover }} />
  <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="border-[var(--border)] text-[var(--text-1)]" style={{ background: tokens.colors.surfaceHover }} />
  </div>
  <DialogFooter>
  <Button onClick={addBirthday} disabled={!name.trim() || !date} className="bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]">Add</Button>
  </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 <CardContent>
 {living.length === 0 && deceased.length === 0 && hidden.length === 0 ? (
 <p className="text-[13px] text-center py-8" style={{ color: tokens.colors.textTertiary }}>No birthdays added</p>
 ) : displayedLiving.length === 0 && deceased.length === 0 ? (
 <div className="text-center py-8">
  <p className="text-[13px] mb-2" style={{ color: tokens.colors.textTertiary }}>No birthdays in the next 30 days</p>
  <button onClick={() => setShowAll(true)} className="text-[12px] font-medium bg-transparent border-none cursor-pointer" style={{ color: tokens.colors.accent }}>Show all {living.length} birthdays</button>
 </div>
 ) : (
 <>
 <motion.div className="flex flex-col gap-1" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}>
  {displayedLiving.map((b) => {
  const days = daysUntilBirthday(b.date)
  const isToday = days === 0
  const countdown = getCountdown(days)
  const age = getAge(b.date, b.year)
  return (
   <motion.div
   key={b.id}
   className="group flex items-center gap-3 rounded-md px-1 py-1.5"
   variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
   whileHover={{ backgroundColor: tokens.colors.surfaceHover }}
   transition={{ duration: 0.15 }}
   >
   <Avatar className="h-7 w-7">
    <AvatarFallback className="bg-[#1E1E20] text-[10px]" style={{ color: tokens.colors.textSecondary }}>{getInitials(b.name)}</AvatarFallback>
   </Avatar>
   <div className="flex-1 min-w-0">
    <span className="text-[13px] leading-5 block" style={{ color: isToday ? '#FBBF24' : tokens.colors.textPrimary }}>{b.name}</span>
    <span className="text-[12px] font-medium leading-4" style={{ color: tokens.colors.textTertiary }}>
    <TextMorph as="span" className="inline-flex text-[12px] font-medium leading-4" style={{ color: tokens.colors.textTertiary }}>{countdown}</TextMorph>
    {age ? <> · <TextMorph as="span" className="inline-flex text-[12px] font-medium leading-4" style={{ color: tokens.colors.textTertiary }}>{age}</TextMorph></> : ''}
    </span>
   </div>
   <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
    <Button variant="ghost" size="icon" className="text-white/30 hover:text-[var(--accent)] h-7 w-7" onClick={() => setMessageModal(b)} title="Birthday message">
    <AnimatedIcon icon={MessageMultiple01Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="icon" className="text-white/30 hover:text-[var(--accent)] h-7 w-7" onClick={() => setGiftModal(b)} title="Gift ideas">
    <AnimatedIcon icon={GiftIcon} strokeWidth={1.5} className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="icon" className={`text-white/30 hover:text-[var(--accent)] h-7 w-7 ${sendingEmailId === b.id ? '!opacity-100' : ''}`} disabled={sendingEmailId === b.id} onClick={async () => { setSendingEmailId(b.id); await onSendEmail(b); setSendingEmailId(null) }} title="Send email reminder">
    {sendingEmailId === b.id ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={Mail01Icon} className="h-3.5 w-3.5" />}
    </Button>
    <button onClick={() => hideBirthday(b.id)} className="text-white/30 hover:text-white/55 h-7 w-7 flex items-center justify-center" title="Hide">
    <AnimatedIcon icon={Cancel01Icon} strokeWidth={1.5} className="h-3 w-3" />
    </button>
   </div>
   <span className="text-[12px] font-medium leading-4 shrink-0" style={{ color: tokens.colors.textTertiary }}>{formatBirthdayDate(b.date)}</span>
   </motion.div>
  )
  })}
 </motion.div>
 {/* Deceased entries */}
 {(showAll || displayedLiving.length > 0) && deceased.length > 0 && (
  <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${tokens.colors.borderSubtle}` }}>
  {deceased.map((b) => (
   <div key={b.id} className="p-1.5">
   <span className="text-[13px]" style={{ color: tokens.colors.textTertiary }}>&#x1F54A;&#xFE0F; {b.name}</span>
   </div>
  ))}
  </div>
 )}
 {!showAll && sortedLiving.length > upcoming.length && (
  <button onClick={() => setShowAll(true)} className="text-[12px] font-medium bg-transparent border-none cursor-pointer mt-3 w-full text-center block" style={{ color: tokens.colors.accent }}>
  Show all {sortedLiving.length} birthdays
  </button>
 )}
 {showAll && (
  <button onClick={() => setShowAll(false)} className="text-[12px] font-medium bg-transparent border-none cursor-pointer mt-3 w-full text-center block" style={{ color: tokens.colors.textTertiary }}>
  Show upcoming only
  </button>
 )}
 </>
 )}
 {/* Hidden entries toggle */}
 {hidden.length > 0 && (
 <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${tokens.colors.borderSubtle}` }}>
  <button onClick={() => setShowHidden(!showHidden)} className="flex items-center gap-1.5 text-[12px] font-medium bg-transparent border-none cursor-pointer" style={{ color: tokens.colors.textTertiary }}>
  {showHidden ? <AnimatedIcon icon={ViewOffSlashIcon} strokeWidth={1.5} className="h-3 w-3" /> : <AnimatedIcon icon={ViewIcon} className="h-3 w-3" />}
  {showHidden ? 'Hide' : 'Show'} hidden ({hidden.length})
  </button>
  <AnimatePresence>
  {showHidden && (
  <motion.div className="flex flex-col gap-1 mt-2" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
   {hidden.map((b) => (
   <div key={b.id} className="group flex items-center justify-between p-1.5">
    <div className="flex items-center gap-3">
    <span className="text-[13px]" style={{ color: tokens.colors.textTertiary }}>{b.name}</span>
    <span className="text-[12px]" style={{ color: tokens.colors.textQuaternary }}>{formatBirthdayDate(b.date)}</span>
    </div>
    <Button variant="ghost" size="icon" className="text-[var(--text-3)] hover:text-[var(--text-2)] h-7 w-7" onClick={() => unhideBirthday(b.id)} title="Unhide">
    <AnimatedIcon icon={ViewIcon} strokeWidth={1.5} className="h-3.5 w-3.5" />
    </Button>
   </div>
   ))}
  </motion.div>
  )}
  </AnimatePresence>
 </div>
 )}
 </CardContent>

 {/* Message Modal */}
 <Dialog open={!!messageModal} onOpenChange={(v) => { if (!v) setMessageModal(null) }}>
 <DialogContent className="">
 <DialogHeader>
  <DialogTitle className="text-[var(--text-1)]">Message pour {messageModal?.name.split(' ')[0]}</DialogTitle>
 </DialogHeader>
 {messageModal && (
  <div className="space-y-4">
  <p className="text-[13px] text-[var(--text-2)] rounded-lg p-4 leading-relaxed" style={{ background: tokens.colors.surfaceHover }}>
   {generateBirthdayMessage(messageModal)}
  </p>
  <Button onClick={() => copyToClipboard(generateBirthdayMessage(messageModal))} className="w-full bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]">
   <AnimatedIcon icon={Copy01Icon} strokeWidth={1.5} className="h-3.5 w-3.5 mr-2" />
   {copied ? 'Copié !' : 'Copier le message'}
  </Button>
  </div>
 )}
 </DialogContent>
 </Dialog>

 {/* Gift Ideas Modal */}
 <Dialog open={!!giftModal} onOpenChange={(v) => { if (!v) setGiftModal(null) }}>
 <DialogContent className="">
 <DialogHeader>
  <DialogTitle className="text-[var(--text-1)]">Idées cadeaux pour {giftModalTitle}</DialogTitle>
 </DialogHeader>
 {giftLoading ? (
  <div className="flex items-center justify-center py-8 gap-2 text-[var(--text-2)]">
  <Loading03Icon strokeWidth={1.5} className="h-4 w-4 animate-spin" />
  <span className="text-[13px]">Génération en cours...</span>
  </div>
 ) : (
  <div className="space-y-2">
  {giftIdeas.map((idea, i) => (
   <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: tokens.colors.surfaceHover }}>
   <span className="text-[13px] text-[var(--text-2)]">{idea}</span>
   <a href={`https://www.google.com/search?q=${encodeURIComponent(idea.replace(/^\S+\s/, '') + ' cadeau Toulouse')}`} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-text)] shrink-0 ml-2" title="Chercher près de Toulouse">
    <AnimatedIcon icon={LinkSquare02Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
   </a>
   </div>
  ))}
  {giftIdeas.length === 0 && (
   <p className="text-[13px] text-[var(--text-3)] text-center py-4">Aucune suggestion disponible</p>
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
 <Card className="rounded-md" style={{ background: tokens.colors.surface, borderColor: tokens.colors.border }}>
 <div className="flex items-center justify-between px-6 pt-6 pb-0">
  <span className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: tokens.colors.textTertiary }}>Reminders</span>
  <Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
   <button className="text-[12px] font-medium bg-transparent border-none cursor-pointer" style={{ color: tokens.colors.accent }}>Add</button>
  </DialogTrigger>
  <DialogContent className="">
   <DialogHeader><DialogTitle className="text-[var(--text-1)]">Add Reminder</DialogTitle></DialogHeader>
   <div className="space-y-3">
    <Input placeholder="Reminder title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-[var(--border)] text-[var(--text-1)]" style={{ background: tokens.colors.surfaceHover }} />
    <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="border-[var(--border)] text-[var(--text-1)]" style={{ background: tokens.colors.surfaceHover }} />
   </div>
   <DialogFooter>
    <Button onClick={addReminder} disabled={!title.trim()} className="bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]">Add</Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>
 </div>
 <CardContent>
 {active.length === 0 && done.length === 0 ? (
 <p className="text-[13px] text-center py-8" style={{ color: tokens.colors.textTertiary }}>No reminders</p>
 ) : (
 <div className="flex flex-col gap-3 md:gap-4">
  {active.map((r) => {
  const overdue = isOverdue(r.due)
  return (
   <div key={r.id} className="group flex items-center gap-3">
   <Checkbox
    checked={false}
    onCheckedChange={() => toggleDone(r.id)}
    className={overdue ? 'border-[#F87171]' : 'border-[rgba(255,255,255,0.15)]'}
   />
   <span className="flex-1 min-w-0 text-[13px] leading-5" style={{ color: overdue ? tokens.colors.red : tokens.colors.textSecondary }}>{r.title}</span>
   <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-3)] hover:text-[var(--accent)] h-7 w-7" onClick={() => openEdit(r)}>
    <AnimatedIcon icon={PencilEdit02Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
   </Button>
   </div>
  )
  })}
  {done.map((r) => (
  <div key={r.id} className="group flex items-center gap-3">
   <Checkbox
   checked={true}
   onCheckedChange={() => toggleDone(r.id)}
   />
   <span className="flex-1 min-w-0 text-[13px] leading-5 line-through" style={{ color: tokens.colors.textTertiary }}>{r.title}</span>
   <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-3)] hover:text-[var(--accent)] h-7 w-7" onClick={() => openEdit(r)}>
   <AnimatedIcon icon={PencilEdit02Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
   </Button>
  </div>
  ))}
 </div>
 )}
 </CardContent>

 {/* Edit Reminder Modal */}
 <Dialog open={!!editModal} onOpenChange={(v) => { if (!v) setEditModal(null) }}>
 <DialogContent className="">
 <DialogHeader><DialogTitle className="text-[var(--text-1)]">Edit Reminder</DialogTitle></DialogHeader>
 <div className="space-y-3">
  <div>
  <label className="text-[12px] text-[var(--text-2)] mb-1 block">Title</label>
  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="border-[var(--border)] text-[var(--text-1)]" style={{ background: tokens.colors.surfaceHover }} />
  </div>
  <div>
  <label className="text-[12px] text-[var(--text-2)] mb-1 block">Due date</label>
  <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} className="border-[var(--border)] text-[var(--text-1)]" style={{ background: tokens.colors.surfaceHover }} />
  </div>
  <div>
  <Label className="text-[12px] text-[var(--text-2)] mb-1 block">Recurring</Label>
  <Select value={editRecurring} onValueChange={setEditRecurring}>
   <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
   <SelectContent>
    <SelectItem value="none">None</SelectItem>
    <SelectItem value="daily">Daily</SelectItem>
    <SelectItem value="weekly">Weekly</SelectItem>
    <SelectItem value="monthly">Monthly</SelectItem>
    <SelectItem value="yearly">Yearly</SelectItem>
   </SelectContent>
  </Select>
  </div>
  <div>
  <Label className="text-[12px] text-[var(--text-2)] mb-1 block">Status</Label>
  <Select value={editStatus} onValueChange={setEditStatus}>
   <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
   <SelectContent>
    <SelectItem value="active">Active</SelectItem>
    <SelectItem value="done">Done</SelectItem>
   </SelectContent>
  </Select>
  </div>
 </div>
 <DialogFooter className="flex justify-between">
  {!deleteConfirm ? (
  <Button variant="ghost" onClick={() => setDeleteConfirm(true)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
   <AnimatedIcon icon={Delete02Icon} strokeWidth={1.5} className="h-3.5 w-3.5 mr-1" /> Delete
  </Button>
  ) : (
  <Button variant="ghost" onClick={deleteReminder} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
   <AnimatedIcon icon={Delete02Icon} strokeWidth={1.5} className="h-3.5 w-3.5 mr-1" /> Confirm delete
  </Button>
  )}
  <Button onClick={saveEdit} className="bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]">Save</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </Card>
 )
}

// --- Day Planner Modal ---
function DayPlannerModal({ plan, open, onClose, toast }: { plan: DayPlan; open: boolean; onClose: () => void; toast: (msg: string) => void }) {
 const [sharing, setSharing] = useState(false)
 const [downloading, setDownloading] = useState(false)

 if (!plan) return null

 const stepTypeIcon = (type?: string) => {
 switch (type) {
 case 'drive': return '🚗'
 case 'arrive': return '📍'
 case 'activity': return '🎯'
 case 'lunch': return '🍽️'
 default: return '•'
 }
 }

 const handleShare = async () => {
 setSharing(true)
 try {
 const result = await lifeApi.sharePlan(plan)
 toast(result.success ? 'Plan shared with Anne!' : `Failed: ${result.error || 'Unknown'}`)
 } catch {
 toast('Failed to share plan')
 } finally {
 setSharing(false)
 }
 }

 const handleDownloadIcs = async () => {
 setDownloading(true)
 try {
 const blob = await lifeApi.downloadIcs(plan)
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = `${(plan.title || 'day-plan').replace(/[^a-zA-Z0-9-_ ]/g, '')}.ics`
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 URL.revokeObjectURL(url)
 toast('Calendar file downloaded')
 } catch {
 toast('Failed to download calendar')
 } finally {
 setDownloading(false)
 }
 }

 return (
 <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
 <DialogContent className="max-w-[640px] max-h-[85vh] overflow-y-auto p-0" style={{ background: '#1E1E20', borderColor: tokens.colors.border }}>
 <DialogHeader className="p-6 pb-4">
 <DialogTitle className="flex items-center gap-3 text-[var(--text-1)]" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
  <AnimatedIcon icon={Calendar01Icon} strokeWidth={1.5} className="h-5 w-5 text-[var(--accent)]" />
  {plan.title}
 </DialogTitle>
 <DialogDescription className="text-[var(--text-2)] text-[12px] ml-8">
  {plan.day}
 </DialogDescription>
 </DialogHeader>

 {/* Timeline */}
 <div className="px-6 pb-4">
 <div className="relative">
  <div className="absolute left-[27px] top-2 bottom-2 w-px bg-white/[0.08]" />
  <div className="space-y-0">
  {plan.steps.map((step: DayPlanStep, i: number) => (
  <div key={i} className="relative flex gap-4 py-3">
   <div className="flex items-start gap-2 shrink-0 w-[56px]">
   <span className="text-[12px] font-mono text-[var(--accent)] mt-0.5">{step.time}</span>
   </div>
   <div className="flex items-start shrink-0 -ml-1 mt-0.5">
   <span className="text-[13px] relative z-10 px-0.5" style={{ background: tokens.colors.surfaceHover }}>{stepTypeIcon(step.type)}</span>
   </div>
   <div className="flex-1 min-w-0">
   <p className="text-[13px] text-[var(--text-1)]">{step.action}</p>
   {step.place && (
    <p className="text-[12px] text-[var(--accent-muted)] mt-0.5">{step.place}{step.cuisine ? ` · ${step.cuisine}` : ''}{step.price ? ` · ${step.price}` : ''}</p>
   )}
   {step.parking && (
    <p className="text-[11px] text-[var(--text-3)] mt-0.5">🅿️ {step.parking}</p>
   )}
   {step.notes && (
    <p className="text-[13px] text-[var(--text-3)] mt-1 leading-relaxed">{step.notes}</p>
   )}
   {step.mapQuery && (
    <a
    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(step.mapQuery)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-muted)] hover:text-[var(--accent-text)] mt-1"
    >
    <AnimatedIcon icon={Location01Icon} strokeWidth={1.5} className="h-2.5 w-2.5" /> Maps
    </a>
   )}
   </div>
  </div>
  ))}
  </div>
 </div>
 </div>

 <DialogFooter className="p-6 pt-2 border-t border-[var(--border)] flex-row gap-3 sm:justify-start">
 <Button variant="outline" size="sm" onClick={handleShare} disabled={sharing} className="bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)] text-[12px]">
  {sharing ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={Share01Icon} className="h-3.5 w-3.5" />}
  Share with Anne
 </Button>
 <Button variant="outline" size="sm" onClick={handleDownloadIcs} disabled={downloading} className="text-[var(--text-2)] text-[12px]">
  {downloading ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={Download02Icon} className="h-3.5 w-3.5" />}
  Add to Calendar
 </Button>
 <Button variant="outline" size="sm" onClick={onClose} className="text-[var(--text-2)] text-[12px]">
  Close
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 )
}

// --- Idea Card (compact + expandable) ---
function IdeaCard({ idea, type, toast, onDidThis, weather, onOpenPlan }: { idea: Idea; type: 'weekend' | 'date'; toast: (msg: string) => void; onDidThis: (idea: Idea) => void; weather?: WeekendWeather | null; onOpenPlan: (plan: DayPlan) => void }) {
 const [expanded, setExpanded] = useState(false)
 const [sharing, setSharing] = useState(false)
 const [planning, setPlanning] = useState(false)
 const [planDay, setPlanDay] = useState<'Saturday' | 'Sunday'>('Saturday')

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

 const handlePlanDay = async (e: React.MouseEvent) => {
 e.stopPropagation()
 setPlanning(true)
 try {
 const weatherStr = weather
 ? `${planDay === 'Saturday' ? weather.saturday.condition : weather.sunday.condition}, ${planDay === 'Saturday' ? weather.saturday.tempMax : weather.sunday.tempMax}°C`
 : undefined
 const plan = await lifeApi.planDay({
 title: idea.title,
 location: idea.mapQuery || idea.title,
 day: planDay,
 weather: weatherStr,
 })
 onOpenPlan(plan)
 } catch {
 toast('Failed to generate plan')
 } finally {
 setPlanning(false)
 }
 }

 return (
 <>
 <div
 className="group cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.03)]"
 style={{ borderRadius: tokens.radii.sm, padding: `${tokens.spacing.md}px ${tokens.spacing.sm}px` }}
 onClick={() => setExpanded(!expanded)}
 >
 {/* Compact row — wraps on mobile */}
 <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
 <span className="text-[16px] leading-none shrink-0">{idea.emoji}</span>
 <p className="truncate text-[13px] font-medium text-[var(--text-1)] min-w-0 flex-1 md:flex-none md:max-w-[40%]">{idea.title}</p>
 {/* Activity pills — shadcn Badge with semantic colors */}
 <div className="hidden md:flex items-center gap-2">
 {idea.indoor !== undefined && (
 <Badge className={idea.indoor
  ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--accent-border)] hover:bg-[var(--accent-subtle)]'
  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
 }>
  {idea.indoor ? 'Indoor' : 'Outdoor'}
 </Badge>
 )}
 <Badge variant="secondary" className="gap-1">
 <AnimatedIcon icon={Car01Icon} strokeWidth={1.5} className="h-2.5 w-2.5" />
 {idea.driveTime}
 </Badge>
 </div>
 <div className="flex items-center gap-1 shrink-0 ml-auto">
 <Button variant="ghost" size="icon-xs" onClick={handleShare} disabled={sharing} title="Share with Anne" className="text-[var(--text-3)] hover:text-[var(--text-2)]">
  {sharing ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={Share01Icon} className="h-3.5 w-3.5" />}
 </Button>
 <Button variant="ghost" size="icon-xs" onClick={handleDidThis} title="We did this!" className="text-[var(--text-3)] hover:text-emerald-400 hover:bg-emerald-500/[0.08]">
  <AnimatedIcon icon={Tick02Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
 </Button>
 <AnimatedIcon icon={ArrowDown01Icon} strokeWidth={1.5} className={`transition-transform duration-200 h-3.5 w-3.5 text-[var(--text-3)] ${expanded ? 'rotate-180' : ''}`} />
 </div>
 </div>

 {/* Expanded detail */}
 <AnimatePresence>
 {expanded && (
 <motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="mt-2"
 >
  <Separator className="mb-3" />
  <div className="flex flex-col gap-3 px-1 pb-1">
  <p className="text-[13px] text-[var(--text-2)] leading-relaxed">{idea.fullDescription}</p>

  <div className="flex flex-wrap gap-2">
   <Button variant="outline" size="sm" asChild className="bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--accent)] text-[12px] h-7">
   <a href={mapsLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
    <AnimatedIcon icon={Location01Icon} strokeWidth={1.5} className="h-3 w-3" /> Google Maps
   </a>
   </Button>
   <Button variant="outline" size="sm" asChild className="text-[var(--text-2)] text-[12px] h-7">
   <a href={parkingLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
    <AnimatedIcon icon={ParkingAreaCircleIcon} strokeWidth={1.5} className="h-3 w-3" /> Parking
   </a>
   </Button>
   <Button variant="outline" size="sm" asChild className="text-[var(--text-2)] text-[12px] h-7">
   <a href={hotelLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
    <AnimatedIcon icon={Hotel01Icon} strokeWidth={1.5} className="h-3 w-3" /> Hotels
   </a>
   </Button>
   <Button variant="outline" size="sm" asChild className="text-[var(--text-2)] text-[12px] h-7">
   <a href={lunchLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
    <AnimatedIcon icon={CookBookIcon} strokeWidth={1.5} className="h-3 w-3" /> Lunch
   </a>
   </Button>
  </div>

  {(idea.parking || idea.hotel || idea.lunchSpot) && (
   <div className="flex flex-col gap-1.5 pt-1">
   {idea.lunchSpot && <p className="text-[12px] text-[var(--text-3)]">Lunch: {idea.lunchSpot}</p>}
   {idea.parking && <p className="text-[12px] text-[var(--text-3)]">Parking: {idea.parking}</p>}
   {idea.hotel && <p className="text-[12px] text-[var(--text-3)]">Stay: {idea.hotel}</p>}
   </div>
  )}

  {/* Plan this day */}
  <Separator />
  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
   <Select value={planDay} onValueChange={(v) => setPlanDay(v as 'Saturday' | 'Sunday')}>
   <SelectTrigger size="sm" className="w-[110px] text-[12px] bg-transparent border-[var(--border)] text-[var(--text-2)]">
    <SelectValue />
   </SelectTrigger>
   <SelectContent>
    <SelectItem value="Saturday">Saturday</SelectItem>
    <SelectItem value="Sunday">Sunday</SelectItem>
   </SelectContent>
   </Select>
   <Button variant="outline" size="sm" onClick={handlePlanDay} disabled={planning} className="bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--accent)] text-[12px]">
   {planning ? <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin" /> : <AnimatedIcon icon={Calendar01Icon} className="h-3 w-3" />}
   Plan this day
   </Button>
  </div>

  <div className="flex items-center gap-2">
   <Button variant="ghost" size="sm" onClick={handleShare} disabled={sharing} className="text-[var(--text-2)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] text-[12px]">
   {sharing ? <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin" /> : <AnimatedIcon icon={Share01Icon} className="h-3 w-3" />}
   Share with Anne
   </Button>
   <Button variant="ghost" size="sm" onClick={handleDidThis} className="text-[var(--text-2)] hover:bg-emerald-500/10 hover:text-emerald-400 text-[12px]">
   <AnimatedIcon icon={Tick02Icon} strokeWidth={1.5} className="h-3 w-3" /> We did this!
   </Button>
  </div>
  </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 </>
 )
}

// --- Weather Icon Helper ---
function WeatherIcon({ code, className }: { code: number; className?: string }) {
 // WMO weather codes: 0=clear, 1-3=partly cloudy, 45-48=fog, 51-57=drizzle, 61-67=rain, 71-77=snow, 80-82=showers, 95-99=thunderstorm
 if (code === 0) return <AnimatedIcon icon={Sun01Icon} strokeWidth={1.5} className={className} />
 if (code <= 3) return <AnimatedIcon icon={SunCloud01Icon} strokeWidth={1.5} className={className} />
 if (code <= 48) return <AnimatedIcon icon={CloudIcon} strokeWidth={1.5} className={className} />
 if (code <= 57) return <AnimatedIcon icon={CloudLittleRainIcon} strokeWidth={1.5} className={className} />
 if (code <= 67) return <AnimatedIcon icon={CloudBigRainIcon} strokeWidth={1.5} className={className} />
 if (code <= 77) return <AnimatedIcon icon={SnowIcon} strokeWidth={1.5} className={className} />
 if (code <= 82) return <AnimatedIcon icon={CloudBigRainIcon} strokeWidth={1.5} className={className} />
 if (code <= 99) return <AnimatedIcon icon={ZapIcon} strokeWidth={1.5} className={className} />
 return <AnimatedIcon icon={WindPower01Icon} strokeWidth={1.5} className={className} />
}

// --- Weekend Weather Card ---
function WeekendWeatherCard({ weather }: { weather: WeekendWeather | null }) {
 if (!weather) return null
 const homeCity = weather.homeCity

 return (
 <div className="rounded-lg p-5" style={{ background: tokens.colors.surface, border: `1px solid ${tokens.colors.borderSubtle}` }}>
 <div className="flex items-center justify-between">
 <span style={{ ...tokens.typography.label, color: tokens.colors.textTertiary }}>
 This weekend{homeCity ? ` — ${homeCity}` : ''}
 </span>
 <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 flex-wrap">
 <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
 <WeatherIcon code={weather.saturday.weatherCode} className="h-4 w-4 text-amber-400/80" />
 <span style={{ ...tokens.typography.body, color: tokens.colors.textSecondary }}>Sat</span>
 <span style={{ ...tokens.typography.body, color: tokens.colors.textPrimary }}>{Math.round(weather.saturday.tempMax)}°</span>
 <span style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>{Math.round(weather.saturday.tempMin)}°</span>
 {weather.saturday.precipitation > 0 && (
 <span className="text-[10px] text-blue-400/60">{weather.saturday.precipitation}mm</span>
 )}
 </div>
 <div style={{ width: 1, height: tokens.spacing.lg, background: tokens.colors.border }} />
 <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
 <WeatherIcon code={weather.sunday.weatherCode} className="h-4 w-4 text-amber-400/80" />
 <span style={{ ...tokens.typography.body, color: tokens.colors.textSecondary }}>Sun</span>
 <span style={{ ...tokens.typography.body, color: tokens.colors.textPrimary }}>{Math.round(weather.sunday.tempMax)}°</span>
 <span style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>{Math.round(weather.sunday.tempMin)}°</span>
 {weather.sunday.precipitation > 0 && (
 <span className="text-[10px] text-blue-400/60">{weather.sunday.precipitation}mm</span>
 )}
 </div>
 </div>
 </div>
 </div>
 )
}

// --- Local Events Section ---
function LocalEventsSection({ events }: { events: LocalEvent[] }) {
 if (events.length === 0) return null

 return (
 <div className="rounded-lg p-5" style={{ background: tokens.colors.surface, border: `1px solid ${tokens.colors.borderSubtle}` }}>
 <div className="flex items-center justify-between mb-4">
 <span style={{ ...tokens.typography.title, color: tokens.colors.textPrimary }}>This Weekend</span>
 </div>
 <div className="flex flex-col gap-4">
 {events.map((event, i) => (
 <a
 key={i}
 href={`https://www.google.com/search?q=${encodeURIComponent(event.title + ' ' + (event.location || 'Toulouse'))}`}
 target="_blank"
 rel="noopener noreferrer"
 className="group cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.03)]"
 style={{ borderRadius: tokens.radii.sm, padding: `${tokens.spacing.md}px ${tokens.spacing.sm}px` }}
 >
 <div className="flex items-center gap-2 md:gap-3">
 <span className="text-[16px] leading-none shrink-0">🎭</span>
 <p className="truncate text-[13px] font-medium text-[var(--text-1)] min-w-0 flex-1">{event.title}</p>
 {event.location && (
 <span className="hidden md:inline text-[13px] text-[var(--text-2)] truncate max-w-[200px]">{event.location}</span>
 )}
 {event.driveTime && (
 <Badge variant="secondary" className="gap-1 shrink-0">
 <AnimatedIcon icon={Car01Icon} strokeWidth={1.5} className="h-2.5 w-2.5" />
 {event.driveTime}
 </Badge>
 )}
 <AnimatedIcon icon={LinkSquare02Icon} strokeWidth={1.5} style={{ width: 14, height: 14, color: tokens.colors.textTertiary, flexShrink: 0 }} className="group-hover:text-[var(--text-2)]" />
 </div>
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
 <AnimatedIcon icon={WorkHistoryIcon} strokeWidth={1.5} className="h-3.5 w-3.5 text-[var(--text-3)]" />
 <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)] group-hover:text-[var(--text-2)] transition-colors">
 Trip History
 </span>
 {trips.length > 0 && (
 <span className="text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>{trips.length}</span>
 )}
 <AnimatedIcon icon={ArrowDown01Icon} strokeWidth={1.5} className={`h-3 w-3 text-[var(--text-3)] transition-transform duration-200 ml-auto ${expanded ? 'rotate-180' : ''}`} />
 </button>
 <AnimatePresence>
 {(expanded || trips.length > 0) && (
 <motion.div className="space-y-1" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
 {displayTrips.map((trip) => (
 <div key={trip.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors">
 <span className="text-[12px] font-medium text-[var(--text-3)] font-mono w-20 shrink-0">
 {new Date(trip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
 </span>
 <span className="text-[13px] text-[var(--text-2)] flex-1 truncate">{trip.title}</span>
 {trip.location && (
 <span className="text-[12px] font-medium text-[var(--text-3)] truncate max-w-[120px]">{trip.location}</span>
 )}
 {trip.rating && (
 <div className="flex items-center gap-0.5 shrink-0">
 {Array.from({ length: trip.rating }).map((_, j) => (
 <AnimatedIcon key={j} icon={StarIcon} strokeWidth={1.5} className="h-2.5 w-2.5 fill-amber-400/60 text-amber-400/60" noStroke />
 ))}
 </div>
 )}
 </div>
 ))}
 {!expanded && trips.length > 3 && (
 <button onClick={onToggle} className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-2)] w-full text-center py-1">
 Show all {trips.length} trips
 </button>
 )}
 {expanded && trips.length > 3 && (
 <button onClick={onToggle} className="text-[12px] text-[var(--text-3)] hover:text-[var(--text-2)] w-full text-center py-1">
 Show less
 </button>
 )}
 {trips.length === 0 && (
 <p className="text-[12px] text-[var(--text-3)] text-center py-4">No trips recorded yet</p>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

// --- Ideas Section (weekend or date) ---
const ideaStaggerContainer = {
 hidden: {},
 show: { transition: { staggerChildren: 0.06 } },
}
const ideaStaggerItem = {
 hidden: { opacity: 0, y: 16 },
 show: { opacity: 1, y: 0 },
}

function IdeasSection({ type, ideas, content, lastUpdated, refreshing, refreshDisabled, onRefresh, toast, onDidThis, weather, onOpenPlan }: {
 type: 'weekend' | 'date'
 ideas: Idea[]
 content: string
 lastUpdated: string | null
 refreshing: boolean
 refreshDisabled: boolean
 onRefresh: () => void
 toast: (msg: string) => void
 onDidThis: (idea: Idea) => void
 weather?: WeekendWeather | null
 onOpenPlan: (plan: DayPlan) => void
}) {
 const isWeekend = type === 'weekend'
 const label = isWeekend ? 'Weekend Ideas' : 'Date Ideas'
 const fallbackMsg = isWeekend ? 'No suggestions yet. Next update: Thursday 7pm.' : 'No suggestions yet. Next update: Monday 9am.'

 const { parsedIdeas, parseError } = useMemo(() => {
 if (ideas.length > 0) return { parsedIdeas: ideas, parseError: false }
 if (!content.trim()) return { parsedIdeas: [] as Idea[], parseError: false }
 try {
 const cleaned = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
 const parsed = JSON.parse(cleaned)
 if (Array.isArray(parsed)) return { parsedIdeas: parsed as Idea[], parseError: false }
 } catch { /* not valid JSON */ }
 const looksLikeJson = content.trimStart().startsWith('[') || content.trimStart().startsWith('{')
 return { parsedIdeas: [] as Idea[], parseError: looksLikeJson }
 }, [ideas, content])

 const hasIdeas = parsedIdeas.length > 0

 return (
 <div className="rounded-lg p-5 min-h-[200px] flex flex-col" style={{ background: tokens.colors.surface, border: `1px solid ${tokens.colors.borderSubtle}` }}>
 <div className="flex items-center justify-between mb-4">
  <span style={{ ...tokens.typography.title, color: tokens.colors.textPrimary }}>{label}</span>
  <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshDisabled} className="text-[var(--text-3)] hover:text-[var(--text-2)] h-7 gap-1.5">
  {refreshing ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={RotateClockwiseIcon} className="h-3.5 w-3.5" />}
  <span className="hidden sm:inline">Refresh</span>
  </Button>
 </div>
 <div className="flex-1">
  {refreshing ? (
  <p className="text-[13px] text-[var(--text-3)] text-center py-8">Generating suggestions...</p>
  ) : hasIdeas ? (
  <motion.div variants={ideaStaggerContainer} initial="hidden" animate="show" className="flex flex-col gap-4">
   {parsedIdeas.map((idea, i) => (
   <motion.div key={i} variants={ideaStaggerItem} transition={{ duration: 0.25 }}>
    <IdeaCard idea={idea} type={type} toast={toast} onDidThis={onDidThis} weather={weather} onOpenPlan={onOpenPlan} />
   </motion.div>
   ))}
  </motion.div>
  ) : parseError ? (
  <div className="text-center py-8 space-y-3">
   <p className="text-[13px] text-[var(--text-3)]">Data is corrupted or incomplete.</p>
   <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshDisabled} className="bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--accent)]">
   <AnimatedIcon icon={RotateClockwiseIcon} strokeWidth={1.5} className="h-3 w-3" />
   Regenerate
   </Button>
  </div>
  ) : content.trim() ? (
  <div className="prose prose-invert prose-sm max-w-none
   prose-headings:text-[var(--text-1)] prose-headings:text-[13px] prose-headings:mb-4 prose-headings:mt-0
   prose-p:text-[var(--text-2)] prose-p:text-[13px] prose-p:leading-relaxed prose-p:my-1
   prose-li:text-[var(--text-2)] prose-li:text-[13px] prose-li:my-0
   prose-strong:text-[var(--text-2)] prose-ul:my-1 prose-ol:my-1">
   <ReactMarkdown>{content}</ReactMarkdown>
  </div>
  ) : (
  <p className="text-[13px] text-[var(--text-3)] text-center py-8">{fallbackMsg}</p>
  )}
 </div>
 </div>
 )
}

// --- Email Notifications Section (unified: test + recipients + add per row) ---
const EMAIL_TYPES: { id: string; label: string; testId?: string }[] = [
 { id: 'morning-digest', label: 'Morning Digest', testId: 'morning-digest' },
 { id: 'weekend-family', label: 'Weekend Family', testId: 'weekend-family' },
 { id: 'midweek-date', label: 'Midweek Date', testId: 'midweek-date' },
 { id: 'birthday-reminders', label: 'Birthday Reminders', testId: 'birthday-reminders' },
 { id: 'weekend-plans', label: 'Weekend Plans', testId: 'weekend-plans' },
 { id: 'article-summaries', label: 'Article Summaries' },
 { id: 'trip-packing', label: 'Trip Packing', testId: 'trip-packing' },
 { id: 'trip-anne-notification', label: 'Trip Anne', testId: 'trip-anne' },
 { id: 'trip-connection-summary', label: 'Trip Connection', testId: 'trip-connection' },
]

function EmailNotificationsSection({ toast }: { toast: (msg: string) => void }) {
 const [config, setConfig] = useState<{ recipients: Record<string, string[]> } | null>(null)
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [newEmails, setNewEmails] = useState<Record<string, string>>({})
 const [addingFor, setAddingFor] = useState<string | null>(null)
 const [testState, setTestState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({})
 const [cooldown, setCooldown] = useState<Record<string, number>>({})
 const cooldownRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})

 useEffect(() => {
 lifeApi.getEmailConfig().then(c => { setConfig(c); setLoading(false) }).catch(() => setLoading(false))
 return () => { Object.values(cooldownRefs.current).forEach(clearInterval) }
 }, [])

 const save = async (updated: { recipients: Record<string, string[]> }) => {
 setSaving(true)
 try {
 const result = await lifeApi.updateEmailConfig(updated)
 setConfig(result)
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
 setAddingFor(null)
 save(updated)
 }

 const sendTest = async (testId: string) => {
 setTestState(prev => ({ ...prev, [testId]: 'sending' }))
 try {
 const result = await lifeApi.sendTestEmail(testId)
 if (result.error) {
 toast(`Test failed: ${result.error}`)
 setTestState(prev => ({ ...prev, [testId]: 'idle' }))
 } else {
 setTestState(prev => ({ ...prev, [testId]: 'sent' }))
 toast('Test email sent!')
 // 30-second cooldown
 setCooldown(prev => ({ ...prev, [testId]: 30 }))
 if (cooldownRefs.current[testId]) clearInterval(cooldownRefs.current[testId])
 cooldownRefs.current[testId] = setInterval(() => {
  setCooldown(prev => {
   const next = (prev[testId] || 0) - 1
   if (next <= 0) {
    clearInterval(cooldownRefs.current[testId])
    delete cooldownRefs.current[testId]
    setTestState(p => ({ ...p, [testId]: 'idle' }))
    const { [testId]: _, ...rest } = prev
    return rest
   }
   return { ...prev, [testId]: next }
  })
 }, 1000)
 }
 } catch {
 toast('Test failed')
 setTestState(prev => ({ ...prev, [testId]: 'idle' }))
 }
 }

 if (loading) return null

 return (
 <div className="py-4 border-b border-white/[0.08]">
 <div className="flex items-center gap-2 mb-4">
 <AnimatedIcon icon={Mail01Icon} strokeWidth={1.5} className="h-4 w-4 text-[var(--text-3)]" />
 <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-3)]">Email Notifications</p>
 {saving && <Loading03Icon strokeWidth={1.5} className="h-3 w-3 animate-spin text-[var(--accent)] ml-auto" />}
 </div>
 <div className="space-y-1">
 {EMAIL_TYPES.map(({ id, label, testId }) => {
 const recipients = config?.recipients[id] || []
 const tState = testId ? (testState[testId] || 'idle') : null
 return (
 <div key={id} className="group rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors px-2 py-2">
 {/* Row: name + test + pills + add */}
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[12px] text-[var(--text-2)] shrink-0 w-28 truncate" title={label}>{label}</span>
 {testId && (
 <button
 onClick={() => sendTest(testId)}
 disabled={tState !== 'idle' || (cooldown[testId] || 0) > 0}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all border border-[var(--border)] hover:bg-[var(--bg-surface)] text-[var(--text-3)] hover:text-[var(--text-2)] disabled:opacity-50 shrink-0"
 >
 {tState === 'sending' ? <Loading03Icon strokeWidth={1.5} className="h-2.5 w-2.5 animate-spin" /> : (cooldown[testId] || 0) > 0 ? <AnimatedIcon icon={Tick02Icon} className="h-2.5 w-2.5 text-emerald-400" noStroke /> : <AnimatedIcon icon={Mail01Icon} className="h-2.5 w-2.5" />}
 {tState === 'sending' ? 'Test' : (cooldown[testId] || 0) > 0 ? `${cooldown[testId]}s` : 'Test'}
 </button>
 )}
 {!testId && <span className="w-[52px] shrink-0" />}
 <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
 {recipients.map(email => (
 <span key={email} className="inline-flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-2, var(--text-2))' }}>
 {email}
 <button onClick={() => removeRecipient(id, email)} className="text-[var(--text-3)] hover:text-rose-400 transition-colors">
 <AnimatedIcon icon={Cancel01Icon} strokeWidth={1.5} className="h-2.5 w-2.5" />
 </button>
 </span>
 ))}
 {addingFor === id ? (
 <div className="inline-flex items-center gap-1">
 <input
 autoFocus
 placeholder="email@..."
 value={newEmails[id] || ''}
 onChange={e => setNewEmails(prev => ({ ...prev, [id]: e.target.value }))}
 onKeyDown={e => {
 if (e.key === 'Enter') addRecipient(id)
 if (e.key === 'Escape') setAddingFor(null)
 }}
 onBlur={() => { if (!(newEmails[id] || '').trim()) setAddingFor(null) }}
 className="h-5 w-32 text-[10px] border border-[var(--border)] rounded px-1.5 text-[var(--text-2)] placeholder:text-[var(--text-3)] outline-none focus:border-[var(--accent)]"
style={{ background: tokens.colors.surfaceHover }}
 />
 <button onClick={() => addRecipient(id)} className="text-[var(--text-3)] hover:text-[var(--accent)]">
 <AnimatedIcon icon={Tick02Icon} strokeWidth={1.5} className="h-3 w-3" />
 </button>
 </div>
 ) : (
 <button
 onClick={() => setAddingFor(id)}
 className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
 >
 <AnimatedIcon icon={PlusSignIcon} strokeWidth={1.5} className="h-2.5 w-2.5" />
 </button>
 )}
 </div>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 )
}

// --- Relationship options ---
const RELATIONSHIP_OPTIONS = ['Family', 'Friend', 'Colleague', 'Acquaintance', 'Neighbor', 'Other']

const TAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
 family: { bg: 'bg-pink-500/10', border: 'border-pink-500/25', text: 'text-pink-300' },
 friend: { bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-300' },
 colleague: { bg: 'bg-[var(--accent-subtle)]', border: 'border-[var(--accent-border)]', text: 'text-[var(--accent-text)]' },
 acquaintance:{ bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-300' },
 neighbor: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-300' },
 other: { bg: 'bg-[var(--bg-surface)]', border: 'border-[var(--border)]', text: 'text-[var(--text-3)]' },
}

function getTagColor(tag: string) {
 return TAG_COLORS[tag.toLowerCase()] || TAG_COLORS.other
}

function contactInitials(c: Contact): string {
 return ((c.firstName?.[0] || '') + (c.lastName?.[0] || '')).toUpperCase() || '?'
}

// --- Contact Detail (Right Panel, inline) ---
function ContactDetailPanel({ contact, onSave, onDelete, saving, toast, onBack }: {
 contact: Contact
 onSave: (id: string, updates: Partial<Contact>) => Promise<void>
 onDelete: (id: string) => Promise<void>
 saving: string | null
 toast: (msg: string) => void
 onBack?: () => void
}) {
 const [editing, setEditing] = useState(false)
 const [deleteOpen, setDeleteOpen] = useState(false)
 const [deleting, setDeleting] = useState(false)
 const [editFirstName, setEditFirstName] = useState(contact.firstName)
 const [editLastName, setEditLastName] = useState(contact.lastName)
 const [editPhone, setEditPhone] = useState(contact.phone)
 const [editEmail, setEditEmail] = useState(contact.email)
 const [editBirthday, setEditBirthday] = useState(() => {
  if (!contact.birthday) return ''
  const year = contact.birthYear || '2000'
  return `${year}-${contact.birthday}`
 })
 const [editNotes, setEditNotes] = useState(contact.notes)
 const [editTags, setEditTags] = useState<string[]>(contact.tags)
 const [editRelationship, setEditRelationship] = useState(contact.relationship)

 useEffect(() => {
  setEditing(false)
 }, [contact.id])

 const age = contact.birthYear ? (() => {
  const year = parseInt(contact.birthYear)
  const [mm, dd] = contact.birthday.split('-').map(Number)
  const now = new Date()
  let a = now.getFullYear() - year
  if (now.getMonth() + 1 < mm || (now.getMonth() + 1 === mm && now.getDate() < dd)) a--
  return a
 })() : null
 const birthdayFormatted = contact.birthday ? formatBirthdayDate(contact.birthday) : ''
 const daysUntil = contact.birthday ? daysUntilBirthday(contact.birthday) : null

 const enterEdit = () => {
  setEditFirstName(contact.firstName)
  setEditLastName(contact.lastName)
  setEditPhone(contact.phone)
  setEditEmail(contact.email)
  setEditBirthday(() => {
   if (!contact.birthday) return ''
   const year = contact.birthYear || '2000'
   return `${year}-${contact.birthday}`
  })
  setEditNotes(contact.notes)
  setEditTags([...contact.tags])
  setEditRelationship(contact.relationship)
  setEditing(true)
 }

 const saveEdit = async () => {
  const mmdd = editBirthday ? editBirthday.slice(5) : ''
  const birthYear = editBirthday ? editBirthday.slice(0, 4) : undefined
  await onSave(contact.id, {
   firstName: editFirstName.trim(),
   lastName: editLastName.trim(),
   phone: editPhone.trim(),
   email: editEmail.trim(),
   birthday: mmdd,
   birthYear,
   notes: editNotes.trim(),
   tags: editTags,
   relationship: editRelationship,
  })
  setEditing(false)
 }

 const toggleEditTag = (tag: string) => {
  setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
 }

 const handleDelete = async () => {
  setDeleting(true)
  try {
   await onDelete(contact.id)
   setDeleteOpen(false)
  } catch {
   toast('Failed to delete')
  } finally {
   setDeleting(false)
  }
 }

 return (
  <div className="h-full flex flex-col">
   {/* Toolbar */}
   <PanelToolbar
    title={`${contact.firstName} ${contact.lastName}`}
    onBack={onBack}
    actions={
     <>
      {!editing && (
       <ToolbarAction icon={PencilEdit02Icon} label="Edit" onClick={enterEdit} />
      )}
      {editing && (
       <>
        <ToolbarAction icon={Tick02Icon} label="Save" onClick={saveEdit} disabled={saving === contact.id || !editFirstName.trim()} />
        <ToolbarAction icon={Cancel01Icon} label="Cancel" onClick={() => setEditing(false)} />
        <ToolbarAction icon={Delete02Icon} label="Delete" onClick={() => setDeleteOpen(true)} destructive />
       </>
      )}
     </>
    }
   />

   {/* Scrollable content */}
   <div className="flex-1 overflow-y-auto p-6">
    {editing ? (
     <div className="flex flex-col gap-5 max-w-md">
      <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
        <Label className="text-[var(--text-3)]">First Name</Label>
        <Input value={editFirstName} onChange={e => setEditFirstName(e.target.value)} className="bg-[#1E1E20]" style={{ borderColor: tokens.colors.border }} />
       </div>
       <div className="space-y-1.5">
        <Label className="text-[var(--text-3)]">Last Name</Label>
        <Input value={editLastName} onChange={e => setEditLastName(e.target.value)} className="bg-[#1E1E20]" style={{ borderColor: tokens.colors.border }} />
       </div>
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Phone</Label>
       <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+33 6..." className="bg-[#1E1E20]" style={{ borderColor: tokens.colors.border }} />
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Email</Label>
       <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@..." className="bg-[#1E1E20]" style={{ borderColor: tokens.colors.border }} />
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Birthday</Label>
       <Input type="date" value={editBirthday} onChange={e => setEditBirthday(e.target.value)} className="bg-[#1E1E20]" style={{ borderColor: tokens.colors.border }} />
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Relationship</Label>
       <Select value={editRelationship} onValueChange={setEditRelationship}>
        <SelectTrigger className="bg-[#1E1E20] text-[var(--text-2)]" style={{ borderColor: tokens.colors.border }}>
         <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
         {RELATIONSHIP_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
       </Select>
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Notes</Label>
       <Textarea
        value={editNotes}
        onChange={e => setEditNotes(e.target.value)}
        rows={4}
        className="bg-[#1E1E20] resize-none"
        style={{ borderColor: tokens.colors.border }}
       />
      </div>
      <div className="space-y-2">
       <Label className="text-[var(--text-3)]">Tags</Label>
       <div className="flex flex-wrap gap-1.5">
        {RELATIONSHIP_OPTIONS.map(tag => {
         const active = editTags.includes(tag.toLowerCase())
         return (
          <Badge
           key={tag}
           variant={active ? 'default' : 'secondary'}
           className={`cursor-pointer transition-all ${active ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-border)] border' : ''}`}
           onClick={() => toggleEditTag(tag.toLowerCase())}
          >
           {tag}
          </Badge>
         )
        })}
       </div>
      </div>
     </div>
    ) : (
     <>
      {/* Large avatar + name header */}
      <div className="flex items-start gap-4 mb-6">
       <div className="w-14 h-14 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
        <span className="text-xl font-semibold" style={{ color: tokens.colors.textSecondary }}>{contactInitials(contact)}</span>
       </div>
       <div className="min-w-0 flex-1 pt-1">
        <h2 className="text-xl font-semibold" style={{ color: tokens.colors.textPrimary }}>{contact.firstName} {contact.lastName}</h2>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
         {contact.relationship && (
          <Badge variant="secondary" className={getTagColor(contact.relationship).bg + ' ' + getTagColor(contact.relationship).text + ' ' + getTagColor(contact.relationship).border + ' border'}>
           {contact.relationship}
          </Badge>
         )}
         {contact.tags.map(tag => (
          <Badge key={tag} variant="secondary">{tag}</Badge>
         ))}
        </div>
       </div>
      </div>

      {/* Detail sections */}
      <div className="flex flex-col gap-5">
       {/* Birthday */}
       <div className="space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: tokens.colors.textTertiary }}>Birthday</span>
        <div className="flex items-center gap-2">
         <span className="text-[13px]" style={{ color: birthdayFormatted ? tokens.colors.textSecondary : tokens.colors.textTertiary }}>
          {birthdayFormatted || 'Not set'}{age !== null ? ` (turns ${age})` : ''}
         </span>
         {daysUntil !== null && (
          <Badge variant={daysUntil === 0 ? 'default' : 'secondary'} className="text-[10px]">
           {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
          </Badge>
         )}
        </div>
       </div>

       {/* Phone */}
       <div className="space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: tokens.colors.textTertiary }}>Phone</span>
        {contact.phone ? (
         <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-[13px] hover:underline" style={{ color: tokens.colors.accent }}>
          <AnimatedIcon icon={SmartPhone01Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
          {contact.phone}
         </a>
        ) : (
         <span className="text-[13px]" style={{ color: tokens.colors.textTertiary }}>Not set</span>
        )}
       </div>

       {/* Email */}
       {contact.email && (
        <div className="space-y-1">
         <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: tokens.colors.textTertiary }}>Email</span>
         <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-[13px] hover:underline" style={{ color: tokens.colors.accent }}>
          <AnimatedIcon icon={Mail01Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
          {contact.email}
         </a>
        </div>
       )}

       {/* Notes */}
       {contact.notes && (
        <div className="space-y-1">
         <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: tokens.colors.textTertiary }}>Notes</span>
         <p className="text-[13px] leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
          {contact.notes}
         </p>
        </div>
       )}
      </div>
     </>
    )}
   </div>

   {/* Delete confirmation */}
   <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
    <AlertDialogContent style={{ background: '#1E1E20', borderColor: tokens.colors.border }}>
     <AlertDialogHeader>
      <AlertDialogTitle className="text-[var(--text-1)]">Delete contact</AlertDialogTitle>
      <AlertDialogDescription className="text-[var(--text-2)]">
       Are you sure you want to delete <strong>{contact.firstName} {contact.lastName}</strong>? This action cannot be undone.
      </AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter className="gap-2 sm:gap-0">
      <AlertDialogCancel className="text-[var(--text-2)]">Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
       {deleting ? <Loading03Icon strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <AnimatedIcon icon={Delete02Icon} className="h-3.5 w-3.5" />}
       Delete
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </div>
 )
}

// --- Contacts Section (Two-panel Gmail-style layout) ---
function ContactsSection({ toast }: { toast: (msg: string) => void }) {
 const [contacts, setContacts] = useState<Contact[]>([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [selectedId, setSelectedId] = useState<string | null>(null)
 const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
 const [addOpen, setAddOpen] = useState(false)
 const [saving, setSaving] = useState<string | null>(null)

 // Add form state
 const [newFirstName, setNewFirstName] = useState('')
 const [newLastName, setNewLastName] = useState('')
 const [newBirthday, setNewBirthday] = useState('')
 const [newPhone, setNewPhone] = useState('')
 const [newEmail, setNewEmail] = useState('')
 const [newRelationship, setNewRelationship] = useState('')
 const [newNotes, setNewNotes] = useState('')
 const [newTags, setNewTags] = useState<string[]>([])

 useEffect(() => {
  lifeApi.getContacts().then(c => { setContacts(c); setLoading(false) }).catch(() => setLoading(false))
 }, [])

 const filtered = useMemo(() => {
  const q = search.toLowerCase().trim()
  const list = contacts.filter(c => !c.deceased && !c.hidden && (c.firstName || c.lastName))
  if (!q) return list
  return list.filter(c =>
   `${c.lastName} ${c.firstName}`.toLowerCase().includes(q) ||
   `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
   c.phone.toLowerCase().includes(q) ||
   c.email.toLowerCase().includes(q) ||
   c.relationship.toLowerCase().includes(q) ||
   c.tags.some(t => t.toLowerCase().includes(q))
  )
 }, [contacts, search])

 const sorted = useMemo(() => {
  return [...filtered].sort((a, b) => {
   const aName = `${a.lastName} ${a.firstName}`.toLowerCase()
   const bName = `${b.lastName} ${b.firstName}`.toLowerCase()
   return aName.localeCompare(bName)
  })
 }, [filtered])

 const selectedContact = useMemo(
  () => contacts.find(c => c.id === selectedId) || null,
  [contacts, selectedId]
 )

 const selectContact = useCallback((id: string) => {
  setSelectedId(id)
  setMobileDetailOpen(true)
 }, [])

 const resetAddForm = () => {
  setNewFirstName(''); setNewLastName(''); setNewBirthday(''); setNewPhone('')
  setNewEmail(''); setNewRelationship(''); setNewNotes(''); setNewTags([])
 }

 const addContact = async () => {
  if (!newFirstName.trim()) return
  try {
   const mmdd = newBirthday ? newBirthday.slice(5) : ''
   const birthYear = newBirthday ? newBirthday.slice(0, 4) : undefined
   const contact = await lifeApi.createContact({
    firstName: newFirstName.trim(),
    lastName: newLastName.trim(),
    birthday: mmdd,
    birthYear,
    phone: newPhone.trim(),
    email: newEmail.trim(),
    notes: newNotes.trim(),
    tags: newTags,
    relationship: newRelationship,
    giftHistory: [],
   })
   setContacts(prev => [...prev, contact])
   setSelectedId(contact.id)
   resetAddForm()
   setAddOpen(false)
   toast('Contact added')
  } catch {
   toast('Failed to add contact')
  }
 }

 const saveContact = async (id: string, updates: Partial<Contact>) => {
  setSaving(id)
  try {
   const updated = await lifeApi.updateContact(id, updates)
   setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
   toast('Contact saved')
  } catch {
   toast('Failed to save')
  } finally {
   setSaving(null)
  }
 }

 const deleteContact = async (id: string) => {
  await lifeApi.deleteContact(id)
  setContacts(prev => prev.filter(c => c.id !== id))
  setSelectedId(null)
  setMobileDetailOpen(false)
  toast('Contact deleted')
 }

 const toggleTag = (tag: string) => {
  setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
 }

 /* ── Left Panel: scrollable contact list ── */
 const leftPanel = (
  <div className="flex flex-col h-full">
   {/* Search bar */}
   <div className="shrink-0 p-3 flex items-center gap-2" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}>
    <div className="flex-1 relative">
     <Search01Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: tokens.colors.textTertiary }} />
     <Input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search contacts..."
      className="pl-8 h-8 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)] bg-transparent border-0 focus-visible:ring-0"
     />
    </div>
    <Button variant="ghost" size="icon-sm" onClick={() => setAddOpen(true)} className="text-[var(--accent)] shrink-0" title="Add contact">
     <AnimatedIcon icon={UserAdd01Icon} strokeWidth={1.5} className="h-3.5 w-3.5" />
    </Button>
   </div>

   {/* Count */}
   <div className="shrink-0 px-3 py-1.5">
    <span className="text-[11px]" style={{ color: tokens.colors.textTertiary }}>{sorted.length} contact{sorted.length !== 1 ? 's' : ''}</span>
   </div>

   {/* Scrollable list */}
   <div className="flex-1 overflow-y-auto">
    {loading ? (
     <div className="flex justify-center py-12"><Loading03Icon strokeWidth={1.5} className="h-5 w-5 animate-spin" style={{ color: tokens.colors.textTertiary }} /></div>
    ) : sorted.length === 0 ? (
     <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <AnimatedIcon icon={UserMultiple02Icon} strokeWidth={1.5} className="h-6 w-6 mb-3" style={{ color: tokens.colors.textQuaternary }} />
      <p className="text-[13px]" style={{ color: tokens.colors.textTertiary }}>{search ? 'No matches' : 'No contacts yet'}</p>
     </div>
    ) : (
     <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.015 } } }} initial="hidden" animate="show">
      {sorted.map(c => {
       const isActive = c.id === selectedId
       const bdayText = c.birthday ? formatBirthdayDate(c.birthday) : ''
       const rel = c.relationship
       const colors = rel ? getTagColor(rel) : null
       return (
        <motion.div
         key={c.id}
         variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0 } }}
         onClick={() => selectContact(c.id)}
         className="flex items-center gap-3 px-3 cursor-pointer transition-colors"
         style={{
          height: 48,
          background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent, #0A84FF)' : '2px solid transparent',
         }}
         onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
         onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
         {/* Avatar initials */}
         <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-medium" style={{ color: tokens.colors.textSecondary }}>{contactInitials(c)}</span>
         </div>
         {/* Name + tag */}
         <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: tokens.colors.textPrimary }}>{c.firstName} {c.lastName}</span>
          {colors && (
           <Badge variant="secondary" className={`${colors.bg} ${colors.text} ${colors.border} border text-[10px] shrink-0 py-0 px-1.5`}>{rel}</Badge>
          )}
         </div>
         {/* Birthday on right */}
         {bdayText && (
          <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{bdayText}</span>
         )}
        </motion.div>
       )
      })}
     </motion.div>
    )}
   </div>
  </div>
 )

 /* ── Right Panel: detail view ── */
 const rightPanel = selectedContact ? (
  <ContactDetailPanel
   contact={selectedContact}
   onSave={saveContact}
   onDelete={deleteContact}
   saving={saving}
   toast={toast}
   onBack={() => setMobileDetailOpen(false)}
  />
 ) : null

 return (
  <div className="flex flex-col flex-1 min-h-0">
   <TwoPanelLayout
    leftPanel={leftPanel}
    rightPanel={rightPanel}
    emptyState={{ icon: <UserMultiple02Icon className="h-8 w-8" />, text: 'Select a contact' }}
    selectedKey={selectedId}
    mobileOpen={mobileDetailOpen}
    onMobileClose={() => setMobileDetailOpen(false)}
    mobileTitle={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : 'Contact'}
   />

   {/* Add Contact Dialog */}
   <Dialog open={addOpen} onOpenChange={setAddOpen}>
    <DialogContent className="max-w-[640px] max-h-[85vh] overflow-y-auto" style={{ background: '#1E1E20', borderColor: tokens.colors.border }}>
     <DialogHeader>
      <DialogTitle className="text-[var(--text-1)]">New Contact</DialogTitle>
     </DialogHeader>

     <div className="flex flex-col gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
        <Label className="text-[var(--text-3)]">First name *</Label>
        <Input value={newFirstName} onChange={e => setNewFirstName(e.target.value)} placeholder="Jean" style={{ background: tokens.colors.surfaceHover, borderColor: tokens.colors.border }} />
       </div>
       <div className="space-y-1.5">
        <Label className="text-[var(--text-3)]">Last name</Label>
        <Input value={newLastName} onChange={e => setNewLastName(e.target.value)} placeholder="Dupont" style={{ background: tokens.colors.surfaceHover, borderColor: tokens.colors.border }} />
       </div>
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Birthday</Label>
       <Input type="date" value={newBirthday} onChange={e => setNewBirthday(e.target.value)} style={{ background: tokens.colors.surfaceHover, borderColor: tokens.colors.border }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
       <div className="space-y-1.5">
        <Label className="text-[var(--text-3)]">Phone</Label>
        <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+33 6..." style={{ background: tokens.colors.surfaceHover, borderColor: tokens.colors.border }} />
       </div>
       <div className="space-y-1.5">
        <Label className="text-[var(--text-3)]">Email</Label>
        <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@..." style={{ background: tokens.colors.surfaceHover, borderColor: tokens.colors.border }} />
       </div>
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Relationship</Label>
       <Select value={newRelationship} onValueChange={setNewRelationship}>
        <SelectTrigger className="text-[var(--text-2)]" style={{ background: tokens.colors.surfaceHover, borderColor: tokens.colors.border }}>
         <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
         {RELATIONSHIP_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
       </Select>
      </div>
      <div className="space-y-2">
       <Label className="text-[var(--text-3)]">Tags</Label>
       <div className="flex flex-wrap gap-1.5">
        {RELATIONSHIP_OPTIONS.map(tag => {
         const active = newTags.includes(tag.toLowerCase())
         return (
          <Badge
           key={tag}
           variant={active ? 'default' : 'secondary'}
           className={`cursor-pointer transition-all ${active ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-border)] border' : ''}`}
           onClick={() => toggleTag(tag.toLowerCase())}
          >
           {tag}
          </Badge>
         )
        })}
       </div>
      </div>
      <div className="space-y-1.5">
       <Label className="text-[var(--text-3)]">Notes</Label>
       <Textarea
        value={newNotes}
        onChange={e => setNewNotes(e.target.value)}
        rows={3}
        placeholder="Additional notes..."
        className="resize-none"
        style={{ background: tokens.colors.surfaceHover, borderColor: tokens.colors.border }}
       />
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={() => { resetAddForm(); setAddOpen(false) }} className="text-[var(--text-2)]">Cancel</Button>
      <Button onClick={addContact} disabled={!newFirstName.trim()} className="bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]">
       <AnimatedIcon icon={UserAdd01Icon} strokeWidth={1.5} className="h-3.5 w-3.5" /> Add Contact
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
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
 const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTrip | null>(null)
 const [tripHistoryExpanded, setTripHistoryExpanded] = useState(false)
 const [loading, setLoading] = useState(true)
 const [refreshingWeekend, setRefreshingWeekend] = useState(false)
 const [refreshingDates, setRefreshingDates] = useState(false)
 const [activeTab, setActiveTab] = useState<TabId>('dashboard')
 const [globalDayPlan, setGlobalDayPlan] = useState<DayPlan | null>(null)
 const [globalPlanModalOpen, setGlobalPlanModalOpen] = useState(false)
 const [resendConfirmBirthday, setResendConfirmBirthday] = useState<Birthday | null>(null)
 const [briefing, setBriefing] = useState<Briefing | null>(null)
 const [regeneratingBriefing, setRegeneratingBriefing] = useState(false)

 const loadData = useCallback(async () => {
 try {
 const [lifeData, calendarData, remindersData, activitiesData, weatherData, eventsData, tripsData, upcomingTripData, briefingData] = await Promise.all([
 lifeApi.getData(),
 lifeApi.getCalendar(7),
 lifeApi.getReminders(),
 lifeApi.getActivities(),
 lifeApi.getWeekendWeather(),
 lifeApi.getLocalEvents(),
 lifeApi.getTrips(),
 lifeApi.getUpcomingTrip(),
 lifeApi.getBriefing()
 ])
 setData({ ...lifeData, reminders: remindersData.length > 0 ? remindersData : lifeData.reminders })
 setCalendar(calendarData)
 setActivities(activitiesData)
 setWeather(weatherData)
 setLocalEvents(eventsData)
 setTrips(tripsData)
 setUpcomingTrip(upcomingTripData)
 setBriefing(briefingData)
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
 toast.success('Weekend ideas refreshed')
 const activitiesData = await lifeApi.getActivities()
 setActivities(activitiesData)
 } else {
 toast.error('Refresh failed: ' + (result.error || 'Unknown'))
 }
 } catch (err: unknown) {
 toast.error('Refresh failed: ' + (err instanceof Error ? err.message : String(err)))
 } finally {
 setRefreshingWeekend(false)
 }
 }

 const refreshDates = async () => {
 setRefreshingDates(true)
 try {
 const result = await lifeApi.refreshDateActivities()
 if (result.success) {
 toast.success('Date ideas refreshed')
 const activitiesData = await lifeApi.getActivities()
 setActivities(activitiesData)
 } else {
 toast.error('Refresh failed: ' + (result.error || 'Unknown'))
 }
 } catch (err: unknown) {
 toast.error('Refresh failed: ' + (err instanceof Error ? err.message : String(err)))
 } finally {
 setRefreshingDates(false)
 }
 }

 const openDayPlan = (plan: DayPlan) => {
 setGlobalDayPlan(plan)
 setGlobalPlanModalOpen(true)
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loading03Icon strokeWidth={1.5} className="h-6 w-6 animate-spin text-[var(--text-3)]" />
 </div>
 )
 }

 if (!data) {
 return <p className="text-[13px] text-[var(--text-3)] text-center py-12">Failed to load data</p>
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
 setResendConfirmBirthday(b)
 return
 }
 await doSendBirthdayEmail(b)
 }

 const doSendBirthdayEmail = async (b: Birthday) => {
 try {
 const result = await lifeApi.sendBirthdayEmail(b.id)
 if (result.success) {
 toast.success('Email envoyé')
 const lifeData = await lifeApi.getData()
 setData(prev => prev ? { ...prev, birthdays: lifeData.birthdays } : prev)
 } else {
 toast.error('Erreur: ' + (result.error || 'Unknown'))
 }
 } catch (err: unknown) {
 toast.error('Erreur envoi email: ' + (err instanceof Error ? err.message : String(err)))
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
 toast.success('Trip logged!')
 } catch {
 toast.error('Failed to log trip')
 }
 }

 return (
 <>
 <div className="min-h-full max-w-7xl mx-auto px-4 md:px-8 pt-6">
 {/* Sub-nav bar — left-aligned, horizontal scroll on mobile */}
 <div className="border-b border-border px-4 md:px-6 pt-2 pb-0 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
 <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabId)}>
  <TabsList variant="line" className="justify-start gap-5 md:gap-6">
   <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
   <TabsTrigger value="ideas">Ideas</TabsTrigger>
   <TabsTrigger value="contacts">Contacts</TabsTrigger>
  </TabsList>
 </Tabs>
 </div>

 {/* TAB 1 — Dashboard */}
 {activeTab === 'dashboard' && (
 <motion.div
 key="dashboard"
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.15 }}
 className="p-5 md:p-6"
 >
 {/* Morning Briefing card */}
 {briefing && briefing.text ? (
 <div
  style={{
   background: tokens.colors.surface,
   border: `1px solid ${tokens.colors.borderSubtle}`,
   borderLeft: `2px solid ${tokens.colors.accent}`,
   borderRadius: 12,
   padding: 20,
   marginBottom: tokens.spacing.xxl,
  }}
 >
  <div className="flex items-start justify-between gap-4">
   <div className="flex-1 min-w-0">
    <p style={{ fontSize: 15, fontWeight: 500, color: tokens.colors.textPrimary, margin: 0, marginBottom: 8 }}>
     👋 Good morning, Jean-Marc
    </p>
    <p
     style={{
      fontSize: 13,
      fontWeight: 400,
      color: tokens.colors.textSecondary,
      lineHeight: 1.6,
      margin: 0,
     }}
    >
     {briefing.text}
    </p>
    {briefing.generatedAt && (
     <p style={{ fontSize: 11, color: tokens.colors.textQuaternary, margin: 0, marginTop: 8 }}>
      Today at {new Date(briefing.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
     </p>
    )}
   </div>
   <button
    onClick={async () => {
     setRegeneratingBriefing(true)
     try {
      const result = await lifeApi.regenerateBriefing()
      setBriefing(result)
      toast.success('Briefing regenerated')
     } catch {
      toast.error('Failed to regenerate briefing')
     } finally {
      setRegeneratingBriefing(false)
     }
    }}
    disabled={regeneratingBriefing}
    className="shrink-0 flex items-center justify-center rounded-md transition-colors"
    style={{
     width: 28,
     height: 28,
     background: 'transparent',
     border: 'none',
     color: tokens.colors.textQuaternary,
     cursor: regeneratingBriefing ? 'not-allowed' : 'pointer',
     opacity: regeneratingBriefing ? 0.5 : 1,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.color = tokens.colors.textSecondary }}
    onMouseLeave={(e) => { e.currentTarget.style.color = tokens.colors.textQuaternary }}
    title="Regenerate briefing"
   >
    <AnimatedIcon icon={RotateClockwiseIcon} strokeWidth={1.5} size={14} className={regeneratingBriefing ? 'animate-spin' : ''} />
   </button>
  </div>
 </div>
 ) : !briefing ? (
 <div
  style={{
   background: tokens.colors.surface,
   border: `1px solid ${tokens.colors.borderSubtle}`,
   borderLeft: `2px solid ${tokens.colors.accent}`,
   borderRadius: 12,
   padding: 20,
   marginBottom: tokens.spacing.xxl,
  }}
 >
  <Skeleton className="h-4 w-48 rounded mb-3" />
  <Skeleton className="h-3 w-full rounded mb-1.5" />
  <Skeleton className="h-3 w-3/4 rounded" />
 </div>
 ) : null}

 {/* Trip hero card (full width) */}
 {upcomingTrip && <TripHelper trip={upcomingTrip} toast={toast} />}

 {/* Two-column grid: Calendar ~65% | Reminders + Birthdays ~35% */}
 <div className="flex flex-col md:flex-row" style={{ gap: tokens.spacing.xxl, marginTop: upcomingTrip ? tokens.spacing.xxl : 0 }}>
 <div style={{ flex: '1.85 1 0%', minWidth: 0 }}>
 <CalendarSection events={calendar} />
 </div>
 <div className="flex flex-col" style={{ flex: '1 1 0%', minWidth: 0, gap: tokens.spacing.xxl }}>
 <RemindersSection reminders={data.reminders} onUpdate={updateReminders} onRefresh={refreshReminders} />
 <BirthdaysSection birthdays={data.birthdays} onUpdate={updateBirthdays} onPatchBirthday={patchBirthday} onSendEmail={sendBirthdayEmail} toast={toast} />
 </div>
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
 className="p-5 md:p-6 flex flex-col gap-4 md:gap-5"
 >
 {/* Weather bar */}
 <WeekendWeatherCard weather={weather} />

 {/* Local events */}
 <LocalEventsSection events={localEvents} />

 {/* Idea cards — equal height, 16px gap */}
 <div className="grid grid-cols-1 md:grid-cols-2 items-stretch" style={{ gap: tokens.spacing.lg }}>
 <IdeasSection type="weekend" ideas={activities.weekend.ideas} content={activities.weekend.content} lastUpdated={activities.weekend.lastUpdated} refreshing={refreshingWeekend} refreshDisabled={refreshingWeekend || refreshingDates} onRefresh={refreshWeekend} toast={toast} onDidThis={handleDidThis} weather={weather} onOpenPlan={openDayPlan} />
 <IdeasSection type="date" ideas={activities.date.ideas} content={activities.date.content} lastUpdated={activities.date.lastUpdated} refreshing={refreshingDates} refreshDisabled={refreshingDates || refreshingWeekend} onRefresh={refreshDates} toast={toast} onDidThis={handleDidThis} weather={weather} onOpenPlan={openDayPlan} />
 </div>

 {/* Trip History */}
 <TripHistorySection trips={trips} expanded={tripHistoryExpanded} onToggle={() => setTripHistoryExpanded(!tripHistoryExpanded)} />
 </motion.div>
 )}

 {/* TAB 3 — Contacts */}
 {activeTab === 'contacts' && (
 <motion.div
  key="contacts"
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.15 }}
  className="flex flex-col flex-1 min-h-0 px-5 md:px-6 pb-5 md:pb-6"
 >
  <ContactsSection toast={toast} />
 </motion.div>
 )}

 </div>
 {globalDayPlan && (
 <DayPlannerModal
 plan={globalDayPlan}
 open={globalPlanModalOpen}
 onClose={() => setGlobalPlanModalOpen(false)}
 toast={toast}
 />
 )}

 {/* Resend birthday email confirm */}
 <AlertDialog open={!!resendConfirmBirthday} onOpenChange={(open) => { if (!open) setResendConfirmBirthday(null) }}>
 <AlertDialogContent>
  <AlertDialogHeader>
  <AlertDialogTitle>Resend email?</AlertDialogTitle>
  <AlertDialogDescription>A birthday email was already sent this year. Send again?</AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
  <AlertDialogCancel>Cancel</AlertDialogCancel>
  <AlertDialogAction onClick={() => { if (resendConfirmBirthday) { doSendBirthdayEmail(resendConfirmBirthday); setResendConfirmBirthday(null) } }}>Resend</AlertDialogAction>
  </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </>
 )
}
