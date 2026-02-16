import { useEffect, useRef, useState } from 'react'
import { opsApi, type Task } from '../services/opsApi'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet'
import { Loader2 } from 'lucide-react'

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
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col bg-white/5 backdrop-blur-xl border-l border-white/10">
        <SheetHeader className="p-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-sm font-medium text-white/80">
              {task?.title || 'Task Log'}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-white/30 font-mono">
            {task?.id ? `ID: ${task.id}` : ''}
            {task?.status === 'running' && (
              <span className="ml-2 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400/80 text-[10px]">LIVE</span>
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 bg-black/20">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          ) : notFound ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-white/20">No log file found for this task.</p>
            </div>
          ) : (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words text-emerald-400/80 leading-relaxed">
              {logContent}
              <div ref={bottomRef} />
            </pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
