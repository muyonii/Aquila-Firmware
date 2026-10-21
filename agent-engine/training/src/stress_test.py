"""
AQUILA Machine Learning Pipeline — Activity 2: Real-World Sensor Noise & Stress Testing
Injects 0%, 5%, 10%, 20%, and 30% Gaussian noise into test features to measure physical model robustness.
"""

import sys
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

RANDOM_SEED = 42
OPERATING_THRESHOLD = 0.40
NOISE_LEVELS = [0.00, 0.05, 0.10, 0.20, 0.30]

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({'font.sans-serif': 'DejaVu Sans', 'font.size': 11})

print("=" * 75)
print(" AQUILA ML RESEARCH — ACTIVITY 2: SENSOR NOISE & STRESS TESTING")
print("=" * 75)

model_path = MODELS_DIR / "leak_rf_model.joblib"
test_csv_path = DATA_DIR / "test_split.csv"

if not model_path.exists() or not test_csv_path.exists():
    raise FileNotFoundError("Model or test data missing. Run generate_dataset.py & train_model.py first.")

print("\n[1/3] Loading trained model and test partition...")
rf_model = joblib.load(model_path)
test_df  = pd.read_csv(test_csv_path)

X_test_clean = test_df.drop(columns=['is_leak']).values
y_test       = test_df['is_leak'].values

feature_names = test_df.drop(columns=['is_leak']).columns.tolist()

feature_stds = np.std(X_test_clean, axis=0)

print(f"\n[2/3] Simulating physical sensor noise (0% to 30% Gaussian noise)...")
results = []

print("\n  " + "-" * 71)
print(f"  {'Noise Level':<12} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'ROC-AUC':<10}")
print("  " + "-" * 71)

np.random.seed(RANDOM_SEED)

for noise in NOISE_LEVELS:
    noise_matrix = np.random.normal(loc=0.0, scale=noise * feature_stds, size=X_test_clean.shape)
    X_noisy = X_test_clean + noise_matrix

    # Apply physical boundary clamps matching YF-S201 turbine sensor
    X_noisy[:, 0] = np.clip(X_noisy[:, 0], 0.0, 45.0)   # flow_rate in [0, 45] LPM
    X_noisy[:, 1] = np.maximum(0.0, X_noisy[:, 1])      # rolling_mean >= 0
    X_noisy[:, 2] = np.maximum(0.02, X_noisy[:, 2])     # effective_std >= 0.02 floor
    X_noisy[:, 3] = np.maximum(0.0, X_noisy[:, 3])      # duration >= 0
    X_noisy[:, 4] = np.clip(X_noisy[:, 4], 0, 23)      # hour in [0, 23]

    # Convert back to DataFrame with feature names to silence scikit-learn warning
    df_noisy = pd.DataFrame(X_noisy, columns=feature_names)

    probs = rf_model.predict_proba(df_noisy)[:, 1]
    preds = (probs >= OPERATING_THRESHOLD).astype(int)

    acc  = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds, zero_division=0)
    rec  = recall_score(y_test, preds, zero_division=0)
    f1   = f1_score(y_test, preds, zero_division=0)
    auc_score = roc_auc_score(y_test, probs)

    results.append({
        'noise_pct': int(noise * 100),
        'accuracy': acc,
        'precision': prec,
        'recall': rec,
        'f1_score': f1,
        'roc_auc': auc_score
    })

    print(f"  {int(noise*100):>3}% Noise    | {acc:.4f}     | {prec:.4f}    | {rec:.4f}    | {f1:.4f}    | {auc_score:.4f}")

print("  " + "-" * 71)
res_df = pd.DataFrame(results)

# Figure: Noise Degradation Curve
print("\n[3/3] Generating Noise Degradation Curve plot...")
fig, ax = plt.subplots(figsize=(8, 5))

ax.plot(res_df['noise_pct'], res_df['recall'] * 100, marker='o', lw=2.5, color='#d62728', label='Recall (Leak Sensitivity)')
ax.plot(res_df['noise_pct'], res_df['precision'] * 100, marker='s', lw=2.5, color='#1f77b4', label='Precision')
ax.plot(res_df['noise_pct'], res_df['accuracy'] * 100, marker='^', lw=2.0, color='#2ca02c', linestyle='--', label='Overall Accuracy')

ax.axhline(y=90.0, color='darkred', linestyle=':', lw=1.5, label='Neyman-Pearson Minimum Floor (90% Recall)')

ax.set_title("Model Robustness Under Injected Sensor Noise", fontsize=12, pad=12)
ax.set_xlabel("Injected Gaussian Noise Level (%)", fontsize=11)
ax.set_ylabel("Metric Score (%)", fontsize=11)
ax.set_ylim(70, 103)
ax.set_xticks(res_df['noise_pct'])
ax.set_xticklabels([f"{p}%" for p in res_df['noise_pct']])
ax.legend(loc='lower left', frameon=True)

plt.tight_layout()
graph_path = REPORTS_DIR / "noise_stress_test.png"
plt.savefig(graph_path, dpi=300)
plt.close()

# Write text report
text_path = REPORTS_DIR / "stress_test_results.txt"
with open(text_path, "w", encoding="utf-8") as f:
    f.write(f"""======================================================================
AQUILA ML RESEARCH — SENSOR NOISE & STRESS TEST REPORT
======================================================================
Operating Decision Threshold (tau): {OPERATING_THRESHOLD}
Evaluated Noise Levels             : 0%, 5%, 10%, 20%, 30%

PERFORMANCE DEGRADATION TABLE:
""")
    for r in results:
        f.write(f"  Noise {r['noise_pct']:>2}% | Acc: {r['accuracy']*100:.2f}% | Prec: {r['precision']*100:.2f}% | Rec: {r['recall']*100:.2f}% | F1: {r['f1_score']*100:.2f}% | AUC: {r['roc_auc']:.4f}\n")
    f.write("======================================================================\n")

print(f"  ✔ Saved Noise Degradation Report to reports/{text_path.name}")
print("\n" + "=" * 75)
print(" ACTIVITY 2 COMPLETE")
print("=" * 75)