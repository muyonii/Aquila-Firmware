import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white w-full ${maxWidth} rounded-lg border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0c4a6e]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}