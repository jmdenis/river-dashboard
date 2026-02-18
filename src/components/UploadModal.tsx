import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Loader2, CheckCircle2, AlertCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { Progress } from './ui/progress'
import { lifeApi } from '../services/lifeApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN = API_BASE_URL.split('/dash/')[1]?.split('/')[0] || ''

interface UploadEntry {
  name: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

interface FileEntry {
  name: string
  size: number
  sizeHuman: string
  date: string
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
  const [files, setFiles] = useState<FileEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processedFilesRef = useRef<File[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const LIMIT = 10

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const loadFiles = useCallback(async (p: number) => {
    setLoadingFiles(true)
    try {
      const data = await lifeApi.getFilesPaginated(p, LIMIT)
      setFiles(data.files)
      setTotalPages(data.totalPages)
      setPage(data.page)
    } catch {
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  // Load files when dropdown opens
  useEffect(() => {
    if (open) loadFiles(1)
  }, [open, loadFiles])

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
      addToast(`${file.name} uploaded`, 'success')
      // Reload file list after upload
      loadFiles(1)
    } catch (e: any) {
      setUploads(prev =>
        prev.map(u => u.name === file.name ? { ...u, status: 'error', error: e.message } : u)
      )
      addToast(`Upload failed: ${e.message}`, 'error')
    }
  }, [addToast, loadFiles])

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

  // Auto-clear completed uploads after a delay
  useEffect(() => {
    if (uploads.length === 0) return
    const allDone = uploads.every(u => u.status === 'done' || u.status === 'error')
    if (allDone) {
      const timer = setTimeout(() => setUploads([]), 3000)
      return () => clearTimeout(timer)
    }
  }, [uploads])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    // Slight delay so the click that opened it doesn't immediately close
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler) }
  }, [open, onOpenChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [uploadFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(uploadFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (!open) return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-4 py-2.5 rounded-2xl text-sm shadow-lg shadow-black/20 animate-in slide-in-from-right-5 fade-in duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Dropdown panel */}
      <div
        ref={dropdownRef}
        className="fixed top-12 right-4 z-[70] w-[400px] max-h-[calc(100vh-80px)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'none' }}
      >
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="m-3 p-6 text-center cursor-pointer transition-all duration-150"
          style={{
            borderRadius: '12px',
            border: dragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
            background: dragOver ? 'var(--accent-subtle)' : 'transparent',
          }}
        >
          <Upload className="h-5 w-5 mx-auto mb-2" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-3)' }} />
          <p style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-2)' }}>
            {dragOver ? 'Drop files here' : 'Drop files here or click to browse'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload progress */}
        {uploads.length > 0 && (
          <div className="px-3 pb-2 space-y-2">
            {uploads.map((u, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {u.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin text-[var(--accent)] shrink-0" />}
                  {u.status === 'done' && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                  {u.status === 'error' && <AlertCircle className="h-3 w-3 text-rose-400 shrink-0" />}
                  <span className="truncate text-[var(--text-2)]">{u.name}</span>
                  {u.status === 'uploading' && (
                    <span className="text-[var(--text-3)] ml-auto">{u.progress}%</span>
                  )}
                </div>
                {u.status === 'uploading' && (
                  <Progress value={u.progress} color="bg-[var(--accent)]" className="h-1" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* File list */}
        <div className="border-t border-[rgba(255,255,255,0.1)]">
          {loadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-3)]" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-center py-6" style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-2)' }}>No files uploaded</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {files.map((f) => (
                <a
                  key={f.name}
                  href={`${API_BASE_URL}/api/files/${encodeURIComponent(f.name)}/download`}
                  className="flex items-center gap-3 hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-100 group"
                  style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate transition-colors" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{f.name}</p>
                    <p style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-2)' }}>{f.sizeHuman} &middot; {formatDate(f.date)}</p>
                  </div>
                  <Download className="h-3.5 w-3.5 text-[var(--text-3)] group-hover:text-[var(--text-2)] shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04]">
              <button
                onClick={() => page > 1 && loadFiles(page - 1)}
                disabled={page <= 1}
                className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] disabled:text-[rgba(255,255,255,0.1)] disabled:cursor-default flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-2)' }}>{page} / {totalPages}</span>
              <button
                onClick={() => page < totalPages && loadFiles(page + 1)}
                disabled={page >= totalPages}
                className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] disabled:text-[rgba(255,255,255,0.1)] disabled:cursor-default flex items-center gap-1 transition-colors"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-2xl text-sm shadow-lg shadow-black/20 animate-in slide-in-from-right-5 fade-in duration-200 ${
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
