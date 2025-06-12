import os
import json
from datetime import datetime
import logging
import time
from flask import Flask, Response, request, jsonify
from pymongo import MongoClient
from pymongo.cursor import CursorType
from bson import ObjectId
from bson.json_util import dumps, RELAXED_JSON_OPTIONS
from redis import Redis

# -- Configuration -------------------------------------------------------------

MONGO_URI        = os.getenv("MONGO_URI", "mongodb://localhost:27017") 
MONGO_DB         = os.getenv("MONGO_DB", "spaceweather")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "solar_wind")
REDIS_URL        = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# -- App & DB Setup ------------------------------------------------------------
app = Flask(__name__)
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
col = db[MONGO_COLLECTION]

redis = Redis.from_url(REDIS_URL,decode_responses=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z"
)
logger = logging.getLogger()

def serialize_doc(doc):
    """Return a pure-JSON dict: no $date / $oid wrappers."""
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()           # "2025-06-10T02:23:00+00:00"
        else:
            out[k] = v
    return out

# -- REST: Query historical data ------------------------------------------------

@app.route("/data")
def get_data():
    """
    Query params:
      - start  : ISO timestamp, inclusive
      - end    : ISO timestamp, inclusive
      - limit  : max number of records (default 1000)
    """
    q = {}
    if (s := request.args.get("start")):
        q["time_tag"] = { "$gte": datetime.fromisoformat(s) }
    if (e := request.args.get("end")):
        q.setdefault("time_tag", {})["$lte"] = datetime.fromisoformat(e)

    limit = int(request.args.get("limit", 1000))

    cursor = col.find(q).sort("time_tag", -1).limit(limit)
    docs = [serialize_doc(d) for d in cursor]
    return jsonify(docs), 200

@app.route("/alerts", methods=["GET"])
def list_alerts():
    """
    Returns all currently active (unexpired) alerts from Redis.
    """
    keys = redis.keys("alert:*")
    # sort by timestamp suffix
    keys.sort()
    alerts = [json.loads(redis.get(k)) for k in keys]
    return jsonify(alerts), 200

# -- SSE: Tail new inserts in real time ----------------------------------------
@app.route("/stream")
def stream():
    def event_stream():
        logger.info("SSE client connected, opening Change Stream…")
        with col.watch(
            [{ '$match': { 'operationType': 'insert' } }],
            full_document='updateLookup'
        ) as change_stream:
            for change in change_stream:
                doc = change['fullDocument']
                logger.info(f"SSE: got new insert {doc.get('timestamp')}")
                yield f"data: {json.dumps(serialize_doc(doc))}\n\n"

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            # Some proxies buffer SSE; this disables that in nginx 
            "X-Accel-Buffering": "no",
        }
    )
    

@app.route("/alerts/stream")
def alerts_stream():
    def event_stream():
        # 1) first, push all existing alerts
        for key in sorted(redis.keys("alert:*")):
            yield f"event: alert\ndata: {redis.get(key)}\n\n"

        # 2) then subscribe to new ones
        pubsub = redis.pubsub()
        pubsub.subscribe("alerts")
        for msg in pubsub.listen():
            if msg["type"] != "message":
                continue
            yield f"event: alert\ndata: {msg['data']}\n\n"

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "Connection":        "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
    
# -- Health Check -------------------------------------------------------------
@app.route("/healthcheck")
def health():
    return "OK", 200

# -- Entry Point ---------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True)
