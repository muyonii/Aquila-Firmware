import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../api/admin_api';
import { axiosClient } from '../../../api/axios_client';

import ReportsHeader from './components/ReportsHeader';
import ReportsTabBar from './components/ReportsTabBar';
import EquityView from './components/EquityView';
import LeakLossView from './components/LeakLossView';
import WorkforceView from './components/WorkforceView';
import AuditLedgerView from './components/AuditLedgerView';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('equity');
  const [loading, setLoading] = useState(false);
  const [compacting, setCompacting] = useState(false);

  // Default 30-day window
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [reportData, setReportData] = useState({
    consumption: null,
    leaks: null,
    maintenance: null,
    auditLogs: []
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const dateParams = { start_date: startDate, end_date: endDate };
      const [consumptionRes, leaksRes, maintenanceRes, auditRes] = await Promise.all([
        adminApi.getConsumptionReport(dateParams),
        adminApi.getLeakLossReport(dateParams),
        adminApi.getMaintenanceReport(),
        adminApi.getAuditLogs()
      ]);

      setReportData({
        consumption: consumptionRes?.success ? consumptionRes.data : null,
        leaks: leaksRes?.success ? leaksRes.data : null,
        maintenance: maintenanceRes?.success ? maintenanceRes.data : null,
        auditLogs: auditRes?.success ? auditRes.data?.audit_logs || [] : []
      });
    } catch (err) {
      console.warn('[ReportsPage] Failed fetching reports from REST API:', err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleCompactNow = async () => {
    setCompacting(true);
    try {
      await axiosClient.post('/reports/compact-now');
      await loadReports();
    } catch (err) {
      console.warn('[ReportsPage] Compaction trigger failed:', err.message);
    } finally {
      setCompacting(false);
    }
  };

  const handleExportCsv = async () => {
    const typeMap = {
      equity: 'consumption',
      leaks: 'leaks',
      workforce: 'maintenance',
      audit: 'audit'
    };
    try {
      await adminApi.downloadReportCsv(typeMap[activeTab] || 'consumption');
    } catch {
      alert('Failed to stream CSV file export from server.');
    }
  };

  return (
    <div className="min-h-full bg-canvas text-slate-900 p-6 sm:p-10 space-y-8 select-none font-sans">
      <ReportsHeader
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onExport={handleExportCsv}
        onRefresh={loadReports}
        onCompactNow={handleCompactNow}
        loading={loading}
        compacting={compacting}
      />

      <ReportsTabBar activeTab={activeTab} onChange={setActiveTab} />

      <main>
        {activeTab === 'equity' && <EquityView data={reportData.consumption} />}
        {activeTab === 'leaks' && <LeakLossView data={reportData.leaks} />}
        {activeTab === 'workforce' && <WorkforceView data={reportData.maintenance} />}
        {activeTab === 'audit' && <AuditLedgerView logs={reportData.auditLogs} />}
      </main>
    </div>
  );
}