import { useState, useRef, useEffect } from 'react'
import { CopyIcon, SimpleCheckedIcon, RefreshIcon, type AnimatedIconHandle } from './icons'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { tokens } from '../designTokens'

interface LogViewerProps {
  content: string | null
  loading?: boolean
  notFound?: boolean
  autoScroll?: boolean
  maxHeight?: string
}

export function LogViewer({ content, loading, notFound, autoScroll, maxHeight = '100%' }: LogViewerProps) {
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<AnimatedIconHandle>(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [content, autoScroll])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center">
        <RefreshIcon size={14} strokeWidth={1.5} className="animate-spin text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">Loading log...</span>
      </div>
    )
  }

  if (notFound) {
    return (
      <p className="text-[12px] py-4 text-center" style={{ color: tokens.colors.textTertiary }}>
        No output
      </p>
    )
  }

  const handleCopy = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-md overflow-hidden" style={{ background: tokens.colors.bg, border: '1px solid ' + tokens.colors.borderSubtle, borderRadius: 6 }}>
      <div className="flex items-center justify-between px-3 py-2 rounded-t-md" style={{ borderBottom: '1px solid ' + tokens.colors.borderSubtle, background: tokens.colors.surface }}>
        <span className="text-[11px] uppercase tracking-wider" style={{ color: tokens.colors.textTertiary }}>Output</span>
        {content && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            style={{ color: tokens.colors.textTertiary }}
            onClick={handleCopy}
            onMouseEnter={() => copyRef.current?.startAnimation()}
            onMouseLeave={() => copyRef.current?.stopAnimation()}
          >
            {copied ? <SimpleCheckedIcon size={14} strokeWidth={1.5} /> : <CopyIcon ref={copyRef} size={14} strokeWidth={1.5} />}
            <span className="ml-1 text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        )}
      </div>
      <ScrollArea style={{ maxHeight }}>
        <pre
          className="px-3 pt-0 pb-3 whitespace-pre-wrap break-words leading-relaxed"
          style={{ ...tokens.typography.mono, color: 'rgba(52,211,153,0.8)' }}
        >
          {content || 'No output'}
          <div ref={bottomRef} />
        </pre>
      </ScrollArea>
    </div>
  )
}
