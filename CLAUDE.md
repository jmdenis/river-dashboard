# CLAUDE.md — River / OpenClaw VPS

## Server
- **Host:** OVHcloud VPS (Ubuntu 24.04 LTS) — 51.255.199.163
- **User:** ubuntu
- **Domain:** rivertam.denis.me
- **Owner:** Jean-Marc Denis (jmd) — Product Design Director at Meta, based near Toulouse

## OpenClaw
OpenClaw is River's AI assistant platform. River is a Telegram bot (@RiverTamCoreBot) that chats with jmd, manages memory, and delegates tasks.

### Services
- `openclaw-gateway` (user systemd) — main gateway on port 18789
- `openclaw-upload` (system systemd) — dashboard backend (Node.js) on port 8444
- Nginx reverse proxy on ports 80/443

### Key Paths
- `/home/ubuntu/.openclaw/` — OpenClaw root
- `/home/ubuntu/.openclaw/workspace/` — River's workspace (knowledge files, memory, projects)
- `/home/ubuntu/.openclaw/workspace/upload/` — dashboard backend (server.js)
- `/home/ubuntu/.openclaw/openclaw.json` — main config (DO NOT dump full schema, 396KB+)
- `/home/ubuntu/.openclaw/credentials/` — API keys (NEVER expose)

### Knowledge Files (River's brain)
- `AGENTS.md` — operating instructions and rules
- `USER.md` — everything about jmd
- `SOUL.md` — River's personality
- `MEMORY.md` — long-term memory
- `IDENTITY.md` — who River is
- `TOOLS.md` — environment-specific notes
- `HEARTBEAT.md` — periodic check config
- `memory/YYYY-MM-DD.md` — daily logs

### Backup
- GitHub repo: `jmdenis/river-brain` (private)
- Auto-backup cron at 3am: `/home/ubuntu/river-brain/backup.sh`

## Dashboard (river-dashboard)
React/Vite/TypeScript dashboard for monitoring River.

### Stack
- React 18 + TypeScript + Vite
- shadcn/ui components (src/components/ui/)
- Tailwind CSS (dark mode default, violet accents)
- Recharts for charts, Framer Motion for transitions
- Lucide icons, react-markdown for .md rendering

### Deployment
- **Source:** `/home/ubuntu/.openclaw/workspace/river-dashboard/`
- **Repo:** github.com/jmdenis/rivertam-dashboard
- **Live:** https://rivertam.denis.me/ (nginx basic auth, user: jm)
- **Deploy:** `cd /home/ubuntu/.openclaw/workspace/river-dashboard && npm run build && sudo cp -r dist/* /var/www/river-dashboard/`

### API (served by upload/server.js on port 8444)
- **External:** https://rivertam.denis.me/api/
- **Internal (from VPS):** http://localhost:8444
- `GET /api/tasks` — tasks (id, title, service, model, status, created, cost, tokensIn, tokensOut)
- `POST /api/tasks` — create task
- `GET /api/stats` — system stats
- `GET /api/files` — workspace file list
- `GET /api/files/:name` — file content
- `POST /api/files` — upload (headers: x-upload-token, x-file-name)
- `GET /api/profile` — knowledge files array
- `GET /api/finance/*` — spending, subscriptions, insurance, waste

### Pages
- **Ops** — task feed, system stats, model usage
- **Files** — upload dropzone + file list (NO knowledge files)
- **Finance** — spending analysis
- **Logs** — activity heatmap + daily timeline
- **Profile** — knowledge files with rendered markdown

### Auth
Nginx basic auth (user: jm) protects the dashboard. No token in URL path.

## OpenClaw Gateway
- **URL:** https://openclaw.denis.me/

## Nginx
- Config: `/etc/nginx/sites-available/rivertam.denis.me`
- Backup: `/etc/nginx/sites-available/rivertam.denis.me.backup`
- `location /` → serves dashboard static files + proxies /api/ to upload server (port 8444)
- SSL via Let's Encrypt (certbot)

## Rules
- NEVER modify nginx config, systemd services, or /etc/ without explicit approval
- NEVER restart openclaw-gateway without approval
- NEVER expose API keys, tokens, or passwords
- NEVER dump openclaw.json full schema (too large)
- Use `trash` over `rm` when possible
- Test changes with `npm run build` before deploying
- Keep dark mode + violet accent aesthetic
- jmd's personal machine is Windows 11 with NO WSL — use PowerShell/CMD only for local instructions
- jmd's work machine is macOS
IMPORTANT: Never use shadcn components (AlertDialog, Dialog, Sheet, etc) without importing them from '@/components/ui/'. Always verify imports exist before using components.
