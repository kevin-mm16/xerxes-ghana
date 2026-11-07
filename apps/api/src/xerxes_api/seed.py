"""Explicit, idempotent development seed. Never run against a production database."""

import argparse
import json
import os
from importlib.resources import files
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import text

from xerxes_api.db import get_engine


def seed_demo():
    if os.environ.get("APP_ENV") != "development":
        raise RuntimeError("Demo seeding requires APP_ENV=development")
    data = json.loads(files("xerxes_api").joinpath("data/coverage.demo.geojson").read_text())
    with get_engine().begin() as connection:
        for feature in data["features"]:
            props = feature["properties"]
            connection.execute(
                text("""
                INSERT INTO coverage_regions
                    (id,code,name,description,geometry,version,is_demo,valid_from)
                VALUES (:id,:code,:name,:description,
                    ST_SetSRID(ST_GeomFromGeoJSON(:geometry),4326),:version,true,'2020-01-01T00:00:00Z')
                ON CONFLICT (code) DO NOTHING
            """),
                {
                    **props,
                    "id": uuid5(NAMESPACE_URL, "xersxes:coverage:" + props["code"]),
                    "geometry": json.dumps(feature["geometry"]),
                },
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true", required=True)
    parser.parse_args()
    seed_demo()
    print("Development coverage seed complete (3 demo regions; existing codes retained).")
