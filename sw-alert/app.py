"""
Solar-storm early-warning engine.

Listens to MongoDB change streams for each feed collection and fires alert
handlers when rule predicates return True.
"""
import os, json, logging, time
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from redis import Redis
from concurrent.futures import ThreadPoolExecutor
from rules import RULES   # ← import your rule registry

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGO_DB",  "spaceweather")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log = logging.getLogger("engine")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db     = client[DB_NAME]

redis = Redis.from_url(REDIS_URL)

# -----------------------------------------------------------------------------
def send_alert(code: str, level: str, payload: dict, ttl: int):
    alert = {
        "ts":      datetime.now(timezone.utc).isoformat(),
        "code":    code,
        "level":   level,
        "payload": payload,
    }
    j = json.dumps(alert, default=str)

    # publish to channel
    redis.publish("alerts", j)

    # store with per-rule TTL
    key = f"alert:{code}:{alert['ts']}"
    redis.set(key, j, ex=ttl)
    log.info("Stored alert %s with TTL %ss", key, ttl)


def process_change(coll_name: str, doc: dict):
    for rule in RULES.get(coll_name, []):
        try:
            if rule["when"](doc):
                send_alert(rule["code"], rule["level"], rule["payload"](doc), rule["ttl"])
        except Exception as e:
            log.exception("Rule %s raised error: %s", rule["code"], e)


def run_stream(coll_name: str):
    """
    Tail a single collection in its own thread / green-thread.
    """
    coll = db[coll_name]
    try:
        with coll.watch(full_document="updateLookup") as stream:
            log.info("Listening %s…", coll_name)
            for change in stream:
                if change["operationType"] != "insert": 
                    continue
                doc = change["fullDocument"]
                process_change(coll_name, doc)
    except PyMongoError as e:
        log.error("ChangeStream error on %s: %s - restarting in 5 s", coll_name, e)
        time.sleep(5)
        run_stream(coll_name)     # tail-recursively restart


def main():
    
    collections = list(RULES.keys())
    with ThreadPoolExecutor(max_workers=len(collections)) as ex:
        for name in collections:
            ex.submit(run_stream, name)
        ex.shutdown(wait=True)


if __name__ == "__main__":
    main()
