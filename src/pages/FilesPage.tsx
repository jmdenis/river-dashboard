import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, Title, Text } from '@tremor/react'
import { Loader2, FileText, ChevronDown, ChevronRight, Download, FolderOpen, Upload, CheckCircle2, AlertCircle, User } from 'lucide-react'

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
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<Record<string, string>>({})
  const [loadingContent, setLoadingContent] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadStatus[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = () => {
    fetch(`${API_BASE_URL}/api/files`).then(r => r.ok ? r.json() : [])
      .then(setFiles)
      .catch(err => console.error('FilesPage error:', err))
      .finally(() => setLoading(false))
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
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'done' } : u))
      loadFiles()
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

  const toggleFile = async (name: string) => {
    if (expandedFile === name) { setExpandedFile(null); return }
    setExpandedFile(name)
    if (!fileContent[name]) {
      setLoadingContent(name)
      try {
        const res = await fetch(`${API_BASE_URL}/api/files/${encodeURIComponent(name)}`)
        const text = res.ok ? await res.text() : `Failed to load (${res.status})`
        setFileContent(prev => ({ ...prev, [name]: text }))
      } catch { setFileContent(prev => ({ ...prev, [name]: 'Failed to load' })) }
      setLoadingContent(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Files</h1>
        <p className="text-muted-foreground">Upload files and browse workspace</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}`}
      >
        <Upload className={`h-8 w-8 mx-auto mb-3 ${dragOver ? 'text-violet-500' : 'text-muted-foreground'}`} />
        <p className="font-medium">{dragOver ? 'Drop files here' : 'Drag & drop files, or click to browse'}</p>
        <p className="text-sm text-muted-foreground mt-1">Up to 200 MB per file</p>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card className="bg-card">
          <div className="flex items-center justify-between mb-3">
            <Title>Uploads</Title>
            <button onClick={() => setUploads([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          </div>
          <div className="space-y-2">
            {uploads.map((u, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {u.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />}
                {u.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                {u.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <span className="truncate">{u.name}</span>
                {u.error && <span className="text-xs text-red-500">{u.error}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Link to Profile for knowledge files */}
      <Link to="/profile" className="block">
        <Card className="bg-card hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-violet-500" />
            <div>
              <Title>Knowledge Files</Title>
              <Text>USER.md, SOUL.md, MEMORY.md and more — view in Profile</Text>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
          </div>
        </Card>
      </Link>

      {/* Workspace Files */}
      <Card className="bg-card">
        <div className="flex items-center gap-2 mb-4"><FolderOpen className="h-5 w-5 text-emerald-500" /><Title>Workspace Files</Title></div>
        <div className="space-y-2">
          {files.map((f) => {
            const isText = /\.(md|json|txt|py|js|ts|html|css|qif|yml|yaml|toml|sh)$/i.test(f.name)
            return (
              <div key={f.name} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                  <button onClick={() => isText && toggleFile(f.name)} className="flex items-center gap-3 flex-1 text-left" disabled={!isText}>
                    <FileText className={`h-4 w-4 shrink-0 ${isText ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    <div className="min-w-0"><span className="font-medium text-sm block truncate">{f.name}</span><span className="text-xs text-muted-foreground">{formatSize(f.size)} · {formatDate(f.mtime)}</span></div>
                  </button>
                  <div className="flex items-center gap-2">
                    <a href={`${API_BASE_URL}/api/files/${encodeURIComponent(f.name)}`} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Download"><Download className="h-4 w-4" /></a>
                    {isText && (expandedFile === f.name ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
                  </div>
                </div>
                {expandedFile === f.name && <div className="border-t p-4 bg-muted/30">{loadingContent === f.name ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading...</span></div> : <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">{fileContent[f.name] || 'No content'}</pre>}</div>}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
