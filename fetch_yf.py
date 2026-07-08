import json
import sys
import time
import yfinance as yf

symbol = sys.argv[1] if len(sys.argv) > 1 else "SPY"
mode = sys.argv[2] if len(sys.argv) > 2 else "history"


def safe_float(v):
    try:
        if v is None or v != v:
            return 0.0
        return float(v)
    except Exception:
        return 0.0


def safe_int(v):
    try:
        if v is None or v != v:
            return 0
        return int(v)
    except Exception:
        return 0


def fetch_history(sym):
    """~1y of daily OHLCV, normalised to the same shape the frontend expects."""
    ticker = yf.Ticker(sym)
    hist = ticker.history(period="1y", interval="1d", auto_adjust=False)
    rows = []
    for idx, row in hist.iterrows():
        rows.append({
            "date": idx.strftime("%Y-%m-%d"),
            "open": safe_float(row.get("Open")),
            "high": safe_float(row.get("High")),
            "low": safe_float(row.get("Low")),
            "close": safe_float(row.get("Close")),
            "volume": safe_int(row.get("Volume")),
        })
    return {"symbol": sym, "bars": rows}


def fetch_info(sym):
    """Curated fundamentals. yfinance `info` is slow/rate-limited; return whatever we get."""
    ticker = yf.Ticker(sym)
    info = {}
    try:
        info = ticker.info or {}
    except Exception:
        info = {}
    officers = info.get("companyOfficers") or []
    rng = info.get("fiftyTwoWeekRange") or ""
    return {
        "symbol": sym,
        "companyName": info.get("shortName") or info.get("longName"),
        "marketCap": safe_float(info.get("marketCap")),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "website": info.get("website"),
        "description": info.get("longBusinessSummary"),
        "ceo": (officers[0].get("name") if officers else None),
        "exchange": info.get("exchange"),
        "beta": safe_float(info.get("beta")),
        "range": rng,
        "trailingPE": safe_float(info.get("trailingPE")),
        "dividendYield": safe_float(info.get("dividendYield")),
        "fullTimeEmployees": safe_int(info.get("fullTimeEmployees")),
    }


try:
    if mode == "info":
        result = fetch_info(symbol)
    else:
        result = fetch_history(symbol)
    print(json.dumps(result))
except Exception as e:
    import traceback
    error_json = json.dumps({"error": str(e), "traceback": traceback.format_exc()})
    print(error_json)
    print(error_json, file=sys.stderr)
    sys.exit(1)
