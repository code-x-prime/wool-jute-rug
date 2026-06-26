"use client";

// Clean black/stroke SVG icons for addon services
// icon prop = emoji stored in DB — maps to SVG
// Falls back to generic star if no match

const ICONS = {
  // Anti-slip
  "🛡️": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.5C16.5 21.15 20 16.25 20 11V5L12 2z"/>
    </svg>
  ),
  // Stain resist / sparkle
  "✨": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  // Wash / laundry
  "🧺": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="5"/>
      <path d="M5 5h14M7 5V3h10v2"/>
      <path d="M10 13a2 2 0 0 1 4 0"/>
    </svg>
  ),
  // Custom size / ruler
  "📐": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21L21 3M3 21h6M3 21v-6"/>
      <path d="M9 15l2-2M6 18l2-2"/>
      <path d="M15 9l2-2M12 12l2-2"/>
    </svg>
  ),
  // Delivery / truck
  "🚚": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="7" width="13" height="11" rx="1"/>
      <path d="M14 10h4l3 5v2h-7V10z"/>
      <circle cx="6" cy="20" r="2"/>
      <circle cx="18" cy="20" r="2"/>
    </svg>
  ),
  // Install / wrench
  "🔧": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  // Protect / lock
  "🔒": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="11" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
      <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
  ),
  // Gift wrap
  "🎁": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="12" rx="1"/>
      <path d="M3 10h18M12 10V22M12 10c0-2 2-4 4-4s2 3 0 4H12zM12 10C12 8 10 6 8 6s-2 3 0 4h4"/>
    </svg>
  ),
  // Fragrance / flower
  "🌸": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M12 7a3 3 0 0 0 0-6 3 3 0 0 0 0 6zM12 23a3 3 0 0 0 0-6 3 3 0 0 0 0 6zM7 12a3 3 0 0 0-6 0 3 3 0 0 0 6 0zM23 12a3 3 0 0 0-6 0 3 3 0 0 0 6 0zM8.5 8.5a3 3 0 0 0-4.24-4.24 3 3 0 0 0 4.24 4.24zM19.74 19.74a3 3 0 0 0-4.24-4.24 3 3 0 0 0 4.24 4.24zM8.5 15.5a3 3 0 0 0-4.24 4.24 3 3 0 0 0 4.24-4.24zM19.74 4.26a3 3 0 0 0-4.24 4.24 3 3 0 0 0 4.24-4.24z"/>
    </svg>
  ),
  // Repair / needle thread
  "🪡": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l9-9M12 3c0 0 4 1 4 5s-4 5-4 5"/>
      <path d="M15 6l4-4M12 8l7 7M9 12l-6 6"/>
    </svg>
  ),
  // Cleaning / broom
  "🧹": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l9-12M9 15l-3 6M15 3l-9 12"/>
      <path d="M6 21h6"/>
    </svg>
  ),
  // Padding / box
  "📦": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8L12 3 3 8v8l9 5 9-5V8z"/>
      <path d="M12 3v13M3 8l9 5 9-5"/>
    </svg>
  ),
};

// Generic fallback
const FALLBACK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v4M12 16h.01"/>
  </svg>
);

export default function AddonSvgIcon({ icon, size = 20, className = "" }) {
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
