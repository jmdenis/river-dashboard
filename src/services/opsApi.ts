const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = `${API_BASE_URL}/api`

export interface Task {
  id: string
  title: string
  service?: string
  model?: string
  status: 'queued' | 'running' | 'done' | 'failed'
  created: string
  startTime?: string
  endTime?: string
  result?: string
  cost?: string
  tokensIn?: number
  tokensOut?: number
}

export interface SystemInfo {
  cpu: number
  mem: number
  disk: number
  uptime: number
  hostname: string
  cpus: number
  loadavg: number[]
}

export const opsApi = {
  async getTasks(token: string): Promise<Task[]> {
    console.log('opsApi: getTasks called with token:', token);
    console.log('opsApi: Fetching tasks from URL:', `${API_BASE}/tasks`);
    console.log('Fetching tasks...');
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to fetch tasks:', res.statusText); return []; }
    const data = await res.json();
    console.log('Tasks fetched:', data);
    return data;
  },

  async getSystemInfo(token: string): Promise<SystemInfo> {
    console.log('opsApi: getSystemInfo called with token:', token);
    console.log('opsApi: Fetching system info from URL:', `${API_BASE}/stats`);
    console.log('Fetching system info...');
    const res = await fetch(`${API_BASE}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) { console.error('Failed to fetch system info:', res.statusText); return { cpu: 0, mem: 0, disk: 0, uptime: 0, hostname: 'N/A', cpus: 0, loadavg: [] }; }
    const data = await res.json();
    console.log('System info fetched:', data);
    return data;
  },

  async createTask(token: string, task: Partial<Task>): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(task),
    })
    return res.json()
  },

  async updateTask(token: string, id: string, updates: Partial<Task>): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id, ...updates }),
    })
    return res.json()
  },

  async deleteTask(token: string, id: string): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    return res.json()
  },
}
