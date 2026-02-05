"""Reproducible demonstration portfolio. All monetary values are USD millions."""

from functools import lru_cache

import numpy as np
from scipy.stats import norm

AS_OF = "2026-09-30"
NAMES = [
    ("Alder Capital", "Funds", "EMEA"),
    ("Northstar Industries", "Corporates", "Americas"),
    ("Seiwa Financial", "Financials", "APAC"),
    ("Cedar Asset Management", "Funds", "Americas"),
    ("Westbridge Holdings", "Corporates", "EMEA"),
    ("Pacific Union Bank", "Financials", "APAC"),
    ("Calder Infrastructure", "Corporates", "EMEA"),
    ("Ashford Partners", "Funds", "Americas"),
    ("Hinoki Securities", "Financials", "APAC"),
    ("Linden Energy", "Corporates", "Americas"),
    ("Atlas Pension Trust", "Funds", "EMEA"),
    ("Harbour Financial", "Financials", "APAC"),
    ("Vela Technologies", "Corporates", "Americas"),
    ("Juniper Credit Fund", "Funds", "EMEA"),
    ("Kestrel Insurance", "Financials", "Americas"),
    ("Takara Manufacturing", "Corporates", "APAC"),
    ("Birch Global Macro", "Funds", "EMEA"),
    ("Coral Commercial Bank", "Financials", "APAC"),
    ("Solstice Logistics", "Corporates", "EMEA"),
    ("Redwood Investments", "Funds", "Americas"),
    ("Sora Trading", "Corporates", "APAC"),
    ("Granite Capital", "Funds", "Americas"),
    ("Estuary Bank", "Financials", "EMEA"),
    ("Horizon Industrials", "Corporates", "APAC"),
]
PRODUCTS = ["Interest rate swaps", "FX forwards", "Equities", "Credit derivatives"]
VOLS = [0.035, 0.085, 0.20, 0.12]
RATINGS = ["AA", "A", "BBB", "BB", "B"]
PD = {"AA": 0.0004, "A": 0.001, "BBB": 0.004, "BB": 0.018, "B": 0.055}
SCENARIOS = {
    "base": {"label": "Base case", "shock": 0, "pd_multiplier": 1, "haircut_add": 0},
    "moderate": {"label": "Market correction", "shock": 0.08, "pd_multiplier": 1.6, "haircut_add": 0.04},
    "severe": {"label": "Severe downturn", "shock": 0.20, "pd_multiplier": 2.8, "haircut_add": 0.12},
}


@lru_cache
def portfolio():
    rng = np.random.default_rng(42)
    result = []
    for i, (name, sector, region) in enumerate(NAMES):
        product = i % 4
        notional = float(rng.uniform(250, 1100))
        gross = float(rng.uniform(50, 165))
        collateral = gross * float(rng.uniform(0.40, 0.90))
        rating = RATINGS[[3, 2, 1, 2, 4, 1, 2, 1, 0, 3, 0, 1][i % 12]]
        net = max(gross - collateral * 0.95, 0)
        addon = notional * VOLS[product] * norm.ppf(0.95) * np.sqrt(10 / 252)
        limit = (net + addon) / ([1.12, 0.96, 0.72, 0.65, 1.06, 0.52][i % 6])
        result.append({
            "id": f"MR-{1001+i}", "name": name, "sector": sector, "region": region,
            "product": PRODUCTS[product], "rating": rating, "pd": PD[rating],
            "lgd": 0.45, "notional": notional, "gross": gross,
            "collateral": collateral, "haircut": 0.05, "limit": limit,
            "volatility": VOLS[product], "margin_posted": addon * float(rng.uniform(0.85, 1.65)),
            "previous_net": net * float(rng.uniform(0.92, 1.06)),
            "review_date": f"2026-10-{3 + (i * 3) % 26:02d}",
            "leverage": round(float(rng.uniform(1.2, 5.9)), 1),
            "interest_cover": round(float(rng.uniform(1.4, 9.0)), 1),
        })
    return result


@lru_cache
def market_returns():
    """756 shared observations preserve cross-product dependence in aggregation."""
    rng = np.random.default_rng(7)
    common = rng.standard_t(6, 756) * np.sqrt(4 / 6)
    specific = rng.standard_normal((756, 4))
    return (0.55 * common[:, None] + np.sqrt(1 - 0.55**2) * specific) * np.array(VOLS) / np.sqrt(252)


def assess(row, shock=0, pd_multiplier=1, haircut_add=0):
    haircut = min(row["haircut"] + haircut_add, 1)
    gross = row["gross"] + row["notional"] * row["volatility"] * shock
    net = max(gross - row["collateral"] * (1 - haircut), 0)
    addon = row["notional"] * row["volatility"] * (1 + shock) * norm.ppf(0.95) * np.sqrt(10 / 252)
    pfe = net + addon
    pd = min(row["pd"] * pd_multiplier, 1)
    losses = -market_returns()[:, PRODUCTS.index(row["product"])] * row["notional"]
    im = max(float(np.quantile(losses, 0.99)), 0) * np.sqrt(10) * (1 + shock)
    return {**row, "gross": gross, "net": net, "pfe": pfe, "pd": pd,
            "haircut": haircut, "expected_loss": net * pd * row["lgd"],
            "initial_margin": im, "margin_due": max(im - row["margin_posted"], 0),
            "utilization": pfe / row["limit"],
            "status": "Breach" if pfe > row["limit"] else "Watch" if pfe > row["limit"] * 0.9 else "Within limit"}


def snapshot(region="All regions", scenario="base", custom=None):
    params = custom or SCENARIOS[scenario]
    rows = [assess(r, params["shock"], params["pd_multiplier"], params["haircut_add"])
            for r in portfolio() if region == "All regions" or r["region"] == region]
    totals = {key: sum(r[key] for r in rows) for key in
              ["gross", "net", "pfe", "collateral", "expected_loss", "initial_margin", "margin_due", "limit", "previous_net"]}
    totals.update({"counterparties": len(rows), "breaches": sum(int(r["utilization"] > 1) for r in rows),
                   "watch": sum(int(0.9 < r["utilization"] <= 1) for r in rows),
                   "weighted_pd": sum(r["pd"] * r["net"] for r in rows) / totals["net"],
                   "utilization": totals["pfe"] / totals["limit"],
                   "change": totals["net"] - totals["previous_net"]})
    groups = [{"name": name, "value": sum(r["net"] for r in rows if r["product"] == name)} for name in PRODUCTS]
    # Illustrative history anchored to the selected scenario's computed final exposure.
    rng = np.random.default_rng(11)
    path = np.cumsum(rng.normal(0.0025, 0.017, 90))
    path = np.exp(path - path[-1])
    dates = np.arange(np.datetime64("2026-07-03"), np.datetime64("2026-10-01"))
    history = [{"date": str(day), "net": totals["net"] * float(factor),
                "pfe": totals["pfe"] * float(factor), "limit": totals["limit"]}
               for day, factor in zip(dates, path)]
    # Portfolio VaR uses aggregated same-day losses, not a sum of individual quantiles.
    weights = np.array([sum(r["notional"] for r in rows if r["product"] == p) for p in PRODUCTS])
    losses = -market_returns() @ weights * (1 + params["shock"])
    var = float(np.quantile(losses, 0.99))
    es = float(losses[losses >= var].mean())
    return {"as_of": AS_OF, "currency": "USD", "unit": "millions", "synthetic": True,
            "scenario": params["label"], "region": region, "totals": totals,
            "counterparties": sorted(rows, key=lambda r: r["utilization"], reverse=True),
            "concentration": groups, "history": history,
            "market_risk": {"var_99": var, "expected_shortfall_99": es, "observations": len(losses), "horizon_days": 1}}
