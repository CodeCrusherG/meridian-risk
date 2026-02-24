# Meridian Risk

Credit and exposure analytics workbench built around the existing OptBinning engine.
The project name is Meridian Risk; the `optbinning` import namespace and upstream
copyright remain intact for compatibility and attribution. The project folder is named ``meridian-risk``. The numerical engine retains
its ``optbinning`` import namespace.

## Product brief

Audience: a credit analyst reviewing counterparties, an exposure analyst reviewing
margin and limits, and a quantitative analyst reviewing model behaviour.

Design: a compact institutional workspace, mist-grey surfaces, deep slate navigation,
teal exposure curves and restrained amber/red exceptions. DM Sans is the interface
face; IBM Plex Mono is used for numerical annotations. The signature view overlays
current exposure and potential future exposure, next to portfolio concentration.
Motion is limited to focus, hover and loading. Every figure identifies its demo origin.

## Delivery plan

1. Modernize Python dependencies, retain the modelling API, and lock the environment.
2. Add a deterministic synthetic portfolio and a FastAPI service. Compute exposure,
   expected loss, limits, historical margin estimates and parameterized stress results.
3. Add React/TypeScript views for portfolio, exposures, counterparty reviews,
   stress scenarios and OptBinning scorecard validation. Share region filters and CSV
   exports; support keyboard navigation and narrow viewports.
4. Document model assumptions and the relationship to the three supplied job descriptions.
5. Run analytic invariants, API tests, the existing Python suite, frontend build,
   browser interactions and visual checks at 320, 768, 1280 and 1920 pixels.

## Boundaries

Synthetic counterparties, trade aggregates and returns are reproducible, not observed
market data. Margin is a historical-simulation prototype, not SIMM. PFE is a simple
normal-volatility add-on, not a full trade-pricing simulation. Expected loss is a
one-year PD × LGD × current net exposure proxy, not regulatory capital or IFRS 9 ECL.
No bank affiliation, regulatory approval or production readiness is implied.
