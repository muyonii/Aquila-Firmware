# AQUILA Model Card: Supervised Leak Detection Classifier (`CMP-LDA-01`)

## Model Details
* **Model Name:** AQUILA Random Forest Subterranean Leak Classifier
* **Version:** 2.3.0
* **Architecture:** Bagged Random Forest Ensemble (50 Estimator Decision Trees, Max Depth 8, Balanced Class Weights)
* **Target Environment:** Zero-dependency Node.js runtime AST evaluation (`RandomForestModel.js`)
* **Primary Objective:** Evaluates instantaneous hydraulic telemetry against domestic distractor profiles (drum filling, showers, taps) and subterranean ruptures.

---

## Input Features (`X ∈ ℝ⁵`)

| Index | Feature Name | Variable | Description & Physical Boundary |
| :---: | :--- | :---: | :--- |
| `0` | `flow_rate_lpm` | $Q$ | Instantaneous flow velocity in Liters per Minute ($0.0 \le Q \le 45.0$). |
| `1` | `rolling_mean_5m` | $\mu_Q$ | 20-snapshot ($5$-minute) rolling flow average in $\text{L/min}$. |
| `2` | `effective_std` | $\sigma_Q$ | Rolling standard deviation ($\sigma_Q \ge 0.02$). Measures flow turbulence. |
| `3` | `duration_minutes` | $t_{\text{active}}$ | Continuous active flow duration without returning to $\le 0.05\text{ L/min}$. |
| `4` | `hour_of_day` | $H$ | Philippine Standard Time integer hour ($0\text{ to }23$). |

---

## Decision Threshold & Neyman-Pearson Strategy
* **Default Threshold:** $0.50$
* **Calibrated Operating Threshold ($\tau$):** **`0.40`**
* **Rationale:** Asymmetric cost matrix prioritizes **Recall ($\ge 90\%$)** over Precision. A missed subterranean rupture causes catastrophic non-revenue water (NRW) loss and property subsidence, whereas false alarms are triaged safely by human operators via Action Cards.

---

## Two-Stage Cascaded Inference Framework
1. **Stage 1 (Statistical Likelihood):** Evaluates $X \in \mathbb{R}^5$ across the 50 compiled decision trees in `leak_trees.json` to yield probability $\hat{P}(\text{leak}) \in [0.0, 1.0]$.
2. **Stage 2 (Domain Multi-Agent Coordination):** The `LeakDetectionAgent` and `CoordinatorAgent` correlate the statistical probability with **Household Behavioral Profiles** and **Topological Mass Balance ($\Delta Q$)** across the physical pipe network.