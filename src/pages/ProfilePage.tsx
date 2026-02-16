import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
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

  useEffect(() => {
    const fetchProfileFiles = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/profile`)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const data: ProfileFile[] = await res.json()
        setProfileFiles(data)
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-white/60 mt-1">Knowledge files editor</p>
      </div>

      {profileFiles.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue={profileFiles[0]?.file}>
              <TabsList className="w-full justify-start overflow-x-auto bg-white/[0.03] border border-white/[0.06]">
                {profileFiles.map((f) => (
                  <TabsTrigger key={f.file} value={f.file} className="text-xs text-white/40 data-[state=active]:text-white data-[state=active]:bg-white/[0.06]">
                    {f.file}
                  </TabsTrigger>
                ))}
              </TabsList>
              {profileFiles.map((fileData) => (
                <TabsContent key={fileData.file} value={fileData.file}>
                  {fileData.modified && (
                    <p className="text-xs text-white/25 mb-4">
                      Last modified: {new Date(fileData.modified).toLocaleString()}
                    </p>
                  )}
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white/90 prose-headings:font-medium prose-a:text-violet-400 prose-strong:text-white/80 prose-code:text-violet-400 prose-p:text-white/60 prose-li:text-white/60">
                    <ReactMarkdown>{fileData.content}</ReactMarkdown>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-white/20 text-center py-12">No profile files found</p>
      )}
    </div>
  )
}
