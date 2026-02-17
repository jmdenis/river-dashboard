const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export interface ProfileFile {
  file: string
  content: string
  modified: string | null
}

export interface DocFile {
  name: string
  size: number
  modified: string
}

export interface DocContent {
  name: string
  content: string
  modified: string
}

export interface SecurityStatus {
  smtp: { connected: boolean; account?: string; error?: string }
  imap: { connected: boolean; error?: string }
  gemini: { connected: boolean; error?: string }
  calendar: { connected: boolean; error?: string }
  telegram: { connected: boolean; username?: string; error?: string }
  github: { connected: boolean; error?: string }
  auth: { method: string; user: string }
}

export const profileApi = {
  async getProfileFiles(): Promise<ProfileFile[]> {
    const res = await fetch(`${API_BASE_URL}/api/profile`)
    if (!res.ok) return []
    return res.json()
  },

  async getEnvVars(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE_URL}/api/security/env`)
    if (!res.ok) return {}
    return res.json()
  },

  async getSecurityStatus(): Promise<SecurityStatus | null> {
    const res = await fetch(`${API_BASE_URL}/api/security/status`)
    if (!res.ok) return null
    return res.json()
  },

  async rotateToken(): Promise<{ success?: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/security/rotate-token`, { method: 'POST' })
    return res.json()
  },

  async clearDebugLogs(): Promise<{ success?: boolean; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/security/clear-debug-logs`, { method: 'POST' })
    return res.json()
  },

  async clearInbox(): Promise<{ success?: boolean; cleared?: number; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/security/clear-inbox`, { method: 'POST' })
    return res.json()
  },

  async getDocs(): Promise<DocFile[]> {
    const res = await fetch(`${API_BASE_URL}/api/docs`)
    if (!res.ok) return []
    return res.json()
  },

  async getDocContent(filename: string): Promise<DocContent | null> {
    const res = await fetch(`${API_BASE_URL}/api/docs/${encodeURIComponent(filename)}`)
    if (!res.ok) return null
    return res.json()
  },
}
