from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


USERNAME = "albercm30"

API_URL = (
    "https://api.inaturalist.org/v1/observations"
)

ROOT = Path(__file__).resolve().parents[1]

OUTPUT_FILE = (
    ROOT / "data" / "wildlife.json"
)

PER_PAGE = 200

REQUEST_DELAY_SECONDS = 1.05

MAX_PAGES = 100


def extract_coordinates(
    observation: dict[str, Any]
) -> tuple[float | None, float | None]:

    geojson = (
        observation.get("geojson")
        or {}
    )

    coordinates = (
        geojson.get("coordinates")
    )

    if (
        isinstance(coordinates, list)
        and len(coordinates) >= 2
    ):
        try:
            longitude = float(
                coordinates[0]
            )

            latitude = float(
                coordinates[1]
            )

            return (
                latitude,
                longitude
            )

        except (
            TypeError,
            ValueError
        ):
            pass


    location = (
        observation.get("location")
    )

    if (
        isinstance(location, str)
        and "," in location
    ):
        try:
            latitude, longitude = [
                float(value)
                for value in location.split(",")[:2]
            ]

            return (
                latitude,
                longitude
            )

        except (
            TypeError,
            ValueError
        ):
            pass


    return None, None


def extract_photo_url(
    observation: dict[str, Any]
) -> str | None:

    photos = (
        observation.get("photos")
        or []
    )

    if not photos:
        return None


    first_photo = (
        photos[0]
        or {}
    )


    # Prefer the highest quality URL supplied by iNaturalist.
    for key in (
        "original_url",
        "large_url",
        "medium_url",
        "url"
    ):

        candidate = (
            first_photo.get(key)
        )

        if (
            isinstance(candidate, str)
            and candidate.strip()
        ):

            return candidate


    return None


def normalize_observation(
    observation: dict[str, Any]
) -> dict[str, Any] | None:

    latitude, longitude = (
        extract_coordinates(
            observation
        )
    )

    if (
        latitude is None
        or longitude is None
    ):
        return None


    taxon = (
        observation.get("taxon")
        or {}
    )


    species = (
        taxon.get("name")
        or observation.get(
            "species_guess"
        )
        or "Unidentified organism"
    )


    common_name = (
        taxon.get(
            "preferred_common_name"
        )
    )


    observation_id = (
        observation.get("id")
    )


    return {

        "id":
            observation_id,

        "species":
            species,

        "common_name":
            common_name,

        "place_guess":
            observation.get(
                "place_guess"
            ),

        "observed_on":
            observation.get(
                "observed_on"
            ),

        "latitude":
            latitude,

        "longitude":
            longitude,

        "photo_url":
            extract_photo_url(
                observation
            ),

        "inaturalist_url":
            (
                f"https://www.inaturalist.org/observations/{observation_id}"
                if observation_id
                else
                "https://www.inaturalist.org/"
            )

    }


def fetch_page(
    session: requests.Session,
    page: int
) -> dict[str, Any]:

    params = {

        "user_id":
            USERNAME,

        "page":
            page,

        "per_page":
            PER_PAGE,

        "order_by":
            "observed_on",

        "order":
            "desc",

        "verifiable":
            "any"

    }


    response = session.get(
        API_URL,
        params=params,
        timeout=30
    )


    if response.status_code == 429:

        raise RuntimeError(
            "iNaturalist returned HTTP 429."
        )


    response.raise_for_status()

    return response.json()


def main() -> int:

    session = (
        requests.Session()
    )


    session.headers.update({

        "User-Agent":
            "ACM-Field-Notes/1.0 "
            "(personal portfolio; "
            "iNaturalist username albercm30)"

    })


    observations = []

    page = 1


    print(
        f"Loading iNaturalist observations for @{USERNAME}..."
    )


    while page <= MAX_PAGES:

        print(
            f"Fetching page {page}..."
        )


        payload = fetch_page(
            session,
            page
        )


        raw_results = (
            payload.get("results")
            or []
        )


        if not raw_results:
            break


        for raw in raw_results:

            normalized = (
                normalize_observation(
                    raw
                )
            )


            if normalized is not None:

                observations.append(
                    normalized
                )


        total_pages = int(
            payload.get(
                "total_pages"
            )
            or page
        )


        if page >= total_pages:
            break


        page += 1


        time.sleep(
            REQUEST_DELAY_SECONDS
        )


    unique_by_id = {}


    for observation in observations:

        unique_by_id[
            observation["id"]
        ] = observation


    observations = sorted(

        unique_by_id.values(),

        key=lambda item:
            item.get(
                "observed_on"
            )
            or "",

        reverse=True

    )


    payload = {

        "source":
            "iNaturalist",

        "username":
            USERNAME,

        "generated_at":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "observation_count":
            len(observations),

        "species_count":
            len({
                item["species"]
                for item in observations
            }),

        "observations":
            observations

    }


    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )


    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8"
    ) as handle:

        json.dump(
            payload,
            handle,
            ensure_ascii=False,
            indent=2
        )


    print(
        "Dataset built successfully."
    )


    print(
        "Observations with coordinates:",
        len(observations)
    )


    print(
        "Species:",
        payload["species_count"]
    )


    return 0


if __name__ == "__main__":

    sys.exit(
        main()
    )
