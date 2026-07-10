import yfinance as yf
import numpy as np
from scipy.stats import norm
from scipy.interpolate import griddata
from datetime import datetime, date
import math


def bs_price(S, K, T, r, q, sigma, option_type="call"):
    if T <= 0 or sigma <= 0:
        return 0.0
    d1 = (math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    if option_type == "call":
        return S * math.exp(-q * T) * norm.cdf(d1) - K * math.exp(-r * T) * norm.cdf(d2)
    else:
        return K * math.exp(-r * T) * norm.cdf(-d2) - S * math.exp(-q * T) * norm.cdf(-d1)


def compute_greeks(S, K, T, r, q, sigma, option_type="call"):
    """
    Black-Scholes greeks — market desk convention (aligned with terminal TS computeGreeks):
      θ, charm → per calendar day (/365)
      ν       → per 1 volatility point (/100)
      vanna   → ∂²V/∂S∂σ on raw-σ scale
    """
    if T <= 0 or sigma <= 0:
        return None
    d1 = (math.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    sqrt_T = math.sqrt(T)
    exp_qT = math.exp(-q * T)
    exp_rT = math.exp(-r * T)
    pdf_d1 = norm.pdf(d1)

    if option_type == "call":
        delta = exp_qT * norm.cdf(d1)
        theta = (
            -(S * exp_qT * pdf_d1 * sigma) / (2 * sqrt_T)
            - r * K * exp_rT * norm.cdf(d2)
            + q * S * exp_qT * norm.cdf(d1)
        ) / 365
    else:
        delta = -exp_qT * norm.cdf(-d1)
        theta = (
            -(S * exp_qT * pdf_d1 * sigma) / (2 * sqrt_T)
            + r * K * exp_rT * norm.cdf(-d2)
            - q * S * exp_qT * norm.cdf(-d1)
        ) / 365

    gamma = (exp_qT * pdf_d1) / (S * sigma * sqrt_T)
    vega = S * exp_qT * pdf_d1 * sqrt_T / 100  # per 1 vol point

    # Vanna: ∂²V/∂S∂σ (per 1 vol unit; scale carefully in UI)
    vanna = -exp_qT * pdf_d1 * d2 / sigma

    # Charm (delta decay) — Wikipedia / Haug analytic form, then /365 for per-day
    # call: -e^{-qT} [ n(d1)·(2(r-q)T − d2 σ√T)/(2T σ √T) − q N(d1) ]
    # put:  -e^{-qT} [ n(d1)·(2(r-q)T − d2 σ√T)/(2T σ √T) + q N(-d1) ]
    term = pdf_d1 * (2 * (r - q) * T - d2 * sigma * sqrt_T) / (2 * T * sigma * sqrt_T)
    if option_type == "call":
        charm_annual = -exp_qT * (term - q * norm.cdf(d1))
    else:
        charm_annual = -exp_qT * (term + q * norm.cdf(-d1))
    charm = charm_annual / 365

    return {
        "delta": round(delta, 4) if math.isfinite(delta) else 0,
        "gamma": round(gamma, 6) if math.isfinite(gamma) else 0,
        "vega": round(vega, 4) if math.isfinite(vega) else 0,
        "theta": round(theta, 4) if math.isfinite(theta) else 0,
        "vanna": round(vanna, 4) if math.isfinite(vanna) else 0,
        "charm": round(charm, 6) if math.isfinite(charm) else 0,
    }


def otm_points(points: list, spot: float) -> list:
    """Market OTM convention: put wing K < spot, call wing K ≥ spot."""
    out = []
    for p in points:
        K = p.get("K")
        t = p.get("type")
        if K is None or t not in ("call", "put"):
            continue
        if t == "put" and K < spot:
            out.append(p)
        elif t == "call" and K >= spot:
            out.append(p)
    return out


def compute_iv(market_price, S, K, T, r, q, option_type="call"):
    if T <= 0 or market_price <= 0:
        return None
    disc_s = S * math.exp(-q * T)
    disc_k = K * math.exp(-r * T)
    intrinsic = max(0.0, disc_s - disc_k) if option_type == "call" else max(0.0, disc_k - disc_s)
    if market_price < intrinsic * 0.99:
        return None
    lo, hi = 0.001, 5.0
    for _ in range(200):
        mid = (lo + hi) / 2
        price = bs_price(S, K, T, r, q, mid, option_type)
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


def build_greeks_surface(ticker: str, r: float = 0.05, q: float = 0.0, curve_points=None) -> dict:
    stock = yf.Ticker(ticker)
    spot = stock.fast_info.get("lastPrice") or stock.fast_info.get("previousClose")
    if not spot:
        hist = stock.history(period="1d")
        spot = float(hist["Close"].iloc[-1])

    today = date.today()
    expiries = stock.options[:8]

    all_points = []

    for exp_str in expiries:
        exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
        T = (exp_date - today).days / 365.0
        if T < 3 / 365:
            continue
        r_t = _r_for_T(T, r, curve_points)
        try:
            chain = stock.option_chain(exp_str)
        except Exception:
            continue

        for _, row in chain.calls.iterrows():
            pt = _point_from_row(row, spot, T, r_t, q, "call")
            if pt:
                all_points.append(pt)

        for _, row in chain.puts.iterrows():
            pt = _point_from_row(row, spot, T, r_t, q, "put")
            if pt:
                all_points.append(pt)

    if not all_points:
        raise ValueError(f"No valid options data for {ticker}")

    nearest_T = min(set(p["T"] for p in all_points))
    atm_calls = [p for p in all_points if p["T"] == nearest_T and p["type"] == "call"]
    atm_point = min(atm_calls, key=lambda p: abs(p["K"] - spot)) if atm_calls else None

    gex_list = build_gex_strikes(all_points, spot)
    flip = compute_gex_flip(gex_list, spot)

    return {
        "ticker": ticker,
        "spot": float(spot),
        "timestamp": datetime.now().isoformat(),
        "total_points": len(all_points),
        "atm": atm_point,
        "gex": gex_list,
        "gex_flip": flip,
        "gex_convention": (
            "Naive dealer convention: call GEX = +γ·OI·100·S²·0.01, put GEX = −γ·OI·100·S²·0.01. "
            "Assumes dealers short calls / long puts. Not a position inventory model."
        ),
        "r": r,
        "q": q,
        "r_mode": "term_structure" if curve_points else "flat",
        "points": all_points,
    }


def _point_from_row(row, spot, T, r, q, option_type: str):
    K = float(row["strike"])
    if K < spot * 0.85 or K > spot * 1.15:
        return None
    bid = float(row.get("bid", 0) or 0)
    ask = float(row.get("ask", 0) or 0)
    last = float(row.get("lastPrice", 0) or 0)
    oi_raw = row.get("openInterest", 0)
    oi = float(oi_raw) if oi_raw and not (isinstance(oi_raw, float) and math.isnan(oi_raw)) else 0.0
    if bid > 0 and ask > 0:
        mid = (bid + ask) / 2
    elif last > 0:
        mid = last
    else:
        return None
    iv = compute_iv(mid, spot, K, T, r, q, option_type)
    # Keep in sync with VALIDATION_CONFIG.ranges (TS) and iv_calculator (Python).
    if not iv or iv < 0.01 or iv > 3.0:
        return None
    greeks = compute_greeks(spot, K, T, r, q, iv, option_type)
    if not greeks:
        return None
    return {
        "T": round(T, 4),
        "K": K,
        "iv": round(iv * 100, 2),
        "oi": oi,
        "type": option_type,
        **greeks,
    }


def _gex_unit(gamma: float, oi: float, spot: float, option_type: str) -> float:
    """Dollar gamma exposure for 1% spot move. Call +, put − (naive dealer convention)."""
    sign = 1 if option_type == "call" else -1
    return sign * gamma * oi * 100 * spot * spot * 0.01


def build_gex_grid(points: list, spot: float, n_T: int = 25, n_K: int = 35) -> dict:
    data = []
    for p in points:
        g = p.get("gamma")
        oi = p.get("oi", 0)
        if g is None or not oi:
            continue
        gex = _gex_unit(g, oi, spot, p["type"])
        if math.isfinite(gex):
            data.append((p["T"], p["K"], gex))
    if len(data) < 10:
        return {"T_vals": [], "K_vals": [], "grid": []}
    return _interpolate_grid(data, n_T, n_K, decimals=2)


def build_gex_strikes(points: list, spot: float) -> list:
    gex_by_strike = {}
    for p in points:
        K = p["K"]
        g = p.get("gamma")
        oi = p.get("oi", 0)
        if g and oi and math.isfinite(g):
            gex = _gex_unit(g, oi, spot, p["type"])
            if math.isfinite(gex):
                gex_by_strike[K] = gex_by_strike.get(K, 0) + gex
    return [{"strike": k, "gex": round(v, 2)} for k, v in sorted(gex_by_strike.items()) if math.isfinite(v)]


def compute_gex_flip(gex_list: list, spot: float) -> dict | None:
    """
    Zero-crossing of strike-aggregated GEX nearest to spot (not first sign change in list).
    Returns strike and side of spot.
    """
    if not gex_list or len(gex_list) < 2:
        return None
    crossings = []
    for i in range(1, len(gex_list)):
        a, b = gex_list[i - 1], gex_list[i]
        ga, gb = a["gex"], b["gex"]
        if ga == 0:
            crossings.append(a["strike"])
        elif ga * gb < 0:
            # linear interpolate zero
            w = abs(ga) / (abs(ga) + abs(gb))
            crossings.append(a["strike"] + w * (b["strike"] - a["strike"]))
    if not crossings:
        return None
    flip = min(crossings, key=lambda k: abs(k - spot))
    return {
        "strike": round(flip, 2),
        "spot_vs_flip": "above" if spot > flip else "below" if spot < flip else "at",
        "net_gex": round(sum(g["gex"] for g in gex_list), 2),
    }


def build_charm_exposure_grid(points: list, spot: float, n_T: int = 25, n_K: int = 35) -> dict:
    """
    Charm exposure ≈ charm_per_day × OI × 100 × S
    (dollar-delta change per day for 1% is NOT the right scale — this is Δ$ per day).
    Call +, put − under same naive dealer sign convention as GEX.
    """
    data = []
    for p in points:
        c = p.get("charm")
        oi = p.get("oi", 0)
        if c is None or not oi:
            continue
        sign = 1 if p["type"] == "call" else -1
        # Dollar-delta decay per calendar day
        exposure = sign * c * oi * 100 * spot
        if math.isfinite(exposure):
            data.append((p["T"], p["K"], exposure))
    if len(data) < 10:
        return {"T_vals": [], "K_vals": [], "grid": []}
    return _interpolate_grid(data, n_T, n_K, decimals=2)


def build_interpolated_surface(
    points: list,
    greek_key: str,
    n_T: int = 25,
    n_K: int = 35,
    *,
    spot: float | None = None,
    otm_only: bool = True,
) -> dict:
    """
    Interpolate a greek surface. Default otm_only=True so call/put deltas are
    not averaged into nonsense near ATM (matches terminal 3D / heatmap OTM).
    """
    src = points
    if otm_only and spot is not None and spot > 0:
        filtered = otm_points(points, spot)
        if len(filtered) >= 10:
            src = filtered
    data = [(p["T"], p["K"], p[greek_key]) for p in src if p.get(greek_key) is not None]
    if len(data) < 10:
        return {"T_vals": [], "K_vals": [], "grid": []}
    return _interpolate_grid(data, n_T, n_K, decimals=6)


def _interpolate_grid(data: list, n_T: int, n_K: int, decimals: int = 4) -> dict:
    arr = np.array(data)
    T_vals = np.linspace(arr[:, 0].min(), arr[:, 0].max(), n_T)
    K_vals = np.linspace(arr[:, 1].min(), arr[:, 1].max(), n_K)
    T_grid, K_grid = np.meshgrid(T_vals, K_vals)
    grid = griddata(arr[:, :2], arr[:, 2], (T_grid, K_grid), method="cubic")
    grid_linear = griddata(arr[:, :2], arr[:, 2], (T_grid, K_grid), method="linear")
    grid_nearest = griddata(arr[:, :2], arr[:, 2], (T_grid, K_grid), method="nearest")
    mask = np.isnan(grid)
    grid[mask] = grid_linear[mask]
    mask2 = np.isnan(grid)
    grid[mask2] = grid_nearest[mask2]
    return {
        "T_vals": [round(float(t), 4) for t in T_vals],
        "K_vals": [round(float(k), 2) for k in K_vals],
        "grid": [[round(float(v), decimals) if not np.isnan(v) else None for v in row] for row in grid.T],
    }
