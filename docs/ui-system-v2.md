# XERSXES UI system v2

Implementation and local review: 12 November 2026. Work is on `feature/ui-system-v2`, created from accepted `main` commit `21e34722723810f85e065481da5cfd58ded91d8d`. This release does not merge the branch into `main`.

## Baseline and design audit

The original application passed 114 backend and 34 frontend tests, TypeScript and a production build. Fourteen baseline screenshots cover seven routes at 1440 and 390 pixels. The operations page overflowed the document at both widths.

The old interface declared fonts without loading them, used a gradient-circle placeholder, displayed a large development banner, and repeated rounded white cards and strong green/red actions. Districts competed with imagery at national scale. Contribution was one long form. The operations queue required a wide table, repeated row actions, exposed dead links and presented credential inputs despite having no authentication.

## Design system and shell

Inter is self-hosted for interface text; Newsreader is self-hosted for the homepage's editorial heading. Both use `next/font/local`, with original OFL licences and source URLs in `apps/web/app/fonts`. Font loading requires no Google request at runtime or build time.

Warm paper `#f5f3ed`, graphite `#172021`, muted green `#346c55` and champagne `#a99977` form the base palette. Amber communicates uncertainty and red marks danger or errors. Four-pixel spacing increments, restrained 4px controls/7px panels, quiet borders and limited floating elevation replace the repeated large rounded cards. CSS component layers allow responsive utilities to override primitives; variant class maps keep Tailwind's production extraction deterministic.

Shared primitives live in `src/components/ui`: buttons, links, icon buttons, a single stroke icon system, fields/inputs/selects/textareas, help and errors, badges, panels, labels, dividers, metrics, toolbars, alerts, empty states, skeletons, progress, popovers, sheets, disclosure tooltips, segmented views and an accessible upload zone. Application-specific map panels retain their own keyboard/focus handling.

The public shell uses a typographic XERSXES wordmark, compact navigation, discreet DEMO indicator, skip link, responsive disclosure navigation and a small safety footer. The homepage leads directly into the real satellite map with two useful actions. No marketing cards, fabricated analytics or simulated AI results were added.

## Ghana map

The initial view fits Ghana. One inert inverse polygon dims surrounding geography; no blur or duplicate satellite stack is used. Its full, pinned geoBoundaries/Stanford ADM0 outline represents 2007 and is Public Domain according to source metadata. It is a display aid, not current legal geography, coverage eligibility or an analytical boundary.

Districts are hidden below zoom 9, faint at 9–10, thin at 11+, and expose hover labels from zoom 13. Monitoring geometry has very low fill. The mask reduces from 60% to 40% to 18% opacity as detail increases. Provider place labels remain an optional, independent reference layer and start off for a photographic view. The Esri labels contain fused administrative lines that cannot be styled separately.

Layers and filters use compact controls and mobile bottom panels. Search selects loaded public districts/records; coordinate and Ghana navigation remain available. The drawer contains public metadata and generalized geography, with a right-side desktop layout and bottom mobile layout. Empty AI/analysis layers remain unavailable.

Map instances and camera state survive overlays, filters, labels and drawer changes, including Google failure into Leaflet. Raster status updates are isolated from memoized feature geometry. In the same local zoom profile, SVG path writes fell from 5,481 to 786, approximately 86%; unchanged writes fell from 5,451 to 745. Leaflet still reprojects paths during zoom. This is a local measurement, not a device-independent benchmark.

Partial tile failures retain successful imagery and receive at most two staggered retries per image. Unresolved gaps display a warning and explicit imagery retry. Complete provider failure advances to Sentinel-2, then a truthful unavailable state. A forced-failure browser check recovered four tiles on their second request with zero vector path writes; the final national view loaded 54/54 visible tiles.

See [display focus, source provenance and accuracy limits](map-focus.md) and [imagery sources](map-sources.md). The earlier audit flagged 69 stored districts for shared-edge/overlap issues; independent display simplification can add edge differences. This visual release does not certify or repair that geography.

## Contribution and private evidence

The flow is Location → Evidence → Details → Review. Step validation moves focus to meaningful feedback; Back/Edit preserves location, text and selected file. GPS is requested only by an explicit action. Inside, outside, uncertain, denied and manual paths retain existing server-side coverage semantics.

The upload zone supports a native file chooser, drag/drop, one-file validation, selected filename/size, removal and progress. Review exposes what will be sent and requires consent before any request uploads a file. Upload capabilities remain in memory; retries reuse the submission identifier and uploaded-file permission. The receipt reports private processing state and does not imply publication or automatic content redaction.

Live browser verification submitted one clearly synthetic MP4 privately. Exactly one intent, one content PUT and one observation were issued. The worker reached `review_ready`. Contribution made no external-origin requests. No media was published.

After verification, that exact synthetic observation, its media row/job and its three private objects were removed. Earlier local records were left intact.

## Public evidence and operations

The feed is a dated list of reviewed summaries with genuine source fields, empty/loading/error/retry states and record links. Public record pages preserve server fetching and 404 behavior, show generalized geometry on the existing satellite layer, and state when no public image/video exists. No private upload preview or invented media contract is used. Methodology explains imagery dates, geographic provenance, privacy and prototype limits.

The operations demo uses a compact queue and selected review workspace, counts derived from its synthetic records, resettable checklists and session-only decisions/activity. Mobile switches between queue and review with explicit Back behavior. The entry screen does not collect credentials. It remains visibly disconnected from authentication and private intake; this release does not make it an operational moderation service.

## Changed areas

| Area              | Files                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation        | `app/layout.tsx`, `app/icon.svg`, `app/fonts/*`, `src/styles/globals.css`, `tailwind.config.js`, `next.config.mjs`, `src/components/ui/*` |
| Public shell/home | `src/components/layout/{PublicNavbar,PublicLayout,Footer}.tsx`, `src/views/HomePage.tsx`                                                  |
| Maps              | `src/components/map/*`, `src/utils/map-{view,geometry}.ts`, `src/config/ghana-focus.json`, map tests and source docs                      |
| Contribution      | `src/components/forms/*`, `src/views/ReportPage.tsx`, contribution/media-intake tests                                                     |
| Public records    | `src/components/evidence/*`, evidence/detail/methodology/not-found views, `tests/public-evidence.test.tsx`                                |
| Operations        | `src/components/admin/*`, moderator layouts, `tests/operations.test.tsx`                                                                  |

Backend source, migrations, upload proxy, service adapters, API types and storage/publication contracts are unchanged.

## Validation and screen evidence

Commands run from `apps/web` with Windows `npm.cmd` (equivalent to the requested `npm` commands):

| Command                 | Result                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm.cmd ci`            | Passed; 213 packages installed. Existing lockfile unchanged.                               |
| `npm.cmd run test`      | 63 tests passed across 14 files, including upload privacy/retry/proxy tests.               |
| `npm.cmd run typecheck` | Passed route generation and TypeScript.                                                    |
| `npm.cmd run build`     | Passed optimized compilation, type checks, generation of 11 static pages and build traces. |
| `npm.cmd audit --json`  | Exit 1: five package findings (two moderate, one high, two critical).                      |

From the repository root, `apps/api/.venv/Scripts/python.exe scripts/run_api.py test` passed **114 tests**, with one existing Starlette/httpx deprecation warning. No backend contracts were changed.

The dependency audit is separate from the passing UI checks. It reports existing Vitest/mocker/tinypool development-tool findings and a Next/PostCSS dependency finding. The Vitest UI server is not used here. Audit severity does not establish exploitability in this application, and this release did not perform a security scan or apply a framework major upgrade. Package versions and the lockfile are unchanged; the dependency findings remain unresolved.

Browser review uses Edge through Playwright at desktop 1440×1000, tablet 768×1024 and mobile 390×844. Reviewed routes: `/`, `/map`, `/report`, `/evidence`, a valid `/reports/{id}`, `/about`, `/moderator/login` and `/moderator/dashboard`. All 24 production route/viewport checks returned 200 without page errors or document overflow. Every visible satellite tile loaded in the final captures. An invalid record returned 404. The valid record was an explicitly synthetic metadata-only local fixture with a whole monitoring-region public geometry; its private text sentinels and capture fields were absent from public HTML and JSON. That exact temporary published fixture was removed after screenshots; the current evidence feed correctly returns to its actual empty state.

Additional checks cover real GPS inside/outside, denied/manual location, keyboard focus, menu/panel Escape, file drop/removal, invalid files, consent, upload progress, worker processing, feed failure → retry → empty, map loading/failure, and imagery fallback. Google rendering without a key uses satellite fallback; Google integration behavior is covered with mocks and has not been certified with a live key.

Local artifacts are intentionally ignored:

- `.local/ui-v2-baseline/`: before screenshots and route results.
- `.local/ui-v2-final/`: final full-route screenshots and results.
- `.local/ui-v2-map/`: national/detail views, panels, camera/zoom profile and failure checks.
- `.local/ui-v2-contribute/`: guided flow, upload/progress/private receipt and live request counts.
- `.local/ui-v2-public/`: public records, privacy checks and failure/empty/404 states.
- `.local/ui-v2-operations/`: desktop/mobile queue, review and decisions.

## Critical limits and next milestone

The visual hierarchy is calmer and the application is more coherent, but its operational credibility still depends on work outside this release. Satellite tiles are external services and are not a live change-detection feed. The district response remains about 3.35MB and can take several seconds locally; hiding lines at national scale does not reduce that API payload. Geographic vintage/topology and GSS redistribution terms remain unresolved. Very small map attribution and metadata need further low-vision/device testing; this is not an accessibility certification. Public records currently lack published media. The operations console cannot review real intake. Files may retain identifying visual/audio content after metadata stripping. Production object storage and source-protection controls remain unfinished.

**Next milestone: authenticated private-media moderation.** Connect the existing private intake to a real reviewer identity/authorization boundary, audited decisions and explicit sanitization/redaction before any public publication. This turns the working intake pipeline into a controlled operational workflow.
