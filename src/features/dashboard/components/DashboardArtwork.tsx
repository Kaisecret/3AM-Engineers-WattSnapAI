export function ProfileAvatar() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="avatar-bg" x2="1" y2="1"><stop stopColor="#b5f1fc" /><stop offset="1" stopColor="#77d8f1" /></linearGradient></defs>
      <circle cx="32" cy="32" r="32" fill="url(#avatar-bg)" />
      <path d="M13 64v-8c0-13 38-13 38 0v8" fill="#fff" />
      <path d="M27 43h10v11c-3 5-7 5-10 0" fill="#f2a27d" />
      <ellipse cx="32" cy="30" rx="14" ry="18" fill="#ffc29a" />
      <path d="M18 32c-5-13 0-23 13-23 16-1 20 10 15 23l-3-12c-5 1-10-1-13-4-2 5-7 5-10 5z" fill="#14283e" />
      <ellipse cx="25" cy="30" rx="1.8" ry="2.3" fill="#14283e" /><ellipse cx="39" cy="30" rx="1.8" ry="2.3" fill="#14283e" />
      <path d="M27 38q5 6 10 0" fill="white" stroke="#a65a42" strokeWidth="1.2" strokeLinecap="round" />
      <path d="m24 53 8 5 8-5" fill="none" stroke="#d8eef7" strokeWidth="2" />
    </svg>
  );
}

export function PlugArtwork() {
  return (
    <svg viewBox="0 0 160 142" aria-hidden="true">
      <defs>
        <linearGradient id="tip-yellow" x2="1" y2="1"><stop stopColor="#ffeb9d" /><stop offset="1" stopColor="#ffdb63" /></linearGradient>
        <linearGradient id="tip-outlet" x2="1" y2="1"><stop stopColor="#f6fcff" /><stop offset="1" stopColor="#a6d9ef" /></linearGradient>
        <linearGradient id="tip-plug" x2="1" y2="1"><stop stopColor="#35668a" /><stop offset="1" stopColor="#0c2947" /></linearGradient>
      </defs>
      <rect x="52" y="8" width="104" height="106" rx="21" fill="url(#tip-yellow)" />
      <path d="M55 57q28-17 51 2t50-2v38q-23 18-50-1T55 93" fill="#fff3b7" opacity=".65" />
      <rect x="91" y="23" width="51" height="80" rx="8" fill="url(#tip-outlet)" stroke="#d1ecf5" strokeWidth="3" />
      <circle cx="117" cy="47" r="14" fill="#bce2f4" /><circle cx="117" cy="78" r="14" fill="#bce2f4" />
      <g fill="#427fa9"><ellipse cx="112" cy="44" rx="2.5" ry="4" /><ellipse cx="122" cy="44" rx="2.5" ry="4" /><circle cx="117" cy="53" r="2.6" /><ellipse cx="112" cy="75" rx="2.5" ry="4" /><ellipse cx="122" cy="75" rx="2.5" ry="4" /><circle cx="117" cy="84" r="2.6" /></g>
      <path d="M51 105C19 115 20 130 23 149" fill="none" stroke="#0d304e" strokeWidth="8" strokeLinecap="round" />
      <g transform="rotate(-27 60 90)"><rect x="68" y="70" width="22" height="8" rx="3" fill="#acd8ed" /><rect x="68" y="93" width="22" height="8" rx="3" fill="#acd8ed" /><path d="M42 72q-7 0-7 8v16q0 8 7 8h27V72z" fill="url(#tip-plug)" stroke="#1c4160" strokeWidth="2" /><rect x="28" y="82" width="10" height="12" rx="4" fill="#214a6c" /></g>
      <g stroke="#ffd34e" strokeWidth="6" strokeLinecap="round"><path d="m31 41 8 8M45 30l4 12M20 58l12 2" /></g>
    </svg>
  );
}

export function PowerLinesArtwork() {
  return (
    <svg viewBox="0 0 160 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round">
        <path d="m81 9-17 86m17-86 20 86M62 29h39M57 51h48M54 74h55M65 51l34 23M95 51 58 74M70 29l29 22M93 29 62 51M29 53l-9 43m9-43 10 43M14 63h29M12 79h33" />
        <path d="M0 48q32 37 61-13M99 34q35 26 61 3" strokeWidth="2" />
      </g>
    </svg>
  );
}
