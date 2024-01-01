"""
Script to scrape the latest routes & stop information
from the NextBus API
"""

import os
import json
import requests

from pathlib import Path
from typing import Dict, List, Literal, Set, TypedDict

BASE_PATH = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_PATH / "src" / "lib" / "data"

url = os.getenv("NEXTBUS_API_URL")
header = {
    "Authorization": f"Basic {os.getenv('NEXTBUS_BASIC_AUTH')}",
    "Content-Type": "application/json",
}

if not url:
    raise ValueError("NEXTBUS_API_URL secret not defined")

if not os.getenv("NEXTBUS_BASIC_AUTH"):
    raise ValueError("NEXTBUS_BASIC_AUTH secret not defined")

RouteLiterals = Literal["A1", "A2", "D1", "D2", "BTC", "E", "K", "L"]


class Stop(TypedDict):
    caption: str
    name: str
    LongName: str
    ShortName: str
    latitude: float
    longitude: float


class RouteStop(TypedDict):
    seq: int
    stop_name: str
    busstopcode: str


Route = Dict[RouteLiterals, RouteStop]


def _to_json(response: dict, filename: str) -> None:
    fname = f"{filename}.json"
    with open(DATA_PATH / fname, "w") as out:
        json.dump(response, out, indent=2)


def scrape_stops() -> List[Stop]:
    bus_stops = requests.get(url=url + "/BusStops", headers=header)
    bus_stops = bus_stops.json()
    return bus_stops["BusStopsResult"]["busstops"]


def scrape_routes(unique_stops: Set[str]) -> Route:
    def _scrape_services() -> List[RouteLiterals]:
        r = requests.get(url=url + "/ServiceDescription", headers=header)
        r = r.json()
        return [
            service["Route"]
            for service in r["ServiceDescriptionResult"]["ServiceDescription"]
        ]

    def _get_routes(route: str) -> RouteStop:
        pickup_point = requests.get(
            url=url + "/PickupPoint", params={"route_code": f"{route}"}, headers=header
        )
        response = pickup_point.json()
        response = response["PickupPointResult"]["pickuppoint"]

        # handle special case
        return [
            {
                "seq": r["seq"],
                "stop_name": r["pickupname"],
                "busstopcode": r["busstopcode"]
                if r["busstopcode"] in unique_stops
                else r["busstopcode"].split("-")[0],
            }
            for r in response
        ]

    return {route: _get_routes(route) for route in _scrape_services()}


def main():
    stops = scrape_stops()
    routes = scrape_routes(set([stop["name"] for stop in stops]))

    _to_json(stops, "stops")
    _to_json(routes, "routes")


if __name__ == "__main__":
    main()
