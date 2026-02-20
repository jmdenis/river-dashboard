import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { opsApi, type InboxItem, type IntegrationProposal } from '../services/opsApi'
import { Alert, AlertTitle, AlertDescription } from '@/components/reui/alert'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  News01Icon, TestTube01Icon, Wrench01Icon, BookOpen01Icon, YoutubeIcon,
  Share01Icon, Briefcase01Icon, Package01Icon, LinkSquare02Icon, ArrowReloadHorizontalIcon, Loading03Icon,
  PlayIcon, Copy01Icon, Tick02Icon, BookmarkAdd01Icon, Cancel01Icon, Delete02Icon, InformationCircleIcon,
  InstagramIcon,
} from 'hugeicons-react'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { tokens } from '../designTokens'
import { TwoPanelLayout } from '../components/TwoPanelLayout'
import { PanelToolbar, ToolbarAction } from '../components/PanelToolbar'

/* ── Types ─────────────────────────────────────────────── */

type FilterTab = 'all' | 'actionable' | 'saved' | 'executed' | 'dismissed'

/* ── Category icons ────────────────────────────────────── */

const categoryIcons: Record<string, React.ComponentType<any>> = {
  'tech-news': News01Icon,
  'ai-research': TestTube01Icon,
  'tool-update': Wrench01Icon,
  'tutorial': BookOpen01Icon,
  'youtube-video': YoutubeIcon,
  'instagram-reel': InstagramIcon,
  'social-media': Share01Icon,
  'business': Briefcase01Icon,
  'other': Package01Icon,
}

function CategoryIcon({ category, className }: { category?: string; className?: string }) {
  const Icon = categoryIcons[category || 'other'] || Package01Icon
  return <AnimatedIcon icon={Icon} className={className || 'h-4 w-4'} strokeWidth={1.5} style={{ color: tokens.colors.textTertiary }} />
}

/* ── Helpers ───────────────────────────────────────────── */

function cleanTitle(item: InboxItem): string {
  const a = item.analysis
  let raw = a?.tldr || a?.summary || item.subject || ''

  const prefixes = [
    /^This Instagram Reel forwarded by Jean-Marc Denis\b[^.]*[.!]?\s*/i,
    /^Jean-Marc Denis forwarded\b[^.]*[.!]?\s*/i,
    /^Jean-Marc forwarded\b[^.]*[.!]?\s*/i,
    /^This email forwards?\b[^.]*[.!]?\s*/i,
    /^(Fwd:\s*|Re:\s*)+/i,
  ]
  for (const re of prefixes) {
    raw = raw.replace(re, '')
  }

  if (!a?.tldr && raw.length > 0) {
    const firstSentence = raw.match(/^[^.!?]+[.!?]/)
    if (firstSentence) raw = firstSentence[0]
  }

  if (raw.length > 80) raw = raw.slice(0, 80) + '...'
  if (raw.length > 0) raw = raw.charAt(0).toUpperCase() + raw.slice(1)
  return raw || 'Untitled'
}

function isVagueProposal(item: InboxItem): boolean {
  const cmd = item.rr_command || (item.analysis?.integrationProposal as IntegrationProposal | null)?.rrCommand || ''
  const proposal = item.analysis?.integrationProposal as IntegrationProposal | null
  const from = item.from || ''
  if (/\b(Investigate|Explore|Research)\b/i.test(cmd)) return true
  if (item.analysis?.category === 'other' && !proposal) return true
  if (/google\.com|noreply/i.test(from)) return true
  if (proposal?.what && /potential integration/i.test(proposal.what)) return true
  return false
}

function isJunk(item: InboxItem): boolean {
  const subj = item.subject.trim()
  if (/^(Fwd:\s*)?$/i.test(subj)) return true
  if (/River email test|test envoyé|test simple/i.test(subj)) return true
  if (/rivertam\.opc|mailer-daemon/i.test(item.from)) return true
  const a = item.analysis
  if (a?.category === 'other') {
    const rel = a.relevance || {}
    const allZero = Object.values(rel).every(v => v === 0)
    if (allZero) return true
  }
  return false
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatCategory(cat: string): string {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function sourceName(item: InboxItem): string {
  const from = item.from || ''
  const match = from.match(/^([^<]+)/)
  if (match) {
    const name = match[1].trim().replace(/"/g, '')
    if (name) return name
  }
  return formatCategory(item.analysis?.category || 'other')
}

/* ── Animation variants ────────────────────────────────── */

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.02 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0 },
}

/* ── Detail View (Right Panel) ─────────────────────────── */

function DetailView({ item, onRecheck, recheckingId, onExecute, executingId, executedId, onCopy, copiedId, onDismiss, onSave, onDelete, onBack }: {
  item: InboxItem
  onRecheck: (id: string) => void
  recheckingId: string | null
  onExecute: (id: string) => void
  executingId: string | null
  executedId: string | null
  onCopy: (text: string, id: string) => void
  copiedId: string | null
  onDismiss: (id: string) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
  onBack?: () => void
}) {
  const a = item.analysis
  const proposal = a?.integrationProposal as IntegrationProposal | null
  const rrCmd = item.rr_command || proposal?.rrCommand || null
  const showRrCmd = rrCmd && !isVagueProposal(item)
  const title = cleanTitle(item)
  const source = sourceName(item)
  const fullDate = new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const [checkedTakeaways, setCheckedTakeaways] = useState<Set<number>>(new Set())
  useEffect(() => { setCheckedTakeaways(new Set()) }, [item.id])

  // Parse actionItems
  const actionItems: { assignee: string; action: string }[] = []
  if (a?.actionItems && Array.isArray(a.actionItems)) {
    for (const ai of a.actionItems) {
      if (typeof ai === 'string') {
        const match = ai.match(/^\[([^\]]+)\]\s*(.*)$/)
        if (match) actionItems.push({ assignee: match[1], action: match[2] })
        else actionItems.push({ assignee: 'jm', action: ai })
      } else if (ai && typeof ai === 'object') {
        actionItems.push({ assignee: (ai as { for?: string }).for || 'jm', action: (ai as { action?: string }).action || String(ai) })
      }
    }
  }

  // Parse takeaways
  const takeaways: string[] = []
  if (a?.keyTakeaways && a.keyTakeaways.length > 0) {
    takeaways.push(...a.keyTakeaways)
  } else if (a?.summary) {
    const parts = a.summary.split(/\.\s+/).filter(Boolean)
    if (parts.length > 1) takeaways.push(...parts)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <PanelToolbar
        title={title}
        onBack={onBack}
        actions={
          <>
            <ToolbarAction icon={BookmarkAdd01Icon} label="Save" onClick={() => onSave(item.id)} />
            <ToolbarAction icon={PlayIcon} label="Execute" disabled={executingId === item.id || executedId === item.id} onClick={() => onExecute(item.id)} />
            <ToolbarAction icon={Cancel01Icon} label="Dismiss" onClick={() => onDismiss(item.id)} />
            <ToolbarAction icon={Delete02Icon} label="Delete" destructive onClick={() => onDelete(item.id)} />
          </>
        }
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Source + date + category badge */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span style={{ ...tokens.typography.caption, color: tokens.colors.accent }}>{source}</span>
          <span className="text-[12px] tabular-nums" style={{ color: tokens.colors.textQuaternary }}>{fullDate}</span>
          {a?.category && (
            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
              <CategoryIcon category={a.category} className="h-3 w-3" />
              {formatCategory(a.category)}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h2 className="leading-tight mb-5" style={{ ...tokens.typography.display, letterSpacing: '-0.02em', color: tokens.colors.textPrimary }}>
          {title}
        </h2>

        {/* Takeaways as checkbox list */}
        {takeaways.length > 0 && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary, marginBottom: 10 }}>Takeaways</p>
            <div className="space-y-2.5">
              {takeaways.map((t, i) => {
                const id = `takeaway-${item.id}-${i}`
                const isChecked = checkedTakeaways.has(i)
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <Checkbox
                      id={id}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setCheckedTakeaways(prev => {
                          const next = new Set(prev)
                          if (checked) next.add(i)
                          else next.delete(i)
                          return next
                        })
                      }}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={id}
                      className={`text-[13px] leading-relaxed font-normal cursor-pointer transition-colors ${isChecked ? 'line-through opacity-50' : ''}`}
                      style={{ color: tokens.colors.textSecondary }}
                    >
                      {t}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Action Items</p>
            <ul className="space-y-1.5">
              {actionItems.map((ai, i) => (
                <li key={i} className="text-[13px] pl-3.5 relative leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                  <span className="absolute left-0 top-[9px] h-[5px] w-[5px] rounded-full bg-emerald-400" />
                  <span
                    className="mr-1.5 px-1.5 py-0.5 rounded"
                    style={{ ...tokens.typography.label, background: tokens.colors.surface, color: tokens.colors.textTertiary }}
                  >
                    {ai.assignee}
                  </span>
                  {ai.action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Video verdict */}
        {a?.videoVerdict && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Verdict</p>
            <p className="text-[13px] italic" style={{ color: tokens.colors.textSecondary }}>{a.videoVerdict}</p>
          </div>
        )}

        {/* Integration Proposal — Card with accent left border + Alert info */}
        {proposal && (
          <Card className="mb-6 py-0 gap-0 overflow-hidden" style={{ borderLeft: `3px solid ${tokens.colors.accent}` }}>
            <CardContent className="p-0">
              <Alert variant="info" className="rounded-none border-0">
                <InformationCircleIcon className="size-4" strokeWidth={1.5} />
                <AlertTitle>Integration Plan</AlertTitle>
                <AlertDescription>
                  <div className="grid gap-2 mt-1">
                    {([
                      ['WHERE', proposal.connectsTo],
                      ['HOW', proposal.how],
                      ['EFFORT', proposal.effort],
                      ['IMPACT', (proposal as IntegrationProposal & { impact?: string }).impact],
                      ['WHAT', proposal.what],
                    ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex gap-2.5">
                        <span
                          className="text-[10px] uppercase tracking-[0.05em] w-[60px] shrink-0 pt-0.5 font-medium"
                          style={{ color: tokens.colors.accent }}
                        >
                          {label}
                        </span>
                        <span className="text-[13px] leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* rr command */}
        {showRrCmd && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Command</p>
            <pre
              className="text-[12px] font-mono px-3 py-2.5 rounded-md whitespace-pre-wrap break-all mb-2.5"
              style={{ color: tokens.colors.textSecondary, background: tokens.colors.surfaceHover, border: '1px solid ' + tokens.colors.border }}
            >
              {rrCmd}
            </pre>
            <ButtonGroup>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(rrCmd!, item.id)}
              >
                {copiedId === item.id
                  ? <AnimatedIcon icon={Tick02Icon} className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} noStroke />
                  : <AnimatedIcon icon={Copy01Icon} className="h-3.5 w-3.5" strokeWidth={1.5} />}
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExecute(item.id)}
                disabled={executingId === item.id || executedId === item.id}
              >
                {executingId === item.id
                  ? <Loading03Icon className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  : executedId === item.id
                    ? <AnimatedIcon icon={Tick02Icon} className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} noStroke />
                    : <AnimatedIcon icon={PlayIcon} className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {executedId === item.id ? 'Executed' : 'Execute'}
              </Button>
            </ButtonGroup>
          </div>
        )}

        {/* No rr_command but has integrationProposal */}
        {!showRrCmd && proposal && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Command</p>
            <Button variant="ghost" size="sm" disabled>
              <AnimatedIcon icon={PlayIcon} className="h-3.5 w-3.5" strokeWidth={1.5} />
              Generate rr
            </Button>
          </div>
        )}

        {/* Relevance scores */}
        {a?.relevance && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.label, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Relevance</p>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(a.relevance).map(([k, v]) => {
                const color = (v as number) > 7 ? 'text-emerald-400' : (v as number) >= 4 ? 'text-amber-400' : 'text-white/30'
                return (
                  <span key={k} className={`text-[12px] ${color}`}>
                    {k}: <span className="font-medium">{v}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Source link */}
        {item.urls && item.urls.length > 0 && (
          <a
            href={item.urls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] hover:underline mb-6"
            style={{ color: tokens.colors.accent }}
          >
            <AnimatedIcon icon={LinkSquare02Icon} className="h-3.5 w-3.5" strokeWidth={1.5} noStroke />
            Open source
          </a>
        )}
      </div>

      {/* Recheck button (secondary, at bottom of scroll area) */}
      <div className="shrink-0 px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRecheck(item.id)}
          disabled={recheckingId === item.id}
        >
          {recheckingId === item.id
            ? <Loading03Icon className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            : <AnimatedIcon icon={ArrowReloadHorizontalIcon} className="h-3.5 w-3.5" strokeWidth={1.5} />}
          <span className="ml-1">Recheck</span>
        </Button>
      </div>
    </div>
  )
}

/* ── Main Component ────────────────────────────────────── */

export default function KnowledgePage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [recheckingId, setRecheckingId] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [executedId, setExecutedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Pagination
  const ITEMS_PAGE_SIZE = 30
  const [visibleCount, setVisibleCount] = useState(ITEMS_PAGE_SIZE)

  useEffect(() => {
    opsApi.getInboxRecent(100)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const nonJunk = useMemo(() => items.filter(i => !isJunk(i)), [items])

  const filteredItems = useMemo(() => {
    let result = [...nonJunk]
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (filter === 'actionable') {
      result = result.filter(i => i.analysis?.actionable)
    } else if (filter === 'saved') {
      result = result.filter(i => i.status === 'saved')
    } else if (filter === 'executed') {
      result = result.filter(i => i.status === 'executed')
    } else if (filter === 'dismissed') {
      result = result.filter(i => i.status === 'dismissed')
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.subject.toLowerCase().includes(q) ||
        i.from.toLowerCase().includes(q) ||
        (i.analysis?.summary || '').toLowerCase().includes(q) ||
        (i.analysis?.tldr || '').toLowerCase().includes(q) ||
        (i.analysis?.category || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [nonJunk, filter, search])

  // Reset visible count on filter/search change
  useEffect(() => { setVisibleCount(ITEMS_PAGE_SIZE) }, [filter, search])

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount])
  const hasMoreItems = filteredItems.length > visibleCount

  const counts = useMemo(() => ({
    all: nonJunk.length,
    actionable: nonJunk.filter(i => i.analysis?.actionable).length,
    saved: nonJunk.filter(i => i.status === 'saved').length,
    executed: nonJunk.filter(i => i.status === 'executed').length,
    dismissed: nonJunk.filter(i => i.status === 'dismissed').length,
  }), [nonJunk])

  const selectedItem = useMemo(
    () => filteredItems.find(i => i.id === selectedId) || null,
    [filteredItems, selectedId]
  )

  /* ── Handlers ──────────────────────────────────────── */

  const handleRecheck = useCallback(async (id: string) => {
    setRecheckingId(id)
    toast('Rechecking article...')
    try {
      await fetch(`/api/inbox/${id}/recheck`, { method: 'POST' })
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
      toast.success('Article rechecked')
    } catch {
      toast.error('Failed to recheck')
    }
    setRecheckingId(null)
  }, [])

  const handleExecute = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const proposal = item.analysis?.integrationProposal as IntegrationProposal | null
    const cmd = item.rr_command || proposal?.rrCommand
    if (!cmd) return
    setExecutingId(id)
    setExecutedId(null)
    toast('Executing rr command...')
    try {
      await opsApi.queueTask(cmd)
      await opsApi.inboxAction(id, 1)
      setExecutedId(id)
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
      toast.success('Command executed')
      setTimeout(() => setExecutedId(null), 3000)
    } catch {
      toast.error('Failed to execute command')
    }
    setExecutingId(null)
  }, [items])

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Command copied')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [])

  const handleSave = useCallback(async (id: string) => {
    try {
      await opsApi.inboxAction(id, 2)
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
      toast.success('Article saved')
    } catch {
      toast.error('Failed to save')
    }
  }, [])

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await opsApi.inboxAction(id, 0)
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
      toast('Article dismissed')
    } catch {
      toast.error('Failed to dismiss')
    }
  }, [])

  const confirmDelete = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/inbox/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
      setSelectedId(prev => {
        if (prev !== id) return prev
        const idx = filteredItems.findIndex(i => i.id === id)
        const next = filteredItems[idx + 1] || filteredItems[idx - 1] || null
        return next?.id || null
      })
      toast.success('Article deleted')
    } catch {
      toast.error('Failed to delete')
    }
    setDeleteConfirmId(null)
  }, [filteredItems])
  const handleMobileClose = useCallback(() => { setMobileOpen(false); setSelectedId(null) }, [])

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'actionable', label: 'Actionable' },
    { key: 'saved', label: 'Saved' },
    { key: 'executed', label: 'Executed' },
    { key: 'dismissed', label: 'Dismissed' },
  ]

  /* ── Loading skeleton ──────────────────────────────── */

  if (loading) {
    return (
      <div
        className="h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]"
        style={{ background: tokens.colors.bg }}
      >
        <div className="h-full flex max-w-7xl mx-auto w-full md:px-6">
          {/* Left skeleton */}
          <div className="w-full md:w-[35%] md:max-w-[420px] shrink-0 flex flex-col" style={{ background: tokens.colors.surface, borderRight: '1px solid ' + tokens.colors.borderSubtle }}>
            {/* Search bar placeholder */}
            <div style={{ height: 44, borderBottom: '1px solid ' + tokens.colors.borderSubtle }} />
            {/* Filter bar placeholder */}
            <div style={{ height: 36 }} />
            {/* Skeleton rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 px-4 py-2" style={{ height: 72 }}>
                  <div className="shrink-0 rounded-full animate-pulse" style={{ width: 12, height: 12, background: 'rgba(255,255,255,0.1)' }} />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="h-[12px] rounded animate-pulse" style={{ width: '60%', background: 'rgba(255,255,255,0.1)' }} />
                    <div className="h-[10px] rounded animate-pulse" style={{ width: '30%', background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="shrink-0 h-[10px] rounded animate-pulse" style={{ width: 36, background: 'rgba(255,255,255,0.1)' }} />
                </div>
                <div style={{ marginLeft: 44, height: 1, background: tokens.colors.borderSubtle }} />
              </div>
            ))}
          </div>
          {/* Right skeleton — empty */}
          <div className="hidden md:flex flex-1" />
        </div>
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────── */

  const leftPanel = (
    <>
      {/* Search — border-bottom input */}
      <div className="shrink-0 relative" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="w-full text-[13px] px-4"
          style={{
            height: 44,
            background: 'transparent',
            color: tokens.colors.textPrimary,
            border: 'none',
            outline: 'none',
          }}
        />
      </div>

      {/* Filter tabs */}
      <div className="shrink-0 px-4 flex items-center gap-4 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide" style={{ height: 36, WebkitOverflowScrolling: 'touch' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="whitespace-nowrap transition-colors duration-150"
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: filter === f.key ? tokens.colors.textPrimary : tokens.colors.textTertiary,
            }}
          >
            {f.label}{counts[f.key] > 0 ? ` ${counts[f.key]}` : ''}
          </button>
        ))}
      </div>

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <AnimatedIcon icon={BookOpen01Icon} className="h-8 w-8 mb-3" strokeWidth={1.5} style={{ color: tokens.colors.textQuaternary, opacity: 0.4 }} />
            <p className="text-[13px]" style={{ color: tokens.colors.textQuaternary }}>
              {nonJunk.length === 0 ? 'No articles yet' : 'No matches'}
            </p>
          </div>
        ) : (
          <motion.div
            key={filter}
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            {visibleItems.map(item => {
              const isActive = selectedId === item.id
              const itemTitle = cleanTitle(item)
              const date = relativeDate(item.date)
              const source = sourceName(item)

              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => {
                    setSelectedId(item.id)
                    if (window.innerWidth < 768) setMobileOpen(true)
                  }}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isActive ? '' : 'hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 px-4 py-2"
                    style={{
                      height: 72,
                      borderLeft: `3px solid ${isActive ? tokens.colors.accent : 'transparent'}`,
                      background: isActive ? tokens.colors.accentSubtle : undefined,
                    }}
                  >
                    <CategoryIcon category={item.analysis?.category} />
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{ fontSize: 13, fontWeight: 500, lineHeight: '18px', color: tokens.colors.textPrimary }}
                      >
                        {itemTitle}
                      </p>
                      <p
                        className="truncate"
                        style={{ fontSize: 12, lineHeight: '16px', color: tokens.colors.textTertiary, marginTop: 1 }}
                      >
                        {source}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[11px] tabular-nums"
                      style={{ color: tokens.colors.textQuaternary }}
                    >
                      {date}
                    </span>
                  </div>
                  {/* Indented divider */}
                  <div style={{ marginLeft: 44, height: 1, background: tokens.colors.borderSubtle }} />
                </motion.div>
              )
            })}

            {/* Load more */}
            {hasMoreItems && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + ITEMS_PAGE_SIZE)}
                  className="px-4 py-2 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: tokens.colors.surface,
                    color: tokens.colors.textTertiary,
                    border: '1px solid ' + tokens.colors.borderSubtle,
                  }}
                >
                  Load more ({filteredItems.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </>
  )


  const rightPanel = selectedItem ? (
    <DetailView
      item={selectedItem}
      onRecheck={handleRecheck}
      recheckingId={recheckingId}
      onExecute={handleExecute}
      executingId={executingId}
      executedId={executedId}
      onCopy={handleCopy}
      copiedId={copiedId}
      onDismiss={handleDismiss}
      onSave={handleSave}
      onDelete={confirmDelete}
      onBack={handleMobileClose}
    />
  ) : null

  return (
    <>
      <div className="h-[calc(100vh-48px)] md:h-[calc(100vh-64px)]" style={{ background: tokens.colors.bg }}>
        <div className="h-full flex flex-col max-w-7xl mx-auto w-full md:px-6">
        <TwoPanelLayout
          leftPanel={leftPanel}
          rightPanel={rightPanel}
          emptyState={{ icon: <AnimatedIcon icon={BookOpen01Icon} className="h-12 w-12" strokeWidth={1.5} />, text: 'Select an article' }}
          selectedKey={selectedItem?.id}
          mobileOpen={mobileOpen}
          onMobileClose={handleMobileClose}
          mobileTitle={selectedItem ? cleanTitle(selectedItem) : 'Article'}
        />
        </div>
      </div>

      {/* Delete Article Confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this article. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
