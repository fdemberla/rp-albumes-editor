# Copilot Instructions — Editor de Metadatos

## Project overview

Electron desktop app for managing photo albums with EXIF metadata, SFTP storage, and batch editing. Built with Next.js 15 (static export) + React 19 + TypeScript + Tailwind CSS 4. The data layer uses Prisma 7 with PostgreSQL and `@prisma/adapter-pg`.

## Architecture

- **Renderer (Next.js):** `app/`, `components/`, `lib/`, `types/` — all components are `"use client"`
- **Main process (Electron):** `electron/main.js`, `electron/preload.js`, `electron/handlers/`, `electron/services/`
- **Bridge:** `contextBridge.exposeInMainWorld("electronAPI", ...)` — typed in `types/electron.d.ts`
- **State:** Zustand stores in `lib/` — `useAuthStore` (auth/user), `useAlbumStore` (albums/photos), `useImageStore` (standalone editing)
- **Auth:** Microsoft Entra ID SSO via `@azure/msal-node` in `electron/services/auth.js` — persistent token cache in `userData/msal-token-cache.json`

## Key conventions

### File naming

- Components: PascalCase (`AlbumDetail.tsx`)
- Stores/libs: camelCase (`albumStore.ts`)
- Electron JS: camelCase (`albums.js`, `storage.js`)

### IPC channels

- Format: `namespace:action` (e.g., `album:create`, `db:testConnection`, `dialog:openFiles`)
- Response envelope: always `{ success: boolean, ...data, error?: string }`
- Progress events: `event.sender.send("album:uploadProgress", { current, total, fileName, stage })`

### IPC handler pattern

```js
ipcMain.handle("album:action", async (event, ...args) => {
  try {
    const db = getPrisma();
    // business logic
    return { success: true, data };
  } catch (err) {
    console.error("[Album] Error description:", err);
    return { success: false, error: err.message };
  }
});
```

### Preload bridge

- Each method wraps `ipcRenderer.invoke("channel", args)`
- Event listeners return a cleanup function: `() => ipcRenderer.removeListener(...)`
- Must also be typed in `types/electron.d.ts` under `ElectronAPI`

### Zustand store pattern

```ts
export const useAlbumStore = create<AlbumStore>((set, get) => ({
  // State
  albums: [],
  loading: false,
  error: null,
  // Async actions
  fetchAlbums: async (filters?) => {
    set({ loading: true, error: null });
    const result = await window.electronAPI.listAlbums(filters);
    if (result.success) set({ albums: result.albums });
    else set({ error: result.error });
    set({ loading: false });
  },
}));
```

### Component pattern

```tsx
"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";          // animations
import { useAlbumStore } from "@/lib/albumStore"; // Zustand
import type { Album } from "@/types/electron";    // types (import type)
import AlbumForm from "./AlbumForm";              // sibling components

interface Props { /* ... */ }
export default function MyComponent({ ... }: Props) { /* ... */ }
```

### Import order

1. React hooks
2. Third-party (`motion/react`)
3. Zustand stores (`@/lib/...`)
4. Types (`import type` from `@/types/electron`)
5. Sibling components (`./ComponentName`)

## Prisma

- **Prisma 7** — NO `url` in `datasource` block. Connection is via `@prisma/adapter-pg` (`PrismaPg`) passed to the `PrismaClient` constructor.
- UUIDs as primary keys (`@default(uuid())`)
- Models use PascalCase; columns use `@map("snake_case")`; tables use `@@map("plural_snake")`
- GPS coordinates are `Float?`
- Keywords are `String[]` with GIN indexes
- After schema changes: `npx prisma migrate dev --name description`
- **Models:** `User` (auth + roles), `Fotografo` (photographer profiles, optionally linked to `User`), `Album` (FK to `Fotografo`), `Photo`
- **Roles:** `ADMIN` (can manage users/fotografos), `USER` (all other operations)
- `Album.photographerId` FK → `Fotografo.id`; legacy `Album.photographer` text column is nullable (to be removed)
- `Fotografo.email` links to `User.email` for auto-attribution

## Electron security

- `nodeIntegration: false`, `contextIsolation: true`
- Never expose `ipcRenderer` directly — only specific methods via `contextBridge`
- Sanitize all filenames: strip `/`, `\`, `..`, null bytes
- Validate SFTP paths with `isPathSafe()` — reject traversal attempts
- Dev mode: `loadURL("http://localhost:3000")`; Prod: static export from `.next/`

## Styling

- **Tailwind CSS v4** — utility classes only, no CSS modules
- Dark mode via system preference (`dark:` variants)
- Animations via `motion` library (`AnimatePresence`, `motion.div`)
- No component-level CSS files

## When adding a new IPC feature

1. Add handler in `electron/handlers/albums.js` (or new handler file)
2. Add bridge method in `electron/preload.js`
3. Add TypeScript types in `types/electron.d.ts` (interface + `ElectronAPI` method)
4. Consume via Zustand store action or directly with `window.electronAPI.*`

## Authentication

- **Login flow:** `auth:login` → MSAL `acquireTokenInteractive` opens system browser → MS Entra ID login → validates user exists in `users` table → returns user + linked fotografo
- **Session persistence:** MSAL token cache persisted to disk → `auth:getSession` attempts `acquireTokenSilent` on app startup
- **Authorization:** User must exist in the `users` table to access the app. First user is added manually via SQL/Prisma Studio.
- **Role enforcement:** `user:*` IPC handlers check caller is ADMIN via `requireAdmin()` helper. Frontend hides admin UI for non-admin users.
- **Auto-attribution:** If logged-in user's email matches a `Fotografo.email`, new albums auto-default to that fotografo.

## Environment variables

Loaded via `dotenv` in `electron/main.js`. Required:

- `DATABASE_URL` — PostgreSQL connection string
- `AZURE_CLIENT_ID` — Microsoft Entra ID app registration client ID
- `AZURE_TENANT_ID` — Azure AD tenant ID
- `SFTP_HOST`, `SFTP_PORT`, `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_BASE_PATH`

## Build & run

- Dev: `npm run electron:dev` (concurrently starts Next.js + Electron)
- Build: `npm run build` then `npm run electron:build:win` (or `:mac` / `:linux`)
- Next.js uses `output: "export"` — no server at runtime
