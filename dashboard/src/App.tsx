import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Download,
  FlaskConical,
  Globe2,
  LayoutDashboard,
  Menu,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  api,
  money,
  percent,
  type Counterparty,
  type Region,
  type Snapshot,
  type View,
} from "./types";
import { Concentration, ExposureChart, Sparkline } from "./Charts";
import { CounterpartyTable, ReviewDialog } from "./Counterparties";
import { Exposures, ModelValidation, StressTesting } from "./RiskViews";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Exposures", icon: ChartNoAxesCombined },
  { name: "Counterparties", icon: UsersRound },
  { name: "Stress testing", icon: FlaskConical },
  { name: "Model validation", icon: ShieldCheck },
] as const;
const viewCopy: Record<View, [string, string]> = {
  Overview: [
    "Portfolio overview",
    "Monitor credit exposure, collateral coverage and counterparty limits.",
  ],
  Exposures: [
    "Exposure & margin",
    "Follow collateral coverage, potential exposure and margin shortfalls.",
  ],
  Counterparties: [
    "Counterparty review",
    "Track credit quality, investigate breaches and record your assessment.",
  ],
  "Stress testing": [
    "Stress testing",
    "Measure how market moves and credit deterioration affect the portfolio.",
  ],
  "Model validation": [
    "Model validation",
    "Inspect the scorecard, its optimal bins and out-of-sample performance.",
  ],
};
function initialView(): View {
  const value = decodeURIComponent(location.hash.slice(1));
  return navigation.some((n) => n.name === value)
    ? (value as View)
    : "Overview";
}
export default function App() {
  const [view, setView] = useState<View>(initialView),
    [region, setRegion] = useState<Region>("All regions");
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Counterparty | null>(null),
    [menu, setMenu] = useState(false);
  const methodology = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const onHash = () => setView(initialView());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api<Snapshot>(`/api/portfolio?region=${encodeURIComponent(region)}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [region, refresh]);
  const go = (next: View) => {
    setView(next);
    location.hash = encodeURIComponent(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const t = data?.totals;
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a
          className="brand"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
          aria-label="Meridian Risk overview"
        >
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <path d="M6 30V10l14 14L34 10v20M20 4v32" />
          </svg>
          <span>
            meridian<span>RISK ANALYTICS</span>
          </span>
        </a>
        <button
          className="icon-button mobile-close"
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <div className="workspace">
          <span className="workspace-symbol">M</span>
          <span>
            Risk workspace<small>Demonstration portfolio</small>
          </span>
          <Globe2 size={16} />
        </div>
        <span className="nav-section-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${view === name ? "active" : ""}`}
              aria-current={view === name ? "page" : undefined}
              onClick={() => go(name)}
            >
              <Icon size={18} strokeWidth={1.65} />
              <span>{name}</span>
              {name === "Counterparties" && data && (
                <span className="nav-count">{data.totals.counterparties}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <div>
              <span className="orbit-symbol">◉</span>
              <span>Portfolio methodology</span>
            </div>
            <p>
              Exposure definitions, margin
              <br />
              estimates and model assumptions.
            </p>
            <button onClick={() => methodology.current?.showModal()}>
              Read the methodology <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="nav-item"
            onClick={() => methodology.current?.showModal()}
          >
            <BookOpen size={17} />
            Methodology
          </button>
          <div className="profile">
            <span className="avatar">RA</span>
            <span>
              Risk analyst<small>Local workspace</small>
            </span>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
              aria-expanded={menu}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <b>{view}</b>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <i />
              Demo environment
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="About this workspace"
              onClick={() => methodology.current?.showModal()}
            >
              <CircleHelp size={18} />
            </button>
            <span className="avatar small">RA</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="page-kicker">
                <span className="tiny-square" />
                CREDIT & EXPOSURE ANALYTICS
              </div>
              <h1>
                {viewCopy[view][0]}
                <span className="heading-dot">.</span>
              </h1>
              <p>{viewCopy[view][1]}</p>
            </div>
            <a
              className="secondary-button export-button"
              href={`/api/export?region=${encodeURIComponent(region)}`}
              download="meridian-risk-portfolio.csv"
            >
              <Download size={15} />
              Export portfolio
            </a>
          </div>
          <div className="scope-bar">
            <div className="scope-controls">
              <label className="select-wrap region-select">
                <Globe2 size={15} />
                <select
                  aria-label="Portfolio region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                  disabled={view === "Model validation"}
                >
                  {["All regions", "Americas", "EMEA", "APAC"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
              <span className="scope-separator" />
              <span className="date-chip">
                <CalendarDays size={14} />
                30 Sep 2026<span className="as-of">AS OF</span>
              </span>
            </div>
            <span className="scope-info">
              <i className="dot teal" />
              {view === "Model validation"
                ? "Synthetic model dataset"
                : "Synthetic portfolio"}
              <button
                className="icon-button"
                aria-label="Refresh portfolio"
                disabled={loading}
                onClick={() => setRefresh((v) => v + 1)}
              >
                <RefreshCw size={13} className={loading ? "spinning" : ""} />
              </button>
            </span>
          </div>
          {error && (
            <div className="panel loading-state" role="alert">
              <Activity size={28} />
              <h2>Portfolio unavailable</h2>
              <p>{error}</p>
              <button
                className="primary-button"
                onClick={() => setRefresh((v) => v + 1)}
              >
                Retry connection
              </button>
            </div>
          )}
          {loading && (
            <div className="loading-state" role="status">
              <RefreshCw className="spinning" />
              <p>Loading portfolio…</p>
            </div>
          )}
          {!loading && data && t && (
            <div className="view-content">
              {view === "Overview" && (
                <>
                  <div className="metric-strip">
                    <div className="metric">
                      <span>
                        Net credit exposure{" "}
                        <span className="metric-code">CE</span>
                      </span>
                      <div className="metric-value">
                        <strong>{money(t.net, 2)}</strong>
                        <Sparkline
                          values={data.history.slice(-20).map((v) => v.net)}
                        />
                      </div>
                      <small className="metric-change">
                        <ArrowUpRight size={12} />
                        {money(Math.abs(t.change), 2)}{" "}
                        {t.change >= 0 ? "increase" : "decrease"}
                        <span>vs. prior day</span>
                      </small>
                    </div>
                    <div className="metric">
                      <span>
                        Potential future exposure{" "}
                        <span className="metric-code">PFE</span>
                      </span>
                      <div className="metric-value">
                        <strong>{money(t.pfe, 2)}</strong>
                        <Sparkline
                          values={data.history.slice(-20).map((v) => v.pfe)}
                          tone="blue"
                        />
                      </div>
                      <small>
                        <span className="inline-dot blue" />
                        95% confidence <span>·</span> 10-day horizon
                      </small>
                    </div>
                    <div className="metric">
                      <span>
                        Expected loss <span className="metric-code">EL</span>
                      </span>
                      <div className="metric-value">
                        <strong>{money(t.expected_loss, 2)}</strong>
                        <span className="metric-symbol">
                          <ChartNoAxesCombined size={29} strokeWidth={1} />
                        </span>
                      </div>
                      <small>
                        Weighted PD <b>{percent(t.weighted_pd, 2)}</b>
                        <span>·</span> LGD 45%
                      </small>
                    </div>
                    <div className="metric">
                      <span>
                        Limit exceptions <span className="metric-code">!</span>
                      </span>
                      <div className="metric-value">
                        <strong>
                          {String(t.breaches).padStart(2, "0")}
                          <span className="metric-unit">
                            {" "}
                            / {t.counterparties}
                          </span>
                        </strong>
                        <span className="exception-graphic">
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                      </div>
                      <small>
                        <span className="inline-dot amber" />
                        {t.watch} additional counterparties on watch
                      </small>
                    </div>
                  </div>
                  <div className="overview-chart-grid">
                    <ExposureChart data={data} />
                    <Concentration
                      data={data}
                      onExplore={() => go("Exposures")}
                    />
                  </div>
                  <div className="overview-bottom-grid">
                    <CounterpartyTable
                      rows={data.counterparties}
                      compact
                      onSelect={setSelected}
                      onViewAll={() => go("Counterparties")}
                    />
                    <section className="panel desk-notes">
                      <div className="panel-heading">
                        <div>
                          <span className="eyebrow">ON THE RADAR</span>
                          <h2>Desk notes</h2>
                        </div>
                        <Activity size={17} className="muted" />
                      </div>
                      <div className="desk-note">
                        <span className="note-marker amber" />
                        <div>
                          <span className="note-tag">LIMIT MONITORING</span>
                          <h3>{t.breaches} counterparties above limit</h3>
                          <p>
                            {data.counterparties[0].name} leads utilisation at{" "}
                            {percent(data.counterparties[0].utilization)}.
                            Review the collateral position.
                          </p>
                          <button
                            className="text-button"
                            onClick={() => setSelected(data.counterparties[0])}
                          >
                            Review exposure <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="desk-note">
                        <span className="note-marker teal" />
                        <div>
                          <span className="note-tag">MARGIN COVERAGE</span>
                          <h3>{money(t.margin_due, 2)} aggregate shortfall</h3>
                          <p>
                            Historical simulation at 99% confidence across a
                            10-day margin period.
                          </p>
                          <button
                            className="text-button"
                            onClick={() => go("Exposures")}
                          >
                            Open margin review <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="desk-note compact-note">
                        <ArrowDownRight size={20} />
                        <p>
                          Portfolio VaR{" "}
                          <b>{money(data.market_risk.var_99, 2)}</b>
                          <span>
                            99% confidence · 1 day · synthetic returns
                          </span>
                        </p>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {view === "Exposures" && <Exposures data={data} />}
              {view === "Counterparties" && (
                <>
                  <div className="credit-summary">
                    <span>
                      <b>{t.counterparties}</b> counterparties
                    </span>
                    <span>
                      <i className="dot red" />
                      <b>{t.breaches}</b> limit breaches
                    </span>
                    <span>
                      <i className="dot amber" />
                      <b>{t.watch}</b> on watch
                    </span>
                    <span>
                      <i className="dot teal" />
                      <b>{percent(t.weighted_pd, 2)}</b> weighted PD
                    </span>
                  </div>
                  <CounterpartyTable
                    rows={data.counterparties}
                    onSelect={setSelected}
                  />
                </>
              )}
              {view === "Stress testing" && (
                <StressTesting key={region} base={data} region={region} />
              )}
              {view === "Model validation" && <ModelValidation />}
            </div>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-mark">M</span>MERIDIAN RISK{" "}
              <span className="footer-divider">/</span> Credit & exposure
              analytics
            </span>
            <button onClick={() => methodology.current?.showModal()}>
              Data & methodology <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      <ReviewDialog selected={selected} onClose={() => setSelected(null)} />
      <dialog
        ref={methodology}
        aria-label="Methodology and assumptions"
        className="methodology-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) methodology.current?.close();
        }}
      >
        <div className="dialog-header">
          <span className="eyebrow">METHODOLOGY & DATA</span>
          <button
            className="icon-button"
            autoFocus
            aria-label="Close methodology"
            onClick={() => methodology.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2>Methodology & assumptions</h2>
        <p>
          Meridian Risk is a local analytical prototype. All counterparties,
          positions and market returns are synthetic and reproducible. Figures
          are in USD millions, as of 30 September 2026.
        </p>
        <dl>
          <dt>Current net exposure</dt>
          <dd>
            max(gross positive exposure − collateral × (1 − haircut), 0). The
            base haircut is 5%. Aggregates are calculated at the counterparty
            level.
          </dd>
          <dt>Potential future exposure</dt>
          <dd>
            Current net exposure plus a 95% normal-volatility add-on: notional ×
            annual volatility × 1.645 × √(10/252). This is a simplified 10-day
            estimate.
          </dd>
          <dt>Expected loss</dt>
          <dd>
            One-year rating PD × 45% LGD × current net exposure. This proxy is
            not IFRS 9 ECL or a regulatory capital calculation.
          </dd>
          <dt>Initial margin, VaR and expected shortfall</dt>
          <dd>
            756 synthetic daily returns with shared market factors. Margin uses
            the 99th percentile of losses scaled by √10. Portfolio VaR uses
            aggregated daily losses; expected shortfall averages losses above
            VaR. This is not SIMM.
          </dd>
          <dt>Model validation</dt>
          <dd>
            OptBinning transforms three financial ratios into weight-of-evidence
            bins. Logistic regression is fitted on 70% of 2,400 synthetic
            records; the remaining 30% is used for AUC, Gini and KS. PSI
            compares the two score distributions; it is not longitudinal drift
            monitoring.
          </dd>
          <dt>Scope and attribution</dt>
          <dd>
            The workflows reflect credit risk, exposure management and risk
            methodology work. They do not imply affiliation with Nomura or
            regulatory validation. The original OptBinning engine and its Apache
            2.0 attribution are retained.
          </dd>
        </dl>
        <button
          className="primary-button"
          onClick={() => methodology.current?.close()}
        >
          Back to workspace
        </button>
      </dialog>
    </div>
  );
}
