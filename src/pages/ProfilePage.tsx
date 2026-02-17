import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import ReactMarkdown from 'react-markdown'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface ProfileFile {
  file: string
  content: string
  modified: string | null
}

export default function ProfilePage() {
  const [profileFiles, setProfileFiles] = useState<ProfileFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('')

  useEffect(() => {
    const fetchProfileFiles = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/profile`)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const data: ProfileFile[] = await res.json()
        setProfileFiles(data)
        if (data.length > 0) setActiveTab(data[0].file)
      } catch (e: any) {
        console.error('ProfilePage: Error fetching profile files:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProfileFiles()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-rose-400/80 text-center py-12">Error loading profile: {error}</p>
  }

  const activeFile = profileFiles.find(f => f.file === activeTab)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90">Profile</h1>
          <p className="text-sm text-white/50 mt-1">Knowledge files editor</p>
        </div>
        {profileFiles.length > 0 && (
          <div className="inline-flex rounded-full bg-white/[0.06] p-1 border border-white/[0.06]">
            {profileFiles.map(f => (
              <button
                key={f.file}
                onClick={() => setActiveTab(f.file)}
                className={`relative px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeTab === f.file
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {f.file.replace(/\.md$/, '')}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeFile ? (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Card>
            <CardContent className="pt-6">
              {activeFile.modified && (
                <p className="text-xs text-white/25 mb-4">
                  Last modified: {new Date(activeFile.modified).toLocaleString()}
                </p>
              )}
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white/90 prose-headings:font-medium prose-a:text-violet-400 prose-strong:text-white/80 prose-code:text-violet-400 prose-p:text-white/60 prose-li:text-white/60">
                <ReactMarkdown>{activeFile.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : profileFiles.length === 0 ? (
        <p className="text-sm text-white/20 text-center py-12">No profile files found</p>
      ) : null}
    </div>
  )
}
