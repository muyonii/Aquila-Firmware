"""
AQUILA Machine Learning Pipeline — Module 3: Model Evaluation & Visual Artifacts
Evaluates leak_rf_model.joblib on test_split.csv and saves figures to reports/
"""

import sys
import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

# Headless backend (guarantees saving to disk without GUI popup errors)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_curve,
    auc,
    precision_recall_curve,
    average_precision_score
)

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

OPERATING_THRESHOLD = 0.40

# Setup explicit paths relative to this script
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({'font.sans-serif': 'DejaVu Sans', 'font.size': 11})

print("=" * 70)
print(" AQUILA ML PIPELINE -- MODULE 3: EVALUATION & REPORT GENERATION")
print("=" * 70)
print(f" Target Reports Directory: {REPORTS_DIR}")

# 1. LOAD MODEL BINARY AND UNSEEN TEST PARTITION
model_path = MODELS_DIR / "leak_rf_model.joblib"
test_csv_path = DATA_DIR / "test_split.csv"

if not model_path.exists():
    raise FileNotFoundError(f"Missing model: {model_path}. Run train_model.py first!")
if not test_csv_path.exists():
    raise FileNotFoundError(f"Missing test data: {test_csv_path}. Run generate_dataset.py first!")

print("\n[1/4] Loading trained model and test split...")
rf_model = joblib.load(model_path)
test_df  = pd.read_csv(test_csv_path)

X_test = test_df.drop(columns=['is_leak'])
y_test = test_df['is_leak']

print(f"  * Loaded: {model_path.name}")
print(f"  * Test Samples: {len(X_test)} ({y_test.sum()} leaks, {len(y_test) - y_test.sum()} normal)")

# 2. COMPUTE PREDICTIONS
print("\n[2/4] Calculating probability predictions...")
probs = rf_model.predict_proba(X_test)[:, 1]
preds = (probs >= OPERATING_THRESHOLD).astype(int)

cm = confusion_matrix(y_test, preds)
fpr, tpr, _ = roc_curve(y_test, probs)
roc_auc = auc(fpr, tpr)
precision, recall, _ = precision_recall_curve(y_test, probs)
avg_precision = average_precision_score(y_test, probs)

# 3. GENERATE AND SAVE PLOTS
print("\n[3/4] Generating and writing plots to disk...")

# Plot A: Confusion Matrix
fig, ax = plt.subplots(figsize=(6, 5))
sns.heatmap(
    cm, 
    annot=True, 
    fmt='d', 
    cmap='Blues', 
    cbar=False,
    xticklabels=['Normal (0)', 'Leak (1)'],
    yticklabels=['Normal (0)', 'Leak (1)'],
    annot_kws={"size": 14, "weight": "bold"},
    ax=ax
)
ax.set_title(f"Confusion Matrix (Threshold tau = {OPERATING_THRESHOLD})", fontsize=12, pad=12)
ax.set_xlabel("Predicted Class", fontsize=11)
ax.set_ylabel("True Ground-Truth Class", fontsize=11)
plt.tight_layout()
cm_path = REPORTS_DIR / "confusion_matrix.png"
plt.savefig(cm_path, dpi=300)
plt.close()
print(f"  ✔ Created: {cm_path.resolve()}")

# Plot B: Feature Importance
features = X_test.columns.tolist()
importances = rf_model.feature_importances_
feat_df = pd.DataFrame({'Feature': features, 'Importance': importances}).sort_values('Importance', ascending=True)

fig, ax = plt.subplots(figsize=(8, 4.5))
bars = ax.barh(feat_df['Feature'], feat_df['Importance'], color='#2b5c8f')
ax.set_title("Gini Feature Importance Ranking (MDI)", fontsize=12, pad=12)
ax.set_xlabel("Mean Decrease in Impurity (Gini Score)", fontsize=11)
for bar in bars:
    width = bar.get_width()
    ax.text(width + 0.008, bar.get_y() + bar.get_height()/2, f"{width:.3f} ({width*100:.1f}%)", 
            va='center', fontsize=10, weight='bold')
ax.set_xlim(0, max(importances) * 1.25)
plt.tight_layout()
feat_path = REPORTS_DIR / "feature_importance.png"
plt.savefig(feat_path, dpi=300)
plt.close()
print(f"  ✔ Created: {feat_path.resolve()}")

# Plot C: ROC Curve
fig, ax = plt.subplots(figsize=(6, 5))
ax.plot(fpr, tpr, color='#1f77b4', lw=2.5, label=f'Random Forest (AUC = {roc_auc:.4f})')
ax.plot([0, 1], [0, 1], color='grey', lw=1.5, linestyle='--', label='Random Classifier')
ax.set_title("Receiver Operating Characteristic (ROC) Curve", fontsize=12, pad=12)
ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=11)
ax.set_ylabel("True Positive Rate (Recall / Sensitivity)", fontsize=11)
ax.legend(loc='lower right', frameon=True)
plt.tight_layout()
roc_path = REPORTS_DIR / "roc_curve.png"
plt.savefig(roc_path, dpi=300)
plt.close()
print(f"  ✔ Created: {roc_path.resolve()}")

# Plot D: Precision-Recall Curve
fig, ax = plt.subplots(figsize=(6, 5))
ax.plot(recall, precision, color='#2ca02c', lw=2.5, label=f'Random Forest (AP = {avg_precision:.4f})')
ax.set_title("Precision-Recall Curve", fontsize=12, pad=12)
ax.set_xlabel("Recall (Sensitivity)", fontsize=11)
ax.set_ylabel("Precision", fontsize=11)
ax.legend(loc='lower left', frameon=True)
plt.tight_layout()
pr_path = REPORTS_DIR / "pr_curve.png"
plt.savefig(pr_path, dpi=300)
plt.close()
print(f"  ✔ Created: {pr_path.resolve()}")

# 4. WRITE EVALUATION SUMMARY TEXT FILE
print("\n[4/4] Writing text report...")
report_text = classification_report(y_test, preds, target_names=['Normal (0)', 'Leak (1)'], digits=4)
summary_content = f"""======================================================================
AQUILA LEAK DETECTION MODEL (CMP-LDA-01) EVALUATION REPORT
======================================================================
Model Architecture   : Random Forest Classifier (50 Trees)
Model Binary Source  : models/leak_rf_model.joblib
Unseen Test Samples  : {len(X_test)}
Operating Threshold  : {OPERATING_THRESHOLD} (Neyman-Pearson Recall-Prioritized)
ROC-AUC Score        : {roc_auc:.4f}
Average Precision AP : {avg_precision:.4f}

CONFUSION MATRIX:
  True Normal  (TN) : {cm[0][0]:>4} | False Alarms (FP) : {cm[0][1]:>4}
  Missed Leaks (FN) : {cm[1][0]:>4} | True Leaks   (TP) : {cm[1][1]:>4}

DETAILED CLASSIFICATION REPORT:
{report_text}
======================================================================
"""

txt_path = REPORTS_DIR / "evaluation_summary.txt"
with open(txt_path, "w", encoding="utf-8") as f:
    f.write(summary_content)

print(f"  ✔ Created: {txt_path.resolve()}")
print("\n" + "=" * 70)
print(" MODULE 3 FINISHED SUCCESSFULLY")
print("=" * 70)