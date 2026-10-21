"""
AQUILA Machine Learning Pipeline — Activity 1: 5-Fold Stratified Cross-Validation
Evaluates statistical stability and variance across 5 random dataset partitions
using the updated physical-aligned hyperparameters.
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
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
N_SPLITS = 5
OPERATING_THRESHOLD = 0.40

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 75)
print(" AQUILA ML RESEARCH — ACTIVITY 1: 5-FOLD STRATIFIED CROSS-VALIDATION")
print("=" * 75)

raw_csv_path = DATA_DIR / "raw_dataset.csv"
if not raw_csv_path.exists():
    raise FileNotFoundError("raw_dataset.csv missing. Run src/generate_dataset.py first.")

print("\n[1/3] Loading full dataset (N=10,000)...")
df = pd.read_csv(raw_csv_path)

X = df.drop(columns=['is_leak']).values
y = df['is_leak'].values

print(f"  * Total Samples     : {len(X)}")
print(f"  * Class Balance     : Normal={np.sum(y == 0)} (75%), Leak={np.sum(y == 1)} (25%)")

print(f"\n[2/3] Executing {N_SPLITS}-Fold Stratified Cross-Validation (tau = {OPERATING_THRESHOLD})...")

skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_SEED)

accuracies, precisions, recalls, f1_scores, roc_aucs = [], [], [], [], []

print("\n  " + "-" * 67)
print(f"  {'Fold':<6} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'ROC-AUC':<10}")
print("  " + "-" * 67)

for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
    X_tr, y_tr = X[train_idx], y[train_idx]
    X_va, y_va = X[val_idx], y[val_idx]

    clf = RandomForestClassifier(
        n_estimators=50,
        max_depth=8,
        min_samples_split=6,
        min_samples_leaf=2,
        max_features='sqrt',
        class_weight='balanced',
        random_state=RANDOM_SEED + fold,
        n_jobs=-1
    )
    clf.fit(X_tr, y_tr)

    val_probs = clf.predict_proba(X_va)[:, 1]
    val_preds = (val_probs >= OPERATING_THRESHOLD).astype(int)

    acc  = accuracy_score(y_va, val_preds)
    prec = precision_score(y_va, val_preds, zero_division=0)
    rec  = recall_score(y_va, val_preds, zero_division=0)
    f1   = f1_score(y_va, val_preds, zero_division=0)
    auc_score = roc_auc_score(y_va, val_probs)

    accuracies.append(acc)
    precisions.append(prec)
    recalls.append(rec)
    f1_scores.append(f1)
    roc_aucs.append(auc_score)

    print(f"  Fold {fold:<2} | {acc:.4f}     | {prec:.4f}    | {rec:.4f}    | {f1:.4f}    | {auc_score:.4f}")

print("  " + "-" * 67)

print("\n[3/3] Cross-Validation Aggregate Metrics (Mean +/- Std Dev):")
mean_acc, std_acc   = np.mean(accuracies), np.std(accuracies)
mean_prec, std_prec = np.mean(precisions), np.std(precisions)
mean_rec, std_rec   = np.mean(recalls), np.std(recalls)
mean_f1, std_f1     = np.mean(f1_scores), np.std(f1_scores)
mean_auc, std_auc   = np.mean(roc_aucs), np.std(roc_aucs)

print(f"  * Accuracy  : {mean_acc*100:.2f}% +/- {std_acc*100:.2f}%")
print(f"  * Precision : {mean_prec*100:.2f}% +/- {std_prec*100:.2f}%")
print(f"  * Recall    : {mean_rec*100:.2f}% +/- {std_rec*100:.2f}% (Neyman-Pearson Priority)")
print(f"  * F1-Score  : {mean_f1*100:.2f}% +/- {std_f1*100:.2f}%")
print(f"  * ROC-AUC   : {mean_auc:.4f} +/- {std_auc:.4f}")

report_path = REPORTS_DIR / "cross_validation_results.txt"
with open(report_path, "w", encoding="utf-8") as f:
    f.write(f"""======================================================================
AQUILA ML RESEARCH — 5-FOLD STRATIFIED CROSS-VALIDATION REPORT
======================================================================
Total Samples     : {len(X)}
Folds Evaluated   : {N_SPLITS}
Decision Threshold: {OPERATING_THRESHOLD}
Architecture      : RandomForest (n_estimators=50, max_depth=8, balanced)

AGGREGATE PERFORMANCE (Mean +/- Std Dev):
  Accuracy  : {mean_acc*100:.2f}% +/- {std_acc*100:.2f}%
  Precision : {mean_prec*100:.2f}% +/- {std_prec*100:.2f}%
  Recall    : {mean_rec*100:.2f}% +/- {std_rec*100:.2f}%
  F1-Score  : {mean_f1*100:.2f}% +/- {std_f1*100:.2f}%
  ROC-AUC   : {mean_auc:.4f} +/- {std_auc:.4f}

PER-FOLD BREAKDOWN:
""")
    for i in range(N_SPLITS):
        f.write(f"  Fold {i+1}: Acc={accuracies[i]:.4f}, Prec={precisions[i]:.4f}, Rec={recalls[i]:.4f}, F1={f1_scores[i]:.4f}, AUC={roc_aucs[i]:.4f}\n")
    f.write("======================================================================\n")

print(f"\n  ✔ Saved Cross-Validation Report to: reports/{report_path.name}")
print("\n" + "=" * 75)
print(" ACTIVITY 1 COMPLETE")
print("=" * 75)