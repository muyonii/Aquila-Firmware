// frontend-ui/src/pages/admin/network-map/models/PipeConduit.js

/**
 * PipeConduit (Value Object)
 * Represents an edge in the hydraulic Directed Acyclic Graph (DAG) connecting
 * an upstream parent meter to a downstream child meter.
 */
export class PipeConduit {
  constructor(parentNode, childNode, isDraft = false) {
    this.id = `${parentNode.id || 'parent'}->${childNode.id || 'draft'}`;
    this.from = parentNode.getLatLng ? parentNode.getLatLng() : [parentNode.lat, parentNode.lng];
    this.to = childNode.getLatLng ? childNode.getLatLng() : [childNode.lat, childNode.lng];
    this.isLeaking = parentNode.isLeaking ? parentNode.isLeaking() || childNode.isLeaking() : false;
    this.isDraft = isDraft;
  }

  getPositions() {
    return [this.from, this.to];
  }

  getPathOptions() {
    if (this.isDraft) {
      // Dotted preview line for new draft connections
      return {
        color: '#007aff',
        weight: 2.5,
        dashArray: '6, 6',
        opacity: 0.8
      };
    }

    if (this.isLeaking) {
      // Red dashed alert line for leaking branches
      return {
        color: '#dc2626',
        weight: 3.5,
        dashArray: '6, 6',
        opacity: 0.75
      };
    }

    // Standard active pipe line
    return {
      color: '#007aff',
      weight: 2.2,
      opacity: 0.65
    };
  }
}