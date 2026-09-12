from __future__ import annotations

import json
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


# ============================================================
# CONFIGURATION
# ============================================================

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
# COUNTRY NAMES
# ============================================================

COUNTRIES = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bhutan",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Cape Verde",
    "Central African Republic",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czechia",
    "Democratic Republic of the Congo",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Eswatini",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Grenada",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "North Korea",
    "North Macedonia",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Republic of the Congo",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Timor-Leste",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zambia",
    "Zimbabwe",
]


# Common alternate names used by iNaturalist
# or in place descriptions.

COUNTRY_ALIASES = {

    "españa": "Spain",

    "spain": "Spain",

    "italia": "Italy",

    "italy": "Italy",

    "francia": "France",

    "france": "France",

    "alemania": "Germany",

    "germany": "Germany",

    "australia": "Australia",

    "nueva zelanda": "New Zealand",

    "new zealand": "New Zealand",

    "tailandia": "Thailand",

    "thailand": "Thailand",

    "méxico": "Mexico",

    "mexico": "Mexico",

    "indonesia": "Indonesia",

    "vietnam": "Vietnam",

    "guatemala": "Guatemala",

    "papua nueva guinea":
        "Papua New Guinea",

    "papua new guinea":
        "Papua New Guinea",

    "corea del sur":
        "South Korea",

    "south korea":
        "South Korea",

    "japón":
        "Japan",

    "japan":
        "Japan",

    "china":
        "China",

    "portugal":
        "Portugal",

    "reino unido":
        "United Kingdom",

    "united kingdom":
        "United Kingdom",

    "estados unidos":
        "United States",

    "united states":
        "United States",

}


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(
    value: str
) -> str:

    value = (
        unicodedata.normalize(
            "NFKD",
            value
        )
        .encode(
            "ascii",
            "ignore"
        )
        .decode("ascii")
    )

    return (
        value
        .lower()
        .strip()
    )


NORMALIZED_COUNTRIES = {
    normalize_text(country): country
    for country in COUNTRIES
}


NORMALIZED_ALIASES = {
    normalize_text(alias): country
    for alias, country in COUNTRY_ALIASES.items()
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


    return (
        None,
        None
    )


# ============================================================
# COUNTRY EXTRACTION
# ============================================================

def extract_country(
    observation: dict[str, Any]
) -> str | None:

    # --------------------------------------------------------
    # 1. BEST OPTION:
    #    iNaturalist's own country field.
    # --------------------------------------------------------

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


    # --------------------------------------------------------
    # 2. Try the nested place object.
    # --------------------------------------------------------

    place = (
        observation.get("place")
        or {}
    )


    for key in (
        "country_name",
        "name",
        "display_name",
    ):

        nested_country = (
            place.get(key)
        )


        if (
            isinstance(
                nested_country,
                str
            )
            and nested_country.strip()
        ):

            normalized = normalize_text(
                nested_country
            )


            if (
                normalized
                in NORMALIZED_COUNTRIES
            ):

                return NORMALIZED_COUNTRIES[
                    normalized
                ]


    # --------------------------------------------------------
    # 3. Fallback:
    #    Search place_guess.
    #
    #    Example:
    #    "Da Nang, Vietnam"
    #    "Chiang Mai, Thailand"
    #    "Cabo Pulmo, Baja California Sur, Mexico"
    # --------------------------------------------------------

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


    # First check aliases.

    for alias, country_name in (
        NORMALIZED_ALIASES.items()
    ):

        if (
            alias in normalized_guess
        ):

            return country_name


    # Then check official country names.

    # Sort longest first so, for example,
    # "South Korea" is checked before "Korea".

    country_names = sorted(
        NORMALIZED_COUNTRIES.items(),
        key=lambda item: len(item[0]),
        reverse=True
    )


    for normalized_country, country_name in (
        country_names
    ):

        if (
            normalized_country
            in normalized_guess
        ):

            return country_name


    return None


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
            isinstance(candidate, str)
            and candidate.strip()
        ):

            return candidate


    return None


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
        common_name is not None
        and not common_name.strip()
    ):

        common_name = None


    return (
        scientific_name,
        common_name
    )


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


    country = extract_country(
        observation
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


# ============================================================
# FETCH PAGE
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
            "iNaturalist returned HTTP 429."
        )


    response.raise_for_status()


    return response.json()


# ============================================================
# MAIN
# ============================================================

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

    country_counts = {}

    total_observations_seen = 0


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
            f"  Received {len(results)} observations."
        )


        # ----------------------------------------------------
        # PROCESS OBSERVATIONS
        # ----------------------------------------------------

        for raw in results:

            total_observations_seen += 1


            # ----------------------------
            # Species
            # ----------------------------

            scientific_name, common_name = (
                get_taxon_names(
                    raw
                )
            )


            # Scientific name is the stable
            # species identity used for counting.

            all_species.add(
                scientific_name
            )


            # ----------------------------
            # Country
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
            # Map observation
            # ----------------------------

            normalized = (
                normalize_observation(
                    raw
                )
            )


            if normalized is not None:

                mapped_observations.append(
                    normalized
                )


        # ----------------------------------------------------
        # PAGINATION
        # ----------------------------------------------------

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


    # ========================================================
    # SORT COUNTRIES
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
    # OUTPUT DATASET
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
        f"Total observations: "
        f"{total_observations_seen}"
    )

    print(
        f"Total species: "
        f"{len(all_species)}"
    )

    print(
        f"Total countries: "
        f"{len(country_counts)}"
    )

    print(
        f"Mapped observations: "
        f"{len(mapped_observations)}"
    )

    print()

    print(
        "COUNTRY COUNTS"
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
        f"Dataset written to: "
        f"{OUTPUT_FILE}"
    )


    return 0


if __name__ == "__main__":

    sys.exit(
        main()
    )
