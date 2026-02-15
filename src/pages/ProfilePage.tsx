import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, Title, Text } from '@tremor/react'

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
      <div className="space-y-4">
        {profileFiles.map((fileData) => (
          <Card key={fileData.file} className="bg-card">
            <Title>{fileData.file}</Title>
            <Text className="mt-2 text-muted-foreground">Last Modified: {fileData.modified ? new Date(fileData.modified).toLocaleString() : 'N/A'}</Text>
            <div className="mt-4 p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">{fileData.content}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
