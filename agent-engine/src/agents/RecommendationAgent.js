import { LEAK_TAXONOMY } from '../contracts/LeakTaxonomy.js';

export class RecommendationAgent {
    static generateActionCard(incidentCategory, nodeId, severity = 'P3', locationName = null, context = {}) {
        const locationTag = locationName ? `${locationName} (${nodeId})` : nodeId;

        switch (incidentCategory) {
            case LEAK_TAXONOMY.TIER_1A_BURST.code:
            case 'CRITICAL_LEAK':
                return {
                    title: LEAK_TAXONOMY.TIER_1A_BURST.display_name,
                    academic_term: LEAK_TAXONOMY.TIER_1A_BURST.academic_term,
                    priority: 'P1',
                    action_directive: `Urgent: High-velocity pipe rupture at ${locationTag}. Look for wet ground, puddles, or hissing sounds near the meter box and pipe joints. If a leak is confirmed, close the shutoff valve and patch or clamp the damaged pipe section.`
                };

            // FIX: Changed "Hydraulic mass loss of" to "Hydraulic imbalance of"
            case LEAK_TAXONOMY.TIER_1B_MASS_BALANCE.code:
                return {
                    title: LEAK_TAXONOMY.TIER_1B_MASS_BALANCE.display_name,
                    academic_term: LEAK_TAXONOMY.TIER_1B_MASS_BALANCE.academic_term,
                    priority: 'P1',
                    action_directive: `Hydraulic imbalance of ${Number(context.deltaQ || 0).toFixed(1)} LPM detected downstream of ${locationTag}. Inspect the main pipeline feeding branches [${(context.children || []).join(', ')}] for underground fractures.`
                };

            case LEAK_TAXONOMY.TIER_2_ZERO_FLOW.code:
                return {
                    title: LEAK_TAXONOMY.TIER_2_ZERO_FLOW.display_name,
                    academic_term: LEAK_TAXONOMY.TIER_2_ZERO_FLOW.academic_term,
                    priority: 'P2',
                    action_directive: `Unpaused flow detected for over 60 minutes at ${locationTag}. Inspect household for running toilet flapper valves, open garden taps, or cracked secondary service lines.`
                };

            case LEAK_TAXONOMY.TIER_3_MNF.code:
                return {
                    title: LEAK_TAXONOMY.TIER_3_MNF.display_name,
                    academic_term: LEAK_TAXONOMY.TIER_3_MNF.academic_term,
                    priority: 'P2',
                    action_directive: `Abnormal flow detected during minimum night window (01:00-04:30 AM) at ${locationTag}. Inspect for concealed pipe weeping or water storage cistern valve failure.`
                };

            case LEAK_TAXONOMY.TIER_4_SUSPICIOUS.code:
            case 'SUSPICIOUS_USAGE':
                return {
                    title: LEAK_TAXONOMY.TIER_4_SUSPICIOUS.display_name,
                    academic_term: LEAK_TAXONOMY.TIER_4_SUSPICIOUS.academic_term,
                    priority: 'P3',
                    action_directive: `Continuous water flow detected at ${locationTag}. Check if the resident has an open garden hose, refilling tank, or leaking toilet flapper. Wait 15 minutes before sending a plumber on-site.`
                };

            case 'FAIRNESS_DEFICIT':
                return {
                    title: "Low Water Supply / Pressure Drop",
                    academic_term: "Rawlsian Relative Deprivation Deficit",
                    priority: 'P2',
                    action_directive: `Check water pressure at ${locationTag}. Household is receiving far less water than neighboring homes. Inspect the supply line for partial blockages, check if the upstream isolation valve is partially closed, or test for air locks in the pipe.`
                };

            default:
                return {
                    title: "Irregular Meter Reading",
                    academic_term: "Hydraulic Anomaly",
                    priority: severity,
                    action_directive: `Inspect meter at ${locationTag} for unusual flow readings. Check for clogged sediment or sensor calibration drift.`
                };
        }
    }
}