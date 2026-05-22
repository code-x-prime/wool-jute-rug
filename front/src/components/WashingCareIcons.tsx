// Carpet washing & care SVG icons
// Each icon is a React component. Add downloaded SVGs here by creating new entries.

import React from "react";

export interface WashingCareIcon {
  name: string;
  label: string;
  svg: React.FC<React.SVGProps<SVGSVGElement>>;
}

const iconProps = { width: 40, height: 40, viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// --- SVG icon components ---

const IconShedding: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <rect x="8" y="8" width="48" height="48" rx="4" />
    <path d="M16 20 Q24 28 32 20 Q40 12 48 20" />
    <path d="M16 32 Q24 40 32 32 Q40 24 48 32" />
    <path d="M16 44 Q24 52 32 44 Q40 36 48 44" />
  </svg>
);

const IconNoBrush: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <circle cx="32" cy="32" r="22" />
    <line x1="14" y1="14" x2="50" y2="50" />
    <path d="M26 26 L38 26 L36 44 L28 44 Z" />
    <line x1="32" y1="20" x2="32" y2="26" />
  </svg>
);

const IconVacuum: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <circle cx="32" cy="24" r="10" />
    <path d="M32 34 L32 50" />
    <path d="M20 50 L44 50" />
    <path d="M24 50 L20 58" />
    <path d="M40 50 L44 58" />
    <circle cx="32" cy="24" r="4" />
  </svg>
);

const IconBlot: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <path d="M32 8 Q44 20 44 32 A12 12 0 0 1 20 32 Q20 20 32 8Z" />
    <path d="M28 36 L32 32 L36 36" />
    <path d="M32 32 L32 44" />
  </svg>
);

const IconRotate: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <path d="M12 32 A20 20 0 0 1 52 32" />
    <path d="M52 32 A20 20 0 0 1 12 32" />
    <polyline points="46,24 52,32 44,36" />
    <polyline points="18,40 12,32 20,28" />
  </svg>
);

const IconFurnitureProtector: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <rect x="16" y="16" width="32" height="20" rx="2" />
    <rect x="20" y="36" width="6" height="12" />
    <rect x="38" y="36" width="6" height="12" />
    <path d="M24 44 L24 50 M42 44 L42 50" />
    <ellipse cx="32" cy="16" rx="6" ry="3" />
  </svg>
);

const IconTrimThread: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <circle cx="20" cy="44" r="6" />
    <circle cx="44" cy="44" r="6" />
    <path d="M24 40 L40 40" />
    <path d="M32 40 L32 20" />
    <path d="M28 26 L32 20 L36 26" />
    <path d="M26 32 L38 32" strokeDasharray="2 2" />
  </svg>
);

const IconProfessionalClean: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <circle cx="32" cy="26" r="10" />
    <path d="M22 36 Q16 48 32 52 Q48 48 42 36" />
    <path d="M29 26 L31 28 L35 22" />
    <circle cx="44" cy="44" r="8" />
    <path d="M44 40 L44 48 M40 44 L48 44" />
  </svg>
);

const IconNoFold: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <rect x="8" y="16" width="48" height="32" rx="2" />
    <path d="M8 32 L32 32 L32 48" />
    <circle cx="52" cy="12" r="8" />
    <line x1="48" y1="8" x2="56" y2="16" />
    <line x1="56" y1="8" x2="48" y2="16" />
  </svg>
);

const IconNoDamp: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <path d="M32 8 Q44 20 44 32 A12 12 0 0 1 20 32 Q20 20 32 8Z" />
    <circle cx="32" cy="32" r="22" strokeDasharray="none" />
    <line x1="14" y1="14" x2="50" y2="50" />
  </svg>
);

const IconHandWash: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <path d="M20 40 Q18 28 24 20 Q28 14 32 12 Q36 14 40 20 Q46 28 44 40" />
    <path d="M16 44 Q16 52 32 54 Q48 52 48 44 L44 40 L20 40 Z" />
    <path d="M28 32 Q32 28 36 32" />
  </svg>
);

const IconDirectSunlight: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <circle cx="32" cy="32" r="10" />
    <line x1="32" y1="8" x2="32" y2="16" />
    <line x1="32" y1="48" x2="32" y2="56" />
    <line x1="8" y1="32" x2="16" y2="32" />
    <line x1="48" y1="32" x2="56" y2="32" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="43" y1="43" x2="49" y2="49" />
    <line x1="49" y1="15" x2="43" y2="21" />
    <line x1="21" y1="43" x2="15" y2="49" />
    <line x1="14" y1="14" x2="50" y2="50" />
    <circle cx="32" cy="32" r="22" />
  </svg>
);

const IconRoll: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <ellipse cx="32" cy="32" rx="20" ry="10" />
    <line x1="12" y1="32" x2="12" y2="44" />
    <line x1="52" y1="32" x2="52" y2="44" />
    <ellipse cx="32" cy="44" rx="20" ry="10" />
  </svg>
);

const IconSpot: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <path d="M20 48 Q20 36 32 28 Q44 36 44 48 Q44 56 32 56 Q20 56 20 48Z" />
    <path d="M28 48 L31 51 L36 44" />
    <path d="M32 20 L32 10" />
    <path d="M24 18 L28 12" />
    <path d="M40 18 L36 12" />
  </svg>
);

const IconDryFlat: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg {...iconProps} {...p}>
    <rect x="8" y="28" width="48" height="4" rx="2" />
    <rect x="16" y="20" width="32" height="8" rx="1" />
    <path d="M20 28 L20 52" strokeDasharray="3 3" />
    <path d="M44 28 L44 52" strokeDasharray="3 3" />
  </svg>
);

// --- Icon registry ---

export const WASHING_CARE_ICONS: WashingCareIcon[] = [
  { name: "shedding", label: "Shedding Natural", svg: IconShedding },
  { name: "no-brush", label: "Do Not Brush/Scrub", svg: IconNoBrush },
  { name: "vacuum", label: "Vacuum Only", svg: IconVacuum },
  { name: "blot", label: "Blot Spills", svg: IconBlot },
  { name: "rotate", label: "Rotate Occasionally", svg: IconRotate },
  { name: "furniture-protector", label: "Use Furniture Protectors", svg: IconFurnitureProtector },
  { name: "trim-thread", label: "Trim Loose Threads", svg: IconTrimThread },
  { name: "professional-clean", label: "Professional Cleaning", svg: IconProfessionalClean },
  { name: "no-fold", label: "Do Not Fold", svg: IconNoFold },
  { name: "no-damp", label: "Avoid Damp Surfaces", svg: IconNoDamp },
  { name: "hand-wash", label: "Hand Wash Only", svg: IconHandWash },
  { name: "no-direct-sun", label: "Avoid Direct Sunlight", svg: IconDirectSunlight },
  { name: "roll", label: "Roll For Storage", svg: IconRoll },
  { name: "spot-clean", label: "Spot Clean Only", svg: IconSpot },
  { name: "dry-flat", label: "Dry Flat", svg: IconDryFlat },
];

export function getIconByName(name: string): WashingCareIcon | undefined {
  return WASHING_CARE_ICONS.find((i) => i.name === name);
}

export function parseWashingCare(raw: string): Array<{ iconName: string; text: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // legacy plain text — return as single no-icon row
    return raw.split("\n").filter(Boolean).map((line) => ({ iconName: "", text: line }));
  }
  return [];
}
