import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SETTINGS } from '../../config/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * RandomForestModel (CMP-LDA-01 Supervised Inference Engine)
 *
 * Evaluates the 5-feature hydraulic vector using a 50-tree Random Forest ensemble:
 *   [0: flow_rate_lpm, 1: rolling_mean_5m, 2: effective_std, 3: duration_minutes, 4: hour_of_day]
 */
export class RandomForestModel {
    static forestData = null;

    /**
     * Resets in-memory cached forest weights (used by unit tests)
     */
    static resetCache() {
        this.forestData = null;
    }

    /**
     * Loads the compiled 50-tree ensemble from leak_trees.json
     * @private
     */
    static _loadForest() {
        if (this.forestData) return;

        const candidatePaths = [
            path.resolve(__dirname, './leak_trees.json'),
            path.resolve(__dirname, '../../training/models/leak_trees.json'),
            path.resolve(__dirname, '../../training/leak_trees.json'),
            path.resolve(process.cwd(), 'training/models/leak_trees.json')
        ];

        for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
                try {
                    const raw = fs.readFileSync(p, 'utf8');
                    this.forestData = JSON.parse(raw);
                    break;
                } catch (e) {
                    console.warn(`[RandomForestModel] Could not parse ${p}: ${e.message}`);
                }
            }
        }
    }

    /**
     * Evaluates a single decision tree recursively on the feature vector.
     * @private
     */
    static _evaluateTree(node, features) {
        if (!node) return 0.0;
        if (node.type === 'leaf') {
            return node.prob;
        }

        const featureVal = features[node.feature];
        if (featureVal <= node.threshold) {
            return this._evaluateTree(node.left, features);
        } else {
            return this._evaluateTree(node.right, features);
        }
    }

    /**
     * Predicts pipe rupture probability.
     *
     * @param {number[]} features - [flow_rate_lpm, rolling_mean, effective_std, duration_minutes, hour_of_day]
     * @returns {number} Probability of leak between 0.000 and 1.000
     */
    static predictProbability(features) {
        if (!Array.isArray(features) || features.length < 5) {
            throw new Error(`Invalid feature vector. Expected 5 features, received: ${features ? features.length : 0}`);
        }

        const [q, mean, effectiveStd, durationMin, currentHour] = features;

        // 1. Physical Constraint Invariant (EXC-02): Turbine Impeller Inertia Floor
        // Fluid flow below 1.0 L/min cannot reliably rotate the YF-S201 turbine wheel
        if (q < (SETTINGS.MECHANICAL_SENSOR_FLOOR_LPM || 1.0)) {
            return 0.05;
        }

        // 2. High-Confidence Continuous Laminar Discharge Fast-Track
        // Steady continuous flow with flat variance persisting for >= 0.5 minutes (30s)
        if (q >= 2.5 && effectiveStd <= 0.15 && durationMin >= 0.5) {
            return 0.95;
        }

        // 3. Evaluate the 50-tree Random Forest Ensemble AST
        this._loadForest();

        if (this.forestData && Array.isArray(this.forestData.trees) && this.forestData.trees.length > 0) {
            let totalProb = 0.0;
            const trees = this.forestData.trees;

            for (let i = 0; i < trees.length; i++) {
                totalProb += this._evaluateTree(trees[i], features);
            }

            const ensembleProb = totalProb / trees.length;
            return parseFloat(ensembleProb.toFixed(3));
        }

        // 4. Mathematical Deterministic Fallback (if JSON file is unreadable)
        let prob = 0.10;

        // Dispersion contribution (inversely proportional to variance)
        if (effectiveStd < 0.05) prob += 0.35;
        else if (effectiveStd < 0.10) prob += 0.25;
        else if (effectiveStd < 0.20) prob += 0.10;
        else prob -= 0.15; // Turbulent fixture usage

        // Temporal persistence contribution
        if (durationMin >= 10.0) prob += 0.35;
        else if (durationMin >= 5.0) prob += 0.25;
        else if (durationMin >= 0.5) prob += 0.15;

        // Nocturnal baseline contribution (00:00 - 05:00)
        if (currentHour >= 0 && currentHour < 5) {
            prob += 0.15;
        }

        return parseFloat(Math.min(0.99, Math.max(0.01, prob)).toFixed(3));
    }
}