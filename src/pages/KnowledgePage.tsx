import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { opsApi, type InboxItem, type IntegrationProposal } from '../services/opsApi'
import {
  Search, ExternalLink,
  RefreshCw, Loader2, Play, Copy, Check,
  Bookmark, X, ChevronLeft, Trash2,
  Mail, CheckSquare, Square, CheckCheck,
} from 'lucide-react'
import { MailIcon, type MailIconHandle } from '../components/ui/mail-icon'
import { tokens, styles } from '../designTokens'

type FilterTab = 'all' | 'actionable' | 'saved' | 'executed' | 'dismissed'

const categoryEmojis: Record<string, string> = {
  'tech-news': '\u{1F4F0}',
  'ai-research': '\u{1F9EA}',
  'tool-update': '\u{1F527}',
  'tutorial': '\u{1F4DA}',
  'youtube-video': '\u{1F3AC}',
  'instagram-reel': '\u{1F4F1}',
  'social-media': '\u{1F4F1}',
  'business': '\u{1F4BC}',
  'other': '\u{1F4E8}',
}

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
  // Extract name part before <email>
  const match = from.match(/^([^<]+)/)
  if (match) {
    const name = match[1].trim().replace(/"/g, '')
    if (name) return name
  }
  // Fallback to category
  return formatCategory(item.analysis?.category || 'other')
}

/* ────────────────────────────────────────────────────────── */
/*  Right Panel: Detail View                                  */
/* ────────────────────────────────────────────────────────── */

function DetailView({ item, onRecheck, recheckingId, onExecute, executingId, executedId, onCopy, copiedId, onDismiss, onSave, onDelete }: {
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
}) {
  const a = item.analysis
  const proposal = a?.integrationProposal as IntegrationProposal | null
  const rrCmd = item.rr_command || proposal?.rrCommand || null
  const showRrCmd = rrCmd && !isVagueProposal(item)
  const title = cleanTitle(item)
  const source = sourceName(item)
  const fullDate = new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  // Parse actionItems (can be array of strings or objects from different sources)
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

  // Parse summary into bullet points (can be a joined string with ". " separators)
  const summaryBullets: string[] = []
  if (a?.keyTakeaways && a.keyTakeaways.length > 0) {
    summaryBullets.push(...a.keyTakeaways)
  } else if (a?.summary) {
    const parts = a.summary.split(/\.\s+/).filter(Boolean)
    if (parts.length > 1) summaryBullets.push(...parts)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Source + date + category badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] font-medium" style={{ color: tokens.colors.accent }}>{source}</span>
          <span className="text-[13px] tabular-nums" style={{ color: tokens.colors.textQuaternary }}>{fullDate}</span>
          {a?.category && (
            <span
              className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
              style={{ background: tokens.colors.surface, color: tokens.colors.textTertiary, border: '1px solid ' + tokens.colors.innerHighlight }}
            >
              {categoryEmojis[a.category] || '\u{1F4E8}'} {formatCategory(a.category)}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] mb-5" style={{ color: tokens.colors.textPrimary }}>
          {title}
        </h2>

        {/* Summary as bullet points */}
        {summaryBullets.length > 0 ? (
          <div className="mb-6">
            <p style={{ ...tokens.typography.micro, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Summary</p>
            <ul className="space-y-1.5">
              {summaryBullets.map((s, i) => (
                <li key={i} className="text-[14px] pl-3.5 relative leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                  <span className="absolute left-0 top-[9px] h-[5px] w-[5px] rounded-full" style={{ background: tokens.colors.accent }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : a?.summary ? (
          <p className="text-[14px] leading-relaxed mb-6" style={{ color: tokens.colors.textSecondary }}>{a.summary}</p>
        ) : null}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.micro, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Action Items</p>
            <ul className="space-y-1.5">
              {actionItems.map((ai, i) => (
                <li key={i} className="text-[14px] pl-3.5 relative leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                  <span className="absolute left-0 top-[9px] h-[5px] w-[5px] rounded-full bg-emerald-400" />
                  <span
                    className="text-[11px] uppercase tracking-wider font-semibold mr-1.5 px-1.5 py-0.5 rounded"
                    style={{ background: tokens.colors.surface, color: tokens.colors.textTertiary }}
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
            <p style={{ ...tokens.typography.micro, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Verdict</p>
            <p className="text-[14px] italic" style={{ color: tokens.colors.textSecondary }}>{a.videoVerdict}</p>
          </div>
        )}

        {/* Integration Plan / Proposal */}
        {proposal && (
          <div
            className="rounded-lg p-4 space-y-2.5 mb-6"
            style={{ border: `1px solid ${tokens.colors.accent}33`, background: `${tokens.colors.accent}0D` }}
          >
            <p style={{ ...tokens.typography.micro, color: tokens.colors.accent }}>Integration Plan</p>
            <div className="grid gap-2">
              {([
                ['WHERE', proposal.connectsTo],
                ['HOW', proposal.how],
                ['EFFORT', proposal.effort],
                ['IMPACT', (proposal as IntegrationProposal & { impact?: string }).impact],
                ['WHAT', proposal.what],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex gap-2.5">
                  <span
                    className="text-[10px] uppercase tracking-wider w-[68px] shrink-0 pt-0.5 font-semibold"
                    style={{ color: `${tokens.colors.accent}99` }}
                  >
                    {label}
                  </span>
                  <span className="text-[14px] leading-relaxed" style={{ color: tokens.colors.textSecondary }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* rr command */}
        {showRrCmd && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.micro, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Command</p>
            <pre
              className="text-[12px] font-mono px-3 py-2.5 rounded-md whitespace-pre-wrap break-all mb-2"
              style={{ color: tokens.colors.textSecondary, background: 'rgba(255,255,255,0.03)', border: '1px solid ' + tokens.colors.innerHighlight }}
            >
              {rrCmd}
            </pre>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopy(rrCmd!, item.id)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-2.5 rounded-md transition-colors shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', color: tokens.colors.textSecondary, border: '1px solid ' + tokens.colors.innerHighlight }}
                title="Copy command"
              >
                {copiedId === item.id
                  ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                  : <Copy className="h-3.5 w-3.5" />}
                Copy
              </button>
              <button
                onClick={() => onExecute(item.id)}
                disabled={executingId === item.id || executedId === item.id}
                className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-md transition-colors duration-150 shrink-0 disabled:opacity-50"
                style={{
                  background: executedId === item.id ? 'rgba(16,185,129,0.1)' : `${tokens.colors.accent}26`,
                  color: executedId === item.id ? 'rgb(52,211,153)' : tokens.colors.accent,
                  border: executedId === item.id ? '1px solid rgba(16,185,129,0.3)' : `1px solid ${tokens.colors.accent}33`,
                }}
              >
                {executingId === item.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : executedId === item.id
                    ? <Check className="h-3.5 w-3.5" />
                    : <Play className="h-3.5 w-3.5" />}
                {executedId === item.id ? 'Executed' : 'Execute'}
              </button>
            </div>
          </div>
        )}

        {/* No rr_command but has integrationProposal */}
        {!showRrCmd && proposal && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.micro, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Command</p>
            <button
              disabled
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-md opacity-50 cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.04)', color: tokens.colors.textQuaternary, border: '1px solid ' + tokens.colors.innerHighlight }}
              title="No executable command available"
            >
              <Play className="h-3.5 w-3.5" />
              Generate rr
            </button>
          </div>
        )}

        {/* Relevance scores */}
        {a?.relevance && (
          <div className="mb-6">
            <p style={{ ...tokens.typography.micro, color: tokens.colors.textQuaternary, marginBottom: 8 }}>Relevance</p>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(a.relevance).map(([k, v]) => {
                const color = (v as number) > 7 ? 'text-emerald-400' : (v as number) >= 4 ? 'text-amber-400' : 'text-white/30'
                return (
                  <span key={k} className={`text-[13px] ${color}`}>
                    {k}: <span className="font-semibold">{v}</span>
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
            className="inline-flex items-center gap-1.5 text-[13px] hover:underline mb-6"
            style={{ color: tokens.colors.accent }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open source
          </a>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 px-6 py-3 flex items-center gap-2 flex-wrap" style={{ borderTop: '1px solid ' + tokens.colors.innerHighlight }}>
        <button
          onClick={() => onSave(item.id)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-colors"
          style={{ background: `${tokens.colors.accent}26`, color: tokens.colors.accent }}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Bookmark
        </button>
        <button
          onClick={() => onDismiss(item.id)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-colors hover:bg-white/[0.04]"
          style={{ border: '1px solid ' + tokens.colors.border, color: tokens.colors.textSecondary }}
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
        <button
          onClick={() => onExecute(item.id)}
          disabled={executingId === item.id || executedId === item.id}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          style={{ border: '1px solid ' + tokens.colors.border, color: tokens.colors.textSecondary }}
        >
          <Play className="h-3.5 w-3.5" />
          {executedId === item.id ? 'Executed' : 'Execute'}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onRecheck(item.id)}
          disabled={recheckingId === item.id}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full transition-colors disabled:opacity-50"
          style={{ color: tokens.colors.textQuaternary }}
        >
          {recheckingId === item.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full transition-colors hover:text-rose-400"
          style={{ color: tokens.colors.textQuaternary }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/*  Main Component                                            */
/* ────────────────────────────────────────────────────────── */

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingBatch, setDeletingBatch] = useState(false)

  useEffect(() => {
    opsApi.getInboxRecent(100)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredItems = useMemo(() => {
    let result = items.filter(i => !isJunk(i))
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
  }, [items, filter, search])

  const nonJunk = useMemo(() => items.filter(i => !isJunk(i)), [items])
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

  const handleRecheck = useCallback(async (id: string) => {
    setRecheckingId(id)
    try {
      await fetch(`/api/inbox/${id}/recheck`, { method: 'POST' })
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
    } catch {}
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
    try {
      await opsApi.queueTask(cmd)
      await opsApi.inboxAction(id, 1)
      setExecutedId(id)
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
      setTimeout(() => setExecutedId(null), 3000)
    } catch {}
    setExecutingId(null)
  }, [items])

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }, [])

  const handleSave = useCallback(async (id: string) => {
    try {
      await opsApi.inboxAction(id, 2)
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
    } catch {}
  }, [])

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await opsApi.inboxAction(id, 0)
      const updated = await opsApi.getInboxRecent(100)
      setItems(updated)
    } catch {}
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this article permanently?')) return
    try {
      await fetch(`/api/inbox/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
      setSelectedId(prev => {
        if (prev !== id) return prev
        const idx = filteredItems.findIndex(i => i.id === id)
        const next = filteredItems[idx + 1] || filteredItems[idx - 1] || null
        return next?.id || null
      })
    } catch {}
  }, [filteredItems])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const allVisible = new Set(filteredItems.map(i => i.id))
      const allSelected = filteredItems.every(i => prev.has(i.id))
      return allSelected ? new Set() : allVisible
    })
  }, [filteredItems])

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!window.confirm(`Delete ${count} article${count > 1 ? 's' : ''} permanently?`)) return
    setDeletingBatch(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/inbox/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {})
        )
      )
      setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
      if (selectedId && selectedIds.has(selectedId)) setSelectedId(null)
      setSelectedIds(new Set())
    } catch {}
    setDeletingBatch(false)
  }, [selectedIds, selectedId])

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'actionable', label: 'Actionable' },
    { key: 'saved', label: 'Bookmarked' },
    { key: 'executed', label: 'Executed' },
    { key: 'dismissed', label: 'Dismissed' },
  ]

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-10 w-full rounded-xl" />
        <div className="skeleton h-5 w-72 rounded-lg" />
        <div className="skeleton h-10 w-full rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full mb-2 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Full-bleed two-panel layout */}
      <div
        className="flex flex-col md:flex-row"
        style={{
          height: 'calc(100vh - 52px)',
          background: tokens.colors.bg,
        }}
      >
        {/* Left Panel — 380px */}
        <div
          className={`shrink-0 flex flex-col md:w-[380px] ${selectedItem ? 'hidden md:flex' : 'flex'}`}
          style={{ borderRight: '1px solid ' + tokens.colors.innerHighlight, height: '100%' }}
        >
          {/* Search */}
          <div className="shrink-0 px-5 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: tokens.colors.textTertiary }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[14px] bg-[#1C1C1E] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#0A84FF]/50 transition-all duration-150"
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="shrink-0 px-5 pb-2.5 flex flex-wrap gap-1.5 overflow-hidden">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-[13px] font-medium px-2.5 py-1 rounded-full transition-all duration-200"
                style={filter === f.key
                  ? { background: tokens.colors.border, color: tokens.colors.textPrimary }
                  : { color: tokens.colors.textQuaternary }
                }
              >
                {f.label}{counts[f.key] > 0 ? ` ${counts[f.key]}` : ''}
              </button>
            ))}
          </div>

          {/* Article list */}
          <div className="flex-1 overflow-y-auto relative">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <MailIcon size={24} className="mb-3 text-white/[0.08]" isAnimated={false} />
                <p className="text-[13px]" style={{ color: tokens.colors.textQuaternary }}>
                  {nonJunk.length === 0 ? 'No articles yet' : 'No matches'}
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const isActive = selectedId === item.id
                const isChecked = selectedIds.has(item.id)
                const title = cleanTitle(item)
                const source = sourceName(item)
                const date = relativeDate(item.date)
                const summary = item.analysis?.summary || ''

                return (
                  <div
                    key={item.id}
                    className="flex items-stretch transition-colors duration-100"
                    style={{
                      background: isActive ? `${tokens.colors.accent}1F` : isChecked ? `${tokens.colors.accent}0F` : 'transparent',
                      borderBottom: '1px solid ' + tokens.colors.innerHighlight,
                    }}
                  >
                    {/* Checkbox area */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}
                      className="shrink-0 w-10 flex items-center justify-center hover:bg-white/[0.04] transition-colors"
                      aria-label={isChecked ? 'Deselect' : 'Select'}
                    >
                      {isChecked
                        ? <CheckSquare className="h-4 w-4" style={{ color: tokens.colors.accent }} />
                        : <Square className="h-4 w-4 text-white/20 hover:text-white/40" />}
                    </button>
                    {/* Content area */}
                    <button
                      onClick={() => setSelectedId(item.id)}
                      className="flex-1 min-w-0 text-left pr-5 py-3.5"
                    >
                      {/* Source + date */}
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[13px] font-medium truncate" style={{ color: tokens.colors.accent }}>{source}</span>
                        <span className="text-[13px] tabular-nums shrink-0 ml-2" style={{ color: tokens.colors.textQuaternary }}>{date}</span>
                      </div>
                      {/* Title */}
                      <p
                        className="text-[14px] font-medium truncate"
                        style={{ color: isActive ? tokens.colors.textPrimary : 'rgba(255,255,255,0.85)' }}
                      >
                        {title}
                      </p>
                      {/* Summary */}
                      {summary && (
                        <p className="text-[14px] line-clamp-2 mt-0.5 leading-snug" style={{ color: tokens.colors.textSecondary }}>
                          {summary}
                        </p>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Floating action bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                className="shrink-0 px-4 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(28, 28, 30, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid ' + tokens.colors.innerHighlight }}
              >
                <span className="text-[13px] font-medium text-white/70 tabular-nums">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-[12px] px-2.5 py-1.5 rounded-md transition-colors"
                  style={{ color: tokens.colors.accent }}
                >
                  {filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id))
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleBatchDelete}
                  disabled={deletingBatch}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 disabled:opacity-50"
                >
                  {deletingBatch
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel */}
        <div className={`flex-1 min-w-0 ${selectedItem ? 'hidden md:flex' : 'hidden md:flex'} flex-col`}>
          {selectedItem ? (
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
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MailIcon size={40} className="mx-auto mb-3" style={{ opacity: 0.15, color: tokens.colors.textPrimary }} isAnimated={false} />
                <p className="text-[14px]" style={{ color: tokens.colors.textQuaternary }}>Select an article</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Detail Overlay (< 768px) */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 flex flex-col"
            style={{ background: tokens.colors.bg, top: 52 }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="shrink-0 flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid ' + tokens.colors.innerHighlight }}>
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1 text-[13px]"
                style={{ color: tokens.colors.accent }}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
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
                onDelete={handleDelete}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
