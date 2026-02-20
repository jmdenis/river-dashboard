import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent } from '../components/ui/card'
import { Loader2, FileText, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { tokens, styles } from '../designTokens'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN = API_BASE_URL.split('/dash/')[1]?.split('/')[0] || ''

interface WorkspaceFile { name: string; size: number; mtime: number }
interface UploadStatus { name: string; status: 'uploading' | 'done' | 'error'; error?: string }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' },
  }),
}

export default function FilesPage() {
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadStatus[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = () => {
    fetch(`${API_BASE_URL}/api/files`).then(r => r.ok ? r.json() : [])
      .then(data => { setFiles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadFiles() }, [])

  const uploadFile = async (file: File) => {
    setUploads(prev => [...prev, { name: file.name, status: 'uploading' }])
    try {
      const res = await fetch(`${API_BASE_URL}/api/files`, {
        method: 'POST',
        headers: { 'x-upload-token': TOKEN, 'x-file-name': file.name },
        body: file,
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'done' } : u))
      setTimeout(loadFiles, 500)
    } catch (e: any) {
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', error: e.message } : u))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(uploadFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 style={{ ...tokens.typography.display, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>Files</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-2)' }}>Share files with River</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="p-12 text-center cursor-pointer transition-all duration-150"
        style={{
          borderRadius: '12px',
          border: dragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
          background: dragOver ? 'var(--accent-subtle)' : 'transparent',
        }}
      >
        <div className="flex justify-center mb-3"><AnimatedIcon icon={Upload} className="h-6 w-6" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-3)' }} /></div>
        <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>{dragOver ? 'Drop files here' : 'Drag & drop files, or click to browse'}</p>
        <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>Up to 200 MB per file</p>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-3 text-[13px] p-2">
              {u.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)] shrink-0" />}
              {u.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-400/80 shrink-0" />}
              {u.status === 'error' && <AlertCircle className="h-4 w-4 text-rose-400/80 shrink-0" />}
              <span className="truncate text-[var(--text-2)]">{u.name}</span>
              {u.error && <span className="text-[12px] text-rose-400/80">Error {u.error}</span>}
            </div>
          ))}
        </div>
      )}

      <div>
        <p style={{ ...styles.sectionHeader, marginBottom: 16 }}>{files.length} file{files.length !== 1 ? 's' : ''}</p>
        <Card>
          <CardContent className="p-0">
            {files.length === 0 ? (
              <p className="text-[13px] text-[var(--text-3)] text-center py-12">No files uploaded yet</p>
            ) : (
              <div>
                {files.map((f, i) => (
                  <motion.div
                    key={f.name}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-between px-4 py-3 last:border-b-0 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AnimatedIcon icon={FileText} className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                      <div className="min-w-0">
                        <p className="text-[13px] truncate" style={{ color: 'var(--text-1)' }}>{f.name}</p>
                        <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{formatSize(f.size)} · {formatDate(f.mtime)}</p>
                      </div>
                    </div>
                    <a href={`${API_BASE_URL}/api/files/${encodeURIComponent(f.name)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150" title="Download">
                      <AnimatedIcon icon={Download} className="h-4 w-4" />
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
