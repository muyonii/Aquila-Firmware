import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../../api/admin_api';
import { rtdbSubscription } from '../../../firebase/rtdb_subscription';
import { IncidentModel } from './core/IncidentModel';

import IncidentHeader from './components/IncidentHeader';
import IncidentStageButtons from './components/IncidentStageButtons';
import IncidentQueueList from './components/IncidentQueueList';
import IncidentInspectorPane from './components/IncidentInspectorPane';
import LogComplaintModal from './components/LogComplaintModal';

// Safe helper functions immune to Vite HMR class prototype caching
const checkNeedsAction = (i) =>
  typeof i?.needsAction === 'function'
    ? i.needsAction()
    : i?.status === 'OPEN' || i?.status === 'REPAIR_FAILED';

const checkInFieldOrVerifying = (i) =>
  typeof i?.isInFieldOrVerifying === 'function'
    ? i.isInFieldOrVerifying()
    : i?.status === 'DISPATCHED' || i?.status === 'PENDING_VERIFICATION';

const checkIsResolved = (i) =>
  typeof i?.isResolved === 'function'
    ? i.isResolved()
    : i?.status === 'CLOSED_VERIFIED' || i?.status === 'CANCELLED';

export default function IncidentsPage() {
  const [data, setData] = useState({ incidents: [], technicians: [], nodes: [] });
  const [activeStage, setActiveStage] = useState('needs_dispatch');
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const reload = async () => {
    try {
      const [incRes, techRes, nodesRes] = await Promise.all([
        adminApi.getIncidents(),
        adminApi.getUsers('technician'),
        adminApi.getNodes()
      ]);

      const rawIncidents = incRes?.success && Array.isArray(incRes.data) ? incRes.data : [];
      const techs = techRes?.success && Array.isArray(techRes.data?.users) ? techRes.data.users : [];
      const nodes = nodesRes?.success && Array.isArray(nodesRes.data?.nodes) ? nodesRes.data.nodes : [];

      const parsedIncidents = rawIncidents.map((i) => new IncidentModel(i));
      setData({ incidents: parsedIncidents, technicians: techs, nodes });

      if (parsedIncidents.length > 0 && !selectedIncidentId) {
        const firstOpen = parsedIncidents.find((i) => checkNeedsAction(i)) || parsedIncidents[0];
        setSelectedIncidentId(firstOpen.id);
      }
    } catch (err) {
      console.warn('[IncidentsPage] Failed loading incidents from REST API:', err.message);
    }
  };

  useEffect(() => {
    reload();
    rtdbSubscription.subscribeConnectionStatus();
    rtdbSubscription.subscribeAllNodes();

    return () => {
      rtdbSubscription.unsubscribeAll();
    };
  }, []);

  const counts = useMemo(() => {
    const list = data.incidents;
    return {
      needsDispatch: list.filter((i) => checkNeedsAction(i)).length,
      inVerification: list.filter((i) => checkInFieldOrVerifying(i)).length,
      resolved: list.filter((i) => checkIsResolved(i)).length
    };
  }, [data.incidents]);

  const stageIncidents = useMemo(() => {
    switch (activeStage) {
      case 'needs_dispatch':
        return data.incidents.filter((i) => checkNeedsAction(i));
      case 'verifying':
        return data.incidents.filter((i) => checkInFieldOrVerifying(i));
      case 'resolved':
        return data.incidents.filter((i) => checkIsResolved(i));
      default:
        return data.incidents;
    }
  }, [data.incidents, activeStage]);

  const activeIncident = useMemo(() => {
    return data.incidents.find((i) => i.id === selectedIncidentId) || null;
  }, [data.incidents, selectedIncidentId]);

  const handleDispatch = async (incidentId, technicianId) => {
    try {
      await adminApi.dispatchTechnician(incidentId, technicianId);
      await reload();
      setActiveStage('verifying');
      setSelectedIncidentId(incidentId);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to dispatch plumber.');
    }
  };

  const handleDismiss = async (incidentId, reason) => {
    try {
      await adminApi.cancelIncident(incidentId, reason);
      await reload();
      setActiveStage('resolved');
      setSelectedIncidentId(incidentId);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to dismiss incident.');
    }
  };

  const handleCreateComplaint = async (formPayload) => {
    setSubmittingComplaint(true);
    try {
      const res = await adminApi.createManualIncident(formPayload);
      setIsComplaintModalOpen(false);
      await reload();
      setActiveStage('needs_dispatch');
      if (res?.data?.incident_id) {
        setSelectedIncidentId(res.data.incident_id);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to log complaint.');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-canvas text-slate-900 p-5 sm:p-6 select-none font-sans overflow-hidden">
      <div className="shrink-0 mb-4">
        <IncidentHeader onLogComplaintClick={() => setIsComplaintModalOpen(true)} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-hidden">
        <div className="w-full lg:w-[390px] xl:w-[420px] flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
          <div className="shrink-0 mb-3">
            <IncidentStageButtons activeStage={activeStage} onStageChange={setActiveStage} counts={counts} />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 [scrollbar-width:thin]">
            <IncidentQueueList
              incidents={stageIncidents}
              selectedId={selectedIncidentId}
              onSelect={(inc) => setSelectedIncidentId(inc.id)}
              activeStage={activeStage}
            />
          </div>
        </div>

        <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
          <IncidentInspectorPane
            incident={activeIncident}
            technicians={data.technicians}
            onDispatch={handleDispatch}
            onDismiss={handleDismiss}
            onRefresh={reload}
          />
        </div>
      </div>

      <LogComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        nodes={data.nodes}
        onSubmit={handleCreateComplaint}
        submitting={submittingComplaint}
      />
    </div>
  );
}