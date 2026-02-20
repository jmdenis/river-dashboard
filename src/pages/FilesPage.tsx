import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card, CardContent } from '../components/ui/card'
import { Loader2, FileText, Download, Upload, CheckCircle2, AlertCircle, Folder, ChevronRight, ArrowLeft } from 'lucide-react'
import { AnimatedIcon } from '../components/AnimatedIcon'
import { tokens, styles } from '../designTokens'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN = API_BASE_URL.split('/dash/')[1]?.split('/')[0] || ''

interface WorkspaceFile { name: string; size: number; mtime: number }
interface UploadStatus { name: string; status: 'uploading' | 'done' | 'error'; error?: string }
interface FolderInfo { key: string; label: string; dir?: string; files: WorkspaceFile[]; loading: boolean }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' },
  }),
}

export default function FilesPage() {
  const [folders, setFolders] = useState<FolderInfo[]>([
    { key: 'files', label: 'files', dir: '', files: [], loading: true },
    { key: 'memory', label: 'memory', dir: 'memory', files: [], loading: true },
  ])
  const [rootFiles, setRootFiles] = useState<WorkspaceFile[]>([])
  const [rootLoading, setRootLoading] = useState(true)
  const [currentDir, setCurrentDir] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadStatus[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFolder = useCallback((key: string, dir: string) => {
    const url = dir ? `${API_BASE_URL}/api/files?dir=${dir}` : `${API_BASE_URL}/api/files`
    fetch(url).then(r => r.ok ? r.json() : [])
      .then(data => {
        setFolders(prev => prev.map(f => f.key === key ? { ...f, files: data, loading: false } : f))
      })
      .catch(() => {
        setFolders(prev => prev.map(f => f.key === key ? { ...f, loading: false } : f))
      })
  }, [])

  const loadRootFiles = useCallback(() => {
    fetch(`${API_BASE_URL}/api/profile`).then(r => r.ok ? r.json() : [])
      .then((data: { file: string; modified: string }[]) => {
        const mapped: WorkspaceFile[] = data.map(d => ({
          name: d.file,
          size: 0,
          mtime: new Date(d.modified).getTime(),
        }))
        setRootFiles(mapped)
        setRootLoading(false)
      })
      .catch(() => setRootLoading(false))
  }, [])

  useEffect(() => {
    folders.forEach(f => loadFolder(f.key, f.dir || ''))
    loadRootFiles()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reloadCurrentFolder = useCallback(() => {
    if (currentDir) {
      const folder = folders.find(f => f.key === currentDir)
      if (folder) loadFolder(folder.key, folder.dir || '')
    } else {
      folders.forEach(f => loadFolder(f.key, f.dir || ''))
      loadRootFiles()
    }
  }, [currentDir, folders, loadFolder, loadRootFiles])

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
      setTimeout(reloadCurrentFolder, 500)
    } catch (e: any) {
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', error: e.message } : u))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [reloadCurrentFolder]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(uploadFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isLoading = folders.some(f => f.loading) || rootLoading

  if (isLoading && !currentDir) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
    </div>
  )

  const activeFolderData = currentDir ? folders.find(f => f.key === currentDir) : null

  return (
    <div className="space-y-6">
      {/* Header + breadcrumb */}
      <div>
        {currentDir ? (
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setCurrentDir(null)}
              className="flex items-center gap-1.5 text-[13px] transition-colors duration-150 hover:text-[var(--accent)]"
              style={{ color: 'var(--text-3)' }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Files
            </button>
            <ChevronRight className="h-3 w-3" style={{ color: 'var(--text-3)' }} />
            <span className="text-[13px]" style={{ color: 'var(--text-1)' }}>{currentDir}/</span>
          </div>
        ) : null}
        <h1 style={{ ...tokens.typography.display, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
          {currentDir ? `${currentDir}/` : 'Files'}
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-2)' }}>
          {currentDir
            ? `${activeFolderData?.files.length || 0} file${(activeFolderData?.files.length || 0) !== 1 ? 's' : ''}`
            : 'Browse workspace files'}
        </p>
      </div>

      {/* Upload dropzone — always visible */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="px-6 py-8 text-center cursor-pointer transition-all duration-150"
        style={{
          borderRadius: '10px',
          border: dragOver ? '2px dashed var(--accent)' : '2px dashed var(--border)',
          background: dragOver ? 'var(--accent-subtle)' : 'transparent',
        }}
      >
        <div className="flex justify-center mb-2"><AnimatedIcon icon={Upload} className="h-5 w-5" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-3)' }} /></div>
        <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>{dragOver ? 'Drop files here' : 'Drag & drop files, or click to browse'}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>Up to 200 MB per file</p>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Upload status */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {uploads.map((u, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px] px-2 py-1.5">
                {u.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)] shrink-0" />}
                {u.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-400/80 shrink-0" />}
                {u.status === 'error' && <AlertCircle className="h-4 w-4 text-rose-400/80 shrink-0" />}
                <span className="truncate text-[var(--text-2)]">{u.name}</span>
                {u.error && <span className="text-[12px] text-rose-400/80">Error {u.error}</span>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {!currentDir ? (
          /* ── Root view: folder cards + root files ── */
          <motion.div
            key="root"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Folder cards */}
            <div>
              <p style={{ ...styles.sectionHeader, marginBottom: 12 }}>Folders</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {folders.map((folder, i) => {
                  const latestMtime = folder.files.length > 0 ? Math.max(...folder.files.map(f => f.mtime)) : 0
                  const totalSize = folder.files.reduce((sum, f) => sum + f.size, 0)
                  return (
                    <motion.div
                      key={folder.key}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Card
                        className="cursor-pointer transition-all duration-150 hover:border-[var(--accent)]/30"
                        style={{ background: 'var(--surface)' }}
                        onClick={() => setCurrentDir(folder.key)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex items-center justify-center w-9 h-9 rounded-lg"
                                style={{ background: 'var(--accent-subtle)' }}
                              >
                                <Folder className="h-4.5 w-4.5" style={{ color: 'var(--accent)' }} />
                              </div>
                              <div>
                                <p className="text-[14px] font-medium" style={{ color: 'var(--text-1)' }}>
                                  {folder.label}/
                                </p>
                                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                                  {folder.loading ? '...' : (
                                    <>
                                      {folder.files.length} file{folder.files.length !== 1 ? 's' : ''}
                                      {totalSize > 0 && ` · ${formatSize(totalSize)}`}
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 mt-1" style={{ color: 'var(--text-3)' }} />
                          </div>
                          {latestMtime > 0 && (
                            <p className="text-[11px] mt-3 pl-12" style={{ color: 'var(--text-3)' }}>
                              Updated {relativeDate(latestMtime)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Root .md files */}
            {rootFiles.length > 0 && (
              <div>
                <p style={{ ...styles.sectionHeader, marginBottom: 12 }}>
                  Root files
                </p>
                <Card>
                  <CardContent className="p-0">
                    {rootFiles.map((f, i) => (
                      <motion.div
                        key={f.name}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
                        style={{ borderBottom: i < rootFiles.length - 1 ? '1px solid var(--divider)' : 'none' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AnimatedIcon icon={FileText} className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                          <div className="min-w-0">
                            <p className="text-[13px] truncate" style={{ color: 'var(--text-1)' }}>{f.name}</p>
                            <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{formatDate(f.mtime)}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Folder contents view ── */
          <motion.div
            key={currentDir}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            {activeFolderData?.loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--text-3)]" />
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {(!activeFolderData?.files.length) ? (
                    <p className="text-[13px] text-[var(--text-3)] text-center py-12">No files in this folder</p>
                  ) : (
                    <div>
                      {activeFolderData.files.map((f, i) => (
                        <motion.div
                          key={f.name}
                          custom={i}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          className="flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
                          style={{ borderBottom: i < activeFolderData.files.length - 1 ? '1px solid var(--divider)' : 'none' }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AnimatedIcon icon={FileText} className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                            <div className="min-w-0">
                              <p className="text-[13px] truncate" style={{ color: 'var(--text-1)' }}>{f.name}</p>
                              <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{formatSize(f.size)} · {formatDate(f.mtime)}</p>
                            </div>
                          </div>
                          <a
                            href={`${API_BASE_URL}/api/files/${encodeURIComponent(f.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150"
                            title="Download"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AnimatedIcon icon={Download} className="h-4 w-4" />
                          </a>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
