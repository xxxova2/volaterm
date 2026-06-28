import json
import sys
import time
import yfinance as yf

symbol = sys.argv[1] if len(sys.argv) > 1 else "SPY"

def safe_int(v):
    try:
        if v is None or v != v:
            return 0
        return int(v)
    except Exception:
        return 0

def safe_float(v):
    try:
        if v is None or v != v:
            return 0.0
        return float(v)
    except Exception:
        return 0.0

try:
    ticker = yf.Ticker(symbol)
    spot = ticker.info.get("regularMarketPrice") or ticker.info.get("previousClose", 0)
    if not spot or spot != spot:
        spot = 0

    expirations = ticker.options[:8]
    quotes = []

    for exp in expirations:
        chain = ticker.option_chain(exp)
        calls = chain.calls
        puts = chain.puts

        put_map = {row["strike"]: row for _, row in puts.iterrows()}

        for _, c in calls.iterrows():
            strike = safe_float(c["strike"])
            p = put_map.get(strike)

            quotes.append({
                "strike": strike,
                "expiry": exp,
                "type": "call",
                "bid": safe_float(c.get("bid")),
                "ask": safe_float(c.get("ask")),
                "last": safe_float(c.get("lastPrice")),
                "iv": safe_float(c.get("impliedVolatility")),
                "volume": safe_int(c.get("volume")),
                "openInterest": safe_int(c.get("openInterest")),
            })

            if p is not None:
                quotes.append({
                    "strike": strike,
                    "expiry": exp,
                    "type": "put",
                    "bid": safe_float(p.get("bid")),
                    "ask": safe_float(p.get("ask")),
                    "last": safe_float(p.get("lastPrice")),
                    "iv": safe_float(p.get("impliedVolatility")),
                    "volume": safe_int(p.get("volume")),
                    "openInterest": safe_int(p.get("openInterest")),
                })

    result = {
        "symbol": symbol,
        "spot": safe_float(spot),
        "expirations": expirations,
        "quotes": quotes,
        "timestamp": int(time.time() * 1000),
    }

    print(json.dumps(result))
except Exception as e:
    import traceback
    error_json = json.dumps({"error": str(e), "traceback": traceback.format_exc()})
    print(error_json)
    print(error_json, file=sys.stderr)
    sys.exit(1)
