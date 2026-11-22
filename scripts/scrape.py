import os
import json
import time
import base64
import re
import requests

from pathlib import Path
from typing import Dict, List, Set, TypedDict

BASE_PATH = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_PATH / "src" / "lib" / "data"
TOKEN_KEY = "nextbus:esb-token"
USER_KEY = "nextbus:esb-userid"
VERSION_KEY = "nextbus:app-version"
REFRESH_SKEW_S = 6 * 60 * 60
CANDIDATE_ROUTES = ["A1", "A2", "D1", "D2", "BTC", "E", "K", "L", "R1", "R2", "P"]
PLAY_PACKAGE = "sg.edu.nus.univus"
VERSION_PREFIX = "univus_android_"


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required env var {name} (see .env.example)")
    return value


def normalize_app_version(raw: str, build: str = "") -> str:
    """uNivUS ESB expects univus_android_{versionName}_{versionCode}."""
    trimmed = raw.strip()
    if not trimmed:
        return trimmed
    without_prefix = (
        trimmed[len(VERSION_PREFIX) :]
        if trimmed.startswith(VERSION_PREFIX)
        else re.sub(r"^v", "", trimmed, flags=re.I)
    )
    full = re.fullmatch(r"(\d+\.\d+\.\d+)_(\d+)", without_prefix)
    if full:
        return f"{VERSION_PREFIX}{full.group(1)}_{full.group(2)}"
    name_match = re.fullmatch(r"(\d+\.\d+\.\d+)", without_prefix)
    name = name_match.group(1) if name_match else without_prefix
    # Bare univus_android_{name} / low versionCodes are rejected with 10009.
    # When unknown, use a high sentinel the ESB currently accepts.
    build = (build or os.getenv("NEXTBUS_APP_BUILD") or "").strip() or "999"
    return f"{VERSION_PREFIX}{name}_{build}"


BASE = _required("NEXTBUS_BASE").rstrip("/")
API_KEY = _required("NEXTBUS_API_KEY")
APP_VERSION = normalize_app_version(_required("NEXTBUS_APP_VERSION"))
USER_ID = os.getenv("NEXTBUS_USER_ID") or ""
DEVICE_ID = _required("NEXTBUS_DEVICE_ID")
DOMAIN = os.getenv("NEXTBUS_DOMAIN", "PUBLIC")
SEED_TOKEN = os.getenv("NEXTBUS_ESB_TOKEN") or ""
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


def kv_get(key: str) -> str | None:
    result = kv_command(["GET", key])
    return result if isinstance(result, str) and result else None


def kv_set(key: str, value: str) -> None:
    kv_command(["SET", key, value])


def auth_headers(token: str | None = None) -> dict[str, str]:
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": USER_AGENT,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def esb_body(token: str, user_id: str, extra: dict | None = None) -> dict:
    return {
        "token": token,
        "userid": user_id,
        "domain": DOMAIN,
        "deviceid": DEVICE_ID,
        "ipaddr": IP_ADDR,
        "version": APP_VERSION,
        **(extra or {}),
    }


def fetch_play_store_version() -> str | None:
    res = requests.get(
        f"https://play.google.com/store/apps/details?id={PLAY_PACKAGE}&hl=en&gl=SG",
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20,
    )
    if not res.ok:
        return None
    match = re.search(r'\[\[\["(\d+\.\d+\.\d+)"\]\]', res.text)
    return match.group(1) if match else None


def bump_app_version_from_play() -> str:
    global APP_VERSION
    cached = kv_get(VERSION_KEY)
    if cached and cached.startswith(VERSION_PREFIX):
        APP_VERSION = cached
        return cached

    play = fetch_play_store_version()
    if not play:
        raise RuntimeError("could not resolve uNivUS version from Play Store")

    build_match = re.search(r"_(\d+)$", APP_VERSION)
    APP_VERSION = normalize_app_version(play, build_match.group(1) if build_match else "")
    kv_set(VERSION_KEY, APP_VERSION)
    return APP_VERSION


class Session:
    def __init__(self, token: str, user_id: str):
        self.token = token
        self.user_id = user_id

    def mint(self, allow_version_bump: bool = True) -> None:
        global USER_ID
        res = requests.post(
            f"{BASE}/univus/api/univus-public/mobile/get-access-token",
            headers=auth_headers(),
            json={
                "deviceid": DEVICE_ID,
                "ipaddr": IP_ADDR,
                "version": APP_VERSION,
            },
            timeout=30,
        )
        body = res.json()
        if body.get("code") == "10009" and allow_version_bump:
            bump_app_version_from_play()
            return self.mint(False)
        token = (body.get("data") or {}).get("token")
        user_id = (body.get("data") or {}).get("userid") or USER_ID
        if body.get("code") != "00000" or not token or not user_id:
            raise RuntimeError(
                f"get-access-token failed: {body.get('code')} {body.get('msg')}"
            )
        self.token = token
        self.user_id = user_id
        USER_ID = user_id
        kv_set(TOKEN_KEY, token)
        kv_set(USER_KEY, user_id)

    def refresh(self) -> None:
        res = requests.post(
            f"{BASE}/univus/api/univus/refresh-token",
            headers=auth_headers(self.token),
            json=esb_body(self.token, self.user_id),
            timeout=30,
        )
        body = res.json()
        if body.get("code") == "10009":
            bump_app_version_from_play()
            return self.mint()
        token = (body.get("data") or {}).get("token")
        if body.get("code") != "00000" or not token:
            return self.mint()
        user_id = (body.get("data") or {}).get("userid") or self.user_id
        self.token = token
        self.user_id = user_id
        kv_set(TOKEN_KEY, token)
        if user_id:
            kv_set(USER_KEY, user_id)

    def proxy(self, endpoint: str, extra: dict | None = None) -> dict:
        def _post() -> dict:
            return requests.post(
                f"{BASE}/univus/api/bus-proxy/{endpoint}",
                headers=auth_headers(self.token),
                json=esb_body(self.token, self.user_id, extra),
                timeout=30,
            ).json()

        body = _post()
        if body.get("code") == "10009":
            bump_app_version_from_play()
            self.mint()
            body = _post()
        elif body.get("code") != "00000":
            self.refresh()
            body = _post()
        if body.get("code") != "00000":
            raise RuntimeError(
                f"{endpoint} failed: {body.get('code')} {body.get('msg')}"
            )
        return body["data"]


def resolve_session() -> Session:
    global APP_VERSION, USER_ID
    cached_version = kv_get(VERSION_KEY)
    if cached_version and cached_version.startswith(VERSION_PREFIX):
        APP_VERSION = cached_version

    token = kv_get(TOKEN_KEY) or SEED_TOKEN
    user_id = kv_get(USER_KEY) or USER_ID
    session = Session(token, user_id)
    if not token:
        session.mint()
    elif jwt_exp(session.token) - time.time() < REFRESH_SKEW_S:
        session.refresh()
    elif not session.user_id:
        session.mint()
    USER_ID = session.user_id
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
