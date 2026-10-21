import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RandomForestModel } from '../../src/models/RandomForestModel.js';

describe('RandomForestModel (50-Tree ML Inference Engine)', () => {

    describe('Rule EXC-02: Mechanical Impeller Friction Floor (< 1.0 L/min)', () => {
        test('Flow below mechanical floor (0.85 L/min) returns floor probability (0.05)', () => {
            const features = [0.85, 0.85, 0.02, 10.0, 14];
            const prob = RandomForestModel.predictProbability(features);
            assert.equal(prob, 0.05);
        });

        test('Boundary check: 0.99 L/min still returns floor probability (0.05)', () => {
            const features = [0.99, 0.99, 0.02, 10.0, 14];
            const prob = RandomForestModel.predictProbability(features);
            assert.equal(prob, 0.05);
        });

        test('Boundary check: hairline leak flow (1.80 L/min) triggers model scoring (> 0.05)', () => {
            const features = [1.80, 1.80, 0.03, 10.0, 14];
            const prob = RandomForestModel.predictProbability(features);
            assert.ok(prob > 0.05, `Expected prob > 0.05, got ${prob}`);
        });
    });

    describe('Variance Sensitivity (Flat vs. Turbulent Flow)', () => {
        test('Flat variance (std <= 0.08) yields higher leak probability than turbulent flow (std > 0.20)', () => {
            const flatFeatures = [3.50, 3.50, 0.03, 10.0, 14];
            const turbulentFeatures = [3.50, 3.50, 0.45, 10.0, 14];

            const flatProb = RandomForestModel.predictProbability(flatFeatures);
            const turbulentProb = RandomForestModel.predictProbability(turbulentFeatures);

            assert.ok(flatProb > turbulentProb, `Expected flatProb (${flatProb}) > turbulentProb (${turbulentProb})`);
        });
    });

    describe('Duration Sensitivity (Temporal Persistence)', () => {
        test('Sustained flow (duration >= 15m) yields higher leak probability than transient flow (< 2m)', () => {
            const sustainedFeatures = [3.50, 3.50, 0.04, 15.0, 14];
            const transientFeatures = [3.50, 3.50, 0.04, 1.0, 14];

            const sustainedProb = RandomForestModel.predictProbability(sustainedFeatures);
            const transientProb = RandomForestModel.predictProbability(transientFeatures);

            assert.ok(sustainedProb >= transientProb, `Expected sustainedProb (${sustainedProb}) >= transientProb (${transientProb})`);
        });
    });

    describe('Diurnal Window Priors (00:00 - 05:00 vs Daytime)', () => {
        test('Nocturnal flow (02:00) yields higher or equal leak probability than daytime flow (14:00)', () => {
            const nocturnalFeatures = [2.20, 2.20, 0.04, 10.0, 2];
            const daytimeFeatures   = [2.20, 2.20, 0.04, 10.0, 14];

            const nocProb = RandomForestModel.predictProbability(nocturnalFeatures);
            const dayProb = RandomForestModel.predictProbability(daytimeFeatures);

            assert.ok(nocProb >= dayProb, `Expected nocProb (${nocProb}) >= dayProb (${dayProb})`);
        });
    });

    describe('Neyman-Pearson Operating Boundary (tau = 0.40)', () => {
        test('Normal low flow rate yields score below alert threshold (< 0.40)', () => {
            const features = [1.20, 1.20, 0.50, 0.5, 14];
            const prob = RandomForestModel.predictProbability(features);
            assert.ok(prob < 0.40, `Expected prob < 0.40, got ${prob}`);
        });

        test('Sustained rupture yields score reaching leak alert threshold (>= 0.40)', () => {
            const features = [3.42, 3.42, 0.03, 10.0, 2];
            const prob = RandomForestModel.predictProbability(features);
            assert.ok(prob >= 0.40, `Expected prob >= 0.40, got ${prob}`);
        });

        test('Probability is strictly bounded in [0.0, 1.0]', () => {
            const extremeFeatures = [10.0, 10.0, 0.01, 100.0, 2];
            const prob = RandomForestModel.predictProbability(extremeFeatures);
            assert.ok(prob >= 0.0 && prob <= 1.0, `Expected 0.0 <= prob <= 1.0, got ${prob}`);
        });
    });

    describe('Real-World Operational Scenarios', () => {
        test('High-confidence nocturnal rupture (02:00, flat variance, sustained > 15m) yields prob >= 0.90', () => {
            const features = [3.50, 3.50, 0.03, 20.0, 2];
            const prob = RandomForestModel.predictProbability(features);
            assert.ok(prob >= 0.90, `Expected prob >= 0.90, got ${prob}`);
        });

        test('Normal intermittent domestic daytime consumption (14:00, short, turbulent) yields prob < 0.40', () => {
            const features = [4.50, 2.10, 0.65, 1.0, 14];
            const prob = RandomForestModel.predictProbability(features);
            assert.ok(prob < 0.40, `Expected prob < 0.40, got ${prob}`);
        });

        test('Morning shower (07:00, 8 mins, turbulent faucets) yields lower prob than continuous leak', () => {
            const showerFeatures = [5.50, 5.20, 0.55, 8.0, 7];
            const leakFeatures   = [3.50, 3.50, 0.03, 15.0, 2];

            const showerProb = RandomForestModel.predictProbability(showerFeatures);
            const leakProb   = RandomForestModel.predictProbability(leakFeatures);

            assert.ok(leakProb > showerProb, `Expected leakProb (${leakProb}) > showerProb (${showerProb})`);
        });

        test('Throws error if feature vector is incomplete', () => {
            assert.throws(() => {
                RandomForestModel.predictProbability([3.42, 3.40]);
            }, /Invalid feature vector/);
        });
    });
});