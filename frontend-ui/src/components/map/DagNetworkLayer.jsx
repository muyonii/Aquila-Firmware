import React from 'react';
import { Polyline } from 'react-leaflet';

/**
 * Draws hydraulic Directed Acyclic Graph (DAG) conduits between parent and child nodes
 * @param {Array<Object>} nodes - Node list with parent_node_id and coordinates
 * @param {Object} leakHypotheses - Map of active leak hypotheses to paint leaking pipes red
 */
export default function DagNetworkLayer({ nodes = [], leakHypotheses = {} }) {
  // Index nodes by node_id for O(1) parent lookups
  const nodeMap = {};
  nodes.forEach((n) => {
    if (n.latitude && n.longitude) {
      nodeMap[n.node_id] = [Number(n.latitude), Number(n.longitude)];
    }
  });

  const conduits = [];

  nodes.forEach((child) => {
    if (!child.parent_node_id) return;
    const childCoords = nodeMap[child.node_id];
    const parentCoords = nodeMap[child.parent_node_id];

    if (childCoords && parentCoords) {
      const isParentLeaking = leakHypotheses[child.parent_node_id]?.classification === 'LEAK';
      const isChildLeaking = leakHypotheses[child.node_id]?.classification === 'LEAK';
      const isConduitFault = isParentLeaking || isChildLeaking;

      conduits.push({
        id: `${child.parent_node_id}->${child.node_id}`,
        positions: [parentCoords, childCoords],
        color: isConduitFault ? '#ef4444' : '#0284c7', // Red if leaking, Sky-blue if normal
        dashArray: isConduitFault ? '6, 8' : null,
        weight: isConduitFault ? 4 : 3
      });
    }
  });

  return (
    <>
      {conduits.map((pipe) => (
        <Polyline
          key={pipe.id}
          positions={pipe.positions}
          pathOptions={{
            color: pipe.color,
            weight: pipe.weight,
            opacity: 0.75,
            dashArray: pipe.dashArray
          }}
        />
      ))}
    </>
  );
}