# Ghana display focus and map stability

The workspace opens at a national Ghana fit. Navigation is limited to Ghana and nearby edge context (`4.1–11.5°N`, `3.6°W–1.6°E` for map-center bounds). These navigation limits do not define monitoring eligibility. Search queries only the loaded public feature names, region names, and public area identifiers. It is not a place geocoder.

## Country focus source

`apps/web/src/config/ghana-focus.json` is the **full**, unsimplified geoBoundaries gbOpen Ghana ADM0 FeatureCollection, pinned to upstream commit `9469f09`. It contains one Polygon with 1,898 vertices.

| Metadata | Value |
| --- | --- |
| Boundary ID | `GHA-ADM0-71095829` |
| Represented year | 2007 |
| Original source | Stanford Digital Repository |
| Source licence, as recorded by geoBoundaries | Public Domain |
| Upstream data update | 2023-01-19 |
| Upstream build | 2023-12-12 |
| Retrieved for this implementation | 2026-11-12 |
| Original file SHA-256 | `7a7c33572d10aa6652c24abb78a0d5df2fa420376680678d67788aa12b971358` |

Sources: [geoBoundaries metadata and licence](https://www.geoboundaries.org/api/current/gbOpen/GHA/ADM0/), [pinned source file](https://github.com/wmgeolab/geoBoundaries/blob/9469f09/releaseData/gbOpen/GHA/ADM0/geoBoundaries-GHA-ADM0.geojson), [original Stanford record](https://purl.stanford.edu/rh271yg5585).

This is display geography for visual attention, **not an authoritative or current legal boundary**, district source, town perimeter, geofence, or analytical mask. The older outline can differ from contemporary coastlines and the separately sourced GSS district edges. No GSS-derived country geometry is bundled; GSS redistribution terms remain unconfirmed.

A single inverse polygon darkens the surrounding context. The country ring is the hole; no CSS blur, duplicate raster stack, or per-district mask is used. It is inert and cannot capture map clicks. The dimming is 60% at national scale, 40% at zoom 9–10, and 18% at closer scales, reducing the influence of this coarse reference near the border. It uses the same outline and zoom tiers in Leaflet and Google. Satellite imagery remains visible and interactive.

## Overlay hierarchy

District-layer preference starts enabled, but geometry is not rendered below zoom 9. Zoom 9–10 uses a 0.65px champagne stroke at 28% opacity. Zoom 11+ uses a 0.85px stroke at 62% opacity, without fill. District hover labels become available at zoom 13; selection can display the name earlier. Selected outlines strengthen slightly. Monitoring areas use a separate muted green with 2.5% fill; observation points remain distinct. No empty AI or satellite-analysis layers are presented as results.

Town/road labels start off for the clean photographic view and can be enabled independently. Esri reference labels are fused raster tiles and can contain roads and administrative reference lines that cannot be individually restyled. Google Hybrid is also provider-owned reference content. Neither layer supplies verified town polygons.

## Camera and rendering

Map instances persist when filters, layers, labels, dates, and the drawer change. Only explicit Ghana, coordinate, or search-result navigation changes the camera. The provider wrapper retains the last center/zoom, including a final snapshot on Google failure, and supplies it to the Leaflet fallback. Imagery retry does not remount the map.

Raster loading/status state lives outside the vector feature component. Tile success emits one ready transition per batch. Transient holes in a usable batch receive at most two staggered tile retries, retaining successful images. Unresolved partial failures show a warning and explicit imagery retry; a wholly failed batch still switches to Sentinel fallback. Memoized feature components retain converted coordinates, and selection updates only affected features. Zoom handling updates React state only across the four display tiers. Leaflet `smoothFactor={0}` avoids an additional client simplification pass over already simplified API geometry; ordinary geographic reprojection during zoom still occurs.

Local Edge browser checks on 2026-11-12 covered desktop 1440px, tablet 768px, and mobile 390px with no page errors or horizontal overflow. A desktop zoom 11→12 produced 786 SVG path writes (745 unchanged), compared with 5,481 (5,451 unchanged) in the baseline sample: about 86% fewer writes. Four deliberately failed detailed tiles each recovered on the next attempt, with zero further SVG path writes during those retries. The final national capture contained 54/54 loaded visible tiles with no pending or failed tiles. These are local observations, not an imagery-provider availability guarantee.

Browser failure injection also verified Esri→Sentinel→unavailable→manual retry→Esri while retaining the map instance, camera, and all 261 district features. A public-data 503 followed by retry preserved the camera and restored enabled reference layers. Google camera handoff and geometry reuse are tested with mocks; live Google imagery still requires a restricted browser key.

## Accuracy limits and follow-up

The existing GSS district database stores all 261 source geometries and they individually validate. A previous local coverage audit flagged 69 districts for shared-edge/overlap issues. The API simplifies each district independently at 0.0003 degrees; this can add mismatches between adjacent display edges. Those are data/topology limitations, not corrected legal geography. This UI change preserves the database, source geometry, API contracts, coverage checks, and privacy rules. It does not claim to resolve gaps or overlaps through line styling.

The next geography milestone should validate a licensed current reference with GSS, audit shared edges as a coverage, and derive consistent display geometry after that validation. A national-outline comparison cannot establish district or town positional accuracy. Imagery acquisition dates vary; the photographic map is not a live feed.
