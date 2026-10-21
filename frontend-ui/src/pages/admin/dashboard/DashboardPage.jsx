import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../../api/admin_api';
import { useAuthStore } from '../../../stores/useAuthStore';
import { rtdbSubscription } from '../../../firebase/rtdb_subscription';

import DashboardHeader from './components/DashboardHeader';
import { DashboardKpiGrid } from './components/DashboardKpiGrid';
import CommunityFlowChart from './components/CommunityFlowChart';
import PurokNodeOverview from './components/PurokNodeOverview';
import PriorityIncidentWidget from './components/PriorityIncidentWidget';
import AdminActionHub from './components/AdminActionHub';
import SystemMapPreview from './components/SystemMapPreview';
import AgentHeartbeatBar from '../../../components/common/AgentHeartbeatBar';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const [summary, setSummary] = useState({
    totalNodes: 9,
    community24hLiters: 0,
    nodes: [],
    incidentBreakdown: [],
    systemStatus: 'OPERATIONAL'
  });
  const [realIncidents, setRealIncidents] = useState([]);
  const [techCount, setTechCount] = useState(1);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [sumRes, incRes, techRes] = await Promise.all([
          adminApi.getClusterSummary(),
          adminApi.getIncidents(),
          adminApi.getUsers('technician')
        ]);

        if (sumRes?.success && sumRes.data) {
          setSummary({
            totalNodes: sumRes.data.total_nodes ?? 9,
            community24hLiters: sumRes.data.community_24h_liters ?? 0,
            nodes: sumRes.data.nodes ?? [],
            incidentBreakdown: sumRes.data.incident_breakdown ?? [],
            systemStatus: sumRes.data.system_status ?? 'OPERATIONAL'
          });
        }

        if (incRes?.success && Array.isArray(incRes.data)) {
          setRealIncidents(incRes.data);
        }

        if (techRes?.success && Array.isArray(techRes.data?.users)) {
          setTechCount(techRes.data.users.length || 1);
        }
      } catch (err) {
        console.warn('[Dashboard] Failed fetching dashboard data:', err.message);
      }
    }

    loadDashboardData();

    // Subscribe to Firebase Hot Store for real-time telemetry, hypotheses, & heartbeats
    rtdbSubscription.subscribeConnectionStatus();
    rtdbSubscription.subscribeAllNodes();
    rtdbSubscription.subscribeBlackboardHypotheses();
    rtdbSubscription.subscribeHeartbeats();

    return () => {
      rtdbSubscription.unsubscribeAll();
    };
  }, []);

  const kpis = useMemo(() => {
    const openList = realIncidents.filter((i) => i.status === 'OPEN');
    const activeList = realIncidents.filter((i) =>
      ['OPEN', 'DISPATCHED', 'PENDING_VERIFICATION', 'REPAIR_FAILED'].includes(i.status)
    );

    return {
      activeLeaks: activeList.length,
      pendingTickets: openList.length,
      onDutyTechs: techCount
    };
  }, [realIncidents, techCount]);

  return (
    <div className="min-h-full bg-canvas text-slate-900 p-6 sm:p-8 space-y-5 font-sans">
      <DashboardHeader user={user} />

      <AgentHeartbeatBar />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-5">
          <DashboardKpiGrid summary={summary} kpis={kpis} />
        </div>
        <div className="xl:col-span-7">
          <SystemMapPreview />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-8 space-y-5">
          <CommunityFlowChart />
          <PurokNodeOverview nodes={summary.nodes} />
        </div>

        <div className="xl:col-span-4 space-y-5">
          <PriorityIncidentWidget incidents={realIncidents} />
          <AdminActionHub />
        </div>
      </div>
    </div>
  );
}
