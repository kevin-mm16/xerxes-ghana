# Galamsey Watch within xersxes

Galamsey Watch is the initial civic monitoring interface in `apps/web`. It uses the repository's Next.js application, rather than a separate Vite project.

## Routes

| URL | Purpose |
| --- | --- |
| `/` | Landing page and monitoring overview |
| `/map` | Approximate Ghana hotspot map and filters |
| `/report` | Report submission demonstration |
| `/reports/rpt-002` | Example public report detail |
| `/evidence` | Filterable evidence previews |
| `/about` | Purpose, limitations, and safety guidance |
| `/moderator/login` | Simulated moderator access |
| `/moderator/dashboard` | Sample review queue and dashboard |

Unknown URLs and unknown report identifiers return Next.js 404 responses.

## Code ownership

- `apps/web/app/(public)` contains public route files and the shared public layout.
- `apps/web/app/moderator` contains moderator routes and the dashboard layout.
- `apps/web/src/views` provides page content without duplicating route layouts.
- `apps/web/src/components` contains reusable form, report, map, dashboard, and layout components.
- `apps/web/src/components/map/BrowserMaps.tsx` loads only Leaflet map components without server rendering. Page headings, descriptions, navigation, and forms still render on the server.
- `apps/web/src/data` holds versioned synthetic fixtures; real datasets and evidence do not belong here.
- `apps/web/src/types`, `utils`, and `styles` hold shared types, formatting helpers, and global styling.

Next.js owns navigation through `next/link` and `next/navigation`. There is no standalone SPA router or Vite entry point. The API remains in `apps/api`, with workers and research in their existing directories.

## Local commands

From the repository root:

```bash
cd apps/web
npm ci
npm run dev
```

Typecheck and production build from the same directory:

```bash
npm run typecheck
npm run build
npm run start
```

Docker Compose builds the same `apps/web` application using its committed lockfile. Its Docker context excludes local dependencies, build output, and environment files.

## Demonstration behavior

Reports, hotspots, statistics, media previews, review events, satellite comparisons, and confidence scores use sample data. Uploads, submission results, login, status changes, and escalation remain local demonstrations. Draft handling is also a preview; it does not persist the form across navigation or reloads. Date filters currently use a fixed sample-data period.

The browser location button requests geolocation only on click. Map rendering uses external OpenStreetMap tiles; tile requests identify the geographic area being viewed. No real report or media upload is sent to the API.

Moderator routes have no authentication. Their sample exact coordinates are shipped with the demo and are not protected private records. The approximate public presentation is an interface convention, not an access-control boundary.

## Remaining integration

FastAPI currently provides liveness and API discovery only. Report persistence, database migrations, authentication and authorization, private evidence storage, media sanitization, audit logs, satellite processing, notifications, and machine learning remain future work. The API and PostGIS are not wired into this frontend.
