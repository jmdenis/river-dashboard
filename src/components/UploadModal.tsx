import { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Progress } from './ui/progress'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN = API_BASE_URL.split('/dash/')[1]?.split('/')[0] || ''

interface UploadEntry {
  name: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastId = 0

export default function UploadModal({
  open,
  onOpenChange,
  initialFiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFiles?: File[]
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadEntry[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processedFilesRef = useRef<File[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    const entry: UploadEntry = { name: file.name, status: 'uploading', progress: 0 }
    setUploads(prev => [...prev, entry])

    try {
      const xhr = new XMLHttpRequest()
      const promise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploads(prev =>
              prev.map(u => u.name === file.name ? { ...u, progress: pct } : u)
            )
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.open('POST', `${API_BASE_URL}/api/files`)
        xhr.setRequestHeader('x-upload-token', TOKEN)
        xhr.setRequestHeader('x-file-name', file.name)
        xhr.send(file)
      })

      await promise
      setUploads(prev =>
        prev.map(u => u.name === file.name ? { ...u, status: 'done', progress: 100 } : u)
      )
      addToast(`\u2705 ${file.name} uploaded`, 'success')
    } catch (e: any) {
      setUploads(prev =>
        prev.map(u => u.name === file.name ? { ...u, status: 'error', error: e.message } : u)
      )
      addToast(`\u274C Upload failed: ${e.message}`, 'error')
    }
  }, [addToast])

  // Process initial files passed from global drag-and-drop
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0 && initialFiles !== processedFilesRef.current) {
      processedFilesRef.current = initialFiles
      initialFiles.forEach(uploadFile)
    }
    if (!open) {
      processedFilesRef.current = []
    }
  }, [open, initialFiles, uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [uploadFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(uploadFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Auto-close modal after all uploads complete
  useEffect(() => {
    if (uploads.length === 0) return
    const allDone = uploads.every(u => u.status === 'done' || u.status === 'error')
    if (allDone) {
      const timer = setTimeout(() => {
        onOpenChange(false)
        setUploads([])
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [uploads, onOpenChange])

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setUploads([]) }}>
        <DialogContent className="sm:max-w-md bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white/90">Upload Files</DialogTitle>
          </DialogHeader>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors duration-150 ${
              dragOver
                ? 'border-violet-500 bg-violet-500/5'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <Upload className={`h-6 w-6 mx-auto mb-3 ${dragOver ? 'text-violet-400' : 'text-white/20'}`} />
            <p className="text-sm text-white/60">
              {dragOver ? 'Drop files here' : 'Drag & drop files, or click to browse'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {uploads.length > 0 && (
            <div className="space-y-3 mt-2">
              {uploads.map((u, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    {u.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400 shrink-0" />}
                    {u.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    {u.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                    <span className="truncate text-white/60">{u.name}</span>
                    {u.status === 'uploading' && (
                      <span className="text-xs text-white/30 ml-auto">{u.progress}%</span>
                    )}
                  </div>
                  {u.status === 'uploading' && (
                    <Progress value={u.progress} color="bg-violet-500" className="h-1" />
                  )}
                  {u.error && (
                    <p className="text-xs text-rose-400/80 pl-5">{u.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-2xl text-sm shadow-lg shadow-black/20 backdrop-blur-xl animate-in slide-in-from-right-5 fade-in duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  )
}
