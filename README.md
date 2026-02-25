# Editor de Metadatos

Aplicación de escritorio para gestionar álbumes fotográficos con metadatos EXIF, almacenamiento SFTP y edición en lote. Diseñada para el departamento de relaciones públicas.

## Stack

| Capa           | Tecnología                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Desktop        | Electron                                         |
| Base de datos  | PostgreSQL + Prisma 7                            |
| Almacenamiento | SFTP (ssh2-sftp-client)                          |
| Metadatos      | exiftool-vendored, Sharp                         |
| Estado         | Zustand                                          |
| Animaciones    | Motion (Framer Motion)                           |

## Estructura

```
app/            → Next.js pages & layout
components/     → React UI (AlbumManager, AlbumDetail, AlbumForm, AlbumPhotoEditor, etc.)
electron/       → Main process (main.js, preload.js)
  handlers/     → IPC handlers (albums.js)
  services/     → SFTP storage, image compression
lib/            → Zustand stores (albumStore, store)
prisma/         → Schema & migrations
types/          → TypeScript definitions (electron.d.ts)
```

## Setup

```bash
npm install
cp .env.example .env        # Configurar DATABASE_URL, SFTP_HOST, etc.
npx prisma migrate dev       # Crear tablas
npm run electron:dev         # Iniciar app
```

## Comandos

| Comando                        | Descripción                     |
| ------------------------------ | ------------------------------- |
| `npm run electron:dev`         | Desarrollo (Next.js + Electron) |
| `npm run dev`                  | Solo UI web (sin Electron)      |
| `npm run build`                | Build Next.js                   |
| `npm run electron:build:win`   | Build Windows installer         |
| `npm run electron:build:mac`   | Build macOS installer           |
| `npm run electron:build:linux` | Build Linux installer           |
| `npm run lint`                 | Linting                         |

## Funcionalidades

- **Gestión de álbumes**: Crear, editar, eliminar álbumes con metadatos heredables
- **Subida de fotos**: Compresión automática (Sharp), thumbnails, upload SFTP con barra de progreso
- **Edición de metadatos**: Individual o en lote — título, descripción, keywords, copyright, artista, ubicación, GPS
- **Descarga**: Foto individual directa o ZIP para selección múltiple
- **Renombrado en lote**: Patrones con `{n}`, `{date}`, `{original}`
- **Búsqueda de ubicación**: Integración con API de geocodificación
- **Transiciones animadas**: Slideshow de thumbnails en tarjetas, fade entre vistas

## Flujo de trabajo

1. **Crear álbum** → nombre, fotógrafo, fecha, ubicación, keywords
2. **Subir fotos** → se comprimen y suben al servidor SFTP; metadatos del álbum se heredan automáticamente
3. **Editar** → seleccionar fotos, modificar metadatos en panel lateral
4. **Descargar** → 1 foto = descarga directa, múltiples = ZIP

## Variables de entorno

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/editor_metadatos
SFTP_HOST=tu-servidor.com
SFTP_PORT=22
SFTP_USER=usuario
SFTP_PASSWORD=contraseña
SFTP_BASE_PATH=/fotos
```

## Troubleshooting

- **"ElectronAPI not available"** → Ejecutar con `npm run electron:dev`, no `npm run dev`
- **Puerto 3000 ocupado** → `netstat -ano | findstr :3000` (Windows)
- **Prisma error** → `npx prisma generate && npx prisma migrate dev`
- **ExifTool** → Se instala automáticamente con exiftool-vendored

## Seguridad

- Snyk code scan se ejecuta para código nuevo en lenguajes soportados
- Los issues encontrados se corrigen y re-escanean hasta resolverlos
- Path traversal bloqueado en todas las rutas SFTP
- Preload bridge expone solo métodos específicos (no ipcRenderer directo)
