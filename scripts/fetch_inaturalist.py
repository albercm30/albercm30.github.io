from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


# ============================================================
# CONFIG
# ============================================================

USERNAME = "albercm30"

OBSERVATIONS_API = (
    "https://api.inaturalist.org/v1/observations"
)

# IMPORTANT:
# The Places endpoint is served by the classic iNaturalist
# API at www.inaturalist.org, not the current api.inaturalist.org
# v1 host.
PLACES_API = (
    "https://www.inaturalist.org/places.json"
)

ROOT = Path(__file__).resolve().parents[1]

OUTPUT_FILE = (
    ROOT / "data" / "wildlife.json"
)

PER_PAGE = 200

REQUEST_DELAY_SECONDS = 1.05

MAX_PAGES = 100


# ============================================================
# SPECIES
# ============================================================

def get_taxon_names(
    observation: dict[str, Any]
) -> tuple[str, str | None]:

    taxon = (
        observation.get("taxon")
        or {}
    )


    scientific_name = (
        taxon.get("name")
        or observation.get("species_guess")
        or "Unidentified organism"
    )


    common_name = (
        taxon.get(
            "preferred_common_name"
        )
    )


    if not isinstance(
        common_name,
        str
    ):
        common_name = None


    if (
        common_name is not None
        and not common_name.strip()
    ):
        common_name = None


    return (
        scientific_name,
        common_name
    )


# ============================================================
# COORDINATES
# ============================================================

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
        isinstance(
            coordinates,
            list
        )
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
        isinstance(
            location,
            str
        )
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


    return (
        None,
        None
    )


# ============================================================
# PHOTOS
# ============================================================

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
            isinstance(
                candidate,
                str
            )
            and candidate.strip()
        ):

            return candidate


    return None


# ============================================================
# OBSERVATION PLACE IDS
# ============================================================

def extract_place_ids(
    observation: dict[str, Any]
) -> set[int]:

    raw_ids = (
        observation.get(
            "place_ids"
        )
        or []
    )


    result = set()


    for raw_id in raw_ids:

        try:

            result.add(
                int(raw_id)
            )

        except (
            TypeError,
            ValueError
        ):

            continue


    return result


# ============================================================
# COUNTRY PLACES
# ============================================================

def fetch_country_places(
    session: requests.Session
) -> dict[int, str]:

    country_places = {}

    page = 1


    print()
    print(
        "Loading iNaturalist country places..."
    )


    while page <= 10:

        print(
            f"  Fetching country page {page}..."
        )


        params = {

            "page":
                page,

            "per_page":
                200,

            "place_type":
                "country",

        }


        response = session.get(
            PLACES_API,
            params=params,
            timeout=30,
        )


        response.raise_for_status()


        data = response.json()


        # The classic API returns the places as
        # a list. Some versions wrap them in results.

        if isinstance(
            data,
            list
        ):

            results = data

        elif isinstance(
            data,
            dict
        ):

            results = (
                data.get(
                    "results"
                )
                or []
            )

        else:

            results = []


        if not results:

            break


        print(
            f"    Received {len(results)} countries."
        )


        for place in results:

            place_id = place.get(
                "id"
            )


            if place_id is None:
                continue


            name = (
                place.get(
                    "name"
                )
                or place.get(
                    "display_name"
                )
            )


            if (
                isinstance(
                    name,
                    str
                )
                and name.strip()
            ):

                country_places[
                    int(place_id)
                ] = name.strip()


        if len(results) < 200:

            break


        page += 1


        time.sleep(
            REQUEST_DELAY_SECONDS
        )


    print(
        f"  Loaded {len(country_places)} country places."
    )


    return country_places


# ============================================================
# COUNTRY FOR OBSERVATION
# ============================================================

def get_country(
    observation: dict[str, Any],
    country_places: dict[int, str]
) -> str | None:

    # --------------------------------------------------------
    # PRIMARY METHOD:
    # match observation place_ids against iNaturalist's
    # actual country-level place IDs.
    # --------------------------------------------------------

    place_ids = (
        extract_place_ids(
            observation
        )
    )


    for place_id in place_ids:

        country = (
            country_places.get(
                place_id
            )
        )


        if country:

            return country


    # --------------------------------------------------------
    # SECONDARY METHOD:
    # iNaturalist directly gives the country.
    # --------------------------------------------------------

    country = (
        observation.get(
            "place_country_name"
        )
    )


    if (
        isinstance(
            country,
            str
        )
        and country.strip()
    ):

        return country.strip()


    return None


# ============================================================
# NORMALIZE
# ============================================================

def normalize_observation(
    observation: dict[str, Any],
    country_places: dict[int, str]
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


    scientific_name, common_name = (
        get_taxon_names(
            observation
        )
    )


    display_name = (
        common_name
        or scientific_name
    )


    observation_id = (
        observation.get(
            "id"
        )
    )


    return {

        "id":
            observation_id,

        "name":
            display_name,

        "common_name":
            common_name,

        "scientific_name":
            scientific_name,

        "place_guess":
            observation.get(
                "place_guess"
            ),

        "country":
            get_country(
                observation,
                country_places
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
            ),

    }


# ============================================================
# OBSERVATION PAGE
# ============================================================

def fetch_observation_page(
    session: requests.Session,
    page: int
) -> list[dict[str, Any]]:

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
        OBSERVATIONS_API,
        params=params,
        timeout=30,
    )


    if response.status_code == 429:

        raise RuntimeError(
            "iNaturalist returned HTTP 429."
        )


    response.raise_for_status()


    payload = response.json()


    return (
        payload.get(
            "results"
        )
        or []
    )


# ============================================================
# MAIN
# ============================================================

def main() -> int:

    session = requests.Session()


    session.headers.update({

        "User-Agent":
            "ACM-Field-Notes/1.0 "
            "(personal portfolio; "
            "iNaturalist username albercm30)"

    })


    # ========================================================
    # 1. LOAD COUNTRY PLACE IDs
    # ========================================================

    country_places = (
        fetch_country_places(
            session
        )
    )


    if not country_places:

        raise RuntimeError(
            "No iNaturalist country places were returned."
        )


    # ========================================================
    # 2. LOAD OBSERVATIONS
    # ========================================================

    all_species = set()

    country_counts = {}

    mapped_observations = []

    total_observations = 0


    page = 1


    print()

    print(
        f"Loading observations for @{USERNAME}..."
    )


    while page <= MAX_PAGES:

        print(
            f"  Fetching observation page {page}..."
        )


        results = (
            fetch_observation_page(
                session,
                page
            )
        )


        if not results:

            break


        print(
            f"    Received {len(results)} observations."
        )


        for raw in results:

            total_observations += 1


            # ------------------------------------------------
            # SPECIES
            # ------------------------------------------------

            scientific_name, _ = (
                get_taxon_names(
                    raw
                )
            )


            all_species.add(
                scientific_name
            )


            # ------------------------------------------------
            # COUNTRY
            # ------------------------------------------------

            country = (
                get_country(
                    raw,
                    country_places
                )
            )


            if country:

                country_counts[country] = (
                    country_counts.get(
                        country,
                        0
                    )
                    + 1
                )


            # ------------------------------------------------
            # MAP DATA
            # ------------------------------------------------

            normalized = (
                normalize_observation(
                    raw,
                    country_places
                )
            )


            if normalized is not None:

                mapped_observations.append(
                    normalized
                )


        if len(results) < PER_PAGE:

            break


        page += 1


        time.sleep(
            REQUEST_DELAY_SECONDS
        )


    # ========================================================
    # 3. DEDUPLICATE
    # ========================================================

    unique_observations = {}


    for observation in mapped_observations:

        observation_id = (
            observation.get(
                "id"
            )
        )


        if observation_id is not None:

            unique_observations[
                observation_id
            ] = observation


    mapped_observations = sorted(

        unique_observations.values(),

        key=lambda item:
            item.get(
                "observed_on"
            )
            or "",

        reverse=True

    )


    # ========================================================
    # 4. SORT COUNTRIES
    # ========================================================

    country_counts = dict(
        sorted(
            country_counts.items(),
            key=lambda item:
                item[1],
            reverse=True
        )
    )


    # ========================================================
    # 5. DATASET
    # ========================================================

    output = {

        "source":
            "iNaturalist",

        "username":
            USERNAME,

        "generated_at":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "total_observations":
            total_observations,

        "total_species":
            len(
                all_species
            ),

        "total_countries":
            len(
                country_counts
            ),

        "mapped_observations":
            len(
                mapped_observations
            ),

        "country_counts":
            country_counts,

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
    ) as file:

        json.dump(
            output,
            file,
            ensure_ascii=False,
            indent=2
        )


    # ========================================================
    # 6. LOG
    # ========================================================

    print()

    print(
        "=========================================="
    )

    print(
        "WILDLIFE DATASET COMPLETE"
    )

    print(
        "=========================================="
    )

    print(
        "Total observations:",
        total_observations
    )

    print(
        "Total species:",
        len(all_species)
    )

    print(
        "Total countries:",
        len(country_counts)
    )

    print(
        "Mapped observations:",
        len(mapped_observations)
    )

    print()

    print(
        "COUNTRIES"
    )

    print(
        "------------------------------------------"
    )


    for country, count in (
        country_counts.items()
    ):

        print(
            f"{country}: {count}"
        )


    print()

    print(
        "Dataset written to:"
    )

    print(
        OUTPUT_FILE
    )


    return 0


if __name__ == "__main__":

    sys.exit(
        main()
    )
