"""
AQUILA Machine Learning Pipeline — Module 1: Physics-Informed Dataset Generation
Synthesizes N=10,000 hydraulic telemetry samples with empirical sensor noise
and realistic overlap between prolonged domestic usage and early-stage pipe ruptures.
"""

import os
import random
import sys
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 75)
print(" AQUILA ML PIPELINE: CALIBRATED EMPIRICAL DATASET (N=10,000)")
print("=" * 75)

records = []

# ==============================================================================
# CLASS 0: LEGITIMATE DOMESTIC DEMAND (N = 7,500 samples)
# ==============================================================================
print("\n[1/4] Generating 7,500 Domestic Demand Profiles...")

for _ in range(7500):
    hour = random.randint(0, 23)
    event_type = random.choices(
        ['quiescent_off', 'short_tap', 'shower', 'drum_fill', 'kitchen_prep'],
        weights=[0.30, 0.25, 0.20, 0.15, 0.10]
    )[0]

    # Quiescent
    if event_type == 'quiescent_off':
        q = 0.0
        mean_q = 0.0
        sigma = 0.02
        dur_min = 0.0

    # Short taps (10s - 2m)
    elif event_type == 'short_tap':
        base_q = random.uniform(1.8, 4.5)
        sigma = random.uniform(0.25, 0.60)
        dur_min = random.uniform(0.2, 2.0)
        q = max(0.0, base_q + random.gauss(0, sigma * 0.4))
        mean_q = base_q

    # Shower (5 - 20 mins)
    elif event_type == 'shower':
        base_q = random.uniform(4.5, 8.5)
        sigma = random.uniform(0.22, 0.55)
        dur_min = random.uniform(5.0, 20.0)
        q = max(1.5, base_q + random.gauss(0, sigma * 0.3))
        mean_q = base_q

    # Drum filling / Garden watering (Tambol / Irrigation)
    # Real-world ambiguity: 25% of fills are remarkably steady and long
    elif event_type == 'drum_fill':
        base_q = random.uniform(4.0, 8.5)
        dur_min = random.uniform(15.0, 60.0) # Can run up to 1 hour!
        # Realistic steady stream with slight line pressure ripple
        if random.random() < 0.25:
            sigma = random.uniform(0.06, 0.12) # Overlaps with leak variance!
        else:
            sigma = random.uniform(0.13, 0.28)
        
        q = max(2.0, base_q + random.gauss(0, sigma * 0.3))
        mean_q = base_q
        hour = random.choice([5, 6, 7, 8, 9, 16, 17, 18, 19])

    # Kitchen prep
    else:
        base_q = random.uniform(2.0, 5.0)
        sigma = random.uniform(0.20, 0.50)
        dur_min = random.uniform(1.0, 8.0)
        q = max(1.0, base_q + random.gauss(0, sigma * 0.3))
        mean_q = base_q

    # Add realistic sensor telemetry noise (+/- 4% random jitter)
    q = round(max(0.0, q * random.uniform(0.96, 1.04)), 2)
    mean_q = round(max(0.0, mean_q * random.uniform(0.96, 1.04)), 2)

    records.append({
        'flow_rate_lpm': q,
        'rolling_mean_5m': mean_q,
        'effective_std': round(max(0.02, sigma), 3),
        'duration_minutes': round(dur_min, 1),
        'hour_of_day': hour,
        'is_leak': 0
    })

# ==============================================================================
# CLASS 1: PHYSICAL LEAKS (N = 2,500 samples)
# ==============================================================================
print("[2/4] Generating 2,500 Pipe Leak & Rupture Profiles...")

for _ in range(2500):
    leak_archetype = random.choices(
        ['catastrophic_burst', 'running_toilet', 'nocturnal_mnf_seep', 'subterranean_crack'],
        weights=[0.25, 0.35, 0.25, 0.15]
    )[0]

    # Catastrophic Burst
    if leak_archetype == 'catastrophic_burst':
        base_q = random.uniform(12.0, 26.0)
        sigma = random.uniform(0.04, 0.13)
        dur_min = random.uniform(1.0, 50.0)
        hour = random.randint(0, 23)

    # Running Toilet (Flapper leak)
    # Real-world ambiguity: early leaks have only run for 15-45 minutes
    elif leak_archetype == 'running_toilet':
        base_q = random.uniform(1.4, 3.8)
        sigma = random.uniform(0.03, 0.08)
        dur_min = random.uniform(20.0, 180.0) # Overlaps with long drum fills!
        hour = random.randint(0, 23)

    # Nocturnal MNF
    elif leak_archetype == 'nocturnal_mnf_seep':
        base_q = random.uniform(1.2, 3.5)
        sigma = random.uniform(0.03, 0.09)
        dur_min = random.uniform(10.0, 90.0)
        hour = random.choice([1, 2, 3, 4])

    # Subterranean Crack
    # Real-world ambiguity: soil cavitation creates turbulence (sigma up to 0.16)
    else:
        base_q = random.uniform(2.5, 6.5)
        if random.random() < 0.20:
            sigma = random.uniform(0.10, 0.16) # Turbulent underground cavitation!
        else:
            sigma = random.uniform(0.04, 0.09)
        dur_min = random.uniform(15.0, 120.0)
        hour = random.randint(0, 23)

    # Sensor telemetry noise
    q = round(max(1.0, (base_q + random.gauss(0, sigma * 0.2)) * random.uniform(0.96, 1.04)), 2)
    mean_q = round(base_q * random.uniform(0.96, 1.04), 2)

    records.append({
        'flow_rate_lpm': q,
        'rolling_mean_5m': mean_q,
        'effective_std': round(max(0.02, sigma), 3),
        'duration_minutes': round(dur_min, 1),
        'hour_of_day': hour,
        'is_leak': 1
    })

df = pd.DataFrame(records)

# ==============================================================================
# STRATIFIED PARTITIONING
# ==============================================================================
print("\n[3/4] Partitioning into Train/Val/Test splits...")
raw_csv_path = DATA_DIR / "raw_dataset.csv"
df.to_csv(raw_csv_path, index=False)

X = df.drop(columns=['is_leak'])
y = df['is_leak']

X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.30, random_state=RANDOM_SEED, stratify=y
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.50, random_state=RANDOM_SEED, stratify=y_temp
)

pd.concat([X_train, y_train], axis=1).to_csv(DATA_DIR / "train_split.csv", index=False)
pd.concat([X_val, y_val], axis=1).to_csv(DATA_DIR / "val_split.csv", index=False)
pd.concat([X_test, y_test], axis=1).to_csv(DATA_DIR / "test_split.csv", index=False)

print(f"  * Saved Raw Dataset: {raw_csv_path.name}")
print(f"  * Test Partition   : {len(X_test)} samples ({y_test.sum()} leaks)")
print("\n" + "=" * 75)
print(" DATASET SYNTHESIS COMPLETE")
print("=" * 75)