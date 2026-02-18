import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { opsApi, type InboxItem, type IntegrationProposal } from '../services/opsApi'
import {
  Search, ExternalLink,
  RefreshCw, Loader2, Play, Copy, Check,
  Save, X, ChevronLeft, Trash2,
  Mail,
} from 'lucide-react'
import { MailIcon, type MailIconHandle } from '../components/ui/mail-icon'

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
          <span className="text-[13px] font-medium text-[#0A84FF]">{source}</span>
          <span className="text-[13px] text-white/30 tabular-nums">{fullDate}</span>
          {a?.category && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 border border-white/[0.08]">
              {categoryEmojis[a.category] || '\u{1F4E8}'} {formatCategory(a.category)}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white mb-5">
          {title}
        </h2>

        {/* Summary as bullet points */}
        {summaryBullets.length > 0 ? (
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-white/30 mb-2">Summary</p>
            <ul className="space-y-1.5">
              {summaryBullets.map((s, i) => (
                <li key={i} className="text-[14px] pl-3.5 relative text-white/55 leading-relaxed">
                  <span className="absolute left-0 top-[9px] h-[5px] w-[5px] rounded-full bg-[#0A84FF]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : a?.summary ? (
          <p className="text-[14px] leading-relaxed text-white/55 mb-6">{a.summary}</p>
        ) : null}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-white/30 mb-2">Action Items</p>
            <ul className="space-y-1.5">
              {actionItems.map((ai, i) => (
                <li key={i} className="text-[14px] pl-3.5 relative text-white/55 leading-relaxed">
                  <span className="absolute left-0 top-[9px] h-[5px] w-[5px] rounded-full bg-emerald-400" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold mr-1.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">
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
            <p className="text-[11px] uppercase tracking-wider font-semibold text-white/30 mb-2">Verdict</p>
            <p className="text-[14px] italic text-white/55">{a.videoVerdict}</p>
          </div>
        )}

        {/* Integration Plan / Proposal */}
        {proposal && (
          <div className="rounded-lg p-4 space-y-2.5 mb-6 border border-[#0A84FF]/20 bg-[#0A84FF]/[0.05]">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#0A84FF]">Integration Plan</p>
            <div className="grid gap-2">
              {([
                ['WHERE', proposal.connectsTo],
                ['HOW', proposal.how],
                ['EFFORT', proposal.effort],
                ['IMPACT', (proposal as IntegrationProposal & { impact?: string }).impact],
                ['WHAT', proposal.what],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex gap-2.5">
                  <span className="text-[10px] uppercase tracking-wider w-[68px] shrink-0 pt-0.5 font-semibold text-[#0A84FF]/60">
                    {label}
                  </span>
                  <span className="text-[14px] leading-relaxed text-white/55">
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
            <p className="text-[11px] uppercase tracking-wider font-semibold text-white/30 mb-2">Command</p>
            <pre className="text-[12px] font-mono px-3 py-2.5 rounded-md whitespace-pre-wrap break-all mb-2 text-white/55 bg-white/[0.03] border border-white/[0.08]">
              {rrCmd}
            </pre>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopy(rrCmd!, item.id)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-2.5 rounded-md transition-colors shrink-0 bg-white/[0.04] text-white/55 border border-white/[0.08]"
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
                  background: executedId === item.id ? 'rgba(16,185,129,0.1)' : 'rgba(10,132,255,0.15)',
                  color: executedId === item.id ? 'rgb(52,211,153)' : '#0A84FF',
                  border: executedId === item.id ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(10,132,255,0.2)',
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
            <p className="text-[11px] uppercase tracking-wider font-semibold text-white/30 mb-2">Command</p>
            <button
              disabled
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-md opacity-50 cursor-not-allowed bg-white/[0.04] text-white/30 border border-white/[0.08]"
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
            <p className="text-[11px] uppercase tracking-wider font-semibold text-white/30 mb-2">Relevance</p>
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
            className="inline-flex items-center gap-1.5 text-[13px] text-[#0A84FF] hover:underline mb-6"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open source
          </a>
        )}
      </div>

      {/* Footer actions */}
      <div className="shrink-0 px-6 py-3 border-t border-white/[0.08] flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSave(item.id)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-colors bg-[#0A84FF]/15 text-[#0A84FF]"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
        <button
          onClick={() => onDismiss(item.id)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-colors border border-white/12 text-white/55 hover:bg-white/[0.04]"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
        <button
          onClick={() => onExecute(item.id)}
          disabled={executingId === item.id || executedId === item.id}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-colors border border-white/12 text-white/55 hover:bg-white/[0.04] disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          {executedId === item.id ? 'Executed' : 'Execute'}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onRecheck(item.id)}
          disabled={recheckingId === item.id}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full transition-colors disabled:opacity-50 text-white/30 hover:text-white/55"
        >
          {recheckingId === item.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full transition-colors text-white/30 hover:text-rose-400"
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

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'actionable', label: 'Actionable' },
    { key: 'saved', label: 'Saved' },
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
          background: '#000',
        }}
      >
        {/* Left Panel — 380px */}
        <div
          className={`shrink-0 flex flex-col md:w-[380px] ${selectedItem ? 'hidden md:flex' : 'flex'}`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.08)', height: '100%' }}
        >
          {/* Search */}
          <div className="shrink-0 px-5 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
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
                  ? { background: 'rgba(255,255,255,0.10)', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.30)' }
                }
              >
                {f.label}{counts[f.key] > 0 ? ` ${counts[f.key]}` : ''}
              </button>
            ))}
          </div>

          {/* Article list */}
          <div className="flex-1 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <MailIcon size={24} className="mb-3 text-white/[0.08]" isAnimated={false} />
                <p className="text-[13px] text-white/30">
                  {nonJunk.length === 0 ? 'No articles yet' : 'No matches'}
                </p>
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedId === item.id
                const title = cleanTitle(item)
                const source = sourceName(item)
                const date = relativeDate(item.date)
                const summary = item.analysis?.summary || ''

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className="w-full text-left px-5 py-3.5 transition-colors duration-100 border-b border-white/[0.08]"
                    style={{
                      background: isSelected ? 'rgba(10, 132, 255, 0.12)' : 'transparent',
                    }}
                  >
                    {/* Source + date */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13px] font-medium text-[#0A84FF] truncate">{source}</span>
                      <span className="text-[13px] tabular-nums shrink-0 ml-2 text-white/30">{date}</span>
                    </div>
                    {/* Title */}
                    <p
                      className="text-[14px] font-medium truncate"
                      style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)' }}
                    >
                      {title}
                    </p>
                    {/* Summary */}
                    {summary && (
                      <p className="text-[14px] text-white/55 line-clamp-2 mt-0.5 leading-snug">
                        {summary}
                      </p>
                    )}
                  </button>
                )
              })
            )}
          </div>
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
                <MailIcon size={40} className="mx-auto mb-3" style={{ opacity: 0.15, color: '#fff' }} isAnimated={false} />
                <p className="text-[14px] text-white/30">Select an article</p>
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
            style={{ background: '#000', top: 52 }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/[0.08]">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1 text-[13px] text-[#0A84FF]"
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
