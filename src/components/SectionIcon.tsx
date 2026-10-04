import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const icons = {
  truth: (
    <svg {...base}>
      <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" />
    </svg>
  ),
  memory: (
    <svg {...base}>
      <path d="M12 21c-4-2.6-8-5.6-8-10a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 4.4-4 7.4-8 10z" />
    </svg>
  ),
  book: (
    <svg {...base}>
      <path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5z" />
      <path d="M20 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5z" />
    </svg>
  ),
  teach: (
    <svg {...base}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  game: (
    <svg {...base}>
      <circle cx="9" cy="12" r="6.5" />
      <path d="M14.5 8.5l5-2.5v12l-5-2.5" />
    </svg>
  ),
  apply: (
    <svg {...base}>
      <path d="M12 2l2.5 6.5H21l-5.2 4 2 6.5L12 15l-5.8 4 2-6.5L3 8.5h6.5L12 2z" />
    </svg>
  ),
  pray: (
    <svg {...base}>
      <path d="M12 3v7M8 6l4-3 4 3M6 21c0-4 2.5-7 6-7s6 3 6 7" />
    </svg>
  ),
  craft: (
    <svg {...base}>
      <path d="M4 21l6-6M14.5 3.5a3 3 0 1 1 4.2 4.2L9 17.4l-4.5 1.1 1.1-4.5 9.9-10.5z" />
    </svg>
  ),
  age: (
    <svg {...base}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M15 20c0-2.4 1.6-4.4 4-4.9" />
    </svg>
  ),
  question: (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.3a2.7 2.7 0 1 1 3.8 2.5c-1 .5-1.4 1-1.4 2M12 17h.01" />
    </svg>
  ),
  resource: (
    <svg {...base}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
      <path d="M14 3v6h6" />
    </svg>
  ),
} as const;

export type IconName = keyof typeof icons;

export default function SectionIcon({ name }: { name: IconName }) {
  return (
    <span className="section-icon" aria-hidden="true">
      {icons[name]}
    </span>
  );
}
