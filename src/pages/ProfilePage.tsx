import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading profile data...</p>
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-red-500 py-12">Error loading profile: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">Knowledge files editor</p>
      </div>

      {profileFiles.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue={profileFiles[0]?.file}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {profileFiles.map((f) => (
                  <TabsTrigger key={f.file} value={f.file} className="text-xs">
                    {f.file}
                  </TabsTrigger>
                ))}
              </TabsList>
              {profileFiles.map((fileData) => (
                <TabsContent key={fileData.file} value={fileData.file}>
                  {fileData.modified && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Last modified: {new Date(fileData.modified).toLocaleString()}
                    </p>
                  )}
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-a:text-violet-400 prose-strong:text-foreground prose-code:text-violet-400">
                    <ReactMarkdown>{fileData.content}</ReactMarkdown>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">No profile files found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
