"""Out-of-sample validation of an OptBinning credit scorecard on synthetic data."""

from functools import lru_cache

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

from optbinning import BinningProcess, Scorecard


@lru_cache
def model_report():
    rng = np.random.default_rng(19)
    n = 2400
    X = pd.DataFrame({"Leverage": rng.uniform(0.5, 8, n),
                      "Interest coverage": rng.uniform(0.5, 12, n),
                      "Liquidity ratio": rng.uniform(0.2, 3, n)})
    logit = -2 + 0.48 * X["Leverage"] - 0.22 * X["Interest coverage"] - 0.65 * X["Liquidity ratio"]
    y = rng.binomial(1, 1 / (1 + np.exp(-logit)))
    train, test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
    card = Scorecard(BinningProcess(list(X.columns), max_n_bins=5), LogisticRegression(C=1.0, max_iter=1000),
                     scaling_method="pdo_odds", scaling_method_params={"pdo": 20, "odds": 50, "scorecard_points": 600})
    card.fit(train, y_train)
    pred = card.predict_proba(test)[:, 1]
    train_pred = card.predict_proba(train)[:, 1]
    auc = float(roc_auc_score(y_test, pred))
    edges = np.r_[-np.inf, np.unique(np.quantile(train_pred, np.linspace(0.1, 0.9, 9))), np.inf]
    expected = np.maximum(np.histogram(train_pred, edges)[0] / len(train_pred), 1e-6)
    actual = np.maximum(np.histogram(pred, edges)[0] / len(pred), 1e-6)
    psi = float(np.sum((actual - expected) * np.log(actual / expected)))
    fpr, tpr, _ = roc_curve(y_test, pred)
    indices = np.unique(np.linspace(0, len(fpr) - 1, 45, dtype=int))
    variables = []
    for name in X.columns:
        binner = card.binning_process_.get_binned_variable(name)
        table = binner.binning_table.build()
        variables.append({"name": name, "iv": float(binner.binning_table.iv), "status": binner.status,
                          "bins": [{"bin": str(row["Bin"]), "count": int(row["Count"]),
                                    "event_rate": float(row["Event rate"]), "woe": float(row["WoE"])}
                                   for _, row in table.iloc[:-1].iterrows()]})
    return {"name": "Counterparty credit scorecard", "version": "1.0", "synthetic": True,
            "train_samples": len(train), "test_samples": len(test), "defaults": int(y_test.sum()),
            "auc": auc, "gini": 2 * auc - 1,
            "ks": float(ks_2samp(pred[y_test == 1], pred[y_test == 0]).statistic), "psi": psi,
            "roc": [{"fpr": float(fpr[i]), "tpr": float(tpr[i])} for i in indices],
            "variables": variables}
