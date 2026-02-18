import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { opsApi, type InboxItem, type IntegrationProposal } from '../services/opsApi'
import {
  Search, ExternalLink, BookOpen, Mail,
  RefreshCw, Loader2, Play, Copy, Check,
  Save, X, ChevronLeft, Trash2,
} from 'lucide-react'

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

/* ────────────────────────────────────────────────────────── */
/*  Left Panel: List Item                                     */
/* ────────────────────────────────────────────────────────── */

function ListItem({ item, isActive, onClick }: {
  item: InboxItem
  isActive: boolean
  onClick: () => void
}) {
  const emoji = categoryEmojis[item.analysis?.category || ''] || categoryEmojis['other']
  const title = cleanTitle(item)
  const date = relativeDate(item.date)

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 px-3 transition-colors duration-100"
      style={{
        height: 48,
        background: isActive ? 'var(--accent-subtle)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      <span className="text-sm shrink-0 leading-none">{emoji}</span>
      <span
        className="text-[13px] truncate flex-1 min-w-0"
        style={{ color: isActive ? 'var(--text-1)' : 'var(--text-2)', fontWeight: isActive ? 500 : 400 }}
      >
        {title}
      </span>
      <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-3)' }}>
        {date}
      </span>
    </button>
  )
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
  const rel = a?.relevance || { openclaw: 0, claude: 0, ai: 0, meta: 0, webdev: 0 }
  const proposal = a?.integrationProposal as IntegrationProposal | null
  const rrCmd = item.rr_command || proposal?.rrCommand || null
  const showRrCmd = rrCmd && !isVagueProposal(item)
  const emoji = categoryEmojis[a?.category || ''] || categoryEmojis['other']
  const title = cleanTitle(item)
  const category = formatCategory(a?.category || 'other')
  const fullDate = new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header */}
      <div className="shrink-0 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-2">
          <span className="text-base mt-0.5">{emoji}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] leading-snug" style={{ fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
              {title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{category}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>&middot;</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{fullDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* From */}
        <div>
          <p className="section-label mb-1">From</p>
          <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>{item.from}</p>
        </div>

        {/* Summary */}
        <div>
          <p className="section-label mb-1.5">Summary</p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{a?.summary}</p>
        </div>

        {/* Key Takeaways */}
        {a?.keyTakeaways && a.keyTakeaways.length > 0 && (
          <div>
            <p className="section-label mb-1.5">Key Takeaways</p>
            <ul className="space-y-1.5">
              {a.keyTakeaways.map((t, i) => (
                <li key={i} className="text-[13px] pl-3.5 relative" style={{ color: 'var(--text-2)' }}>
                  <span className="absolute left-0 top-[8px] h-[5px] w-[5px] rounded-full" style={{ background: 'var(--accent)' }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Video verdict */}
        {a?.videoVerdict && (
          <div>
            <p className="section-label mb-1.5">Verdict</p>
            <p className="text-[13px] italic" style={{ color: 'var(--text-2)' }}>{a.videoVerdict}</p>
          </div>
        )}

        {/* Integration Proposal */}
        {proposal && (
          <div
            className="rounded-lg p-4 space-y-2.5"
            style={{ border: '1px solid var(--accent-border)', background: 'var(--accent-subtle)' }}
          >
            <p className="section-label" style={{ color: 'var(--accent-text)' }}>Integration Proposal</p>
            <div className="grid gap-2">
              {([
                ['WHAT', proposal.what],
                ['HOW', proposal.how],
                ['EFFORT', proposal.effort],
                ['CONNECTS', proposal.connectsTo],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex gap-2.5">
                  <span className="text-[10px] uppercase tracking-wider w-[68px] shrink-0 pt-0.5" style={{ fontWeight: 600, color: 'var(--accent-muted)' }}>
                    {label}
                  </span>
                  <span className="text-[13px] leading-relaxed" style={{ color: 'var(--accent-text)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* rr command */}
        {showRrCmd && (
          <div>
            <p className="section-label mb-1.5">Command</p>
            <pre
              className="text-[12px] font-mono px-3 py-2.5 rounded-md whitespace-pre-wrap break-all mb-2"
              style={{ color: 'var(--text-2)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
            >
              {rrCmd}
            </pre>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopy(rrCmd!, item.id)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-2.5 rounded-md transition-colors shrink-0"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
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
                  background: executedId === item.id ? 'rgba(16,185,129,0.1)' : 'var(--accent-subtle)',
                  color: executedId === item.id ? 'rgb(52,211,153)' : 'var(--accent)',
                  border: executedId === item.id ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--accent-border)',
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
          <div>
            <p className="section-label mb-1.5">Command</p>
            <button
              disabled
              className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-md opacity-50 cursor-not-allowed"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
              title="No executable command available"
            >
              <Play className="h-3.5 w-3.5" />
              Generate rr
            </button>
          </div>
        )}

        {/* Relevance */}
        <div>
          <p className="section-label mb-1.5">Relevance</p>
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(rel).map(([k, v]) => (
              <span key={k} className="text-[12px]" style={{ color: 'var(--text-2)' }}>
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="shrink-0 px-5 py-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        {item.urls && item.urls.length > 0 && (
          <a
            href={item.urls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors"
            style={{ color: 'var(--accent-text)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open link
          </a>
        )}
        <button
          onClick={() => onRecheck(item.id)}
          disabled={recheckingId === item.id}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors disabled:opacity-50"
          style={{ color: 'var(--text-2)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {recheckingId === item.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
          Recheck
        </button>
        <button
          onClick={() => onSave(item.id)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors"
          style={{ color: 'var(--text-2)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
        <button
          onClick={() => onDismiss(item.id)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors"
          style={{ color: 'var(--text-3)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md transition-colors"
          style={{ color: 'var(--destructive)', background: 'transparent', border: '1px solid transparent' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
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
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-4 w-72 rounded-lg" />
        <div className="skeleton h-10 w-full rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-20 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5" style={{ color: 'var(--text-3)' }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>Knowledge</h1>
        </div>
        <p className="text-sm mt-1 ml-[30px]" style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-2)' }}>
          Articles, videos, and insights processed by River
        </p>
      </div>

      {/* Two-panel layout */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          height: 'calc(100vh - 190px)',
          minHeight: 400,
        }}
      >
        <div className="flex h-full">
          {/* Left Panel */}
          <div
            className="shrink-0 flex flex-col h-full border-r"
            style={{ width: '40%', maxWidth: 500, borderColor: 'var(--border)' }}
          >
            {/* Search */}
            <div className="shrink-0 px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] transition-all duration-150 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>
            </div>

            {/* Filter tabs */}
            <div className="shrink-0 px-3 pb-2">
              <div className="flex gap-0.5 rounded-lg p-[2px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-all duration-200 flex-1 justify-center"
                    style={filter === f.key
                      ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-1)' }
                      : { color: 'var(--text-3)' }
                    }
                  >
                    {f.label}
                    {counts[f.key] > 0 && (
                      <span className="text-[9px] tabular-nums" style={{ color: filter === f.key ? 'var(--text-2)' : 'var(--text-3)' }}>
                        {counts[f.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto" style={{ borderTop: '1px solid var(--border)' }}>
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Mail className="h-6 w-6 mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
                    {nonJunk.length === 0 ? 'No articles yet' : 'No matches'}
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    isActive={selectedId === item.id}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Panel (desktop) */}
          <div className="flex-1 min-w-0 hidden md:flex flex-col">
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
                  <Mail className="h-8 w-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.06)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>Select an article</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Detail Overlay (< 768px) */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 flex flex-col"
            style={{ background: 'var(--bg-base)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div
              className="shrink-0 flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
            >
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1 text-[13px]"
                style={{ color: 'var(--accent-text)' }}
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
    </div>
  )
}
