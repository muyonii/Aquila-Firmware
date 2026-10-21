// frontend-ui/src/pages/admin/network-map/hooks/useNetworkMap.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { adminApi } from '../../../../api/admin_api';
import { GridNode } from '../models/GridNode';
import { PipeConduit } from '../models/PipeConduit';

export const SECTOR_CENTER = [14.6766, 120.5422];

const FALLBACK_RAW_NODES = [
  { node_id: 'NODE-B1-001', household_label: 'Household 01 (Physical Testbed)', purok_cluster: 'Purok 2', parent_node_id: null, latitude: 14.6778, longitude: 120.5412, is_physical: true, status: 'ACTIVE' },
  { node_id: 'NODE-B1-002', household_label: 'Household 02 (Santos Family)', purok_cluster: 'Purok 2', parent_node_id: 'NODE-B1-001', latitude: 14.6772, longitude: 120.5422, is_physical: false, status: 'ACTIVE' },
  { node_id: 'NODE-B1-003', household_label: 'Household 03 (Reyes Family)', purok_cluster: 'Purok 2', parent_node_id: 'NODE-B1-001', latitude: 14.6766, longitude: 120.5415, is_physical: false, status: 'ACTIVE' },
  { node_id: 'NODE-B1-004', household_label: 'Household 04 (Cruz Family)', purok_cluster: 'Purok 2', parent_node_id: 'NODE-B1-002', latitude: 14.6761, longitude: 120.5430, is_physical: false, status: 'ACTIVE' },
  { node_id: 'NODE-B1-005', household_label: 'Household 05 (Bautista Family)', purok_cluster: 'Purok 2', parent_node_id: 'NODE-B1-002', latitude: 14.6769, longitude: 120.5436, is_physical: false, status: 'ACTIVE' },
  { node_id: 'NODE-B1-006', household_label: 'Household 06 (Mendoza Family)', purok_cluster: 'Purok 2', parent_node_id: 'NODE-B1-003', latitude: 14.6756, longitude: 120.5411, is_physical: false, status: 'ACTIVE' },
  { node_id: 'NODE-B1-007', household_label: 'Household 07 (Garcia Family)', purok_cluster: 'Purok 2', parent_node_id: 'NODE-B1-003', latitude: 14.6750, longitude: 120.5421, is_physical: false, status: 'ACTIVE' }
];

export function useNetworkMap() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPipes, setShowPipes] = useState(true);
  const [mapLayer, setMapLayer] = useState('standard');

  // =========================================================================
  // DRAFT PROVISIONING STATE (Memory only until confirmed)
  // =========================================================================
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [draftNode, setDraftNode] = useState(null);
  const [submittingNode, setSubmittingNode] = useState(false);

  // 1. Fetch nodes and hydrate GridNode instances
  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getNodes();
      if (res?.success && Array.isArray(res.data?.nodes)) {
        setNodes(res.data.nodes.map((n) => new GridNode(n)));
      } else {
        setNodes(FALLBACK_RAW_NODES.map((n) => new GridNode(n)));
      }
    } catch {
      setNodes(FALLBACK_RAW_NODES.map((n) => new GridNode(n)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  // 2. Compute Next Available Sequential Node ID (e.g., NODE-B1-008)
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

  // 3. Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => n.matches(search, statusFilter) && n.hasValidCoordinates());
  }, [nodes, search, statusFilter]);

  // 4. Permanent Pipe Lines
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

  // 5. Live Preview Dashed Pipe Line to Draft Pin
  const draftPipeLine = useMemo(() => {
    if (!isAddingNode || !draftNode || !draftNode.parentId) return null;
    const parent = nodes.find((n) => n.id === draftNode.parentId);
    if (!parent || !parent.hasValidCoordinates()) return null;
    return new PipeConduit(parent, draftNode, true);
  }, [isAddingNode, draftNode, nodes]);

  // 6. Interactive Map-Click Handler: Moves pin & auto-detects nearest street
  const handleMapClick = useCallback((latlng) => {
    if (!isAddingNode) return;

    setDraftNode((prev) => {
      if (!prev) return null;
      return new GridNode({
        ...prev,
        latitude: latlng.lat,
        longitude: latlng.lng
      });
    });
  }, [isAddingNode]);


  // 7. Initiate Adding Node
  const startAddingNode = () => {
    setSelectedNode(null);
    setDraftNode({
      suggestedId: nextSuggestedId,
      householdName: '',
      streetLocation: 'Near Camacho St.',
      cluster: 'Purok 2',
      parentId: '',
      lat: SECTOR_CENTER[0],
      lng: SECTOR_CENTER[1],
      isPhysical: false,
      getLatLng: () => [SECTOR_CENTER[0], SECTOR_CENTER[1]],
      createMarkerIcon: (isDraft) => new GridNode({}).createMarkerIcon(isDraft)
    });
    setIsAddingNode(true);
  };

  // 8. Cancel Workflow
  const cancelAddingNode = () => {
    setIsAddingNode(false);
    setDraftNode(null);
  };

  // 9. Commit & Save Node to Database
  const commitNewNode = async () => {
    if (!draftNode || !draftNode.householdName?.trim()) {
      alert('Please enter a household name.');
      return;
    }

    setSubmittingNode(true);
    try {
      // Formats label cleanly: "Santos Family (P. Paterno St)"
      const fullLabel = draftNode.streetLocation
        ? `${draftNode.householdName.trim()} (${draftNode.streetLocation.trim()})`.slice(0, 50)
        : draftNode.householdName.trim();

      const res = await adminApi.createNode({
        node_id: draftNode.suggestedId,
        household_label: fullLabel,
        purok_cluster: draftNode.cluster,
        parent_node_id: draftNode.parentId || null,
        latitude: draftNode.lat,
        longitude: draftNode.lng,
        is_physical: draftNode.isPhysical
      });

      if (res?.success) {
        setIsAddingNode(false);
        setDraftNode(null);
        await loadNodes();
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
      await adminApi.updateNode(node.id, { status: nextStatus });
      setSelectedNode(new GridNode({ ...node, status: nextStatus }));
      await loadNodes();
    } catch {
      alert('Failed to update node maintenance state.');
    }
  };

  const activeCount = nodes.filter((n) => n.isActive()).length;
  const leakCount = nodes.filter((n) => n.isLeaking()).length;

  return {
    nodes,
    filteredNodes,
    pipeLines,
    draftPipeLine,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedNode,
    setSelectedNode,
    showPipes,
    setShowPipes,
    mapLayer,
    setMapLayer,
    isAddingNode,
    draftNode,
    setDraftNode,
    submittingNode,
    activeCount,
    leakCount,
    handleMapClick,
    startAddingNode,
    cancelAddingNode,
    commitNewNode,
    toggleMaintenance
  };
}