# Hantara - API Client

Fast, collaborative API client with collections and folders. Like Postman, but open and free.

## Tech Stack

- **Framework**: Next.js 15 (App Router + Edge Functions)
- **Language**: TypeScript
- **UI**: TailwindCSS v4
- **State**: Zustand (with localStorage persistence)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Deploy**: Vercel (free tier)
- **Keep-alive**: Vercel Cron + GitHub Actions (dual strategy)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app works **without Supabase** for local/offline usage. Collections are saved to localStorage.

### With Supabase (for auth + cloud sync)

```bash
# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run the SQL schema in Supabase SQL Editor
# File: src/lib/supabase/schema.sql
```

## Features

### Phase 1 - Core Layout ✅
- Collapsible sidebar with collection tree
- Dark theme with custom CSS variables
- Responsive layout (sidebar + request + response panels)

### Phase 2 - Request Builder ✅
- HTTP method selector (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- URL input with Enter-to-send
- Tabs: Params, Headers, Body, Auth
- Query params editor (auto-syncs with URL)
- Headers editor (key-value with enable/disable)
- Body editor (None, JSON, Raw, Form Data)
- Auth editor (Bearer Token, Basic Auth, API Key)

### Phase 3 - Collection System ✅
- Create/rename/delete collections
- Nested folders (unlimited depth)
- Add requests to collections or folders
- Context menus for CRUD operations
- Persistent storage (localStorage via Zustand)
- Method badges with color coding

### Phase 4 - Supabase Integration ✅
- OAuth login (GitHub + Google)
- Full database schema with RLS (Row Level Security)
- Workspace-based collaboration (owner/editor/viewer roles)
- Auto-create profile + workspace on signup
- Realtime subscriptions enabled
- Works without Supabase for local usage

### Phase 5 - Environment Variables ✅
- Create multiple environments
- Key-value variable editor
- `{{variable_name}}` interpolation in URL, headers, and body
- Environment selector in sidebar
- Persistent storage

### Phase 6 - Keep-Alive & Deployment ✅
- `/api/keep-alive` endpoint with dual-check strategy
- Vercel Cron (every 5 days) in `vercel.json`
- GitHub Actions backup cron (`.github/workflows/keep-alive.yml`)
- Request history with replay
- Edge Functions proxy (bypass CORS)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── proxy/route.ts          # Edge proxy (bypass CORS)
│   │   └── keep-alive/route.ts     # Supabase keep-alive ping
│   ├── auth/
│   │   └── callback/route.ts       # OAuth callback handler
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   │   ├── auth-provider.tsx
│   │   ├── login-screen.tsx
│   │   └── user-menu.tsx
│   ├── collections/
│   │   └── collection-tree.tsx
│   ├── environment/
│   │   └── environment-selector.tsx
│   ├── history/
│   │   └── history-panel.tsx
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   └── sidebar.tsx
│   ├── request/
│   │   ├── auth-editor.tsx
│   │   ├── body-editor.tsx
│   │   ├── headers-editor.tsx
│   │   ├── params-editor.tsx
│   │   └── request-panel.tsx
│   └── response/
│       └── response-panel.tsx
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       ├── types.ts
│       └── schema.sql
└── store/
    ├── auth-store.ts
    ├── collection-store.ts
    ├── environment-store.ts
    └── request-store.ts
```

## Supabase Keep-Alive

Supabase free tier pauses databases after 7 days of inactivity. This project uses a **dual strategy**:

| Strategy | How | Frequency |
|----------|-----|-----------|
| Vercel Cron | `vercel.json` → `/api/keep-alive` | Every 5 days |
| GitHub Actions | `.github/workflows/keep-alive.yml` | Every 5 days |

### Setup GitHub Actions Secrets

Add these secrets to your GitHub repo (Settings → Secrets):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (from Supabase dashboard)
- `APP_URL` - Your deployed app URL (e.g., https://hantara.vercel.app)

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

The Vercel Cron job will automatically start pinging your database.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the schema from `src/lib/supabase/schema.sql`
4. Enable Google/GitHub OAuth in Authentication → Providers
5. Copy your project URL and keys to `.env.local`

## License

MIT
