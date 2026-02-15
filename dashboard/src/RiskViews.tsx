import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Info,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  api,
  money,
  percent,
  type Snapshot,
  type Region,
  type ModelReport,
} from "./types";
import { RocChart } from "./Charts";
import { Status } from "./Counterparties";

export function Exposures({ data }: { data: Snapshot }) {
  const t = data.totals;
  return (
    <>
      <div className="exposure-summary">
        <div className="dark-feature">
          <span className="eyebrow">COLLATERAL & MARGIN</span>
          <h2>
            Collateral
            <br />
            coverage
          </h2>
          <div className="coverage-ratio">
            {percent(t.collateral / t.gross)}
            <span>gross exposure collateralised</span>
          </div>
          <div className="coverage-track">
            <i style={{ width: percent(t.collateral / t.gross) }} />
          </div>
          <p>
            {money(t.collateral)} posted against {money(t.gross)} gross positive
            exposure.
          </p>
        </div>
        <div className="panel exposure-breakdown">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">EXPOSURE BRIDGE</span>
              <h2>From gross to potential</h2>
            </div>
          </div>
          {[
            ["Gross positive exposure", t.gross],
            ["Posted collateral", -t.collateral],
            ["Collateral haircut adjustment", t.collateral * 0.05],
            ["Current net exposure", t.net],
            ["Potential exposure add-on", t.pfe - t.net],
            ["Potential future exposure", t.pfe],
          ].map(([label, value], i) => (
            <div
              className={`bridge-row ${i === 3 || i === 5 ? "bridge-total" : ""}`}
              key={label}
            >
              <span>{label}</span>
              <b>
                {Number(value) < 0 ? "−" : ""}
                {money(Math.abs(Number(value)), 2)}
              </b>
            </div>
          ))}
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">DAILY MARGIN REVIEW</span>
            <h2>Collateralised counterparties</h2>
          </div>
          <span className="quiet-label">99% · 10-day horizon</span>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Risk data table"
        >
          <table>
            <thead>
              <tr>
                <th>Counterparty</th>
                <th>Product</th>
                <th>Initial margin estimate</th>
                <th>Margin posted</th>
                <th>Shortfall</th>
                <th>Credit limit</th>
              </tr>
            </thead>
            <tbody>
              {data.counterparties
                .toSorted((a, b) => b.margin_due - a.margin_due)
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td className="muted">{r.product}</td>
                    <td className="numeric">{money(r.initial_margin, 2)}</td>
                    <td className="numeric">{money(r.margin_posted, 2)}</td>
                    <td
                      className={`numeric ${r.margin_due > 0 ? "red-text" : ""}`}
                    >
                      {money(r.margin_due, 2)}
                    </td>
                    <td>
                      <Status value={r.status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          Historical simulation estimate using synthetic returns; not a SIMM
          calculation.
        </div>
      </section>
    </>
  );
}
export function StressTesting({
  base,
  region,
}: {
  base: Snapshot;
  region: Region;
}) {
  const [shock, setShock] = useState(8),
    [pd, setPd] = useState(1.6),
    [haircut, setHaircut] = useState(4);
  const [result, setResult] = useState<Snapshot | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [preset, setPreset] = useState("Market correction");
  useEffect(() => {
    setResult(null);
  }, [region]);
  const update = (setter: (n: number) => void, n: number) => {
    setter(n);
    setResult(null);
    setPreset("Custom scenario");
  };
  const choose = (name: string, s: number, p: number, h: number) => {
    setPreset(name);
    setShock(s);
    setPd(p);
    setHaircut(h);
    setResult(null);
  };
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<Snapshot>("/api/stress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region,
            shock: shock / 100,
            pd_multiplier: pd,
            haircut_add: haircut / 100,
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="scenario-presets">
        {[
          ["Base case", 0, 1, 0, "Current portfolio assumptions"],
          [
            "Market correction",
            8,
            1.6,
            4,
            "Higher volatility and weaker credit",
          ],
          ["Severe downturn", 20, 2.8, 12, "Combined market and credit stress"],
        ].map(([name, s, p, h, description]) => (
          <button
            key={name}
            className={`preset ${preset === name ? "selected" : ""}`}
            onClick={() =>
              choose(String(name), Number(s), Number(p), Number(h))
            }
          >
            <span>
              <i className="radio-mark" />
              <b>{name}</b>
            </span>
            <small>{description}</small>
          </button>
        ))}
      </div>
      <div className="stress-layout">
        <section className="panel scenario-controls">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SCENARIO PARAMETERS</span>
              <h2>Test your assumptions</h2>
            </div>
            <FlaskConical size={20} />
          </div>
          <div className="slider-fields">
            {[
              {
                label: "Market stress factor",
                value: shock,
                max: 50,
                min: 0,
                step: 1,
                suffix: "%",
                setter: setShock,
                hint: "Applied to notional × annual volatility.",
              },
              {
                label: "PD multiplier",
                value: pd,
                max: 5,
                min: 1,
                step: 0.1,
                suffix: "×",
                setter: setPd,
                hint: "Scales the one-year probability of default.",
              },
              {
                label: "Additional collateral haircut",
                value: haircut,
                max: 50,
                min: 0,
                step: 1,
                suffix: " pp",
                setter: setHaircut,
                hint: "Reduces the recognised collateral value.",
              },
            ].map((c) => (
              <label className="slider-field" key={c.label}>
                <span>
                  {c.label}
                  <b>
                    {c.value}
                    {c.suffix}
                  </b>
                </span>
                <input
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={c.value}
                  onChange={(e) => update(c.setter, Number(e.target.value))}
                />
                <small>{c.hint}</small>
              </label>
            ))}
          </div>
          <button
            disabled={busy}
            className="primary-button run-button"
            onClick={run}
          >
            {busy ? (
              <RefreshCw size={16} className="spinning" />
            ) : (
              <Play size={15} />
            )}
            {busy ? "Calculating…" : "Run scenario"}
          </button>
          {error && (
            <p role="alert" className="red-text">
              {error}
            </p>
          )}
          <p className="model-note">
            <Info size={14} />
            These are illustrative sensitivity assumptions, not a calibrated
            regulatory stress scenario.
          </p>
        </section>
        <section className="panel scenario-results">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PORTFOLIO IMPACT</span>
              <h2>{result ? preset : "Scenario comparison"}</h2>
            </div>
            <span className="quiet-label">{region}</span>
          </div>
          {result ? (
            <>
              <div className="comparison-header">
                <span>Risk measure</span>
                <span>Base</span>
                <span>Stressed</span>
              </div>
              {[
                ["Net exposure", "net"],
                ["Potential exposure", "pfe"],
                ["Expected loss", "expected_loss"],
                ["Initial margin", "initial_margin"],
                ["Limit breaches", "breaches"],
              ].map(([label, key]) => (
                <div className="comparison-row" key={key}>
                  <span>{label}</span>
                  <b>
                    {key === "breaches"
                      ? base.totals[key]
                      : money(base.totals[key], 2)}
                  </b>
                  <b
                    className={
                      result.totals[key] > base.totals[key] ? "red-text" : ""
                    }
                  >
                    {key === "breaches"
                      ? result.totals[key]
                      : money(result.totals[key], 2)}
                  </b>
                </div>
              ))}
              <div className="scenario-callout">
                <ArrowUpRight size={24} />
                <div>
                  <b>
                    {percent(
                      result.totals.expected_loss / base.totals.expected_loss -
                        1,
                    )}{" "}
                    change in expected loss
                  </b>
                  <p>
                    {money(
                      result.totals.expected_loss - base.totals.expected_loss,
                      2,
                    )}{" "}
                    above the base case under the selected assumptions.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="scenario-empty">
              <div className="scenario-graphic">
                <span />
                <span />
                <span />
                <ArrowRight size={24} />
              </div>
              <h3>Compare scenario results</h3>
              <p>
                Choose a scenario or adjust the parameters, then run the
                calculation to compare exposure, loss and margin.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function ModelValidation() {
  const [data, setData] = useState<ModelReport | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [feature, setFeature] = useState("Leverage");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    api<ModelReport>("/api/models", { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [retry]);
  if (error)
    return (
      <div className="panel loading-state" role="alert">
        <p>{error}</p>
        <button
          className="secondary-button"
          onClick={() => setRetry((v) => v + 1)}
        >
          Retry model validation
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="panel loading-state" role="status">
        <RefreshCw className="spinning" />
        <h2>Fitting the credit scorecard</h2>
        <p>Binning financial ratios and evaluating a held-out sample…</p>
      </div>
    );
  const variable = data.variables.find((v) => v.name === feature)!;
  return (
    <>
      <div className="model-banner">
        <div>
          <span className="eyebrow">OPTBINNING + LOGISTIC REGRESSION</span>
          <h2>{data.name}</h2>
          <p>
            {data.train_samples.toLocaleString()} training observations ·{" "}
            {data.test_samples} held-out observations · {data.defaults} held-out
            defaults
          </p>
        </div>
        <span className="demo-badge">
          <i />
          Synthetic validation
        </span>
      </div>
      <div className="metric-strip model-metrics">
        {[
          ["ROC AUC", data.auc.toFixed(3), "Out-of-sample discrimination"],
          ["Gini coefficient", data.gini.toFixed(3), "2 × AUC − 1"],
          [
            "KS statistic",
            data.ks.toFixed(3),
            "Default / non-default separation",
          ],
          [
            "Population stability",
            data.psi.toFixed(3),
            "Train vs. held-out score distribution",
          ],
        ].map(([title, value, hint]) => (
          <div className="metric" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      <div className="model-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">DISCRIMINATION</span>
              <h2>Receiver operating characteristic</h2>
            </div>
          </div>
          <RocChart data={data} />
          <p className="panel-caption">
            True positive rate against false positive rate on the held-out
            sample.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">VARIABLE DIAGNOSTICS</span>
              <h2>Information value</h2>
            </div>
          </div>
          <div className="feature-list">
            {data.variables.map((v) => (
              <button
                key={v.name}
                className={feature === v.name ? "selected" : ""}
                onClick={() => setFeature(v.name)}
              >
                <span>
                  {v.name}
                  <small>
                    {v.bins.filter((b) => b.count > 0).length} populated bins ·{" "}
                    {v.status.toLowerCase()}
                  </small>
                </span>
                <b>{v.iv.toFixed(3)}</b>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
          <p className="panel-caption">
            Select a variable to inspect its optimal bins below.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">BINNING DIAGNOSTICS</span>
            <h2>{variable.name}</h2>
          </div>
          <span className="quiet-label">
            Weight of evidence · training sample
          </span>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Risk data table"
        >
          <table>
            <thead>
              <tr>
                <th>Bin interval</th>
                <th>Observations</th>
                <th>Default rate</th>
                <th>Weight of evidence</th>
              </tr>
            </thead>
            <tbody>
              {variable.bins.map((b) => (
                <tr key={b.bin}>
                  <td className="numeric">{b.bin}</td>
                  <td>{b.count}</td>
                  <td>{percent(b.event_rate, 2)}</td>
                  <td className="numeric">{b.woe.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
