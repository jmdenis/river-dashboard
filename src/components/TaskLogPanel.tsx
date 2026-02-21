import { useEffect, useRef, useState } from 'react'
import { opsApi, type Task } from '../services/opsApi'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet'
import { RefreshIcon } from './icons'
import { tokens } from '../designTokens'

interface TaskLogPanelProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TaskLogPanel({ task, open, onOpenChange }: TaskLogPanelProps) {
  const [logContent, setLogContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLog = async (taskId: string) => {
    const result = await opsApi.getTaskLog(taskId)
    if (result) {
      setLogContent(result.content)
      setNotFound(false)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!open || !task) {
      setLogContent(null)
      setNotFound(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    setLoading(true)
    fetchLog(task.id)

    if (task.status === 'running') {
      intervalRef.current = setInterval(() => fetchLog(task.id), 3000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [open, task?.id, task?.status])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logContent])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col border-l" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        <SheetHeader className="p-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <SheetTitle style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
              {task?.title || 'Task Log'}
            </SheetTitle>
          </div>
          <SheetDescription className="font-mono" style={{ ...tokens.typography.caption, color: 'var(--text-2)' }}>
            {task?.id ? `ID: ${task.id}` : ''}
            {task?.status === 'running' && (
              <span className="ml-2 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
                <span className="text-[10px]" style={{ color: 'var(--success)' }}>LIVE</span>
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4" style={{ background: tokens.colors.bg }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshIcon size={20} strokeWidth={1.5} className="animate-spin" color="var(--text-3)" />
            </div>
          ) : notFound ? (
            <div className="flex items-center justify-center h-full">
              <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-2)' }}>No log file found for this task.</p>
            </div>
          ) : (
            <pre className="font-mono whitespace-pre-wrap break-words leading-relaxed" style={{ fontSize: 12, color: tokens.colors.green }}>
              {logContent}
              <div ref={bottomRef} />
            </pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
