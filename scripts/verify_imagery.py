"""Verify public WMS capabilities AND Ghana PNG imagery; refresh the checked-in catalog."""

import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path

ENDPOINT = "https://ows.digitalearth.africa/wms"
NS = {"w": "http://www.opengis.net/wms"}
PRODUCTS = {
    "satellite": ("gm_s2_semiannual", "simple_rgb"),
    "vegetation": ("ndvi_anomaly", "style_ndvi_mean"),
}


def open_verified(url):
    last_error = None
    for _ in range(3):
        try:
            return urllib.request.urlopen(url, timeout=45)
        except OSError as error:
            last_error = error
    raise last_error


def ghana_bbox():
    # A renderer-sized z7 tile over central Ghana, in Leaflet's EPSG:3857.
    # WMS 1.3 EPSG:4326 reverses axis order; using 3857 avoids that ambiguity.
    return "-313086.067856,626172.135712,0,939258.203568"


def verify():
    with open_verified(
        ENDPOINT + "?version=1.3.0&service=WMS&request=GetCapabilities"
    ) as response:
        root = ET.fromstring(response.read())
    catalog = {
        "endpoint": ENDPOINT,
        "verifiedAt": datetime.now(UTC).isoformat(),
        "products": {},
    }
    layers = {
        layer.findtext("w:Name", namespaces=NS): layer
        for layer in root.findall(".//w:Layer", NS)
    }
    for key, (name, style) in PRODUCTS.items():
        if name not in layers:
            raise RuntimeError(f"WMS layer missing: {name}")
        layer = layers[name]
        styles = [item.text for item in layer.findall("w:Style/w:Name", NS)]
        if style not in styles:
            raise RuntimeError(f"WMS style missing: {name}/{style}")
        dimension = next(
            item
            for item in layer.findall("w:Dimension", NS)
            if item.attrib["name"] == "time"
        )
        dates = sorted(dimension.text.split(","))
        date = dimension.attrib["default"]
        params = {
            "service": "WMS",
            "request": "GetMap",
            "version": "1.3.0",
            "layers": name,
            "styles": style,
            "time": date,
            "crs": "EPSG:3857",
            "bbox": ghana_bbox(),
            "width": 256,
            "height": 256,
            "format": "image/png",
        }
        with open_verified(ENDPOINT + "?" + urllib.parse.urlencode(params)) as response:
            body = response.read()
            if (
                response.headers.get_content_type() != "image/png"
                or not body.startswith(b"\x89PNG")
            ):
                raise RuntimeError(f"Imagery response was not PNG: {name}")
        catalog["products"][key] = {
            "layer": name,
            "style": style,
            "dates": dates,
            "defaultDate": date,
        }
        print(
            f"Verified {name}/{style}: {len(dates)} dates, {date}, PNG {len(body)} bytes"
        )
    target = (
        Path(__file__).resolve().parents[1] / "apps/web/src/config/imagery-catalog.json"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    verify()
