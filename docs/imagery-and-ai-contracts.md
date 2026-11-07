# Imagery and analysis boundaries

## Current display

The only active base view is unlabelled satellite imagery. Digital Earth Africa WMS `gm_s2_semiannual`, style `simple_rgb`, supplies a Sentinel-2 composite for an explicitly advertised date. The timeline selects an available composite no later than the selected year and the actual date is displayed. This is not a live satellite feed.

`scripts/verify_imagery.py` fetches live GetCapabilities, checks layer/style/time dimensions, and fetches real PNG GetMap responses over Ghana. Its output catalog is checked in at `apps/web/src/config/imagery-catalog.json`. Verification uses WMS 1.3/EPSG:3857 to match Leaflet and avoid EPSG:4326 axis-order reversal. `ndvi_anomaly`/`style_ndvi_mean` is also validated for a future vegetation view, but is not exposed in the current satellite-only interface.

If WMS tiles fail or stall, the renderer tries Esri World Imagery without town labels. Its acquisition dates are not linked to the timeline and that distinction is shown. If both providers fail, vector overlays and controls remain usable; it does not silently replace satellite imagery with street maps. These external services can still be slow or partially unavailable.

Sources: [DE Africa GeoMAD](https://docs.digitalearthafrica.org/en/latest/data_specs/GeoMAD_specs.html), [NDVI anomaly](https://docs.digitalearthafrica.org/en/latest/data_specs/NDVI_Anomaly_specs.html), [live capabilities](https://ows.digitalearth.africa/wms?service=WMS&request=GetCapabilities&version=1.3.0), [Esri service attribution](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=pjson). Preserve license/attribution requirements when replacing display providers.

## Reproducible pipeline, later

The display WMS is not the analytical source of truth. Future workers in `services/geospatial` should ingest catalogued imagery through STAC, retain COG/object-storage assets, and record sensor (Sentinel-2, Sentinel-1, Landsat), collection/item identifiers, acquisition time, bands, CRS, resolution, nodata, cloud/quality masks, license, processing parameters, source asset checksums, and processing version. Digital Earth Africa can be one provider rather than the whole data architecture.

Derived NDVI, NDWI, bare-soil, or change products must retain their input scene/time windows, algorithm version, masks, CRS, and provenance. Analyses must compare appropriate seasons and report uncertainty. Raster tiles and reviewed vector summaries may be published separately. Do not build a national data cube before validating one study area.

## AI result boundary

Workers should emit an internal inference record with geometry, category, model version, inference timestamp, calibrated confidence, source imagery identifiers, processing provenance, and review state. The publication layer validates/sanitizes it before translating into the stable GeoJSON map contract:

```text
Feature { id, geometry, properties: {
  featureType: ai_candidate | satellite_change,
  layer: ai | satellite,
  title, source, modelVersion, inferenceTimestamp,
  confidence, sourceImagery, reviewState
} }
```

The TypeScript map contract and public API schema reserve these fields. They do not fabricate outputs. Predictions remain candidates/signals for human review and do not imply illegal mining. Model architecture can change without changing the Leaflet renderer or public geometry contract. Reviewed activity geometry must be independent of contributor device positions.
