import L from 'leaflet';

/**
 * GridNode (Domain Entity)
 * Reads both nested backend coordinates ({ coordinates: { lat, lng } })
 * and flat coordinates ({ latitude, longitude }).
 */
export class GridNode {
  constructor(data = {}, index = 0) {
    this.id = data.node_id || data.id || '';
    this.label = data.household_label || data.label || 'Unnamed Meter';
    this.locationName = data.location_name || data.locationName || 'Purok 2 Sector';
    this.cluster = data.purok_cluster || data.cluster || 'Purok 2';
    this.parentId = data.parent_node_id ?? data.parentId ?? null;

    // Read nested coordinates.lat/lng from MonitoringNode.php OR flat latitude/longitude
    const rawLat = data.coordinates?.lat ?? data.latitude ?? data.lat;
    const rawLng = data.coordinates?.lng ?? data.longitude ?? data.lng;

    // Fallback spread so even if a custom node has null GPS, it never stacks invisibly
    const offset = (index % 9) * 0.00035;
    this.lat = rawLat !== null && rawLat !== undefined && !isNaN(Number(rawLat))
      ? Number(rawLat)
      : 14.6766 + offset;
    this.lng = rawLng !== null && rawLng !== undefined && !isNaN(Number(rawLng))
      ? Number(rawLng)
      : 120.5422 + offset;

    this.isPhysical = Boolean(data.is_physical ?? data.isPhysical);
    this.status = data.status || 'ACTIVE'; // 'ACTIVE' | 'LEAK' | 'MAINTENANCE' | 'FAULT' | 'DECOMMISSIONED'
    this.installedAt = data.installation_date || data.installedAt || '2026-09-01';
  }

  isLeaking() {
    return this.status === 'LEAK' || this.status === 'FAULT';
  }

  isMaintenance() {
    return this.status === 'MAINTENANCE';
  }

  isActive() {
    return this.status === 'ACTIVE';
  }

  hasValidCoordinates() {
    return !isNaN(this.lat) && !isNaN(this.lng) && this.lat !== 0 && this.lng !== 0;
  }

  getLatLng() {
    return [this.lat, this.lng];
  }

  getShortNumber() {
    const match = String(this.id).match(/(\d+)$/);
    return match ? match[1].slice(-2) : '•';
  }

  matches(query = '', statusFilter = 'all') {
    if (statusFilter === 'leak' && !this.isLeaking()) return false;
    if (statusFilter === 'maintenance' && !this.isMaintenance()) return false;
    if (statusFilter === 'active' && !this.isActive()) return false;

    if (!query) return true;
    const q = query.toLowerCase().trim();
    return (
      this.label.toLowerCase().includes(q) ||
      this.id.toLowerCase().includes(q) ||
      this.locationName.toLowerCase().includes(q) ||
      this.cluster.toLowerCase().includes(q)
    );
  }

  isOffline() {
    return this.status === 'OFFLINE' || this.status === 'INACTIVE';
  }

  createMarkerIcon(isDraft = false, isSelected = false) {
    if (isDraft) {
      const html = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(2, 132, 199, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: #0c4a6e; box-shadow: 0 4px 14px rgba(0,0,0,0.28); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; color: #ffffff; font-family: monospace; font-size: 11px; font-weight: 800;">
            +
          </div>
        </div>
      `;
      return L.divIcon({
        className: 'apple-map-draft-pin',
        html,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
    }

    let bgColor = '#0284c7'; // Active Sky Blue
    let pulse = false;

    if (this.isMaintenance()) {
      bgColor = '#f59e0b'; // Amber Maintenance
    } else if (this.isLeaking()) {
      bgColor = '#e11d48'; // Rose Leak Alert
      pulse = true;
    } else if (this.isOffline()) {
      bgColor = '#64748b'; // Slate Gray when Sensor is Offline (>45s stale)
    }

    const scale = isSelected ? 'transform: scale(1.18);' : '';
    const ring = isSelected ? 'box-shadow: 0 0 0 4px rgba(12, 74, 110, 0.28), 0 4px 12px rgba(0,0,0,0.22);' : 'box-shadow: 0 3px 10px rgba(0,0,0,0.2);';
    const shortNum = this.getShortNumber();

    const html = `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease; ${scale}">
        ${pulse ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(225, 29, 72, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="width: 26px; height: 26px; border-radius: 9999px; background: ${bgColor}; ${ring} border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; color: #ffffff; font-family: monospace; font-size: 10px; font-weight: 800;">
          ${shortNum}
        </div>
        ${this.isPhysical ? `<div title="Physical ESP32 Sensor" style="position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px; border-radius: 9999px; background: #10b981; border: 2px solid #ffffff;"></div>` : ''}
      </div>
    `;

    return L.divIcon({
      className: 'apple-map-pin',
      html,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }
}