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


# Common country names likely to appear in
# iNaturalist place_guess strings.
COUNTRIES = {
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
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Bulgaria",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Cape Verde",
    "Chile",
    "China",
    "Colombia",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czechia",
    "Denmark",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "Estonia",
    "Eswatini",
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
    "Luxembourg",
    "Madagascar",
    "Malaysia",
    "Maldives",
    "Malta",
    "Mauritius",
    "Mexico",
    "Moldova",
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
    "Seychelles",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Taiwan",
    "Tanzania",
    "Thailand",
    "Togo",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Venezuela",
    "Vietnam",
    "Zambia",
    "Zimbabwe",
}


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


def extract_country(
    place_guess: str | None
) -> str | None:

    if not place_guess:
        return None

    parts = [
        part.strip()
        for part in place_guess.split(",")
    ]

    # Search from right to left because country
    # is normally the final element.
    for part in reversed(parts):

        for country in COUNTRIES:

            if part.lower() == country.lower():

                return country

    # Handle common English / Spanish variants.
    normalized = place_guess.lower()

    aliases = {
        "españa": "Spain",
        "italia": "Italy",
        "francia": "France",
        "alemania": "Germany",
        "australia": "Australia",
        "vietnam": "Vietnam",
        "tailandia": "Thailand",
        "méxico": "Mexico",
        "mexico": "Mexico",
        "indonesia": "Indonesia",
        "nueva zelanda": "New Zealand",
    }

    for alias, country in aliases.items():

        if alias in normalized:

            return country

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

    # Prefer the highest quality image available.
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
            extract_country(
                place_guess
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
            "any",
    }

    response = session.get(
        API_URL,
        params=params,
        timeout=30,
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


    mapped_observations = []

    all_species = set()

    all_countries = set()

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


        raw_results = (
            payload.get("results")
            or []
        )


        if not raw_results:
            break


        for raw in raw_results:

            total_observations_seen += 1


            all_species.add(
                get_species_name(
                    raw
                )
            )


            place_guess = (
                raw.get(
                    "place_guess"
                )
            )


            country = extract_country(
                place_guess
            )


            if country:

                all_countries.add(
                    country
                )


            normalized = (
                normalize_observation(
                    raw
                )
            )


            if normalized is not None:

                mapped_observations.append(
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


    for observation in mapped_observations:

        unique_by_id[
            observation["id"]
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
            len(all_countries),

        "mapped_observations":
            len(mapped_observations),

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
        "Dataset built successfully."
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
        len(all_countries)
    )

    print(
        "Mapped observations:",
        len(mapped_observations)
    )

    print(
        "Output:",
        OUTPUT_FILE
    )


    return 0


if __name__ == "__main__":

    sys.exit(
        main()
    )
