import os
import json
import time
import base64
import requests

from pathlib import Path
from typing import Dict, List, Set, TypedDict

BASE_PATH = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_PATH / "src" / "lib" / "data"
TOKEN_KEY = "nextbus:esb-token"
REFRESH_SKEW_S = 6 * 60 * 60
CANDIDATE_ROUTES = ["A1", "A2", "D1", "D2", "BTC", "E", "K", "L", "R1", "R2", "P"]


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required env var {name} (see .env.example)")
    return value


BASE = _required("NEXTBUS_BASE").rstrip("/")
API_KEY = _required("NEXTBUS_API_KEY")
APP_VERSION = _required("NEXTBUS_APP_VERSION")
USER_ID = _required("NEXTBUS_USER_ID")
DEVICE_ID = _required("NEXTBUS_DEVICE_ID")
DOMAIN = os.getenv("NEXTBUS_DOMAIN", "PUBLIC")
SEED_TOKEN = _required("NEXTBUS_ESB_TOKEN")
USER_AGENT = _required("NEXTBUS_USER_AGENT")
IP_ADDR = _required("NEXTBUS_IP_ADDR")
KV_URL = os.getenv("KV_REST_API_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
KV_TOKEN = os.getenv("KV_REST_API_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")


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


def jwt_exp(token: str) -> int:
    part = token.split(".")[1]
    pad = "=" * ((4 - len(part) % 4) % 4)
    payload = json.loads(base64.urlsafe_b64decode(part + pad))
    return int(payload.get("exp") or 0)


def kv_command(command: list) -> object:
    if not KV_URL or not KV_TOKEN:
        return None
    res = requests.post(
        KV_URL,
        headers={"Authorization": f"Bearer {KV_TOKEN}"},
        json=command,
        timeout=20,
    )
    res.raise_for_status()
    return res.json().get("result")


def kv_get_token() -> str | None:
    result = kv_command(["GET", TOKEN_KEY])
    return result if isinstance(result, str) and result else None


def kv_set_token(token: str) -> None:
    kv_command(["SET", TOKEN_KEY, token])


def auth_headers(token: str) -> dict[str, str]:
    return {
        "x-api-key": API_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": USER_AGENT,
    }


def esb_body(token: str, extra: dict | None = None) -> dict:
    return {
        "token": token,
        "userid": USER_ID,
        "domain": DOMAIN,
        "deviceid": DEVICE_ID,
        "ipaddr": IP_ADDR,
        "version": APP_VERSION,
        **(extra or {}),
    }


class Session:
    def __init__(self, token: str):
        self.token = token

    def refresh(self) -> None:
        res = requests.post(
            f"{BASE}/univus/api/univus/refresh-token",
            headers=auth_headers(self.token),
            json=esb_body(self.token),
            timeout=30,
        )
        body = res.json()
        token = (body.get("data") or {}).get("token")
        if body.get("code") != "00000" or not token:
            raise RuntimeError(
                f"refresh-token failed: {body.get('code')} {body.get('msg')}"
            )
        self.token = token
        kv_set_token(token)

    def proxy(self, endpoint: str, extra: dict | None = None) -> dict:
        def _post() -> dict:
            return requests.post(
                f"{BASE}/univus/api/bus-proxy/{endpoint}",
                headers=auth_headers(self.token),
                json=esb_body(self.token, extra),
                timeout=30,
            ).json()

        body = _post()
        if body.get("code") != "00000":
            self.refresh()
            body = _post()
        if body.get("code") != "00000":
            raise RuntimeError(
                f"{endpoint} failed: {body.get('code')} {body.get('msg')}"
            )
        return body["data"]


def resolve_session() -> Session:
    token = kv_get_token() or SEED_TOKEN
    session = Session(token)
    if jwt_exp(session.token) - time.time() < REFRESH_SKEW_S:
        session.refresh()
    return session


def _to_json(response: object, filename: str) -> None:
    with open(DATA_PATH / f"{filename}.json", "w") as out:
        json.dump(response, out, indent=2)


def scrape_stops(session: Session) -> List[Stop]:
    return session.proxy("bus-stops")["busstops"]


def existing_route_keys() -> List[str]:
    path = DATA_PATH / "routes.json"
    if not path.exists():
        return []
    return list(json.loads(path.read_text()).keys())


def scrape_routes(session: Session, unique_stops: Set[str]) -> Dict[str, List[RouteStop]]:
    # ServiceDescription is not exposed on bus-proxy; probe known + previously
    # scraped route codes via pickup-point instead.
    candidates = list(dict.fromkeys([*existing_route_keys(), *CANDIDATE_ROUTES]))
    routes: Dict[str, List[RouteStop]] = {}
    for route in candidates:
        points = session.proxy("pickup-point", {"route_code": route}).get("pickuppoint") or []
        if not points:
            continue
        routes[route] = [
            {
                "seq": r["seq"],
                "stop_name": r["pickupname"],
                "busstopcode": r["busstopcode"]
                if r["busstopcode"] in unique_stops
                else r["busstopcode"].split("-")[0],
            }
            for r in points
        ]
    return routes


def main():
    session = resolve_session()
    stops = scrape_stops(session)
    routes = scrape_routes(session, set(stop["name"] for stop in stops))

    _to_json(stops, "stops")
    _to_json(routes, "routes")


if __name__ == "__main__":
    main()
