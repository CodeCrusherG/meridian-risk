export type Region = "All regions" | "Americas" | "EMEA" | "APAC";
export type View =
  | "Overview"
  | "Exposures"
  | "Counterparties"
  | "Stress testing"
  | "Model validation";
export type Counterparty = {
  id: string;
  name: string;
  sector: string;
  region: string;
  product: string;
  rating: string;
  pd: number;
  lgd: number;
  notional: number;
  gross: number;
  collateral: number;
  haircut: number;
  limit: number;
  margin_posted: number;
  previous_net: number;
  review_date: string;
  leverage: number;
  interest_cover: number;
  net: number;
  pfe: number;
  expected_loss: number;
  initial_margin: number;
  margin_due: number;
  utilization: number;
  status: string;
};
export type Snapshot = {
  as_of: string;
  currency: string;
  synthetic: boolean;
  scenario: string;
  region: Region;
  totals: Record<string, number>;
  counterparties: Counterparty[];
  concentration: { name: string; value: number }[];
  history: { date: string; net: number; pfe: number; limit: number }[];
  market_risk: {
    var_99: number;
    expected_shortfall_99: number;
    observations: number;
    horizon_days: number;
  };
};
export type ModelReport = {
  name: string;
  version: string;
  train_samples: number;
  test_samples: number;
  defaults: number;
  auc: number;
  gini: number;
  ks: number;
  psi: number;
  roc: { fpr: number; tpr: number }[];
  variables: {
    name: string;
    iv: number;
    status: string;
    bins: { bin: string; count: number; event_rate: number; woe: number }[];
  }[];
};
export const money = (value: number, digits = 1) =>
  "$" +
  (value >= 1000
    ? (value / 1000).toFixed(2) + "B"
    : value.toFixed(digits) + "M");
export const percent = (value: number, digits = 1) =>
  (value * 100).toFixed(digits) + "%";
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok)
    throw new Error(
      `Could not load risk data (${response.status}). Check the API and retry.`,
    );
  return response.json();
}
