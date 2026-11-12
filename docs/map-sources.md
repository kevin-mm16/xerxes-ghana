# Map sources and reference geography

The photographic base uses Google Maps Satellite when a browser key is available, or Esri World Imagery otherwise. The **Town and road labels** control switches Google between `hybrid` and `satellite`, or toggles Esri World Boundaries and Places and World Transportation reference tiles. Labels start off for a quiet national view. Provider labels can include administrative reference lines; the champagne district outline overlay is the separately sourced GSS dataset. Provider label coverage varies by location and zoom. This control does not change monitoring data or request device location. Individual place names are labels; they do not imply a measured town perimeter.

Google loading, authentication, and initial tile timeouts fall back to the existing Esri/Sentinel renderer. This fallback uses its own provider attribution and restores the last center/zoom. Both renderers consume the same public GeoJSON domain contract and preserve the camera when toggling overlays, labels, or observation dates. Base imagery acquisition dates vary and are not an environmental time series.

## Google setup

Enable **Maps JavaScript API** in a Google Cloud project, with the appropriate billing or prototype arrangement. Create a browser key restricted to that API and the website referrers you actually use, including `http://localhost:3000/*` and `http://127.0.0.1:3000/*` for local development. Configure usage quotas/alerts in the project.

Add the following to ignored `apps/web/.env.local`, then restart the Next.js server:

```dotenv
GOOGLE_MAPS_BROWSER_KEY=your-restricted-browser-key
```

The previously documented `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` name is also supported. `GOOGLE_MAPS_BROWSER_KEY` takes precedence and is read at runtime. `/api/map-config` deliberately returns only this public browser key, with `Cache-Control: no-store`; never configure a privileged server key there. No Google key is checked into the repository. For Compose, set `GOOGLE_MAPS_BROWSER_KEY` in the root `.env`; Compose passes it to the web process. Empty keys keep the satellite fallback active.

Google imagery and place content remain presentation data. No Google content is extracted into PostGIS, reused for geofencing, or sent to environmental inference. Analytical imagery continues to use the separately documented Sentinel/Copernicus contracts. Ghana's Google DDS coverage includes administrative levels 1 and 2, but does not include locality polygons. This implementation draws its own GSS district GeoJSON; it does not use DDS or promise town polygons.

References: [official map types](https://developers.google.com/maps/documentation/javascript/maptypes), [API loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [key setup](https://developers.google.com/maps/documentation/javascript/get-api-key), [Ghana boundary coverage](https://developers.google.com/maps/documentation/javascript/dds-boundaries/coverage), [Maps Platform terms](https://cloud.google.com/maps-platform/terms).

## GSS district import

Source: [Ghana Statistical Service StatsBank](https://statsbank.statsghana.gov.gh/censusatlas/), **Download Geo-files (271 & 261 Districts)**, linked to [geofiles.zip](https://statsbank.statsghana.gov.gh/assets/geofiles.zip). The StatsBank landing page describes these as the shape files used for the 2021 PHC census. The selected archive is the 261-district version; the alternative download labelled 271 contains a file named `District_272`, and is deliberately not mixed into it.

Reviewed release:

| Field | Value |
| --- | --- |
| Internal version | `gss-phc2021-district261-2023-10-05` |
| Archive SHA-256 | `a37f1f556283f825194b5a4251f17526e98a2797b273d604e0022a35f67518bb` |
| Nested archive | `Geo FIles/Districts_261.zip` |
| CRS | WGS84 geographic, EPSG:4326 |
| Records | 261 districts, 16 region names |
| Geometry metadata | Processing dated 2023-10-05; download last-modified 2023-10-07 |
| Census context | 2021 PHC, rather than a claim of current legal boundaries |
| Reuse terms | No explicit licence found in the archive; preserve attribution and confirm redistribution terms with GSS before public deployment |

Run from the repository root after installing the API dependencies and configuring the database:

```powershell
New-Item -ItemType Directory -Force .local | Out-Null
curl.exe --location --retry 3 --output .local/gss-geofiles.zip https://statsbank.statsghana.gov.gh/assets/geofiles.zip
apps/api/.venv/Scripts/python.exe scripts/run_api.py migrate
apps/api/.venv/Scripts/python.exe scripts/run_api.py import-boundaries --archive .local/gss-geofiles.zip
```

The download is about 27 MB. To resume an interrupted download, use `curl.exe --location --continue-at - --output .local/gss-geofiles.zip` with the same URL. The importer verifies the pinned checksum, exact CRS, record count, names, and unique region/district identities. A different future release fails verification until its source and schema are reviewed. Large raw source files stay in ignored `.local`, outside Git.

Import is one transaction. Previously imported releases are immutable and repeated imports are idempotent. New reference tables do not change `coverage_regions`, observation eligibility, or public observation precision. PostGIS stores full source-resolution MultiPolygons and a GiST index. Two source features needed small topology repairs: **Ada East** and **Asante Akim South Municipal**. Repairs are recorded per feature, reject empty results, and reject planar area changes above 0.1%. All 261 stored geometries validate. This threshold checks repair consistency, not positional or legal accuracy.

The map requests `layers=boundaries` through the existing `/api/v1/map/features` contract. Bbox and feature limits still apply. Public display geometry uses topology-preserving simplification at 0.0003 degrees and six decimal places to reduce transfer size; analytical consumers should use full database geometry. Simplification is per feature and is not a guarantee that adjacent displayed edges remain identical. Every feature retains source URL, dataset version, source date, region, boundary level, and licence note. The newest imported dataset supplies the reference layer; older releases remain in storage. Selecting an outline opens its district name and provenance.

The district-layer preference starts enabled, while district geometry stays hidden below zoom 9 and becomes thin and subdued at closer scales. Town/road labels start off and can be enabled independently in Layers. The initial national fit uses a separate, Public Domain ADM0 display-focus mask; see [Ghana map focus](map-focus.md) for provenance and scale limitations. Reference districts must never be presented as town perimeters, mining concessions, observation locations, or evidence of illegal activity.

## Local verification

API integration tests cover dataset idempotence, source attribution, bbox filtering, minor repair tracking, excessive repair rejection, archive verification, and separation from monitoring eligibility. Frontend tests cover provider selection/failure and map state. Google live imagery requires a valid restricted key; without one, only the real Esri fallback can be verified live.
