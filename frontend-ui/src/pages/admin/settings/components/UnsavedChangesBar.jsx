// frontend-ui/src/pages/admin/settings/components/UnsavedChangesBar.jsx
import React from 'react';
import { Check, RefreshCw } from 'lucide-react';

export default function UnsavedChangesBar({
  isDirty,
  isShaking,
  isSaving,
  saveSuccess,
  onReset,
  onSave
}) {
  return (
    <div
      className={`fixed bottom-7 inset-x-0 mx-auto max-w-lg z-50 px-4 transition-all duration-300 ease-out select-none ${
 isDirty
 ? 'translate-y-0 opacity-100'
 : 'translate-y-16 opacity-0 pointer-events-none'
 } ${isShaking ? 'animate-bounce': ''}`}
    >
      {/* Frosted Light Glass Capsule with Crisp High-Contrast Text */}
      <div className="aq-surface border border-line rounded-card shadow-soft px-5 py-3.5 flex items-center justify-between gap-4">
        
        {/* Warning Indicator & Readable Label */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          <span className="text-[0.8125rem] font-semibold text-slate-800 truncate">
            Careful — you have unsaved changes.
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="text-[0.8125rem] font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-black/[0.04] transition-colors cursor-pointer"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="bg-[#0369a1] hover:bg-[#0369a1] text-white text-[0.8125rem] font-semibold px-4 py-1.5 rounded-control transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3 w-3 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}