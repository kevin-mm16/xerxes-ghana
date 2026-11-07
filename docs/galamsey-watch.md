# Galamsey Watch in XERSXES

The interface lives in `apps/web`. Public routes remain `/`, `/map`, `/report`, `/evidence`, `/about`, and `/reports/{observation-uuid}`. Public record routes now resolve real approved observations rather than fixture report identifiers. `/moderator/login` and `/moderator/dashboard` remain disconnected demonstrations.

The map is satellite-only by default. Real monitoring coverage and reviewed public observations come from the API. Contribution now performs a server coverage check and persists private metadata/location. Media files, fake upload previews, and fake draft persistence are not part of this flow.

Read [the implementation guide](geospatial-foundation.md) for behavior and limitations, and the root README for native startup and checks. Frontend components remain under `src/components`, page content under `src/views`, and the application routes/layouts under `app`. The only remaining report fixtures serve the explicitly labelled moderator demo.
