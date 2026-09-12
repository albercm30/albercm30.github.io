from __future__ import annotations

import json
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


USERNAME = "albercm30"

OBSERVATIONS_API = (
    "https://api.inaturalist.org/v1/observations"
)

PLACES_API = (
    "https://api.inaturalist.org/v1/places"
)

ROOT = Path(__file__).resolve().parents[1]

OUTPUT_FILE = (
    ROOT / "data" / "wildlife.json"
)

PER_PAGE = 200

REQUEST_DELAY_SECONDS = 1.05

MAX_PAGES = 100


# ============================================================
# HELPERS
# ============================================================

def normalize_text(value: str) -> str:

    return (
        unicodedata
        .normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


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
                float(
                    value.strip()
                )
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


def get_species_names(
    observation: dict[str, Any]
) -> tuple[str, str | None]:

    taxon = (
        observation.get("taxon")
        or {}
    )


    scientific_name = (
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


    if not isinstance(
        common_name,
        str
    ):

        common_name = None


    if (
        common_name
        and not common_name.strip()
    ):

        common_name = None


    return (
        scientific_name,
        common_name
    )


# ============================================================
# COUNTRY EXTRACTION
# ============================================================

def country_from_observation(
    observation: dict[str, Any]
) -> str | None:

    # 1. Direct iNaturalist country field.
    country = observation.get(
        "place_country_name"
    )

    if (
        isinstance(country, str)
        and country.strip()
    ):

        return country.strip()


    # 2. Some responses include place information.
    place = (
        observation.get("place")
        or {}
    )

    for key in (
        "country_name",
        "country",
    ):

        country = place.get(key)

        if (
            isinstance(country, str)
            and country.strip()
        ):

            return country.strip()


    # 3. Some observations include a country
    # in their place_guess.
    place_guess = (
        observation.get(
            "place_guess"
        )
    )

    if (
        isinstance(place_guess, str)
        and place_guess.strip()
    ):

        return country_from_text(
            place_guess
        )


    return None


def country_from_text(
    text: str
) -> str | None:

    normalized = normalize_text(
        text
    )

    # Longer names first.
    aliases = {

        "papua new guinea":
            "Papua New Guinea",

        "new zealand":
            "New Zealand",

        "south korea":
            "South Korea",

        "south africa":
            "South Africa",

        "united states":
            "United States",

        "united kingdom":
            "United Kingdom",

        "costa rica":
            "Costa Rica",

        "dominican republic":
            "Dominican Republic",

        "canary islands":
            "Spain",

        "espana":
            "Spain",

        "españa":
            "Spain",

        "italia":
            "Italy",

        "francia":
            "France",

        "alemania":
            "Germany",

        "tailandia":
            "Thailand",

        "mexico":
            "Mexico",

        "vietnam":
            "Vietnam",

        "indonesia":
            "Indonesia",

        "guatemala":
            "Guatemala",

        "australia":
            "Australia",

        "portugal":
            "Portugal",

        "japan":
            "Japan",

        "china":
            "China",

    }


    for key, value in aliases.items():

        if key in normalized:

            return value


    countries = [

        "Afghanistan",
        "Albania",
        "Algeria",
        "Andorra",
        "Angola",
        "Argentina",
        "Armenia",
        "Australia",
        "Austria",
        "Bahamas",
        "Bangladesh",
        "Belgium",
        "Belize",
        "Bolivia",
        "Botswana",
        "Brazil",
        "Bulgaria",
        "Cambodia",
        "Cameroon",
        "Canada",
        "Chile",
        "China",
        "Colombia",
        "Croatia",
        "Cyprus",
        "Czechia",
        "Denmark",
        "Ecuador",
        "Egypt",
        "Estonia",
        "Ethiopia",
        "Finland",
        "France",
        "Gabon",
        "Georgia",
        "Germany",
        "Ghana",
        "Greece",
        "Guatemala",
        "Guyana",
        "Honduras",
        "Hungary",
        "Iceland",
        "India",
        "Indonesia",
        "Ireland",
        "Israel",
        "Italy",
        "Jamaica",
        "Japan",
        "Jordan",
        "Kenya",
        "Laos",
        "Latvia",
        "Lebanon",
        "Lithuania",
        "Madagascar",
        "Malaysia",
        "Maldives",
        "Malta",
        "Mauritius",
        "Mexico",
        "Monaco",
        "Mongolia",
        "Montenegro",
        "Morocco",
        "Mozambique",
        "Myanmar",
        "Namibia",
        "Nepal",
        "Netherlands",
        "New Zealand",
        "Nicaragua",
        "Nigeria",
        "Norway",
        "Oman",
        "Pakistan",
        "Panama",
        "Papua New Guinea",
        "Paraguay",
        "Peru",
        "Philippines",
        "Poland",
        "Portugal",
        "Romania",
        "Rwanda",
        "Senegal",
        "Serbia",
        "Singapore",
        "Slovakia",
        "Slovenia",
        "South Africa",
        "South Korea",
        "Spain",
        "Sri Lanka",
        "Sweden",
        "Switzerland",
        "Taiwan",
        "Thailand",
        "Tunisia",
        "Turkey",
        "Uganda",
        "Ukraine",
        "United Arab Emirates",
        "United Kingdom",
        "United States",
        "Uruguay",
        "Venezuela",
        "Vietnam",
        "Zambia",
        "Zimbabwe",
    ]


    for country in countries:

        if (
            normalize_text(country)
            in normalized
        ):

            return country


    return None


# ============================================================
# PLACE LOOKUP
# ============================================================

def extract_place_ids(
    observation: dict[str, Any]
) -> list[int]:

    raw_ids = (
        observation.get(
            "place_ids"
        )
        or []
    )

    result = []

    for value in raw_ids:

        try:

            result.append(
                int(value)
            )

        except (
            TypeError,
            ValueError
        ):

            pass


    return result


def lookup_country_from_places(
    session: requests.Session,
    place_ids: list[int],
    cache: dict[int, str | None],
) -> str | None:

    if not place_ids:
        return None


    # iNaturalist places are hierarchical.
    # We ask the Places endpoint for the relevant
    # IDs and inspect their country-level information.

    unresolved = [
        place_id
        for place_id in place_ids
        if place_id not in cache
    ]


    if unresolved:

        id_string = ",".join(
            str(value)
            for value in unresolved
        )


        try:

            response = session.get(
                f"{PLACES_API}/{id_string}",
                timeout=30,
            )


            if response.ok:

                payload = response.json()

                results = (
                    payload.get(
                        "results"
                    )
                    or []
                )


                for place in results:

                    place_id = place.get(
                        "id"
                    )

                    if place_id is None:
                        continue


                    country = (
                        place.get(
                            "country_name"
                        )
                        or place.get(
                            "country"
                        )
                    )


                    cache[int(place_id)] = (
                        country
                        if isinstance(
                            country,
                            str
                        )
                        else None
                    )


        except requests.RequestException:

            pass


        # Keep requests slow and polite.
        time.sleep(
            REQUEST_DELAY_SECONDS
        )


    # Search the places in reverse order.
    # Higher-level country places usually appear
    # later in the hierarchy.

    for place_id in reversed(
        place_ids
    ):

        country = cache.get(
            place_id
        )

        if country:

            return country


    return None


# ============================================================
# PHOTO
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

        value = (
            first_photo.get(
                key
            )
        )


        if (
            isinstance(value, str)
            and value.strip()
        ):

            return value


    return None


# ============================================================
# NORMALIZE
# ============================================================

def normalize_observation(
    observation: dict[str, Any],
    country_cache: dict[int, str | None],
    session: requests.Session,
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
        get_species_names(
            observation
        )
    )


    country = (
        country_from_observation(
            observation
        )
    )


    # Fallback to iNaturalist's place hierarchy.
    if not country:

        country = (
            lookup_country_from_places(
                session,
                extract_place_ids(
                    observation
                ),
                country_cache,
            )
        )


    display_name = (
        common_name
        or scientific_name
    )


    observation_id = (
        observation.get("id")
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
            ),
    }


# ============================================================
# FETCH OBSERVATIONS
# ============================================================

def fetch_page(
    session: requests.Session,
    page: int,
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
        OBSERVATIONS_API,
        params=params,
        timeout=30,
    )


    if response.status_code == 429:

        raise RuntimeError(
            "iNaturalist returned HTTP 429."
        )


    response.raise_for_status()


    return response.json()


# ============================================================
# MAIN
# ============================================================

def main() -> int:

    session = requests.Session()


    session.headers.update({

        "User-Agent":
            "ACM-Field-Notes/1.0 "
            "(personal portfolio; "
            "iNaturalist username albercm30)",

    })


    mapped_observations = []

    all_species = set()

    country_counts = {}

    country_cache = {}

    total_observations_seen = 0

    page = 1


    print(
        f"Loading observations for @{USERNAME}..."
    )


    while page <= MAX_PAGES:

        print(
            f"Fetching observation page {page}..."
        )


        payload = fetch_page(
            session,
            page
        )


        results = (
            payload.get(
                "results"
            )
            or []
        )


        if not results:
            break


        print(
            f"  Received {len(results)} observations."
        )


        for raw in results:

            total_observations_seen += 1


            # ----------------------------
            # SPECIES
            # ----------------------------

            scientific_name, _ = (
                get_species_names(
                    raw
                )
            )


            all_species.add(
                scientific_name
            )


            # ----------------------------
            # COUNTRY
            # ----------------------------

            country = (
                country_from_observation(
                    raw
                )
            )


            if not country:

                country = (
                    lookup_country_from_places(
                        session,
                        extract_place_ids(
                            raw
                        ),
                        country_cache,
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


            # ----------------------------
            # MAP OBSERVATION
            # ----------------------------

            normalized = (
                normalize_observation(
                    raw,
                    country_cache,
                    session,
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
    # REMOVE DUPLICATES
    # ========================================================

    unique_by_id = {}


    for observation in mapped_observations:

        observation_id = (
            observation.get(
                "id"
            )
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


    # ========================================================
    # SORT COUNTRIES
    # ========================================================

    country_counts = dict(
        sorted(
            country_counts.items(),
            key=lambda item:
                item[1],
            reverse=True,
        )
    )


    # ========================================================
    # BUILD DATASET
    # ========================================================

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
            len(country_counts),

        "mapped_observations":
            len(mapped_observations),

        "country_counts":
            country_counts,

        "observations":
            mapped_observations,

    }


    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )


    with OUTPUT_FILE.open(
        "w",
        encoding="utf-8",
    ) as handle:

        json.dump(
            payload,
            handle,
            ensure_ascii=False,
            indent=2,
        )


    # ========================================================
    # LOG
    # ========================================================

    print()

    print(
        "========================================"
    )

    print(
        "WILDLIFE DATASET BUILT"
    )

    print(
        "========================================"
    )

    print(
        "Total observations:",
        total_observations_seen,
    )

    print(
        "Total species:",
        len(all_species),
    )

    print(
        "Total countries:",
        len(country_counts),
    )

    print(
        "Mapped observations:",
        len(mapped_observations),
    )

    print()

    print(
        "COUNTRIES"
    )

    print(
        "----------------------------------------"
    )


    for country, count in (
        country_counts.items()
    ):

        print(
            f"{country}: {count}"
        )


    print()

    print(
        "Dataset:",
        OUTPUT_FILE
    )


    return 0


if __name__ == "__main__":

    sys.exit(
        main()
    )
