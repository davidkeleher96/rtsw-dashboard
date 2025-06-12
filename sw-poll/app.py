"""
Poll NOAA solar-wind JSON feed → upsert into MongoDB (solar_wind collection).
No capped collection, ready for Change-Streams.
"""

import re
import os, time, logging, requests, json
from datetime import datetime
from pymongo import MongoClient, errors
from bson import ObjectId


# -- Config --------------------------------------------------------------------
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", 60)) # seconds
ENDPOINT      = os.getenv(
    "ENDPOINT",
    "https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json"
)
MONGO_URI     = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB      = os.getenv("MONGO_DB", "spaceweather")
COLL          = os.getenv("MONGO_COLLECTION", "solar_wind")

MAX_RETRY     = int(os.getenv("MAX_STARTUP_RETRIES", 5))
RETRY_DELAY   = int(os.getenv("RETRY_DELAY", 5))

TS_FIELD = os.getenv("TS_FIELD", "time_tag") 
UNIQUE_KEYS = json.loads(os.getenv("UNIQUE_KEYS", "[]"))  # e.g. ["time_tag","satellite"]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log = logging.getLogger("poller")

# -- Mongo init ----------------------------------------------------------------
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db     = client[MONGO_DB]
col    = db[COLL]
index_spec = [(key, 1) for key in UNIQUE_KEYS]
col.create_index(
    index_spec,
    name="_".join(UNIQUE_KEYS) + "_idx",
    unique=True,
    sparse=True
)


# -- Helpers -------------------------------------------------------------------
def normalize_keys(d: dict) -> dict:
    new = {}
    for k, v in d.items():
        # lowercase, replace non-alphanum sequences with underscore
        nk = re.sub(r'[^0-9a-zA-Z]+', '_', k).strip('_').lower()
        new[nk] = v
    return new

# -- Core fetch+store ----------------------------------------------------------
def fetch_and_store() -> bool:
    """Pull one NOAA JSON endpoint and upsert new rows into Mongo."""
    try:
        payload = requests.get(ENDPOINT, timeout=10).json()
    except Exception as e:
        log.error("Fetch error: %s", e)
        return False

    # -- Normalize all payloads into a list of dicts --------------------
    if isinstance(payload, dict):
        rows = [payload]
    elif isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, list):
            header = first
            rows = [dict(zip(header, row)) for row in payload[1:]]
        elif isinstance(first, dict):
            rows = payload
        else:
            log.error("Unexpected inner payload type %r", type(first))
            return False
    else:
        log.error("Unexpected payload type %r", type(payload))
        return False

    # -- Upsert loop ---------------------------------------------------
    new_docs = 0
    for raw in rows:
        # normalize the field names
        record = normalize_keys(raw)

        # cast numeric strings to floats
        for k, v in list(record.items()):
            try:
                record[k] = float(v)
            except (TypeError, ValueError):
                pass

        # build uniqueness filter
        flt = { key: record[key] for key in UNIQUE_KEYS if key in record }

        # if no keys matched, force an insert
        if not flt:
            flt = {"_id": ObjectId()}

        # upsert
        try:
            res = col.replace_one(flt, record, upsert=True)
            if getattr(res, "upserted_id", None) or res.matched_count == 0:
                new_docs += 1
        except errors.PyMongoError as e:
            log.error("Mongo error on filter %s: %s", flt, e)

    log.info("Upserted %d new docs (total rows processed %d)", new_docs, len(rows))
    return True

# -- Orchestration -------------------------------------------------------------
def startup():
    for attempt in range(1, MAX_RETRY + 1):
        if fetch_and_store():
            return
        log.warning("Startup fetch failed (%d/%d), retrying…", attempt, MAX_RETRY)
        time.sleep(RETRY_DELAY)
    log.error("All startup retries failed!")

def main():
    startup()
    while True:
        fetch_and_store()
        time.sleep(POLL_INTERVAL)

# -- Main ----------------------------------------------------------------
if __name__ == "__main__":
    log.info("Poller started → %s.%s every %ss", MONGO_DB, COLL, POLL_INTERVAL)
    main()