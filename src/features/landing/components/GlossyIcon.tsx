import { useId } from "react";

export type GlossyIconName = "home" | "chart" | "bulb" | "heart" | "camera" | "bell";

const colors = {
  home: ["#5affad", "#00d77b", "#009b56"],
  chart: ["#77ffb1", "#00d67b", "#009950"],
  bulb: ["#fff883", "#ffe119", "#ffa000"],
  heart: ["#54f5ff", "#00baff", "#065bff"],
  camera: ["#39f1ff", "#009eff", "#064eff"],
  bell: ["#ff9e91", "#ff535b", "#e42b43"],
};

export function GlossyIcon({ name }: { name: GlossyIconName }) {
  const id = useId().replaceAll(":", "");
  const gradient = `gloss-${id}`;
  const palette = colors[name];

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={`glossy-icon glossy-icon-${name}`}>
      <defs>
        <linearGradient id={gradient} x1="16" y1="8" x2="48" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor={palette[0]} />
          <stop offset="0.48" stopColor={palette[1]} />
          <stop offset="1" stopColor={palette[2]} />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradient})`} stroke={palette[2]} strokeWidth="1.4" strokeLinejoin="round">
        {name === "home" && <><path d="M9 30 32 9l23 21-5 5-4-4v24H18V31l-4 4-5-5Z" /><path d="m14 28 18-16 18 16" stroke="#d6ffed" strokeWidth="2.4" fill="none" /><rect x="27" y="37" width="11" height="18" rx="2" fill="white" stroke="none" /><rect x="23" y="27" width="7" height="7" rx="1.5" fill="white" stroke="none" /></>}
        {name === "chart" && <><rect x="10" y="36" width="10" height="21" rx="4" /><rect x="26" y="23" width="11" height="34" rx="4" /><rect x="43" y="9" width="11" height="48" rx="4" /><path d="M13 39v13M29 27v26M46 13v40" stroke="#c2ffde" strokeWidth="2" /></>}
        {name === "bulb" && <><path d="M32 7C20 7 12 15 12 26c0 9 5 14 10 19v4h20v-4c5-5 10-10 10-19C52 15 44 7 32 7Z" /><path d="M21 23c0-6 5-10 11-10" stroke="white" strokeWidth="3.5" strokeLinecap="round" /><path d="m25 30 7 7 7-7m-7 7v12" stroke="#f4a000" fill="none" strokeWidth="2" /><path d="M22 48h20v8H22z" fill="#0787ff" stroke="#0063da" /><path d="M26 56h12l-3 5h-6z" fill="#0749ca" stroke="#0749ca" /><path d="M23 51h18M24 55h16" stroke="#8ae5ff" /></>}
        {name === "heart" && <><path d="M32 55 10 33C-5 16 15-1 32 15 49-1 69 16 54 33L32 55Z" /><path d="M12 25c-3-10 8-17 17-8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" /></>}
        {name === "camera" && <><path d="M19 17 23 9h18l4 8h8a7 7 0 0 1 7 7v26a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7V24a7 7 0 0 1 7-7h8Z" /><circle cx="32" cy="36" r="13" fill="#d5faff" stroke="#fff" strokeWidth="2" /><circle cx="32" cy="36" r="9" fill="#078df5" stroke="none" /><circle cx="49" cy="24" r="2.5" fill="white" stroke="none" /><path d="M10 24v-2h9" stroke="white" strokeWidth="2" strokeLinecap="round" /></>}
        {name === "bell" && <><rect x="4" y="5" width="56" height="54" rx="15" /><path d="M32 14c-2 0-3 2-3 5-8 2-10 9-10 17l-5 6v3h36v-3l-5-6c0-8-2-15-10-17 0-3-1-5-3-5Z" fill="white" stroke="none" /><path d="M26 48h12a6 6 0 0 1-12 0Z" fill="white" stroke="none" /><circle cx="32" cy="32" r="2" fill="#ef424c" stroke="none" /><path d="M11 17c0-4 2-6 6-6" stroke="#ffdcd3" strokeWidth="2" strokeLinecap="round" /></>}
      </g>
    </svg>
  );
}
