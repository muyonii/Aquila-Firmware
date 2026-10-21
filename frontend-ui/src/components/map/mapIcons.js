import L from 'leaflet';

/**
 * Creates an animated HTML divIcon for monitoring nodes
 * @param {'NORMAL' | 'LEAK' | 'SUSPICIOUS' | 'MAINTENANCE' | 'OFFLINE'} status 
 * @param {string} label - Short label (e.g. "01", "02")
 */
export function createNodeIcon(status = 'NORMAL', label = '') {
  let bgColor = 'bg-sky-500 border-white text-white';
  let pingRing = '';

  switch (status) {
    case 'LEAK':
      bgColor = 'bg-rose-600 border-white text-white';
      pingRing = '<span class="absolute -inset-1 rounded-full bg-rose-500 animate-ping opacity-75"></span>';
      break;
    case 'SUSPICIOUS':
      bgColor = 'bg-amber-500 border-white text-white';
      pingRing = '<span class="absolute -inset-1 rounded-full bg-amber-400 animate-ping opacity-50"></span>';
      break;
    case 'MAINTENANCE':
      bgColor = 'bg-slate-500 border-dashed border-slate-300 text-white';
      break;
    case 'OFFLINE':
      bgColor = 'bg-slate-300 border-slate-400 text-slate-600';
      break;
    case 'NORMAL':
    default:
      bgColor = 'bg-emerald-500 border-white text-white';
      break;
  }

  const html = `
    <div class="relative flex items-center justify-center w-7 h-7">
      ${pingRing}
      <div class="relative w-6 h-6 rounded-full border-2 shadow-md flex items-center justify-center text-[10px] font-bold ${bgColor}">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-node-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

/**
 * Marker for Technician Field GPS dot
 */
export function createTechLocationIcon() {
  const html = `
    <div class="relative flex items-center justify-center w-6 h-6">
      <span class="absolute -inset-1 rounded-full bg-sky-400 animate-ping opacity-75"></span>
      <div class="w-4 h-4 rounded-full bg-sky-600 border-2 border-white shadow-md"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-tech-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}