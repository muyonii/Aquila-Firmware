"""
AQUILA Machine Learning Pipeline — Activity 4: Exploratory Data Analysis (EDA)
Generates feature correlation matrices, boxplots, and pairwise cluster distributions.
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({'font.sans-serif': 'DejaVu Sans', 'font.size': 10})

print("=" * 75)
print(" AQUILA ML RESEARCH — ACTIVITY 4: EXPLORATORY DATA ANALYSIS (EDA)")
print("=" * 75)

raw_csv_path = DATA_DIR / "raw_dataset.csv"
if not raw_csv_path.exists():
    raise FileNotFoundError("raw_dataset.csv missing. Run src/generate_dataset.py first.")

print("\n[1/4] Loading raw dataset (N=10,000)...")
df = pd.read_csv(raw_csv_path)

df_plot = df.copy()
df_plot['Class'] = df_plot['is_leak'].map({0: 'Normal Demand', 1: 'Pipe Rupture'})

# Figure 1: Correlation Matrix
print("\n[2/4] Generating Pearson Correlation Matrix Heatmap...")
corr = df.corr()

fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(
    corr, 
    annot=True, 
    fmt='.3f', 
    cmap='coolwarm', 
    vmax=1.0, 
    vmin=-1.0, 
    linewidths=0.5,
    cbar_kws={"shrink": 0.8},
    ax=ax
)
ax.set_title("Pearson Feature Correlation Matrix", fontsize=12, pad=12)
plt.tight_layout()
plt.savefig(REPORTS_DIR / "feature_correlation_matrix.png", dpi=300)
plt.close()

# Figure 2: Boxplots
print("[3/4] Generating Comparative Feature Distribution Plots...")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))

# Plot A: Effective Std (Variance) Distribution
sns.boxplot(
    data=df_plot, 
    x='Class', 
    y='effective_std', 
    hue='Class',      
    legend=False,       
    palette=['#1f77b4', '#d62728'], 
    ax=ax1,
    width=0.4
)
ax1.set_title("A. Effective Standard Deviation (sigma_Q)", fontsize=11)
ax1.set_ylabel("Flow Std Dev (L/min)", fontsize=10)
ax1.set_xlabel("")

# Plot B: Duration Minutes Distribution
sns.boxplot(
    data=df_plot, 
    x='Class', 
    y='duration_minutes', 
    hue='Class',       
    legend=False,        
    palette=['#1f77b4', '#d62728'], 
    ax=ax2,
    width=0.4
)
ax2.set_title("B. Continuous Flow Duration (t_active)", fontsize=11)
ax2.set_ylabel("Duration (Minutes)", fontsize=10)
ax2.set_xlabel("")

plt.tight_layout()
plt.savefig(REPORTS_DIR / "feature_distributions.png", dpi=300)
plt.close()

# Figure 3: Pairplot
print("[4/4] Generating 2D Cluster Scatter Pairplot...")
sample_df = df_plot.sample(n=1000, random_state=42)

pairplot = sns.pairplot(
    sample_df[['flow_rate_lpm', 'effective_std', 'duration_minutes', 'hour_of_day', 'Class']],
    hue='Class',
    palette=['#1f77b4', '#d62728'],
    diag_kind='kde',
    plot_kws={'alpha': 0.6, 's': 20}
)
pairplot.fig.suptitle("Feature Pairwise Distribution Matrix (Sample N=1,000)", y=1.02, fontsize=12)
pairplot.savefig(REPORTS_DIR / "feature_pairplot.png", dpi=300)
plt.close()

# Write Summary Text File
summary_path = REPORTS_DIR / "eda_summary.txt"
with open(summary_path, "w", encoding="utf-8") as f:
    f.write(f"""======================================================================
AQUILA ML RESEARCH — EXPLORATORY DATA ANALYSIS (EDA) REPORT
======================================================================
Total Telemetry Samples : {len(df)}
Normal Samples (0)      : {np.sum(df['is_leak'] == 0)} (75.0%)
Leak Samples (1)        : {np.sum(df['is_leak'] == 1)} (25.0%)

FEATURE CORRELATION WITH TARGET (is_leak):
{corr['is_leak'].sort_values(ascending=False).to_string()}

FEATURE MEANS BY CLASS:
{df.groupby('is_leak')[['flow_rate_lpm', 'rolling_mean_5m', 'effective_std', 'duration_minutes', 'hour_of_day']].mean().to_string()}

FEATURE STANDARD DEVIATIONS BY CLASS:
{df.groupby('is_leak')[['flow_rate_lpm', 'rolling_mean_5m', 'effective_std', 'duration_minutes', 'hour_of_day']].std().to_string()}
======================================================================
""")

print(f"  ✔ Saved EDA Summary to reports/{summary_path.name}")
print("\n" + "=" * 75)
print(" ACTIVITY 4 COMPLETE")
print("=" * 75)