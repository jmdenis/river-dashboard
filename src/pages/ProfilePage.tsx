import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, Title, Text } from '@tremor/react'

interface ProfileFile {
  file: string;
  content: string;
  modified: string | null;
}

export default function ProfilePage() {
  const [profileFiles, setProfileFiles] = useState<ProfileFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = window.location.pathname.split('/dash/')[1]?.split('/')[0] || '';

  useEffect(() => {
    console.log('ProfilePage: useEffect triggered with token:', token);
    const fetchProfileFiles = async () => {
      try {
        const res = await fetch(`/api/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data: ProfileFile[] = await res.json();
        console.log('ProfilePage: Profile files fetched:', data);
        setProfileFiles(data);
      } catch (e: any) {
        console.error('ProfilePage: Error fetching profile files:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileFiles();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading Profile data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-12">Error loading profile: {error}</div>;
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
            <div className="mt-4 p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">
              {fileData.content}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
