"""Local dashboard API. Run with uvicorn meridian.api:app --reload."""

import csv
import io
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .models import model_report
from .portfolio import snapshot

Region = Literal["All regions", "Americas", "EMEA", "APAC"]
Scenario = Literal["base", "moderate", "severe"]
app = FastAPI(title="Meridian Risk", version="1.0.0", description="Synthetic credit and exposure analytics")


class StressRequest(BaseModel):
    region: Region = "All regions"
    shock: float = Field(default=0.08, ge=0, le=0.5)
    pd_multiplier: float = Field(default=1.6, ge=1, le=5)
    haircut_add: float = Field(default=0.04, ge=0, le=0.5)


@app.get("/api/health")
def health():
    return {"status": "ok", "application": "Meridian Risk"}


@app.get("/api/portfolio")
def get_portfolio(region: Region = "All regions", scenario: Scenario = "base"):
    return snapshot(region, scenario)


@app.post("/api/stress")
def run_stress(request: StressRequest):
    return snapshot(request.region, custom={**request.model_dump(), "label": "Custom stress"})


@app.get("/api/models")
def get_models():
    return model_report()


@app.get("/api/export")
def export_portfolio(region: Region = "All regions", scenario: Scenario = "base"):
    data = snapshot(region, scenario)
    out = io.StringIO()
    fields = ["id", "name", "region", "sector", "product", "rating", "net", "pfe", "limit", "utilization", "expected_loss", "initial_margin", "margin_due", "status"]
    writer = csv.DictWriter(out, fieldnames=["as_of", "data_source", "currency", "unit", "scenario", *fields], extrasaction="ignore")
    writer.writeheader()
    for row in data["counterparties"]:
        writer.writerow({**row, "as_of": data["as_of"], "data_source": "Synthetic demonstration",
                         "currency": "USD", "unit": "millions", "scenario": data["scenario"]})
    return Response(out.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="meridian-risk-portfolio.csv"'})


# Build with `cd dashboard && npm run build`; the API then serves the full app.
dist = Path(__file__).resolve().parent.parent / "dashboard" / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="dashboard")
