import yfinance as yf
import numpy as np
from scipy.stats import norm
from scipy.interpolate import griddata
from datetime import datetime, date
import math

def black_scholes_price(S, K, T, r, q, sigma, option_type="call"):
    if T <= 0 or sigma <= 0:
        return 0.0
    d1 = (math.log(S/K) + (r - q + 0.5*sigma**2)*T) / (sigma*math.sqrt(T))
    d2 = d1 - sigma*math.sqrt(T)
    if option_type == "call":
        return S*math.exp(-q*T)*norm.cdf(d1) - K*math.exp(-r*T)*norm.cdf(d2)
    else:
        return K*math.exp(-r*T)*norm.cdf(-d2) - S*math.exp(-q*T)*norm.cdf(-d1)

def implied_volatility(market_price, S, K, T, r, q, option_type="call"):
    if T <= 0 or market_price <= 0:
        return None
    # European discounted intrinsic (matches TS ivSolver / yahoo pipeline).
    disc_s = S * math.exp(-q * T)
    disc_k = K * math.exp(-r * T)
    intrinsic = max(0.0, disc_s - disc_k) if option_type == "call" else max(0.0, disc_k - disc_s)
    if market_price < intrinsic * 0.99:
        return None
    lo, hi = 0.001, 5.0
    for _ in range(200):
        mid = (lo + hi) / 2
        price = black_scholes_price(S, K, T, r, q, mid, option_type)
        if abs(price - market_price) < 1e-6:
            return mid
        if price > market_price:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2

def _r_for_T(T: float, r: float, curve_points=None) -> float:
    if not curve_points:
        return r
    try:
        from services.rate_risk import interpolate_r
        return interpolate_r(curve_points, T)
    except Exception:
        return r


def build_iv_surface(
    ticker: str,
    r: float = 0.05,
    q: float = 0.0,
    strike_range: float = 0.3,
    curve_points=None,
) -> dict:
    stock = yf.Ticker(ticker)
    spot = stock.fast_info.get("lastPrice") or stock.fast_info.get("previousClose")
    if not spot:
        hist = stock.history(period="1d")
        spot = float(hist["Close"].iloc[-1])

    today = date.today()
    raw_points = []

    for exp_str in stock.options:
        exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
        T = (exp_date - today).days / 365.0
        if T < 7/365 or T > 3.0:
            continue
        r_t = _r_for_T(T, r, curve_points)
        try:
            chain = stock.option_chain(exp_str)
        except Exception:
            continue

        # Calls + puts (OTM preferred later via filter) for denser smile / less call-only bias
        for opt_type, frame in (("call", chain.calls), ("put", chain.puts)):
            for _, row in frame.iterrows():
                K = float(row["strike"])
                if K < spot * (1 - strike_range) or K > spot * (1 + strike_range):
                    continue
                # Prefer OTM: calls above spot, puts below — reduces deep ITM IV noise
                if opt_type == "call" and K < spot * 0.98:
                    continue
                if opt_type == "put" and K > spot * 1.02:
                    continue
                bid = float(row.get("bid", 0) or 0)
                ask = float(row.get("ask", 0) or 0)
                volume = float(row.get("volume", 0) or 0)
                oi = float(row.get("openInterest", 0) or 0)
                if bid <= 0 or volume < 5 or oi < 20:
                    continue
                mid = (bid + ask) / 2
                iv = implied_volatility(mid, spot, K, T, r_t, q, opt_type)
                # Keep in sync with VALIDATION_CONFIG.ranges (TS) and greeks_calculator.
                if iv and 0.01 < iv < 3.0:
                    raw_points.append((T, K, iv * 100))

    if len(raw_points) < 10:
        raise ValueError(f"Not enough valid options data for {ticker} (got {len(raw_points)} points)")

    raw_points = np.array(raw_points)

    T_vals = np.linspace(raw_points[:,0].min(), raw_points[:,0].max(), 30)
    K_vals = np.linspace(raw_points[:,1].min(), raw_points[:,1].max(), 40)
    T_grid, K_grid = np.meshgrid(T_vals, K_vals)

    iv_grid = griddata(
        points=raw_points[:, :2],
        values=raw_points[:, 2],
        xi=(T_grid, K_grid),
        method="cubic"
    )

    iv_grid_linear = griddata(
        points=raw_points[:, :2],
        values=raw_points[:, 2],
        xi=(T_grid, K_grid),
        method="linear"
    )
    mask = np.isnan(iv_grid)
    iv_grid[mask] = iv_grid_linear[mask]

    iv_grid_nearest = griddata(
        points=raw_points[:, :2],
        values=raw_points[:, 2],
        xi=(T_grid, K_grid),
        method="nearest"
    )
    mask2 = np.isnan(iv_grid)
    iv_grid[mask2] = iv_grid_nearest[mask2]

    return {
        "ticker": ticker,
        "spot": float(spot),
        "expiries": [round(float(t), 4) for t in T_vals],
        "strikes": [round(float(k), 2) for k in K_vals],
        "iv_grid": [[round(float(v), 4) if not np.isnan(v) else None for v in row] for row in iv_grid.T],
        "timestamp": datetime.now().isoformat(),
        "raw_points": len(raw_points),
        "r_mode": "term_structure" if curve_points else "flat",
    }
