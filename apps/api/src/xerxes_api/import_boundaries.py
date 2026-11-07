"""Import the reviewed GSS 261-district archive, with immutable source provenance."""

import argparse
import hashlib
import io
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5
from zipfile import ZipFile

import shapefile
from sqlalchemy import text

from xerxes_api.db import get_engine

DOWNLOAD_URL = "https://statsbank.statsghana.gov.gh/assets/geofiles.zip"
SOURCE_URL = "https://statsbank.statsghana.gov.gh/censusatlas/"
ARCHIVE_SHA256 = "a37f1f556283f825194b5a4251f17526e98a2797b273d604e0022a35f67518bb"
DATASET_VERSION = "gss-phc2021-district261-2023-10-05"
LICENSE_NOTE = (
    "Public download supplied by Ghana Statistical Service. "
    "No explicit reuse licence was found in the archive. "
    "Retain attribution and confirm redistribution terms with GSS before public deployment."
)


def read_gss_archive(path: Path):
    if hashlib.sha256(path.read_bytes()).hexdigest() != ARCHIVE_SHA256:
        raise ValueError("GSS archive checksum differs from the reviewed release")
    with (
        ZipFile(path) as outer,
        ZipFile(io.BytesIO(outer.read("Geo FIles/Districts_261.zip"))) as archive,
    ):
        projection = archive.read("District_261.prj").decode("utf-8")
        expected = (
            'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",'
            'SPHEROID["WGS_1984",6378137.0,298.257223563]],'
            'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
        )
        if projection.strip() != expected:
            raise ValueError("Unreviewed GSS coordinate reference system")
        with shapefile.Reader(
            shp=io.BytesIO(archive.read("District_261.shp")),
            shx=io.BytesIO(archive.read("District_261.shx")),
            dbf=io.BytesIO(archive.read("District_261.dbf")),
            encoding="utf-8",
        ) as reader:
            if len(reader) != 261:
                raise ValueError("Expected exactly 261 GSS districts")
            features = []
            for item in reader.iterShapeRecords():
                fields = item.record.as_dict()
                name, region = fields["District"].strip(), fields["Region"].strip()
                if not name or not region:
                    raise ValueError("Unnamed GSS district or region")
                features.append(
                    {
                        "code": f"{region}/{name}",
                        "name": name,
                        "region": region,
                        "geometry": item.shape.__geo_interface__,
                    }
                )
    if len({feature["code"] for feature in features}) != 261:
        raise ValueError("Duplicate GSS district identity")
    return features


def store_boundaries(connection, features):
    """Atomic and idempotent: existing releases are immutable, never overwritten."""
    dataset_id = uuid5(NAMESPACE_URL, "xersxes:boundaries:" + DATASET_VERSION)
    existing = connection.execute(
        text("SELECT archive_sha256 FROM boundary_datasets WHERE id=:id"), {"id": dataset_id}
    ).scalar()
    if existing:
        if existing != ARCHIVE_SHA256:
            raise ValueError("Stored boundary release has a different archive checksum")
        count = connection.execute(
            text("SELECT count(*) FROM administrative_boundaries WHERE dataset_id=:id"),
            {"id": dataset_id},
        ).scalar()
        if count != len(features):
            raise ValueError("Stored boundary release is incomplete; investigate before re-import")
        return {"imported": 0, "existing": count, "repaired": 0}
    connection.execute(
        text("""
            INSERT INTO boundary_datasets
              (id,version,source_name,source_url,download_url,source_date,census_year,
               archive_sha256,license_note)
            VALUES (:id,:version,'Ghana Statistical Service',:source_url,:download_url,
                '2023-10-05',2021,:sha,:license_note)
        """),
        {
            "id": dataset_id,
            "version": DATASET_VERSION,
            "source_url": SOURCE_URL,
            "download_url": DOWNLOAD_URL,
            "sha": ARCHIVE_SHA256,
            "license_note": LICENSE_NOTE,
        },
    )
    repaired = 0
    for feature in features:
        row = connection.execute(
            text("""
                WITH raw AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326) AS g),
                checked AS (SELECT g,NOT ST_IsValid(g) AS repaired FROM raw),
                fixed AS (SELECT g,repaired,
                    ST_Multi(ST_CollectionExtract(
                        CASE WHEN repaired THEN ST_MakeValid(g) ELSE g END,3)) AS shape
                    FROM checked)
                INSERT INTO administrative_boundaries
                    (id,dataset_id,source_code,name,region,level,geometry,geometry_repaired)
                SELECT :id,:dataset_id,:code,:name,:region,'district',shape,repaired FROM fixed
                WHERE NOT ST_IsEmpty(shape)
                    AND abs(ST_Area(shape)-abs(ST_Area(g))) <= greatest(abs(ST_Area(g)),1e-12)*0.001
                RETURNING geometry_repaired
            """),
            {
                "id": uuid5(dataset_id, feature["code"]),
                "dataset_id": dataset_id,
                "code": feature["code"],
                "name": feature["name"],
                "region": feature["region"],
                "geometry": json.dumps(feature["geometry"]),
            },
        ).first()
        if row is None:
            raise ValueError(f"Unsafe or empty geometry repair for {feature['code']}")
        repaired += row[0]
    return {"imported": len(features), "existing": 0, "repaired": repaired}


def import_gss_archive(path: Path):
    features = read_gss_archive(path)
    with get_engine().begin() as connection:
        return store_boundaries(connection, features)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(import_gss_archive(args.archive)))
