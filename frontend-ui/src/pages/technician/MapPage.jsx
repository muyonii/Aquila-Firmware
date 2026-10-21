import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Marker, Popup, useMap } from 'react-leaflet';
import { useTaskStore } from '../../stores/useTaskStore';
import { useTelemetryStore } from '../../stores/useTelemetryStore';
import { adminApi } from '../../api/admin_api';
import OsmMap from '../../components/map/OsmMap';
import DagNetworkLayer from '../../components/map/DagNetworkLayer';
import {
  createNodeIcon,
  createTechLocationIcon
} from '../../components/map/mapIcons';

import {
  Navigation,
  MapPin,
  ArrowRight,
  Crosshair,
  LocateOff
} from 'lucide-react';

function MapController({ targetCenter }) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter) {
      map.flyTo(targetCenter, 18, { animate: true, duration: 0.6 });
    }
  }, [targetCenter, map]);
  return null;
}

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const focusNodeId = searchParams.get('focus');

  const { tasks, fetchMyTasks } = useTaskStore();
  const rtdbNodes = useTelemetryStore((state) => state.nodes);
  const leakHypotheses = useTelemetryStore((state) => state.leakHypotheses);

  const [allNodes, setAllNodes] = useState([]);
  const [techLocation, setTechLocation] = useState(null);
  const [targetCenter, setTargetCenter] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // 1-second clock to evaluate 45s telemetry staleness accurately
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMyTasks().catch(() => {});
    adminApi
      .getNodes()
      .then((res) => {
        if (res?.success && Array.isArray(res.data?.nodes)) {
          const normalized = res.data.nodes.map((n) => ({
            ...n,
            latitude: n.coordinates?.lat ?? n.latitude,
            longitude: n.coordinates?.lng ?? n.longitude
          }));
          setAllNodes(normalized);

          if (focusNodeId) {
            const target = normalized.find((n) => n.node_id === focusNodeId);
            if (target?.latitude && target?.longitude) {
              setTargetCenter([
                Number(target.latitude),
                Number(target.longitude)
              ]);
            }
          }
        }
      })
      .catch(() => {});
  }, [fetchMyTasks, focusNodeId]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setTechLocation([pos.coords.latitude, pos.coords.longitude]);
        setGpsError(null);
      },
      () =>
        setGpsError(
          'GPS location is off. Showing Purok 2 pipeline network.'
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== 'CLOSED_VERIFIED' &&
          t.latitude &&
          t.longitude &&
          !isNaN(Number(t.latitude)) &&
          !isNaN(Number(t.longitude))
      ),
    [tasks]
  );

  const taskByNodeId = useMemo(() => {
    const map = {};
    activeTasks.forEach((t) => {
      map[t.node_id] = t;
    });
    return map;
  }, [activeTasks]);

  // Count how many nodes are actively streaming (<= 45s)
  const streamingCount = useMemo(() => {
    return allNodes.filter((n) => {
      const rawTs = Number(rtdbNodes?.[n.node_id]?.telemetry?.timestamp || 0);
      const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
      return ts > 0 && Math.max(0, nowSec - ts) <= 45;
    }).length;
  }, [allNodes, rtdbNodes, nowSec]);

  const handleCenterOnMe = () => {
    if (techLocation) setTargetCenter([...techLocation]);
  };

  const handleCenterOnTask = (task) => {
    setTargetCenter([Number(task.latitude), Number(task.longitude)]);
    setSelectedTask(task);
  };

  const glass =
    'bg-white border border-line ring-1 ring-black/[0.05] shadow-soft';

  return (
    <div className="relative w-full h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-3.5rem)] flex flex-col">
      {/* Floating HUD */}
      <div className="absolute top-3 left-14 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div
          className={`${glass} px-3.5 py-2 rounded-control pointer-events-auto flex items-center gap-3 text-[0.8125rem]`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
 activeTasks.length > 0
 ? 'bg-rose-500 animate-ping'
 : streamingCount > 0
 ? 'bg-emerald-500 animate-pulse'
 : 'bg-slate-400'
 }`}
            />
            <span className="font-semibold text-slate-800">
              {activeTasks.length} work order
              {activeTasks.length !== 1 ? 's' : ''} • {streamingCount}/
              {allNodes.length} streaming
            </span>
          </div>

          {/* Mini Legend */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200 text-[10.5px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600" /> Leak
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Maint / Check
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Online
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Offline
            </span>
          </div>
        </div>

        <button
          onClick={handleCenterOnMe}
          disabled={!techLocation}
          title={gpsError || 'Center on my GPS location'}
          aria-label="Center on my location"
          className={`${glass} w-11 h-11 rounded-control pointer-events-auto flex items-center justify-center text-slate-700 transition active:scale-95 disabled:opacity-60 cursor-pointer`}
        >
          {gpsError ? (
            <LocateOff className="w-4 h-4 text-slate-600" />
          ) : (
            <Crosshair
              className={`w-4 h-4 ${
 techLocation ? 'text-sky-600': 'text-slate-600 animate-pulse'
 }`}
            />
          )}
        </button>
      </div>

      {/* Leaflet Map with Hydraulic DAG Conduits + All Nodes */}
      <div className="flex-1 w-full h-full relative z-0">
        <OsmMap className="h-full w-full !rounded-none !border-0 !shadow-none">
          <MapController targetCenter={targetCenter} />

          {/* Hydraulic Pipeline Conduits (Parent -> Child DAG) */}
          <DagNetworkLayer nodes={allNodes} leakHypotheses={leakHypotheses} />

          {/* Technician Live GPS Marker */}
          {techLocation && (
            <Marker position={techLocation} icon={createTechLocationIcon()}>
              <Popup>
                <div className="p-1 text-center text-[0.8125rem]">
                  <p className="font-semibold text-sky-700">Your GPS Location</p>
                  <p className="text-[0.8125rem] text-slate-600 font-mono mt-0.5">
                    Field Technician
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Render All Community Nodes (With Accurate 45s Stale Check) */}
          {allNodes.map((node) => {
            if (!node.latitude || !node.longitude) return null;
            const nodeId = node.node_id;
            const task = taskByNodeId[nodeId];
            const rtdbNode = rtdbNodes?.[nodeId];
            const leak = leakHypotheses?.[nodeId];

            const rawTs = Number(rtdbNode?.telemetry?.timestamp || 0);
            const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
            const isFresh = ts > 0 && Math.max(0, nowSec - ts) <= 45;
            const liveFlow = isFresh
              ? Number(rtdbNode?.telemetry?.flow_rate_lpm || 0)
              : 0;
            const effectiveNodeStatus = rtdbNode?.status || node.status;

            const pos = [Number(node.latitude), Number(node.longitude)];
            const shortCode = nodeId?.slice(-2) || '•';

            let pinStatus = 'NORMAL';
            if (effectiveNodeStatus === 'MAINTENANCE') {
              pinStatus = 'MAINTENANCE';
            } else if (
              task?.severity_level === 'P1' ||
              task?.status === 'REPAIR_FAILED' ||
              (isFresh && leak?.classification === 'LEAK')
            ) {
              pinStatus = 'LEAK';
            } else if (task || (isFresh && leak?.classification === 'SUSPICIOUS')) {
              pinStatus = 'SUSPICIOUS';
            } else if (!isFresh) {
              pinStatus = 'OFFLINE';
            }

            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${node.latitude},${node.longitude}`;

            return (
              <Marker
                key={nodeId}
                position={pos}
                icon={createNodeIcon(pinStatus, shortCode)}
                eventHandlers={{
                  click: () => task && setSelectedTask(task)
                }}
              >
                <Popup>
                  <div className="p-1.5 space-y-2.5 text-[0.8125rem] min-w-[220px]">
                    <div className="border-b border-slate-100 pb-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-semibold text-slate-800">
                          {nodeId}
                        </span>
                        <span
                          className={`text-[0.8125rem] font-mono font-semibold px-1.5 py-0.5 rounded ${
 pinStatus === 'LEAK'
 ? 'bg-rose-100 text-rose-700'
 : pinStatus === 'MAINTENANCE'
 ? 'bg-amber-100 text-amber-800'
 : isFresh
 ? 'bg-emerald-100 text-emerald-700'
 : 'bg-slate-100 text-slate-600'
 }`}
                        >
                          {task
                            ? task.status.replace('_', ' ')
                            : isFresh
                            ? `${liveFlow.toFixed(2)} LPM`
                            : 'OFFLINE (>45s)'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm mt-1">
                        {node.household_label}
                      </h4>
                      <p className="text-[0.8125rem] text-slate-600">
                        {node.location_name} • Feeder:{' '}
                        <strong className="font-mono">
                          {node.parent_node_id || 'Main Reservoir'}
                        </strong>
                      </p>
                    </div>

                    {task && (
                      <p className="text-[0.8125rem] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg">
                        {task.action_directive || task.repair_notes}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-2 rounded-lg transition"
                      >
                        <Navigation className="w-3 h-3 text-sky-600" />
                        <span>Directions</span>
                      </a>
                      {task && (
                        <Link
                          to={`/tasks/${task.incident_id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1 text-[0.8125rem] font-semibold !text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-2 rounded-lg transition"
                        >
                          <span>Workbench</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </OsmMap>
      </div>

      {/* Bottom Work Order Carousel */}
      {activeTasks.length > 0 && (
        <div className="absolute bottom-3 left-0 right-0 z-10 pointer-events-none">
          <div className="flex gap-2 overflow-x-auto px-3 pb-1 pointer-events-auto snap-x [scrollbar-width:none]">
            {activeTasks.map((task) => {
              const isSelected = selectedTask?.incident_id === task.incident_id;
              const isP1 = task.severity_level === 'P1';

              return (
                <div
                  key={task.incident_id}
                  className={`${glass} snap-start shrink-0 w-64 rounded-card flex items-stretch overflow-hidden transition ${
 isSelected ? '!ring-2 !ring-slate-900': ''
 }`}
                >
                  <button
                    onClick={() => handleCenterOnTask(task)}
                    className="flex-1 min-w-0 p-3 text-left active:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[0.8125rem] mb-1">
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded-full ${
 isP1
 ? 'bg-rose-100 text-rose-700'
 : 'bg-slate-100 text-slate-700'
 }`}
                      >
                        {task.severity_level}
                      </span>
                      <span className="font-mono text-slate-600 truncate">
                        {task.node_id}
                      </span>
                    </div>
                    <h5 className="text-sm font-semibold text-slate-900 truncate">
                      {task.household_label || task.node_id}
                    </h5>
                    <p className="text-[0.8125rem] text-slate-600 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="truncate">
                        {task.location_name || task.purok_cluster}
                      </span>
                    </p>
                  </button>
                  <Link
                    to={`/tasks/${task.incident_id}`}
                    aria-label="Open work order"
                    className="w-12 bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}