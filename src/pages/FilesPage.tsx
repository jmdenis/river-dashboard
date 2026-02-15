import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Loader2, FileText, Download, Upload, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'

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

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Files</h1>
        <p className="text-muted-foreground">Share files with River</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}`}
      >
        <Upload className={`h-8 w-8 mx-auto mb-3 ${dragOver ? 'text-violet-500' : 'text-muted-foreground'}`} />
        <p className="font-medium">{dragOver ? 'Drop files here' : 'Drag & drop files, or click to browse'}</p>
        <p className="text-sm text-muted-foreground mt-1">Up to 200 MB per file</p>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-3 text-sm p-2">
              {u.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />}
              {u.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
              {u.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
              <span className="truncate">{u.name}</span>
              {u.error && <span className="text-xs text-red-500">Error {u.error}</span>}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{files.length} file{files.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {files.map((f) => (
              <div key={f.name} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(f.size)} · {formatDate(f.mtime)}</p>
                  </div>
                </div>
                <a href={`${API_BASE_URL}/api/files/${encodeURIComponent(f.name)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Download">
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
