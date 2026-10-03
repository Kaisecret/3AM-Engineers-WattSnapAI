export function EcoIllustration() {
  return (
    <svg viewBox="0 0 280 300" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="post-globe" cx=".32" cy=".25" r=".8"><stop stopColor="#97faff" /><stop offset=".55" stopColor="#23caff" /><stop offset="1" stopColor="#0085ee" /></radialGradient>
        <linearGradient id="post-land" x1="80" y1="110" x2="210" y2="290" gradientUnits="userSpaceOnUse"><stop stopColor="#baff63" /><stop offset="1" stopColor="#19ba78" /></linearGradient>
        <linearGradient id="post-tree" x1="70" y1="75" x2="115" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#d9fa2e" /><stop offset="1" stopColor="#00bc83" /></linearGradient>
        <clipPath id="post-globe-clip"><circle cx="166" cy="230" r="95" /></clipPath>
      </defs>
      <ellipse cx="168" cy="287" rx="88" ry="10" fill="#009be9" opacity=".12" />
      <circle cx="166" cy="230" r="95" fill="url(#post-globe)" />
      <g clipPath="url(#post-globe-clip)" fill="url(#post-land)">
        <path d="m88 158 34-5 21 13 30-2 13 20-16 23-26 2-16 23-21-2-8-17-33-11zM205 192l30-22 37 18-10 31-20 8-10 27-12-13-26-4-8-27zM141 257l27-13 31 12 6 22-20 23-31-9-26-17z" />
      </g>
      <path d="M102 156V95" stroke="#d59942" strokeWidth="8" strokeLinecap="round" />
      <path d="m102 124-18-18m18 9 18-23" stroke="#d59942" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="102" cy="92" rx="29" ry="37" fill="url(#post-tree)" />
      <ellipse cx="87" cy="107" rx="17" ry="23" fill="#3cdc70" />
      <ellipse cx="112" cy="108" rx="21" ry="25" fill="#15c587" />
      <path d="m109 178 25-21 32 12-24 22z" fill="#008de7" />
      <path d="m117 173 18-14 20 9-17 15z" fill="#7be9ff" />
      <path d="m112 180 31 10v24l-31-11z" fill="#fff9d6" />
      <path d="m143 190 22-17v26l-22 15z" fill="#e9fcff" />
      <path d="m122 187 10 3v15l-10-4z" fill="#ffd03e" />
      <path d="m202 182 4-94" stroke="#eefcff" strokeWidth="8" />
      <path d="m206 88-6-53 8-22 5 74zm4 3 46 22 8 17-55-32zm-8 2-39 32-19 1 54-39z" fill="#2bd3fc" stroke="#0088dc" strokeWidth="1.4" />
      <circle cx="206" cy="91" r="7" fill="#f5ffff" stroke="#39aff7" strokeWidth="2" />
      <path d="m234 198 3-44" stroke="#f6ffff" strokeWidth="5" />
      <path d="m237 154-3-30 5-12 3 40zm3 2 27 13 4 10-33-20zm-6 1-22 18-12 1 31-22z" fill="#44d7ee" />
      <circle cx="237" cy="156" r="4" fill="#fff" />
      <path d="M68 201v-39" stroke="#c78f43" strokeWidth="5" />
      <ellipse cx="68" cy="156" rx="18" ry="24" fill="url(#post-tree)" />
      <path d="M84 240v-28" stroke="#ba913b" strokeWidth="4" />
      <ellipse cx="84" cy="207" rx="13" ry="18" fill="#78e83b" />
      <path d="m175 143 6-20 13-3 2 19z" fill="#fdfff4" /><path d="m173 123 12-12 13 7-5 7z" fill="#1b9dec" />
      <circle cx="221" cy="254" r="4" fill="#dfff7c" /><circle cx="147" cy="215" r="3" fill="#fff98e" />
    </svg>
  );
}
