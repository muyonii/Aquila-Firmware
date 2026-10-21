/**
 * FlowGenerator
 *
 * Fluid dynamics and waveform engine generating realistic flow velocity (Q in LPM)
 * and effective standard deviation (sigma_Q) based on diurnal curves and physical event archetypes.
 */
export class FlowGenerator {
    /**
     * Generates a baseline flow state according to diurnal hour
     */
    static generateDiurnalFlow(hour) {
        // Nocturnal Lull (01:00 - 04:30 AM)
        if (hour >= 1 && hour <= 4) {
            const isQuietTap = Math.random() < 0.05;
            return {
                flow_rate_lpm: isQuietTap ? parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)) : 0.0,
                effective_std: isQuietTap ? 0.25 : 0.02
            };
        }

        // Morning Peak (05:00 - 09:00 AM)
        if (hour >= 5 && hour <= 9) {
            const isActive = Math.random() < 0.65;
            if (!isActive) return { flow_rate_lpm: 0.0, effective_std: 0.02 };
            const q = Math.random() * 5.0 + 2.5;
            return {
                flow_rate_lpm: parseFloat(q.toFixed(2)),
                effective_std: parseFloat((Math.random() * 0.35 + 0.25).toFixed(3))
            };
        }

        // Midday Lull (10:00 AM - 04:00 PM)
        if (hour >= 10 && hour <= 16) {
            const isActive = Math.random() < 0.25;
            if (!isActive) return { flow_rate_lpm: 0.0, effective_std: 0.02 };
            const q = Math.random() * 3.5 + 1.2;
            return {
                flow_rate_lpm: parseFloat(q.toFixed(2)),
                effective_std: parseFloat((Math.random() * 0.30 + 0.20).toFixed(3))
            };
        }

        // Evening Peak (05:00 - 09:00 PM)
        const isActive = Math.random() < 0.55;
        if (!isActive) return { flow_rate_lpm: 0.0, effective_std: 0.02 };
        const q = Math.random() * 4.5 + 2.0;
        return {
            flow_rate_lpm: parseFloat(q.toFixed(2)),
            effective_std: parseFloat((Math.random() * 0.35 + 0.20).toFixed(3))
        };
    }

    /**
     * Archetype Generators
     */
    static generateBurst() {
        // High flow rate with flat, laminar variance
        const q = Math.random() * 6.0 + 16.0; // 16 to 22 LPM
        return {
            flow_rate_lpm: parseFloat(q.toFixed(2)),
            effective_std: parseFloat((Math.random() * 0.04 + 0.03).toFixed(3)) // <= 0.07 flat
        };
    }

    static generateRunningToilet() {
        // Continuous, unbroken trickle with dead-flat variance
        const q = Math.random() * 1.5 + 1.5; // 1.5 to 3.0 LPM
        return {
            flow_rate_lpm: parseFloat(q.toFixed(2)),
            effective_std: parseFloat((Math.random() * 0.02 + 0.02).toFixed(3)) // <= 0.04 flat
        };
    }

    static generateTambolFill() {
        // High drum fill (5-9 LPM) with moderate pressure ripple variance
        const q = Math.random() * 3.5 + 5.5;
        return {
            flow_rate_lpm: parseFloat(q.toFixed(2)),
            effective_std: parseFloat((Math.random() * 0.10 + 0.18).toFixed(3))
        };
    }
}