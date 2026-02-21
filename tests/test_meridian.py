"""Financial invariants and HTTP contracts for the risk workbench."""

import csv
import io

import pytest
from fastapi.testclient import TestClient

from meridian.api import app
from meridian.portfolio import assess, portfolio, snapshot

client = TestClient(app)


def test_collateral_cannot_create_negative_exposure():
    row = {**portfolio()[0], "collateral": 1_000_000}
    result = assess(row)
    assert result["net"] == 0
    assert result["expected_loss"] == 0
    assert result["pfe"] > 0


def test_expected_loss_and_limit_contract():
    for row in snapshot()["counterparties"]:
        assert row["expected_loss"] == pytest.approx(row["net"] * row["pd"] * row["lgd"])
        assert row["pfe"] >= row["net"] >= 0
        assert row["margin_due"] >= 0
        assert (row["status"] == "Breach") == (row["pfe"] > row["limit"])


def test_regions_reconcile_to_global_totals():
    global_data = snapshot()
    regional = [snapshot(region) for region in ["Americas", "EMEA", "APAC"]]
    for metric in ["net", "pfe", "expected_loss", "collateral", "margin_due", "breaches"]:
        assert sum(r["totals"][metric] for r in regional) == pytest.approx(global_data["totals"][metric])
    assert sum(p["value"] for p in global_data["concentration"]) == pytest.approx(global_data["totals"]["net"])
    assert global_data["history"][-1]["net"] == pytest.approx(global_data["totals"]["net"])
    assert len(global_data["history"]) == 90


def test_stress_is_monotonic_and_does_not_mutate_base():
    base = snapshot()
    moderate = snapshot(scenario="moderate")
    severe = snapshot(scenario="severe")
    for metric in ["net", "pfe", "expected_loss", "margin_due", "breaches"]:
        assert base["totals"][metric] <= moderate["totals"][metric] <= severe["totals"][metric]
    assert base == snapshot()
    assert snapshot(custom={"shock": 0, "pd_multiplier": 1, "haircut_add": 0, "label": "Custom"})["totals"] == base["totals"]


def test_var_expected_shortfall_ordering():
    risk = snapshot()["market_risk"]
    assert risk["expected_shortfall_99"] >= risk["var_99"] > 0
    assert risk["observations"] == 756


def test_portfolio_api_serializes_all_metrics():
    response = client.get('/api/portfolio')
    assert response.status_code == 200
    assert response.json()["synthetic"] is True
    assert response.json()["totals"]["counterparties"] == 24
    apac = client.get('/api/portfolio', params={"region": "APAC"}).json()
    assert len(apac["counterparties"]) == 8
    assert all(r["region"] == "APAC" for r in apac["counterparties"])


@pytest.mark.parametrize('params', [{"region": "unknown"}, {"scenario": "unknown"}])
def test_unknown_filters_rejected(params):
    assert client.get('/api/portfolio', params=params).status_code == 422


@pytest.mark.parametrize('payload', [{"shock": -1}, {"pd_multiplier": 0}, {"haircut_add": 2}, {"region": "unknown"}, {"shock": "invalid"}])
def test_invalid_stress_inputs_rejected(payload):
    assert client.post('/api/stress', json=payload).status_code == 422


def test_stress_endpoint_recalculates_selected_region():
    result = client.post('/api/stress', json={"region": "EMEA", "shock": 0.2, "pd_multiplier": 2.8, "haircut_add": 0.12})
    assert result.status_code == 200
    assert result.json()["totals"]["net"] > snapshot("EMEA")["totals"]["net"]


def test_csv_preserves_scope_and_provenance():
    result = client.get('/api/export', params={"region": "APAC", "scenario": "severe"})
    assert result.status_code == 200
    assert "attachment" in result.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(result.text)))
    assert len(rows) == 8
    assert all(r["region"] == "APAC" and r["scenario"] == "Severe downturn" and r["data_source"] == "Synthetic demonstration" for r in rows)
    assert sum(float(r["net"]) for r in rows) == pytest.approx(snapshot("APAC", "severe")["totals"]["net"])


def test_model_is_evaluated_on_held_out_data():
    result = client.get('/api/models')
    assert result.status_code == 200
    data = result.json()
    assert data["train_samples"] == 1680
    assert data["test_samples"] == 720
    assert 0.5 < data["auc"] < 1
    assert data["gini"] == pytest.approx(2 * data["auc"] - 1)
    assert 0 <= data["ks"] <= 1
    assert data["psi"] >= 0
    assert all(sum(b["count"] for b in v["bins"]) == data["train_samples"] for v in data["variables"])
