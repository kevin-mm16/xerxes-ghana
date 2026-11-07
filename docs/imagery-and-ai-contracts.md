# Imagery and analysis boundaries

## Current display

The only active base view is unlabelled satellite/aerial imagery. Cached Esri World Imagery is the primary display source, so users can inspect terrain, fields, roads, and buildings at detailed zoom levels without waiting for a composite WMS render. Acquisition date and native detail vary by location; this is neither a live feed nor a historical time-series source.

The workspace opens closer over southern Ghana. A Ghana overview button fits the country display bounds; zoom/scale controls and a coordinate navigator support closer inspection without creating observations or requesting device location. Tile fading is disabled to prevent pale transitional tile squares during source changes. No decorative satellite texture or synthetic raster is rendered.

Digital Earth Africa WMS `gm_s2_semiannual`, style `simple_rgb`, is a lower-detail Sentinel-2 fallback. It uses an explicitly advertised date, displayed with its reduced-detail status. Recovery evaluates a complete tile batch: isolated errors do not discard already loaded detailed imagery. Stalled or wholly failed batches advance to the fallback; if both sources fail, users can retry while vector controls remain available.

`scripts/verify_imagery.py` fetches live GetCapabilities, checks layer/style/time dimensions, and fetches real Ghana PNG responses. Its catalog is checked in at `apps/web/src/config/imagery-catalog.json`. WMS verification uses 1.3/EPSG:3857 to avoid EPSG:4326 axis-order reversal. `ndvi_anomaly`/`style_ndvi_mean` remains validated preparation, not an active view.

The observation timeline is shown only when reviewed observations are enabled and actually have dates. It filters observation records, never remounts or changes the photographic basemap, and defaults to all observation years. Historical imagery controls require a future reproducible scene pipeline rather than implying that World Imagery matches a selected year.

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
