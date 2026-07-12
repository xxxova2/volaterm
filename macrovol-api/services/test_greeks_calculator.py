"""Unit matrix for compute_greeks — aligns with TS src/lib/options/greeks.units.test.ts."""
import math
import sys
from pathlib import Path

# Allow `python -m pytest services/test_greeks_calculator.py` from macrovol-api/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.greeks_calculator import compute_greeks, otm_points


def test_theta_charm_per_day_vega_per_vol_point():
    g = compute_greeks(100, 100, 0.25, 0.05, 0.01, 0.2, "call")
    assert g is not None
    assert abs(g["theta"]) < 1
    assert abs(g["charm"]) < 0.01
    assert g["theta"] < 0
    assert 0.05 < g["vega"] < 2


def test_otm_points_convention():
    pts = [
        {"K": 90, "type": "put"},
        {"K": 100, "type": "put"},
        {"K": 100, "type": "call"},
        {"K": 110, "type": "call"},
    ]
    out = otm_points(pts, 100)
    keys = {(p["type"], p["K"]) for p in out}
    assert ("put", 90) in keys
    assert ("call", 100) in keys
    assert ("call", 110) in keys
    assert ("put", 100) not in keys


def test_golden_atm_call():
    g = compute_greeks(100, 100, 0.25, 0.05, 0.01, 0.2, "call")
    assert g is not None
    assert abs(g["delta"] - 0.5582) < 1e-3
    assert abs(g["vega"] - 0.1967) < 1e-3
    assert abs(g["theta"] - (-0.0271)) < 1e-3
    assert abs(g["charm"] - (-0.000308)) < 1e-5
    assert abs(g["vanna"] - (-0.0984)) < 1e-3
