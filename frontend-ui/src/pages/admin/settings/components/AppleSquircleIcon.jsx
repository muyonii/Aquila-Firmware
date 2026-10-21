// frontend-ui/src/pages/admin/settings/components/AppleSquircleIcon.jsx
import React from 'react';

// Neutral icon chip (white, hairline border). The `color` prop is accepted for
// backwards compatibility but no longer changes the look: color is reserved for state.
export default function AppleSquircleIcon({ icon: Icon, size = 28 }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-tile bg-white border border-line text-ink flex items-center justify-center shrink-0"
    >
      <Icon style={{ width: size * 0.56, height: size * 0.56 }} className="stroke-[1.75]" />
    </div>
  );
}
