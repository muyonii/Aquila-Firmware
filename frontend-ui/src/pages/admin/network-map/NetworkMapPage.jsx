import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { adminApi } from '../../../api/admin_api';
import { rtdbSubscription } from '../../../firebase/rtdb_subscription';
import { useTelemetryStore } from '../../../stores/useTelemetryStore';
import { GridNode } from './models/GridNode';
import { PipeConduit } from './models/PipeConduit';
import 'leaflet/dist/leaflet.css';

import MapSearchOverlay from './components/MapSearchOverlay';
import MapStatusBadge from './components/MapStatusBadge';
import MapControls from './components/MapControls';
import NodeDetailsPanel from './components/NodeDetailsPanel';
import ProvisionNodeDrawer from './components/ProvisionNodeModal';

const SECTOR_CENTER = [14.6766, 120.5422];

/**
 * Forces Leaflet to recalculate dimensions and smoothly fits all nodes into view
 * or flies to the selected node when clicked.
 */
function MapViewportController({ nodes, selectedNode, recenterTrigger }) {
  const map = useMap();

  // Fix initial tile sizing
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => clearTimeout(timer);
  }, [map]);

  // Fit all nodes into camera view when loaded or when Recenter is clicked
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const coords = nodes
      .filter((n) => n.hasValidCoordinates())
      .map((n) => [n.lat, n.lng]);

    if (coords.length > 1) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 18, animate: true });
    } else if (coords.length === 1) {
      map.setView(coords[0], 17);
    }
  }, [map, nodes.length, recenterTrigger]);

  // Fly to selected node when user clicks a pin or quick-jump pill
  useEffect(() => {
    if (selectedNode && selectedNode.hasValidCoordinates()) {
      map.flyTo([selectedNode.lat, selectedNode.lng], 18, {
        animate: true,
        duration: 0.6
      });
    }
  }, [map, selectedNode]);

  return null;
}

function MapClickHandler({ isAddingNode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isAddingNode) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

export default function NetworkMapPage() {
  const [rawNodes, setRawNodes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showPipes, setShowPipes] = useState(true);
  const [mapLayer, setMapLayer] = useState('standard');
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const [isAddingNode, setIsAddingNode] = useState(false);
  const [draftNode, setDraftNode] = useState(null);
  const [submittingNode, setSubmittingNode] = useState(false);

  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Firebase Blackboard & Node Statuses
  const rtdbNodes = useTelemetryStore((state) => state.nodes);
  const leakHypotheses = useTelemetryStore((state) => state.leakHypotheses);

  const loadNodes = useCallback(async () => {
    try {
      const res = await adminApi.getNodes();
      if (res?.success && Array.isArray(res.data?.nodes)) {
        setRawNodes(res.data.nodes);
      }
    } catch (err) {
      console.warn('[NetworkMap] Failed loading nodes:', err.message);
    }
  }, []);

  useEffect(() => {
    loadNodes();
    rtdbSubscription.subscribeConnectionStatus();
    rtdbSubscription.subscribeAllNodes();
    rtdbSubscription.subscribeBlackboardHypotheses();

    return () => {
      rtdbSubscription.unsubscribeAll();
    };
  }, [loadNodes]);

  // Hydrate GridNodes with live Firebase leak & maintenance statuses
  const nodes = useMemo(() => {
    return rawNodes.map((raw, idx) => {
      const nodeId = raw.node_id || raw.id;
      const leak = leakHypotheses?.[nodeId];
      const rtdbNode = rtdbNodes?.[nodeId];
      const rtdbStatus = rtdbNode?.status || raw.status || 'ACTIVE';

      // Check 45-second stale telemetry timeout (Rule INV-04)
      const rawTs = Number(rtdbNode?.telemetry?.timestamp || 0);
      const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
      const isFresh = ts > 0 && Math.max(0, nowSec - ts) <= 45;

      let effectiveStatus = rtdbStatus;
      if (rtdbStatus === 'MAINTENANCE') {
        effectiveStatus = 'MAINTENANCE';
      } else if (!isFresh) {
        effectiveStatus = 'OFFLINE';
      } else if (leak?.classification === 'LEAK') {
        effectiveStatus = 'LEAK';
      }

      return new GridNode({ ...raw, status: effectiveStatus }, idx);
    });
  }, [rawNodes, rtdbNodes, leakHypotheses, nowSec]);

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const nextSuggestedId = useMemo(() => {
    let maxNum = 0;
    for (const n of nodes) {
      const match = String(n.id).match(/NODE-B1-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `NODE-B1-${String(maxNum + 1).padStart(3, '0')}`;
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => n.matches(search, statusFilter) && n.hasValidCoordinates());
  }, [nodes, search, statusFilter]);

  const pipeLines = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const list = [];
    for (const node of nodes) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId);
        if (node.hasValidCoordinates() && parent.hasValidCoordinates()) {
          list.push(new PipeConduit(parent, node, false));
        }
      }
    }
    return list;
  }, [nodes]);

  const draftPipeLine = useMemo(() => {
    if (!isAddingNode || !draftNode || !draftNode.parentId) return null;
    const parent = nodes.find((n) => n.id === draftNode.parentId);
    if (!parent || !parent.hasValidCoordinates()) return null;
    return new PipeConduit(parent, draftNode, true);
  }, [isAddingNode, draftNode, nodes]);

  // Preserve draftNode plain object fields when clicking on the map!
  const handleMapClick = useCallback(
    (latlng) => {
      if (!isAddingNode) return;
      setDraftNode((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          lat: latlng.lat,
          lng: latlng.lng,
          getLatLng: () => [latlng.lat, latlng.lng]
        };
      });
    },
    [isAddingNode]
  );

  const startAddingNode = () => {
    setSelectedNodeId(null);
    setDraftNode({
      suggestedId: nextSuggestedId,
      householdName: '',
      streetLocation: 'Lot 20 Blk 3, Purok 2',
      cluster: 'Purok 2',
      parentId: nodes[0]?.id || 'NODE-B1-001',
      lat: SECTOR_CENTER[0],
      lng: SECTOR_CENTER[1],
      isPhysical: false,
      getLatLng: () => [SECTOR_CENTER[0], SECTOR_CENTER[1]]
    });
    setIsAddingNode(true);
  };

  const commitNewNode = async () => {
    if (!draftNode || !draftNode.householdName?.trim()) {
      alert('Please enter a household name.');
      return;
    }

    setSubmittingNode(true);
    try {
      const res = await adminApi.createNode({
        node_id: draftNode.suggestedId,
        household_label: draftNode.householdName.trim(),
        location_name: draftNode.streetLocation?.trim() || 'Purok 2 Sector',
        purok_cluster: draftNode.cluster || 'Purok 2',
        parent_node_id: draftNode.parentId || null,
        latitude: draftNode.lat,
        longitude: draftNode.lng,
        is_physical: draftNode.isPhysical
      });

      if (res?.success) {
        const createdId = res.data?.node_id || draftNode.suggestedId;
        setIsAddingNode(false);
        setDraftNode(null);
        await loadNodes();
        setSelectedNodeId(createdId);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to provision water meter.');
    } finally {
      setSubmittingNode(false);
    }
  };

  const toggleMaintenance = async (node) => {
    const nextStatus = node.isMaintenance() ? 'ACTIVE' : 'MAINTENANCE';
    try {
      await adminApi.updateNode(node.id, {
        status: nextStatus,
        household_label: node.label,
        location_name: node.locationName,
        purok_cluster: node.cluster,
        parent_node_id: node.parentId,
        latitude: node.lat,
        longitude: node.lng
      });
      await loadNodes();
    } catch {
      alert('Failed to update node maintenance state.');
    }
  };

  const activeCount = nodes.filter((n) => n.isActive()).length;
  const leakCount = nodes.filter((n) => n.isLeaking()).length;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] sm:h-screen overflow-hidden select-none font-sans bg-canvas">
      <MapContainer
        center={SECTOR_CENTER}
        zoom={17}
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <MapViewportController
          nodes={filteredNodes}
          selectedNode={selectedNode}
          recenterTrigger={recenterTrigger}
        />
        <MapClickHandler isAddingNode={isAddingNode} onMapClick={handleMapClick} />

        {mapLayer === 'standard' ? (
          <TileLayer
            key="carto-standard"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2des_1_5b92e80a785d8e242b3ca977"
            maxZoom={21}
            maxNativeZoom={19}
          />
        ) : (
          <TileLayer
            key="google-hybrid"
            attribution="&copy; Google"
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            maxZoom={21}
            maxNativeZoom={20}
          />
        )}

        {/* Hydraulic DAG Conduits */}
        {showPipes &&
          pipeLines.map((pipe) => (
            <Polyline
              key={pipe.id}
              positions={pipe.getPositions()}
              pathOptions={pipe.getPathOptions()}
            />
          ))}

        {/* Draft Pipe Line Preview */}
        {draftPipeLine && (
          <Polyline
            key={draftPipeLine.id}
            positions={draftPipeLine.getPositions()}
            pathOptions={draftPipeLine.getPathOptions()}
          />
        )}

        {/* All Monitoring Node Pins */}
        {filteredNodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          return (
            <Marker
              key={node.id}
              position={[node.lat, node.lng]}
              icon={node.createMarkerIcon(false, isSelected)}
              eventHandlers={{
                click: () => !isAddingNode && setSelectedNodeId(node.id)
              }}
            >
              <Tooltip direction="top" offset={[0, -14]}>
                <div className="text-[0.8125rem] font-sans">
                  <strong className="font-mono">{node.id}</strong> — {node.label}
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Draft Pin When Provisioning New Water Meter */}
        {isAddingNode && draftNode && (
          <Marker
            position={[draftNode.lat, draftNode.lng]}
            icon={new GridNode({
              latitude: draftNode.lat,
              longitude: draftNode.lng
            }).createMarkerIcon(true)}
            draggable={true}
            eventHandlers={{
              dragend: (e) => handleMapClick(e.target.getLatLng())
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -16]}>
              <span className="text-[0.8125rem] font-semibold">
                {draftNode.suggestedId}: Drag or click map to position
              </span>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      <MapSearchOverlay
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalNodes={nodes.length}
        leakCount={leakCount}
        nodes={filteredNodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={(n) => setSelectedNodeId(n.id)}
        disabled={isAddingNode}
      />

      <MapStatusBadge
        activeCount={activeCount}
        leakCount={leakCount}
        onAddClick={startAddingNode}
        isAddingNode={isAddingNode}
      />

      <MapControls
        onRecenter={() => {
          setSelectedNodeId(null);
          setRecenterTrigger((c) => c + 1);
        }}
        showPipes={showPipes}
        onTogglePipes={() => setShowPipes(!showPipes)}
        mapLayer={mapLayer}
        onToggleLayer={() =>
          setMapLayer(mapLayer === 'standard' ? 'satellite' : 'standard')
        }
      />

      <NodeDetailsPanel
        node={selectedNode}
        onClose={() => setSelectedNodeId(null)}
        onToggleMaintenance={toggleMaintenance}
      />

      <ProvisionNodeDrawer
        isOpen={isAddingNode}
        draftNode={draftNode}
        onDraftChange={setDraftNode}
        nodes={nodes}
        onCancel={() => {
          setIsAddingNode(false);
          setDraftNode(null);
        }}
        onCommit={commitNewNode}
        submitting={submittingNode}
      />
    </div>
  );
}