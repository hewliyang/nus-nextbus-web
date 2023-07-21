"""
Author: @hewliyang

This script contains code that will gather/update the static data required for the 
nus-nextbus-web client located at `src/lib/data/`

In particular:
1. routes.json
2. stops.json

Current issues not accounted for:
1. OTH slugs are appended with -L/-BTC (L service, BTC service) + -S/-E (start, end)
    - I just manually removed them for now as it was the simplest solution
"""

import requests
import os
import json

from dotenv import load_dotenv
from typing import List

ENV_LOADED = load_dotenv()
assert ENV_LOADED, "Secrets missing! Please enter your secrets in a .env file!"

url = os.getenv("NEXTBUS_API_URL") + "/"
header = {"Authorization": f"Basic {os.getenv('NEXTBUS_BASIC_AUTH')}"}


# helper
def _to_json(response: dict, filepath: str) -> None:
    with open(f"src/lib/data/{filepath}.json", "w") as out:
        json.dump(response, out, indent=4)


# scrapers
def scrape_stops() -> dict:
    r = requests.get(url=url + "BusStops", headers=header)
    return r.json()


def scrape_services() -> List[str]:
    r = requests.get(url=url + "ServiceDescription", headers=header)
    r = r.json()
    return [
        service["Route"]
        for service in r["ServiceDescriptionResult"]["ServiceDescription"]
    ]


def scrape_routes() -> dict:
    service_codes = scrape_services()

    # helper to get route for one service
    def get_route(service_code: str) -> list:
        pickup_point = requests.get(
            url=url + "PickupPoint",
            params={"route_code": f"{service_code}"},
            headers=header,
        )
        response = pickup_point.json()
        response = response["PickupPointResult"]["pickuppoint"]
        return [
            {
                "seq": r["seq"],
                "stop_name": r["pickupname"],
                "busstopcode": r["busstopcode"],
            }
            for r in response
        ]

    return {service_code: get_route(service_code) for service_code in service_codes}


if __name__ == "__main__":
    _to_json(scrape_stops(), "stops")
    _to_json(scrape_routes(), "routes")
