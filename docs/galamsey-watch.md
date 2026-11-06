# Ghana Galamsey Watch

Security-first frontend for safe civic reporting, private verification, and public monitoring of suspected galamsey activity in Ghana.

## Current frontend scope

This is the frontend-first implementation of the project. It uses sample data until backend, storage, authentication, and satellite services are connected. It includes:

- Anonymous citizen reporting flow
- Simulated media/evidence submission states
- Approximate Ghana hotspot map visualization
- Safe public report details
- Sanitized evidence feed
- Separate moderator login and dashboard frontend
- Public/private separation for sensitive data

No real reports should be submitted until the backend, upload pipeline, storage, authentication, and security review are complete.

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Mock data in `src/data`
- Reusable components in `src/components`

## Run locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Available pages

- `/` - Landing page
- `/map` - Approximate hotspot map with filters
- `/report` - Mock citizen report form
- `/reports/rpt-002` - Example report details page
- `/evidence` - Sanitized evidence feed
- `/about` - About and safety page
- `/moderator/login` - Mock moderator login
- `/moderator/dashboard` - Mock moderator dashboard

## What currently uses sample data or local state

- Reports, hotspots, media items, dashboard stats, verification events, and review queues
- Upload state changes
- Report submission success
- Moderator login and dashboard actions
- Satellite comparison and NDVI/NDWI display
- Duplicate detection, assignment, and escalation workflows

## Not implemented yet

- Real authentication or user accounts
- Real file upload, storage, or media sanitization
- Real backend API
- Real database
- Real moderation permissions
- Real satellite processing
- Real machine learning
- Real notifications or authority handoff
- Public deployment

## Security-first design notes

- Public navigation excludes admin links.
- Moderator access is separated under `/moderator/login` and `/moderator/dashboard`.
- Public pages do not display `exactCoordinatesPrivate`.
- Public map pins use approximate locations only.
- Raw media is represented as private moderator-only data.
- Unverified reports use neutral labels such as pending review and under review.
- Report submission prominently warns users not to put themselves in danger.
- The UI avoids naming accused individuals or specific private actors.

Real deployment requires a full security review, threat model, secure hosting, secrets management, upload validation, audit logging, and incident response planning.

## Future backend plan

Planned backend stack:

- Python FastAPI
- PostgreSQL with PostGIS
- SQLAlchemy or SQLModel
- Alembic migrations
- Pydantic validation
- Role-based access control and audit logging

## Future media processing plan

- Store raw media privately in S3-compatible object storage
- Generate sanitized public copies only
- Use FFmpeg for video compression, thumbnails, and format conversion
- Use OpenCV for image processing, face and plate blurring, and future computer vision tasks
- Run processing in background workers with Redis plus RQ or Celery

## Future satellite processing plan

- Google Earth Engine integration
- Sentinel-2 and Landsat imagery
- NDVI, NDWI, bare-soil, and land-disturbance comparisons
- Human-in-the-loop verification before public display

## Future ML plan

- PyTorch and OpenCV for assisted detection
- Human review as the final decision layer
- No automated public accusation or confirmation without verification

## Next development steps

1. Add real routing with protected moderator sections when authentication exists.
2. Define the FastAPI contract for report submission and moderator review.
3. Build secure upload handling with private raw media and sanitized public derivatives.
4. Add PostGIS-backed approximate public location generation.
5. Add audit logs, RBAC, MFA or passkeys, and security monitoring.
6. Prototype Google Earth Engine change detection with human review.
