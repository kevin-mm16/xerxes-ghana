# Map-first frontend foundation

The public product is organized around the Ghana intelligence map rather than a content-heavy website.

## Real Earth-observation basemap

The default environmental view now uses Digital Earth Africa's public OGC Web Map Service instead of OpenStreetMap.

- **Satellite**: Sentinel-2 semiannual GeoMAD (`gm_s2_semiannual`) for cloud-reduced, real multispectral imagery.
- **Vegetation**: Digital Earth Africa NDVI Anomaly (`ndvi_anomaly`) for real vegetation-condition context.
- **Streets**: OpenStreetMap remains an optional reference view.

This is still a frontend integration, not the final XERSXES raster architecture. Production time-linked imagery should eventually be served through our own scene catalog / tile pipeline so the selected date and model outputs are reproducible.

## Core interface contract

The map consumes `IntelligenceFeature` objects. Features may originate from citizen observations, approved videos, XERSXES coverage polygons, satellite change products, or AI candidates. The frontend does not need to know how an AI model was trained; it only consumes a stable geospatial feature contract.

The temporary `src/services/map-data.ts` adapter hides mock fixtures from map components. It should later call a versioned API such as:

```
GET /api/v1/map/features?bbox=...&layers=coverage,observations,ai,satellite&from=...&to=...
```

The response should ultimately be GeoJSON or a compatible typed representation.

## Location model

Three concepts must remain separate:

1. **Capture location** — device position, accuracy estimate, timestamp and source.
2. **Observation location** — reviewed location of the environmental activity.
3. **Public location** — generalized point, grid or polygon safe for publication.

Public UI must never derive its location directly from private capture coordinates.

## Intelligence layers

- Coverage regions
- Public observations / approved videos
- AI candidates
- Satellite change products

AI candidates are review signals only and must not be presented as confirmed illegal-mining findings.

## Mapping engine

Leaflet remains the renderer for the MVP. The data contract and Earth-observation source boundary are intentionally separate so a later migration to MapLibre or our own tile service does not require changing backend intelligence models.
