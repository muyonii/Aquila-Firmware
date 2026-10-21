// frontend-ui/src/pages/admin/dashboard/components/AdminActionHub.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, UserPlus, PlusSquare, Download } from 'lucide-react';
import { reportManager } from '../../reports/core/ReportManager';

export default function AdminActionHub() {
  const navigate = useNavigate();

  const handleExport = () => {
    reportManager.exportCsv('consumption');
  };

  const actions = [
    { label: 'Log Citizen Complaint', icon: FileText, onClick: () => navigate('/incidents') },
    { label: 'Register New User', icon: UserPlus, onClick: () => navigate('/users') },
    { label: 'Add Water Meter Node', icon: PlusSquare, onClick: () => navigate('/network-map') },
    { label: 'Export Monthly Council CSV', icon: Download, onClick: handleExport }
  ];

  return (
    <section className="aq-card">
      <div className="aq-card-head">
        <h2 className="aq-card-title">Administrative actions</h2>
      </div>

      <div className="space-y-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.label}
              type="button"
              onClick={act.onClick}
              className="aq-tile w-full !py-3 flex items-center justify-between text-left text-sm text-slate-800 hover:bg-[#f4f8fb] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c4a6e]"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-[18px] w-[18px] text-slate-700 stroke-[1.75]" />
                <span className="font-medium">{act.label}</span>
              </span>
              <span className="text-slate-600" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
