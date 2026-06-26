// Clean black stroke SVG icons — mapped from emoji keys stored in DB
import React from "react";

const ICONS: Record<string, React.ReactElement> = {
  "🛡️": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.5C16.5 21.15 20 16.25 20 11V5L12 2z"/>
    </svg>
  ),
  "✨": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  "🧺": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="5"/>
      <path d="M5 5h14M7 5V3h10v2"/>
      <path d="M10 13a2 2 0 0 1 4 0"/>
    </svg>
  ),
  "📐": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21L21 3M3 21h6M3 21v-6"/>
      <path d="M9 15l2-2M6 18l2-2M15 9l2-2M12 12l2-2"/>
    </svg>
  ),
  "🚚": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="7" width="13" height="11" rx="1"/>
      <path d="M14 10h4l3 5v2h-7V10z"/>
      <circle cx="6" cy="20" r="2"/>
      <circle cx="18" cy="20" r="2"/>
    </svg>
  ),
  "🔧": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  "🔒": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="11" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
      <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
  ),
  "🎁": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="12" rx="1"/>
      <path d="M3 10h18M12 10V22M12 10c0-2 2-4 4-4s2 3 0 4H12zM12 10C12 8 10 6 8 6s-2 3 0 4h4"/>
    </svg>
  ),
  "🌸": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <circle cx="12" cy="5" r="2.5"/>
      <circle cx="12" cy="19" r="2.5"/>
      <circle cx="5" cy="12" r="2.5"/>
      <circle cx="19" cy="12" r="2.5"/>
      <circle cx="7.2" cy="7.2" r="2.5"/>
      <circle cx="16.8" cy="16.8" r="2.5"/>
      <circle cx="7.2" cy="16.8" r="2.5"/>
      <circle cx="16.8" cy="7.2" r="2.5"/>
    </svg>
  ),
  "🪡": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l9-9M12 3s4 1 4 5-4 5-4 5"/>
      <path d="M15 6l4-4M12 8l7 7M9 12l-6 6"/>
    </svg>
  ),
  "🧹": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l9-12M15 3l-9 12"/>
      <path d="M6 21h6M9 15l-3 6"/>
    </svg>
  ),
  "📦": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8L12 3 3 8v8l9 5 9-5V8z"/>
      <path d="M12 3v13M3 8l9 5 9-5"/>
    </svg>
  ),
};

const FALLBACK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v4M12 16h.01"/>
  </svg>
);

interface Props {
  icon?: string | null;
  size?: number;
  className?: string;
}

export default function AddonSvgIcon({ icon, size = 20, className = "" }: Props) {
  const svg = icon ? (ICONS[icon] || FALLBACK) : FALLBACK;
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {svg}
    </span>
  );
}
