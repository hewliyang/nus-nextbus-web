import os
import json
import uuid
import requests

from pathlib import Path
from typing import Dict, List, Literal, Set, TypedDict

BASE_PATH = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_PATH / "src" / "lib" / "data"


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required env var {name} (see .env.example)")
    return value


AUTH_BASE = _required("NEXTBUS_AUTH_BASE")
FMS_BASE = _required("NEXTBUS_FMS_BASE")
APP_VERSION = _required("NEXTBUS_APP_VERSION")
HTD_API = _required("NEXTBUS_HTD_API")
APP_API = _required("NEXTBUS_APP_API")
FMS_SERVICE_ID = _required("NEXTBUS_FMS_SERVICE_ID")
FMS_TENANT_CODE = _required("NEXTBUS_FMS_TENANT_CODE")
FMS_HEADERS = {"accept": "application/json"}
if os.getenv("NEXTBUS_REQUESTED_BY"):
    FMS_HEADERS["x-requested-by"] = os.environ["NEXTBUS_REQUESTED_BY"]
if os.getenv("NEXTBUS_SECURED_REQUEST"):
    FMS_HEADERS["x-secured-request"] = os.environ["NEXTBUS_SECURED_REQUEST"]

DEVICE_ID = str(uuid.uuid4()).upper()
KEY_HEADERS = {
    "X-HTD-API": HTD_API,
    "X-APP-API": APP_API,
    "Content-Type": "application/json",
}

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


def authenticate() -> str:
    access = requests.post(
        f"{AUTH_BASE}/univus-public/mobile/get-access-token",
        headers=KEY_HEADERS,
        json={"deviceid": DEVICE_ID, "ipaddr": "0.0.0.0", "version": APP_VERSION},
    ).json()
    if access.get("code") != "00000":
        raise RuntimeError(
            f"get-access-token failed: {access.get('code')} {access.get('msg')}"
        )

    data = access["data"]
    init = requests.post(
        f"{AUTH_BASE}/univus/mobile/buswidget/get-init-data",
        headers=KEY_HEADERS,
        json={
            "deviceid": DEVICE_ID,
            "domain": data.get("domain"),
            "ipaddr": "0.0.0.0",
            "token": data["token"],
            "userid": data["userid"],
            "version": APP_VERSION,
        },
    ).json()
    if init.get("code") != "00000":
        raise RuntimeError(
            f"get-init-data failed: {init.get('code')} {init.get('msg')}"
        )

    token = init.get("data", {}).get("tokens", {}).get("nextbus_token2")
    if not token:
        raise RuntimeError("No nextbus_token2 in init-data")
    return token


def fms_get(token: str, endpoint: str, params: dict | None = None) -> dict:
    params = {
        "ServiceID": FMS_SERVICE_ID,
        "TenantCode": FMS_TENANT_CODE,
        **(params or {}),
        "token": token,
    }
    res = requests.get(f"{FMS_BASE}/{endpoint}", params=params, headers=FMS_HEADERS)
    return res.json()


def _to_json(response: dict, filename: str) -> None:
    fname = f"{filename}.json"
    with open(DATA_PATH / fname, "w") as out:
        json.dump(response, out, indent=2)


def scrape_stops(token: str) -> List[Stop]:
    bus_stops = fms_get(token, "BusStops")
    return bus_stops["BusStopsResult"]["busstops"]


def scrape_routes(token: str, unique_stops: Set[str]) -> Route:
    def _scrape_services() -> List[RouteLiterals]:
        r = fms_get(token, "ServiceDescription")
        return [
            service["Route"]
            for service in r["ServiceDescriptionResult"]["ServiceDescription"]
        ]

    def _get_routes(route: str) -> RouteStop:
        response = fms_get(token, "PickupPoint", {"route_code": f"{route}"})
        response = response["PickupPointResult"]["pickuppoint"]

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
    token = authenticate()
    stops = scrape_stops(token)
    routes = scrape_routes(token, set([stop["name"] for stop in stops]))

    _to_json(stops, "stops")
    _to_json(routes, "routes")


if __name__ == "__main__":
    main()
