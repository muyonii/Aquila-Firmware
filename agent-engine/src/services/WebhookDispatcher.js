import crypto from 'crypto';
import { SETTINGS } from '../../config/settings.js';

export class WebhookDispatcher {
    constructor(webhookUrl = SETTINGS.BACKEND_WEBHOOK_URL, secretKey = SETTINGS.WEBHOOK_SECRET) {
        this.webhookUrl = webhookUrl;
        this.secretKey = secretKey;
        this.timeoutMs = SETTINGS.NETWORK_TIMEOUT_MS || 5000;
        this.maxRetries = 3;
    }

    /**
     * Validates payload schema matching backend expectations
     * @private
     */
    _validatePayload(payload, eventType = 'INCIDENT_DETECTED') {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be a non-null object.');
        }
        if (!payload.node_id || typeof payload.node_id !== 'string') {
            throw new Error("Payload missing required string 'node_id'.");
        }

        // Incident creation requires type & severity; Cleared events only require node_id
        if (eventType === 'INCIDENT_DETECTED') {
            if (!payload.incident_type || typeof payload.incident_type !== 'string') {
                throw new Error("Payload missing required string 'incident_type'.");
            }
            if (!payload.severity_level || !['P1', 'P2', 'P3'].includes(payload.severity_level)) {
                throw new Error("Payload 'severity_level' must be 'P1', 'P2', or 'P3'.");
            }
        }
    }

    /**
     * Dispatches an event payload to the PHP transactional core with HMAC-SHA256 signature
     * @param {Object} incidentPayload - The incident data object
     * @param {'INCIDENT_DETECTED' | 'INCIDENT_CLEARED'} [eventType='INCIDENT_DETECTED']
     * @returns {Promise<Object|null>}
     */
    async dispatchIncident(incidentPayload, eventType = 'INCIDENT_DETECTED') {
        try {
            this._validatePayload(incidentPayload, eventType);
        } catch (validationErr) {
            console.error(`❌ [WebhookDispatcher] Pre-flight validation failed: ${validationErr.message}`);
            return null;
        }

        const now = Math.floor(Date.now() / 1000);
        const eventBody = JSON.stringify({
            event_type: eventType,
            timestamp: now,
            payload: incidentPayload
        });

        // Canonical HMAC-SHA256 signature
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(`${now}.${eventBody}`)
            .digest('hex');

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                console.log(`[WebhookDispatcher] (Attempt ${attempt}/${this.maxRetries}) Pushing ${eventType} for ${incidentPayload.node_id}...`);

                const response = await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Aquila-Timestamp': now.toString(),
                        'X-Aquila-Signature': signature
                    },
                    body: eventBody,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.status === 403) {
                    console.error('❌ [WebhookDispatcher] HTTP 403 Forbidden: WEBHOOK_SECRET mismatch between Node.js and PHP backend!');
                    return null;
                }

                if (response.status === 401) {
                    console.error('❌ [WebhookDispatcher] HTTP 401 Unauthorized: Timestamp drift exceeded 300s replay window!');
                    return null;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`⚠️ [WebhookDispatcher] HTTP ${response.status} Error on attempt ${attempt}: ${errorText.slice(0, 150)}`);
                    if (attempt < this.maxRetries) {
                        await new Promise(r => setTimeout(r, attempt * 500));
                        continue;
                    }
                    return null;
                }

                const json = await response.json();
                console.log(`✔ [WebhookDispatcher] Backend Response: ${json.data?.action} -> ${json.data?.message || 'OK'}`);
                return json;

            } catch (error) {
                clearTimeout(timeoutId);
                const isTimeout = error.name === 'AbortError';
                console.warn(`⚠️ [WebhookDispatcher] Attempt ${attempt} failed: ${isTimeout ? `Timeout after ${this.timeoutMs}ms` : error.message}`);

                if (attempt < this.maxRetries) {
                    await new Promise(r => setTimeout(r, attempt * 500));
                } else {
                    console.error(`❌ [WebhookDispatcher] All ${this.maxRetries} dispatch attempts failed for ${incidentPayload.node_id}`);
                }
            }
        }

        return null;
    }
}