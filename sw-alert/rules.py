# --- per-collection metrics -----------------------------------------------
RULES = {

# 1) propagated solar-wind  -------------------------------------
"solar_wind": [
    {
      "code":  "HIGH_SPEED_STREAM",
      "ttl":     300,
      "level": "info",
      "when":  lambda d: d.get("speed", 0) >= 600,
      "payload": lambda d: {"speed": d["speed"]},
    },
],

# 2) realtime DSCOVR IMF  ---------------------------------------------
"rtsw_mag": [
    {
      "code":  "BZ_STRONG_SOUTH",
      "ttl":     600,
      "level": "warning",
      "when":  lambda d: d.get("bz_gsm", 0) <= -8,
      "payload": lambda d: {"bz": d["bz_gsm"]},
    },
],



# planetary K index ------------------------------------------------
"planetary_k_index": [
    {
        "code":    "KP_G1",
        "level":   "warning",
        "ttl":     300,
        "when":    lambda d: 5.0 <= d.get("kp_index", 0) < 6.0,
        "payload": lambda d: {"kp": d["kp_index"]},
    },
    {
        "code":    "KP_G2",
        "level":   "warning",
        "ttl":     300,
        "when":    lambda d: 6.0 <= d.get("kp_index", 0) < 7.0,
        "payload": lambda d: {"kp": d["kp_index"]},
    },
    {
        "code":    "KP_G3",
        "level":   "critical",
        "ttl":     300,
        "when":    lambda d: 7.0 <= d.get("kp_index", 0) < 8.0,
        "payload": lambda d: {"kp": d["kp_index"]},
    },
    {
        "code":    "KP_G4",
        "level":   "critical",
        "ttl":     300,
        "when":    lambda d: 8.0 <= d.get("kp_index", 0) < 9.0,
        "payload": lambda d: {"kp": d["kp_index"]},
    },
    {
        "code":    "KP_G5",
        "level":   "critical",
        "ttl":     300,
        "when":    lambda d: d.get("kp_index", 0) >= 9.0,
        "payload": lambda d: {"kp": d["kp_index"]},
    },
],

#  GOES X-ray flares - warn on M-class or above
"xray_flares": [
    {
        "code":  "XRAY_FLARE_M1",
        "ttl":     600,
        "level": "warning",
        "when":  lambda d: (
            # d["max_class"] comes in as "B7.2", "C1.2", "M2.5", "X1.0"
            isinstance(d.get("max_class"), str)
            and d["max_class"][0] in ("M")
            and float(d["max_class"][1:]) >= 1.0
        ),
        "payload": lambda d: {
            "max_class":   d["max_class"],
            "max_time":    d.get("max_time"),
            "begin_class": d.get("begin_class"),
            "satellite":   d.get("satellite"),
        },
    },
    {
        "code":  "XRAY_FLARE_X1",
        "ttl":     900,
        "level": "critical",
        "when":  lambda d: (
            isinstance(d.get("max_class"), str)
            and d["max_class"][0] == "X"
            and float(d["max_class"][1:]) >= 1.0
        ),
        "payload": lambda d: {
            "max_class": d["max_class"],
            "max_time":  d.get("max_time"),
            "satellite": d.get("satellite"),
        },
    },
],

}
