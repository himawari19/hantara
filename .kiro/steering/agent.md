# Hantara - Agent Steering

## Project
Hantara adalah web-based API client (mirip Postman) yang dibangun dengan Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS 4, Zustand 5, dan Monaco Editor.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + React 19
- **State**: Zustand 5 (flat store per domain, no middleware)
- **Styling**: Tailwind CSS 4 + CSS custom properties (`var(--bg-primary)`, `var(--accent)`, dll)
- **Editor**: Monaco Editor
- **DnD**: dnd-kit
- **Icons**: Lucide React
- **Auth/DB**: Supabase
- **Lang**: TypeScript 5.8 strict

## Struktur Folder
```
src/
├── app/           → Pages & API routes (App Router)
├── components/    → Feature-based folders (layout/, request/, response/, collections/, dll)
├── store/         → Zustand stores (1 file per domain: request-store.ts, collection-store.ts, dll)
└── lib/           → Utilities (supabase/, code-generator, script-runner, dll)
```

## Konvensi Kode
- `"use client"` di semua komponen interaktif
- Path alias: `@/*` → `./src/*`
- Komponen: functional + hooks, props typed inline/interface
- Store: `create<Interface>()`, state + actions flat, cross-store via `getState()`
- Styling: Tailwind utilities + CSS variables untuk theming, dark-first
- API: request dikirim via `/api/proxy` (avoid CORS), mock via `/api/mock/[...path]`
- Tidak ada test framework — jangan tambah test kecuali diminta eksplisit

## Rules
1. Gunakan pattern yang sudah ada — jangan introduce library/pattern baru tanpa diminta
2. Semua komponen baru harus pakai Tailwind + CSS variables yang sudah ada
3. Store baru ikuti pattern Zustand flat yang sama
4. Jangan tambah test/lint config kecuali diminta
5. **Setelah selesai mengerjakan tugas: JANGAN list apa yang sudah dikerjakan, JANGAN jelaskan fix apa yang dilakukan, Jangan kasih summary, langsung kasih 5 ide pengembangan selanjutnya**
