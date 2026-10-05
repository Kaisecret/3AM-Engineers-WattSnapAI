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

/** Generic electricity bill used by the scanner when no photo is available. */
export function BillArt({ period = "Sep 2026", kwh = "109", amount = "₱1,248.50", due = "Oct 10, 2026" }: { period?: string; kwh?: string; amount?: string; due?: string }) {
  return (
    <svg className="bill-art" viewBox="0 0 240 320" aria-hidden="true">
      <defs><linearGradient id="bill-head" x2="1" y2="1"><stop stopColor="#14c3ee" /><stop offset="1" stopColor="#0a7fdc" /></linearGradient></defs>
      <rect width="240" height="320" rx="14" fill="#fff" />
      <path d="M0 14Q0 0 14 0h212q14 0 14 14v44H0z" fill="url(#bill-head)" />
      <circle cx="30" cy="29" r="15" fill="#ffffff33" />
      <path d="m32 18-9 13h7l-2 10 9-13h-7z" fill="#ffe14d" />
      <text x="52" y="27" fill="#fff" fontSize="13" fontWeight="800">ELECTRIC BILL</text>
      <text x="52" y="41" fill="#d8f5ff" fontSize="8.5">Statement of account</text>
      <g fill="#e4eef4"><rect x="18" y="72" width="98" height="7" rx="3.5" /><rect x="18" y="86" width="70" height="7" rx="3.5" /><rect x="150" y="72" width="72" height="7" rx="3.5" /><rect x="170" y="86" width="52" height="7" rx="3.5" /></g>
      <text x="18" y="117" fill="#7d93a8" fontSize="8" fontWeight="700">BILLING PERIOD</text>
      <text x="18" y="132" fill="#0d2440" fontSize="12" fontWeight="800">{period}</text>
      <text x="146" y="117" fill="#7d93a8" fontSize="8" fontWeight="700">DUE DATE</text>
      <text x="146" y="132" fill="#0d2440" fontSize="11" fontWeight="800">{due}</text>
      <rect x="18" y="146" width="204" height="74" rx="10" fill="#eefaff" stroke="#c9ecf8" />
      <text x="32" y="166" fill="#5b7d96" fontSize="8" fontWeight="700">kWh USED</text>
      <text x="32" y="199" fill="#0d2440" fontSize="25" fontWeight="800">{kwh}</text>
      <path d="M117 158v50" stroke="#c9ecf8" />
      <text x="130" y="166" fill="#5b7d96" fontSize="8" fontWeight="700">AMOUNT DUE</text>
      <text x="130" y="197" fill="#0a8ad8" fontSize="16" fontWeight="800">{amount}</text>
      <g fill="#c4ebf8"><rect x="22" y="258" width="11" height="22" rx="2" /><rect x="38" y="250" width="11" height="30" rx="2" /><rect x="54" y="254" width="11" height="26" rx="2" /><rect x="70" y="262" width="11" height="18" rx="2" /><rect x="86" y="266" width="11" height="14" rx="2" /></g>
      <rect x="102" y="268" width="11" height="12" rx="2" fill="#0aa6e6" />
      <text x="18" y="244" fill="#7d93a8" fontSize="8" fontWeight="700">MONTHLY USAGE</text>
      <g fill="#e4eef4"><rect x="134" y="240" width="88" height="7" rx="3.5" /><rect x="134" y="254" width="70" height="7" rx="3.5" /><rect x="134" y="268" width="80" height="7" rx="3.5" /></g>
      <g fill="#20374f">{[0, 4, 6, 11, 14, 16, 21, 23, 27, 31, 33, 38, 41, 43, 47, 52, 54, 58, 61, 66, 68, 72, 75, 79].map(x => <rect key={x} x={18 + x * 2.6} y="292" width={x % 3 ? 2 : 4} height="14" />)}</g>
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
