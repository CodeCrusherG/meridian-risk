# Workflows and role alignment

The three supplied IIT Mandi job descriptions describe Nomura's Credit Risk,
Credit Risk Exposure Management and Risk Methodology roles. Meridian Risk uses
those responsibilities to structure a demonstrable analytical project. The app
is independent of Nomura and contains no proprietary bank data or systems.

| Responsibility in the supplied descriptions | Implemented workflow | Boundary |
| --- | --- | --- |
| Monitor counterparty exposure, risk profiles and margin | Portfolio overview, region filters, PFE, collateral bridge and margin shortfalls | Aggregated synthetic positions; no live trade pricing |
| Investigate credit limit breaches | Searchable counterparty register, utilisation sorting, breach/watch filters and review notes | Illustrative limits; no approval or escalation workflow |
| Assess credit quality and financial statements | Ratings, PD assumptions, leverage and interest coverage in counterparty reviews | Ratios are synthetic; no statement ingestion or rating committee process |
| Develop credit models and scorecards in Python | Optimal binning, weight of evidence and logistic regression | Separate synthetic training dataset, not a portfolio rating model |
| Prototype risk methodologies and monitor performance | Held-out AUC, Gini, KS, training-bin diagnostics and score-distribution PSI | No independent validation, longitudinal monitoring or model approval |
| Stress testing and risk computation | Market factor shock, credit deterioration and collateral haircut scenarios | Sensitivities, not calibrated economic scenarios or regulatory capital |
| Historical market analysis and initial margin | 756 synthetic daily returns; 99% historical quantiles and margin shortfall review | Square-root-of-time approximation; not SIMM or a priced multi-day simulation |
| Automate reports and document calculations | Filtered CSV export, API documentation and in-app methodology | Notes are browser-local; no shared workflow or scheduled reporting |

## Calculation assumptions

All amounts are USD millions. The 24 fictional counterparties have one aggregated
product exposure each. Positive replacement values are supplied directly, with
no cross-counterparty netting or legal netting-set model. The credit limit is
compared to the sum of net exposure and the PFE add-on. Watch status starts above
90% utilisation; breach status starts above 100%.

Base PDs are AA 0.04%, A 0.10%, BBB 0.40%, BB 1.80%, B 5.50%. These are illustrative
inputs. LGD is 45% throughout. Current net exposure is used as an EAD proxy, with
no undrawn commitments or forward-looking lifetime loss model.

For each counterparty, the stress engine increases gross exposure by
`notional × annual volatility × stress factor`, increases the PFE add-on and
initial margin by `1 + stress factor`, multiplies PD (capped at 100%), and adds
the chosen haircut to the base 5% collateral haircut (capped at 100%). Posted
collateral, posted margin and limits remain fixed. Results are recalculated from
unchanged base positions, so successive runs do not compound shocks.

The market-return generator combines a common Student-t factor with independent
normal product factors. Portfolio VaR is the 99th percentile of aggregate daily
losses; expected shortfall is the mean above that percentile. Counterparty margin
uses a 99% daily loss quantile multiplied by the square root of ten. There is no
backtesting claim: the same synthetic sample is used for this margin prototype.

The scorecard dataset contains 2,400 independently generated financial-ratio
observations and sampled binary default outcomes. A stratified split holds out
720 observations before fitting bins or regression. PSI uses training-score
deciles to compare training and held-out populations. The deliberately synthetic
relationships demonstrate the pipeline, not predictive quality on real borrowers.

## Modernization

The verified environment uses Python 3.12, NumPy 2.5, pandas 3.0, SciPy 1.18,
scikit-learn 1.9, Matplotlib 3.11 and OR-Tools 9.15. The UI uses React 19,
TypeScript 7, Vite 8 and Recharts 3. Exact versions are in the lockfiles.

Dependency versions were checked against the official [Python package registry](https://pypi.org/)
and [npm registry](https://www.npmjs.com/). Build configuration follows the
[Vite documentation](https://vite.dev/config/build-options); CI uses the
[uv integration guide](https://docs.astral.sh/uv/guides/integration/github/).

Legacy Python 3.6/3.7 Travis configuration was removed. The CI workflow now checks
Python 3.12–3.14, builds the dashboard and runs browser accessibility and interaction
checks. Existing OptBinning import paths, source authorship and license are retained.
