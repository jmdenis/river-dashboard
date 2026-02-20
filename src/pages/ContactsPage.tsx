import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { lifeApi, type Contact } from '../services/lifeApi'
import {
  Users, Pencil, Phone, Mail, Trash2, Loader2, Search,
  CheckCircle2, Circle, SquarePen, Plus, Gift, Calendar, Tag,
  Clock, ChevronRight,
} from 'lucide-react'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { tokens } from '../designTokens'
import { TwoPanelLayout } from '../components/TwoPanelLayout'
import { PanelToolbar, ToolbarAction } from '../components/PanelToolbar'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Skeleton } from '../components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog'
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

/* ── useIsMobile ─────────────────────────────────────── */

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

/* ── Helpers ─────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatBirthday(mmdd: string, birthYear?: string): string {
  if (!mmdd) return ''
  const [mm, dd] = mmdd.split('-').map(Number)
  const monthStr = MONTHS[mm - 1] || ''
  const base = `${monthStr} ${dd}`
  if (birthYear) {
    const age = new Date().getFullYear() - parseInt(birthYear)
    return `${base}, ${birthYear} (${age})`
  }
  return base
}

function getInitials(first: string, last: string): string {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?'
}

function formatLastContact(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── Contact Row ─────────────────────────────────────── */

function ContactRow({
  contact,
  isActive,
  editMode,
  isSelected,
  onSelect,
  onToggleSelect,
}: {
  contact: Contact
  isActive: boolean
  editMode: boolean
  isSelected: boolean
  onSelect: (id: string) => void
  onToggleSelect: (id: string) => void
}) {
  const name = `${contact.firstName} ${contact.lastName}`.trim()

  return (
    <motion.div
      onClick={() => editMode ? onToggleSelect(contact.id) : onSelect(contact.id)}
      whileTap={{ scale: 0.99 }}
      className={`group cursor-pointer transition-colors duration-150 ${
        isActive && !editMode ? '' : 'hover:bg-[rgba(255,255,255,0.04)]'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{
          height: 72,
          borderLeft: `3px solid ${isActive && !editMode ? tokens.colors.accent : 'transparent'}`,
          background: isActive && !editMode
            ? tokens.colors.accentSubtle
            : isSelected && editMode
              ? tokens.colors.accentFaint
              : undefined,
        }}
      >
        {/* Edit mode checkbox */}
        {editMode && (
          <div className="shrink-0 flex items-center justify-center" style={{ width: 24 }}>
            {isSelected ? (
              <CheckCircle2 className="h-5 w-5" style={{ color: tokens.colors.accent }} />
            ) : (
              <Circle className="h-5 w-5" style={{ color: tokens.colors.textQuaternary }} />
            )}
          </div>
        )}

        {/* Avatar */}
        {!editMode && (
          <Avatar className="h-9 w-9 shrink-0" style={{ background: tokens.colors.surface }}>
            <AvatarFallback
              className="text-[13px] font-medium"
              style={{ background: tokens.colors.surface, color: tokens.colors.textSecondary }}
            >
              {getInitials(contact.firstName, contact.lastName)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Name + relationship */}
        <div className="flex-1 min-w-0">
          <p
            className="truncate"
            style={{ fontSize: 13, fontWeight: 500, lineHeight: '18px', color: tokens.colors.textPrimary }}
          >
            {name || 'Unnamed'}
          </p>
          {contact.relationship && (
            <p className="truncate" style={{ fontSize: 12, lineHeight: '16px', color: tokens.colors.textTertiary, marginTop: 1 }}>
              {contact.relationship}
            </p>
          )}
        </div>

        {/* Mobile chevron */}
        {!editMode && (
          <AnimatedIcon icon={ChevronRight} className="h-4 w-4 md:hidden" style={{ color: tokens.colors.textQuaternary }} />
        )}
      </div>

      {/* Indented divider */}
      <div style={{ marginLeft: 60, height: 1, background: tokens.colors.borderSubtle }} />
    </motion.div>
  )
}

/* ── Contact Detail ──────────────────────────────────── */

function ContactDetail({ contact }: { contact: Contact }) {
  const name = `${contact.firstName} ${contact.lastName}`.trim()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Avatar + Name header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16 shrink-0" style={{ background: tokens.colors.surface }}>
          <AvatarFallback
            className="text-[20px] font-semibold"
            style={{ background: tokens.colors.surface, color: tokens.colors.textSecondary }}
          >
            {getInitials(contact.firstName, contact.lastName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 style={{ ...tokens.typography.display, letterSpacing: '-0.02em', color: tokens.colors.textPrimary }}>
            {name || 'Unnamed'}
          </h2>
          {contact.relationship && (
            <p className="mt-0.5" style={{ fontSize: 13, color: tokens.colors.textTertiary }}>
              {contact.relationship}
            </p>
          )}
        </div>
      </div>

      {/* Contact info cards */}
      <div className="space-y-4">
        {contact.phone && (
          <DetailField icon={Phone} label="Phone">
            <a href={`tel:${contact.phone}`} className="hover:underline" style={{ color: tokens.colors.accent }}>
              {contact.phone}
            </a>
          </DetailField>
        )}

        {contact.email && (
          <DetailField icon={Mail} label="Email">
            <a href={`mailto:${contact.email}`} className="hover:underline" style={{ color: tokens.colors.accent }}>
              {contact.email}
            </a>
          </DetailField>
        )}

        {contact.birthday && (
          <DetailField icon={Calendar} label="Birthday">
            <span style={{ color: tokens.colors.textSecondary }}>
              {formatBirthday(contact.birthday, contact.birthYear)}
            </span>
          </DetailField>
        )}

        {contact.tags.length > 0 && (
          <DetailField icon={Tag} label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[11px] px-2 py-0.5">
                  {tag}
                </Badge>
              ))}
            </div>
          </DetailField>
        )}

        {contact.lastContact && (
          <DetailField icon={Clock} label="Last Contact">
            <span style={{ color: tokens.colors.textSecondary }}>
              {formatLastContact(contact.lastContact)}
            </span>
          </DetailField>
        )}

        {contact.giftHistory && contact.giftHistory.length > 0 && (
          <DetailField icon={Gift} label="Gift History">
            <ul className="space-y-1">
              {contact.giftHistory.map((gift, i) => (
                <li key={i} className="text-[13px]" style={{ color: tokens.colors.textSecondary }}>
                  {gift}
                </li>
              ))}
            </ul>
          </DetailField>
        )}

        {contact.notes && (
          <DetailField icon={Pencil} label="Notes">
            <p className="text-[13px] whitespace-pre-wrap leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
              {contact.notes}
            </p>
          </DetailField>
        )}
      </div>
    </div>
  )
}

function DetailField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <AnimatedIcon icon={Icon} className="h-4 w-4 mt-0.5" style={{ color: tokens.colors.textQuaternary }} />
      <div className="min-w-0">
        <p style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary, marginBottom: 4 }}>{label}</p>
        {children}
      </div>
    </div>
  )
}

/* ── Edit Contact Dialog ─────────────────────────────── */

function EditContactDialog({
  contact,
  open,
  onOpenChange,
  onSave,
}: {
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updates: Partial<Contact>) => void
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    phone: '',
    email: '',
    birthday: '',
    birthYear: '',
    tags: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (contact && open) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        relationship: contact.relationship,
        phone: contact.phone,
        email: contact.email,
        birthday: contact.birthday,
        birthYear: contact.birthYear || '',
        tags: contact.tags.join(', '),
        notes: contact.notes,
      })
    }
  }, [contact, open])

  const handleSubmit = async () => {
    if (!contact) return
    setSaving(true)
    try {
      await onSave(contact.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        relationship: form.relationship,
        phone: form.phone,
        email: form.email,
        birthday: form.birthday,
        birthYear: form.birthYear || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        notes: form.notes,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update contact information</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={form.firstName} onChange={e => update('firstName', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={form.lastName} onChange={e => update('lastName', e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Relationship</Label>
            <Input value={form.relationship} onChange={e => update('relationship', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={e => update('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Birthday (MM-DD)</Label>
              <Input value={form.birthday} onChange={e => update('birthday', e.target.value)} placeholder="03-15" />
            </div>
            <div>
              <Label className="text-xs">Birth Year</Label>
              <Input value={form.birthYear} onChange={e => update('birthYear', e.target.value)} placeholder="1985" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tags (comma separated)</Label>
            <Input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="family, toulouse" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Component ──────────────────────────────────── */

export default function ContactsPage() {
  const isMobile = useIsMobile()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    lifeApi.getContacts()
      .then(setContacts)
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [])

  const filteredContacts = useMemo(() => {
    let result = contacts.filter(c => !c.hidden && !c.deceased)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.relationship.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return result.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    )
  }, [contacts, search])

  const selectedContact = useMemo(
    () => contacts.find(c => c.id === selectedId) || null,
    [contacts, selectedId]
  )

  /* ── Handlers ──────────────────────────────────────── */

  const selectContact = useCallback((id: string) => {
    setSelectedId(id)
    if (window.innerWidth < 768) setMobileOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setMobileOpen(false)
    setSelectedId(null)
  }, [])

  /* ── Swipe handling ────────────────────────────────── */
  const swipeRef = useRef({ x: 0, y: 0 })
  const onSwipeStart = useCallback((e: React.TouchEvent) => {
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const onSwipeEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - swipeRef.current.x
    const dy = e.changedTouches[0].clientY - swipeRef.current.y
    if (dx > 50 && Math.abs(dx) > Math.abs(dy)) {
      handleClose()
    }
  }, [handleClose])

  const toggleEditMode = useCallback(() => {
    setEditMode(prev => {
      if (prev) setSelectedIds(new Set())
      return !prev
    })
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const allIds = filteredContacts.map(c => c.id)
    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds))
  }, [filteredContacts])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await lifeApi.deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
      if (selectedId === id) {
        setSelectedId(null)
        setMobileOpen(false)
      }
      toast.success('Contact deleted')
    } catch {
      toast.error('Failed to delete contact')
    }
    setDeleteConfirmId(null)
  }, [selectedId])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    let deleted = 0
    for (const id of selectedIds) {
      try {
        await lifeApi.deleteContact(id)
        deleted++
      } catch { /* continue */ }
    }
    if (deleted > 0) {
      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)))
      toast.success(`Deleted ${deleted} contact${deleted !== 1 ? 's' : ''}`)
      if (selectedId && selectedIds.has(selectedId)) setSelectedId(null)
    }
    setSelectedIds(new Set())
    setBulkDeleting(false)
  }, [selectedIds, selectedId])

  const handleSaveContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    try {
      const updated = await lifeApi.updateContact(id, updates)
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
      toast.success('Contact updated')
    } catch {
      toast.error('Failed to update contact')
    }
  }, [])

  /* ── Loading ───────────────────────────────────────── */

  if (loading) {
    return (
      <div
        className="h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]"
        style={{ background: tokens.colors.bg }}
      >
        <div className="h-full flex max-w-7xl mx-auto w-full md:px-6">
          <div className="w-full md:w-[35%] md:max-w-[420px] shrink-0 p-4 space-y-3" style={{ background: tokens.colors.surface, borderRight: '1px solid ' + tokens.colors.borderSubtle }}>
            <Skeleton className="h-9 w-full rounded-lg" />
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-lg" />)}
          </div>
          <div className="hidden md:flex flex-1 p-6 space-y-4 flex-col">
            <Skeleton className="h-16 w-48 rounded-full" />
            <Skeleton className="h-6 w-64 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
        </div>
      </div>
    )
  }

  /* ── Left Panel ────────────────────────────────────── */

  const leftPanel = (
    <>
      {/* Search + edit */}
      <div className="shrink-0 flex items-center" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="flex-1 text-[13px] px-4 outline-none"
          style={{
            height: 44,
            background: 'transparent',
            color: tokens.colors.textPrimary,
            border: 'none',
          }}
        />
        <button
          onClick={toggleEditMode}
          className="shrink-0 pr-4 transition-colors duration-150"
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: editMode ? tokens.colors.accent : tokens.colors.textTertiary,
          }}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Select All bar (edit mode) */}
      {editMode && filteredContacts.length > 0 && (
        <div
          className="shrink-0 px-4 py-1.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}
        >
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 transition-colors"
            style={{ ...tokens.typography.caption, color: tokens.colors.accent }}
          >
            {selectedIds.size === filteredContacts.length
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Deselect All</>
              : <><Circle className="h-3.5 w-3.5" /> Select All</>}
          </button>
          {selectedIds.size > 0 && (
            <span style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Contact list */}
      <div
        className="flex-1 overflow-y-auto"
        style={editMode && selectedIds.size > 0 ? { paddingBottom: 64 } : undefined}
      >
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <AnimatedIcon icon={Users} className="h-8 w-8 mb-3" style={{ color: tokens.colors.textQuaternary, opacity: 0.4 }} />
            <p className="text-[13px]" style={{ color: tokens.colors.textQuaternary }}>
              {contacts.length === 0 ? 'No contacts yet' : 'No matches'}
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
          >
            {filteredContacts.map(contact => (
              <motion.div
                key={contact.id}
                variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }}
              >
                <ContactRow
                  contact={contact}
                  isActive={selectedId === contact.id}
                  editMode={editMode}
                  isSelected={selectedIds.has(contact.id)}
                  onSelect={selectContact}
                  onToggleSelect={toggleSelect}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Edit mode bulk action toolbar */}
      <AnimatePresence>
        {editMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 flex items-center gap-2 px-4"
            style={{
              height: 56,
              background: tokens.colors.surface,
              borderTop: '1px solid ' + tokens.colors.borderSubtle,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
              className="flex-1"
            >
              {bulkDeleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                : <AnimatedIcon icon={Trash2} className="h-3.5 w-3.5 mr-1" />}
              Delete {selectedIds.size}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {!(editMode && selectedIds.size > 0) && (
        <div
          className="shrink-0 px-4 py-2.5 flex items-center"
          style={{ ...tokens.typography.caption, borderTop: '1px solid ' + tokens.colors.borderSubtle, color: tokens.colors.textTertiary }}
        >
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
        </div>
      )}
    </>
  )

  /* ── Right Panel ───────────────────────────────────── */

  const rightPanel = selectedContact ? (
    <div className="h-full flex flex-col">
      <PanelToolbar
        title={`${selectedContact.firstName} ${selectedContact.lastName}`.trim()}
        onBack={handleClose}
        actions={
          <>
            {selectedContact.phone && (
              <ToolbarAction icon={Phone} label="Call" onClick={() => window.open(`tel:${selectedContact.phone}`)} />
            )}
            {selectedContact.email && (
              <ToolbarAction icon={Mail} label="Email" onClick={() => window.open(`mailto:${selectedContact.email}`)} />
            )}
            <ToolbarAction icon={Pencil} label="Edit" onClick={() => setEditDialogOpen(true)} />
            <ToolbarAction icon={Trash2} label="Delete" destructive onClick={() => setDeleteConfirmId(selectedContact.id)} />
          </>
        }
      />
      <ContactDetail contact={selectedContact} />
    </div>
  ) : null

  /* ── Render ────────────────────────────────────────── */

  /* Mobile list view */
  const mobileList = (
    <div className="h-[calc(100vh-48px)] flex flex-col relative overflow-hidden" style={{ background: tokens.colors.bg }}>
      {/* Search + edit */}
      <div className="shrink-0 flex items-center" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="flex-1 text-[13px] px-4 outline-none"
          style={{
            height: 44,
            background: 'transparent',
            color: tokens.colors.textPrimary,
            border: 'none',
          }}
        />
        <button
          onClick={toggleEditMode}
          className="shrink-0 pr-4 transition-colors duration-150"
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: editMode ? tokens.colors.accent : tokens.colors.textTertiary,
          }}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Select All bar (edit mode) */}
      {editMode && filteredContacts.length > 0 && (
        <div
          className="shrink-0 px-4 py-1.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}
        >
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 transition-colors"
            style={{ ...tokens.typography.caption, color: tokens.colors.accent }}
          >
            {selectedIds.size === filteredContacts.length
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Deselect All</>
              : <><Circle className="h-3.5 w-3.5" /> Select All</>}
          </button>
          {selectedIds.size > 0 && (
            <span style={{ ...tokens.typography.caption, color: tokens.colors.textTertiary }}>
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Contact list */}
      <div
        className="flex-1 overflow-y-auto"
        style={editMode && selectedIds.size > 0 ? { paddingBottom: 64 } : undefined}
      >
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <AnimatedIcon icon={Users} className="h-8 w-8 mb-3" style={{ color: tokens.colors.textQuaternary, opacity: 0.4 }} />
            <p className="text-[13px]" style={{ color: tokens.colors.textQuaternary }}>
              {contacts.length === 0 ? 'No contacts yet' : 'No matches'}
            </p>
          </div>
        ) : (
          filteredContacts.map(contact => {
            const name = `${contact.firstName} ${contact.lastName}`.trim()
            const isSelected = selectedIds.has(contact.id)
            return (
              <div key={contact.id}>
                <div
                  onClick={() => editMode ? toggleSelect(contact.id) : selectContact(contact.id)}
                  className="flex items-center gap-3 px-4 py-2 active:bg-white/5 transition-colors"
                  style={{
                    height: 72,
                    background: isSelected && editMode ? tokens.colors.accentFaint : undefined,
                  }}
                >
                  {editMode ? (
                    <div className="shrink-0 flex items-center justify-center" style={{ width: 24 }}>
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5" style={{ color: tokens.colors.accent }} />
                      ) : (
                        <Circle className="h-5 w-5" style={{ color: tokens.colors.textQuaternary }} />
                      )}
                    </div>
                  ) : (
                    <Avatar className="h-9 w-9 shrink-0" style={{ background: tokens.colors.surface }}>
                      <AvatarFallback
                        className="text-[13px] font-medium"
                        style={{ background: tokens.colors.surface, color: tokens.colors.textSecondary }}
                      >
                        {getInitials(contact.firstName, contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 500, lineHeight: '18px', color: tokens.colors.textPrimary }}>
                      {name || 'Unnamed'}
                    </p>
                    {contact.relationship && (
                      <p className="truncate" style={{ fontSize: 12, lineHeight: '16px', color: tokens.colors.textTertiary, marginTop: 1 }}>
                        {contact.relationship}
                      </p>
                    )}
                  </div>
                  {!editMode && (
                    <AnimatedIcon icon={ChevronRight} className="h-4 w-4" style={{ color: tokens.colors.textQuaternary }} />
                  )}
                </div>
                {/* Indented divider */}
                <div style={{ marginLeft: 60, height: 1, background: tokens.colors.borderSubtle }} />
              </div>
            )
          })
        )}
      </div>

      {/* Edit mode bulk action toolbar */}
      <AnimatePresence>
        {editMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 flex items-center gap-2 px-4"
            style={{
              height: 56,
              background: tokens.colors.surface,
              borderTop: '1px solid ' + tokens.colors.borderSubtle,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
              className="flex-1"
            >
              {bulkDeleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                : <AnimatedIcon icon={Trash2} className="h-3.5 w-3.5 mr-1" />}
              Delete {selectedIds.size}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {!(editMode && selectedIds.size > 0) && (
        <div
          className="shrink-0 px-4 py-2.5 flex items-center"
          style={{ ...tokens.typography.caption, borderTop: '1px solid ' + tokens.colors.borderSubtle, color: tokens.colors.textTertiary }}
        >
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Mobile slide-in detail panel (iOS-style push) */}
      <div
        className="absolute inset-0 z-20 flex flex-col"
        style={{
          transform: mobileOpen && selectedContact ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease',
          background: tokens.colors.bg,
          maxHeight: 'calc(100vh - 120px)',
        }}
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
      >
        {selectedContact && (
          <div className="h-full flex flex-col">
            <PanelToolbar
              title={`${selectedContact.firstName} ${selectedContact.lastName}`.trim()}
              onBack={handleClose}
              actions={
                <>
                  {selectedContact.phone && (
                    <ToolbarAction icon={Phone} label="Call" onClick={() => window.open(`tel:${selectedContact.phone}`)} />
                  )}
                  {selectedContact.email && (
                    <ToolbarAction icon={Mail} label="Email" onClick={() => window.open(`mailto:${selectedContact.email}`)} />
                  )}
                  <ToolbarAction icon={Pencil} label="Edit" onClick={() => setEditDialogOpen(true)} />
                  <ToolbarAction icon={Trash2} label="Delete" destructive onClick={() => setDeleteConfirmId(selectedContact.id)} />
                </>
              }
            />
            <ContactDetail contact={selectedContact} />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {isMobile ? mobileList : (
        <div className="h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]" style={{ background: tokens.colors.bg }}>
          <div className="h-full flex flex-col max-w-7xl mx-auto w-full md:px-6">
            <TwoPanelLayout
              leftPanel={leftPanel}
              rightPanel={rightPanel}
              emptyState={{ icon: <AnimatedIcon icon={Users} className="h-12 w-12" />, text: 'Select a contact' }}
              selectedKey={selectedContact?.id}
              mobileOpen={mobileOpen}
              onMobileClose={handleClose}
              mobileTitle={selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}`.trim() : 'Contact'}
            />
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <EditContactDialog
        contact={selectedContact}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveContact}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this contact. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
