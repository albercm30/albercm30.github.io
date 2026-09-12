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

    # Fallback for responses that don't include geojson
    location = observation.get("location")

    if (
        isinstance(location, str)
        and "," in location
    ):
        try:
            latitude, longitude = [
                float(value.strip())
                for value
                in location.split(",")[:2]
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


def extract_country(
    observation: dict[str, Any]
) -> str | None:

    # This is the important fix.
    # iNaturalist provides the country containing
    # the observation coordinates directly.

    country = (
        observation.get(
            "place_country_name"
        )
    )

    if (
        isinstance(country, str)
        and country.strip()
    ):
        return country.strip()


    # Fallback using the place object if available.

    place = (
        observation.get("place")
        or {}
    )

    country = (
        place.get("display_name")
    )

    if (
        isinstance(country, str)
        and country.strip()
    ):
        return country.strip()


    return None


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


    # Prefer the highest quality URL.

    for key in (
        "original_url",
        "large_url",
        "medium_url",
        "url",
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


def get_species_name(
    observation: dict[str, Any]
) -> str:

    taxon = (
        observation.get("taxon")
        or {}
    )

    return (
        taxon.get("name")
        or observation.get(
            "species_guess"
        )
        or "Unidentified organism"
    )


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


    species = get_species_name(
        observation
    )


    common_name = (
        taxon.get(
            "preferred_common_name"
        )
    )


    observation_id = (
        observation.get("id")
    )


    place_guess = (
        observation.get(
            "place_guess"
        )
    )


    country = extract_country(
        observation
    )


    return {

        "id":
            observation_id,

        "species":
            species,

        "common_name":
            common_name,

        "place_guess":
            place_guess,

        "country":
            country,

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
            "any",

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

    session = requests.Session()


    session.headers.update({

        "User-Agent":
            "ACM-Field-Notes/1.0 "
            "(personal portfolio; "
            "iNaturalist username albercm30)"

    })


    mapped_observations = []

    all_species = set()

    country_counts = {}

    total_observations_seen = 0


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


        results = (
            payload.get("results")
            or []
        )


        if not results:
            break


        print(
            f"  Received {len(results)} observations."
        )


        for raw in results:

            total_observations_seen += 1


            # Count species across ALL observations,
            # including observations without coordinates.

            species = get_species_name(
                raw
            )

            all_species.add(
                species
            )


            # Count countries across ALL observations.

            country = extract_country(
                raw
            )


            if country:

                country_counts[country] = (
                    country_counts.get(
                        country,
                        0
                    )
                    + 1
                )


            # Only observations with public coordinates
            # are put on the map.

            normalized = (
                normalize_observation(
                    raw
                )
            )


            if normalized is not None:

                mapped_observations.append(
                    normalized
                )


        # IMPORTANT:
        #
        # The API response can contain up to 200 results.
        # We continue until a page returns fewer than
        # PER_PAGE results.
        #
        # This guarantees that page 2 is fetched when
        # you have 255 observations.

        if len(results) < PER_PAGE:

            break


        page += 1


        time.sleep(
            REQUEST_DELAY_SECONDS
        )


    # Remove possible duplicate observations.

    unique_by_id = {}


    for observation in mapped_observations:

        observation_id = (
            observation.get("id")
        )


        if observation_id is not None:

            unique_by_id[
                observation_id
            ] = observation


    mapped_observations = sorted(

        unique_by_id.values(),

        key=lambda item:
            item.get(
                "observed_on"
            )
            or "",

        reverse=True

    )


    # Sort countries by number of observations.

    sorted_country_counts = dict(
        sorted(
            country_counts.items(),
            key=lambda item:
                item[1],
            reverse=True
        )
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

        "total_observations":
            total_observations_seen,

        "total_species":
            len(all_species),

        "total_countries":
            len(
                sorted_country_counts
            ),

        "mapped_observations":
            len(
                mapped_observations
            ),

        "country_counts":
            sorted_country_counts,

        "observations":
            mapped_observations,

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


    print()

    print(
        "================================"
    )

    print(
        "Dataset built successfully."
    )

    print(
        "================================"
    )

    print(
        "Total observations:",
        total_observations_seen
    )

    print(
        "Total species:",
        len(all_species)
    )

    print(
        "Total countries:",
        len(sorted_country_counts)
    )

    print(
        "Mapped observations:",
        len(mapped_observations)
    )

    print()

    print(
        "Countries:"
    )


    for country, count in (
        sorted_country_counts.items()
    ):

        print(
            f"  {country}: {count}"
        )


    print()

    print(
        "Output:",
        OUTPUT_FILE
    )


    return 0


if __name__ == "__main__":

    sys.exit(
        main()
    )
