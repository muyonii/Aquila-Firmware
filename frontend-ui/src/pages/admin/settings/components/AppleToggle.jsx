// frontend-ui/src/pages/admin/settings/components/AppleToggle.jsx
import React from 'react';

export default function AppleToggle({ checked, onChange, disabled = false, ariaLabel = 'Toggle' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
 checked ? 'bg-[#0c4a6e]': 'bg-[#e5e5ea]'
 }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition duration-200 ease-in-out mt-[2px] ml-[2px] ${
 checked ? 'translate-x-4': 'translate-x-0'
 }`}
      />
    </button>
  );
}