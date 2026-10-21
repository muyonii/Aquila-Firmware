import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../../../api/axios_client';
import {
  ShieldAlert,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SopDirectivesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/action-cards');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTemplates(res.data.data);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: 'Could not load SOP templates from MySQL.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleFieldChange = (templateId, field, value) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.template_id === templateId ? { ...t, [field]: value } : t
      )
    );
  };

  const handleSaveTemplate = async (template) => {
    setSavingId(template.template_id);
    setFeedback(null);
    try {
      const res = await axiosClient.put(
        `/action-cards/${template.template_id}`,
        {
          display_name: template.display_name,
          action_card_title: template.action_card_title,
          action_directive: template.action_directive
        }
      );
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          text: `Saved SOP Template #${template.template_id} (${template.display_name}) to MySQL Table 3.9.`
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err.response?.data?.error?.message ||
          'Failed to update SOP directive.'
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            SOP Action Card Directives (Table 3.9)
          </h2>
          <p className="text-sm text-slate-600">
            Customize the automated repair instructions dispatched to field plumbers for each anomaly tier.
          </p>
        </div>

        <button
          type="button"
          onClick={loadTemplates}
          className="p-2 rounded-control bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          title="Reload from MySQL"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin': ''}`} />
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-control border text-[0.8125rem] flex items-center gap-2.5 ${
 feedback.type === 'success'
 ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
 : 'bg-rose-50 border-rose-200 text-rose-700'
 }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[0.8125rem] text-slate-600">
          Loading SOP Action Card catalog from MySQL...
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((tpl) => (
            <div
              key={tpl.template_id}
              className="aq-surface rounded-card p-5 border border-black/[0.06] shadow-2xs space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#0369a1]" />
                  <span className="font-mono text-[0.8125rem] font-semibold text-slate-900">
                    {tpl.academic_classification}
                  </span>
                  <span className="text-[0.8125rem] text-slate-600 italic">
                    ({tpl.academic_term})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[0.8125rem] font-mono font-semibold border ${
 tpl.severity_level === 'P1'
 ? 'bg-rose-50 text-rose-700 border-rose-200'
 : tpl.severity_level === 'P2'
 ? 'bg-amber-50 text-amber-800 border-amber-200'
 : 'bg-sky-50 text-sky-700 border-sky-200'
 }`}
                  >
                    {tpl.severity_level}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[0.8125rem] font-mono bg-slate-100 text-slate-600">
                    {tpl.incident_type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[0.8125rem]">
                <div className="space-y-1">
                  <label className="text-[0.8125rem] font-semibold text-slate-600 block">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={tpl.display_name || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        tpl.template_id,
                        'display_name',
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0369a1] rounded-control px-3 py-2 text-[0.8125rem] font-semibold text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.8125rem] font-semibold text-slate-600 block">
                    Action Card Headline
                  </label>
                  <input
                    type="text"
                    value={tpl.action_card_title || ''}
                    onChange={(e) =>
                      handleFieldChange(
                        tpl.template_id,
                        'action_card_title',
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0369a1] rounded-control px-3 py-2 text-[0.8125rem] font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 text-[0.8125rem]">
                <label className="text-[0.8125rem] font-semibold text-slate-600 block">
                  Plumber Field Directive (INV-01)
                </label>
                <textarea
                  rows={2}
                  value={tpl.action_directive || ''}
                  onChange={(e) =>
                    handleFieldChange(
                      tpl.template_id,
                      'action_directive',
                      e.target.value
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0369a1] rounded-control px-3 py-2 text-[0.8125rem] text-slate-700 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={savingId === tpl.template_id}
                  onClick={() => handleSaveTemplate(tpl)}
                  className="px-3.5 py-1.5 rounded-control bg-[#0c4a6e] hover:bg-[#075985] text-white text-[0.8125rem] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {savingId === tpl.template_id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Directive</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}