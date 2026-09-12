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


# ============================================================
# COUNTRY DATA
# ============================================================

COUNTRIES = [
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
    "Costa Rica",
    "Croatia",
    "Cyprus",
    "Czechia",
    "Denmark",
    "Ecuador",
    "Egypt",
    "Estonia",
    "Ethiopia",
    "Fiji",
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
    "North Macedonia",
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


ALIASES = {
    "espana": "Spain",
    "españa": "Spain",
    "italia": "Italy",
    "francia": "France",
    "alemania": "Germany",
    "tailandia": "Thailand",
    "mexico": "Mexico",
    "méxico": "Mexico",
    "nueva zelanda": "New Zealand",
    "corea del sur": "South Korea",
    "reino unido": "United Kingdom",
    "estados unidos": "United States",
    "papua nueva guinea": "Papua New Guinea",
    "canary islands": "Spain",
}


def normalize_text(value: str) -> str:

    return (
        unicodedata
        .normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


NORMALIZED_COUNTRIES = {
    normalize_text(country): country
    for country in COUNTRIES
}


NORMALIZED_ALIASES = {
    normalize_text(alias): country
    for alias, country in ALIASES.items()
}


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


    if (
        not isinstance(
            common_name,
            str
        )
        or not common_name.strip()
    ):

        common_name = None


    return (
        scientific_name,
        common_name
    )


# ============================================================
# COUNTRY
# ============================================================

def extract_country(
    observation: dict[str, Any]
) -> str | None:

    # 1. Use iNaturalist's own country field.
    country = (
        observation.get(
            "place_country_name"
        )
    )


    if (
        isinstance(country, str)
        and country.strip()
    ):

        normalized = normalize_text(
            country
        )


        if normalized in NORMALIZED_COUNTRIES:

            return NORMALIZED_COUNTRIES[
                normalized
            ]


        if normalized in NORMALIZED_ALIASES:

            return NORMALIZED_ALIASES[
                normalized
            ]


        return country.strip()


    # 2. Fallback to place_guess.
    place_guess = (
        observation.get(
            "place_guess"
        )
    )


    if not isinstance(
        place_guess,
        str
    ):

        return None


    normalized_guess = normalize_text(
        place_guess
    )


    # Exact aliases first.
    for alias, country_name in (
        NORMALIZED_ALIASES.items()
    ):

        if alias in normalized_guess:

            return country_name


    # Longest country names first.
    countries = sorted(
        NORMALIZED_COUNTRIES.items(),
        key=lambda item: len(item[0]),
        reverse=True
    )


    for normalized_country, country_name in countries:

        if normalized_country in normalized_guess:

            return country_name


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

        candidate = (
            first_photo.get(key)
        )


        if (
            isinstance(candidate, str)
            and candidate.strip()
        ):

            return candidate


    return None


# ============================================================
# NORMALIZE OBSERVATION
# ============================================================

def normalize_observation(
    observation: dict[str, Any]
) -> dict[str, Any] | None:

    latitude, longitude = (
        extract_coordinates(
            observation
        )
    )


    # No coordinates = don't put it on the map.
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
        observation.get("id")
    )


    place_guess = (
        observation.get(
            "place_guess"
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
            place_guess,

        "country":
            extract_country(
                observation
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
# FETCH
# ============================================================

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
            "iNaturalist returned HTTP 429. "
            "Please wait and run the workflow again."
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
            "iNaturalist username albercm30)"

    })


    all_species = set()

    country_counts = {}

    mapped_observations = []

    total_observations = 0

    page = 1


    print(
        f"Loading iNaturalist observations "
        f"for @{USERNAME}..."
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
            f"Received {len(results)} observations."
        )


        for raw in results:

            total_observations += 1


            # ----------------------------
            # SPECIES
            # ----------------------------

            scientific_name, _ = (
                get_taxon_names(
                    raw
                )
            )


            all_species.add(
                scientific_name
            )


            # ----------------------------
            # COUNTRY
            # ----------------------------

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


            # ----------------------------
            # MAP DATA
            # ----------------------------

            observation = (
                normalize_observation(
                    raw
                )
            )


            if observation is not None:

                mapped_observations.append(
                    observation
                )


        # If fewer than 200 were returned,
        # this was the final page.

        if len(results) < PER_PAGE:

            break


        page += 1


        time.sleep(
            REQUEST_DELAY_SECONDS
        )


    # ========================================================
    # DEDUPLICATE
    # ========================================================

    unique_observations = {}


    for observation in mapped_observations:

        observation_id = (
            observation.get("id")
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
    # SORT COUNTRY COUNTS
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
    # CREATE DATASET
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
    # SUMMARY
    # ========================================================

    print()

    print(
        "====================================="
    )

    print(
        "WILDLIFE DATASET COMPLETE"
    )

    print(
        "====================================="
    )

    print(
        "Observations:",
        total_observations
    )

    print(
        "Species:",
        len(all_species)
    )

    print(
        "Countries:",
        len(country_counts)
    )

    print(
        "Mapped observations:",
        len(mapped_observations)
    )

    print()

    print(
        "COUNTRIES:"
    )


    for country, count in (
        country_counts.items()
    ):

        print(
            f"  {country}: {count}"
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
