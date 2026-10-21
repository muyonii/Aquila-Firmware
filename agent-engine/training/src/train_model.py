"""
AQUILA Machine Learning Pipeline — Module 2: Model Training & Persistence
Trains the 50-tree Random Forest ensemble on the physics-aligned dataset
and persists the binary artifact to models/leak_rf_model.joblib.
"""

import sys
import joblib
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, classification_report

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

RANDOM_SEED = 42

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 75)
print(" AQUILA ML PIPELINE — MODULE 2: MODEL TRAINING & PERSISTENCE")
print("=" * 75)

# 1. Load Preprocessed Dataset Partitions
train_csv_path = DATA_DIR / "train_split.csv"
val_csv_path   = DATA_DIR / "val_split.csv"

if not train_csv_path.exists() or not val_csv_path.exists():
    raise FileNotFoundError("Training or Validation CSV missing. Run src/generate_dataset.py first.")

print("\n[1/4] Loading preprocessed dataset partitions from data/...")
train_df = pd.read_csv(train_csv_path)
val_df   = pd.read_csv(val_csv_path)

X_train = train_df.drop(columns=['is_leak'])
y_train = train_df['is_leak']

X_val = val_df.drop(columns=['is_leak'])
y_val = val_df['is_leak']

print(f"  * Training Set   : {len(X_train)} samples ({y_train.sum()} leaks)")
print(f"  * Validation Set : {len(X_val)} samples ({y_val.sum()} leaks)")

# 2. Fit Random Forest Classifier (Optimized for Multi-Feature Interaction)
print("\n[2/4] Fitting Random Forest Ensemble (50 Trees, max_depth=8, balanced)...")

rf_model = RandomForestClassifier(
    n_estimators=50,
    max_depth=6,              # Regularized: prevents perfect memorization of edge cases
    min_samples_split=8,
    min_samples_leaf=4,       # Requires at least 4 samples in a leaf
    max_features='sqrt',
    class_weight='balanced',
    random_state=RANDOM_SEED,
    n_jobs=-1
)

rf_model.fit(X_train, y_train)
print("  ✔ Model fitting completed successfully.")

# 3. Gini Feature Importance Ranking
print("\n[3/4] Feature Importance Ranking (Gini Mean Decrease Impurity):")
features = X_train.columns.tolist()
importances = rf_model.feature_importances_

for name, imp in sorted(zip(features, importances), key=lambda x: x[1], reverse=True):
    print(f"      - {name:<18}: {imp:.4f} ({imp*100:.1f}%)")

val_probs = rf_model.predict_proba(X_val)[:, 1]
val_auc = roc_auc_score(y_val, val_probs)
print(f"\n  * Validation Set ROC-AUC Score: {val_auc:.4f}")

# 4. Save Binary Model
model_output_path = MODELS_DIR / "leak_rf_model.joblib"
joblib.dump(rf_model, model_output_path)

print(f"\n[4/4] Saved trained model binary to:\n      -> {model_output_path.name}")
print("\n" + "=" * 75)
print(" MODULE 2 COMPLETE: leak_rf_model.joblib IS READY")
print("=" * 75)