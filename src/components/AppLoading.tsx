import Image from "next/image";

/** Brief branded loading screen for the sign-in pages. */
export default function AppLoading() {
  return (
    <div className="app-loading" aria-busy="true">
      <Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={420} height={132} sizes="180px" priority />
      <span className="app-loading-ring" aria-hidden="true" />
      <p role="status">Loading…</p>
      <style>{`
        .app-loading { min-height: 100dvh; display: grid; place-content: center; justify-items: center; gap: 18px; background: #f1fafc; animation: app-loading-in .2s ease .12s both; }
        .app-loading img { width: 180px; height: auto; }
        .app-loading-ring { width: 36px; height: 36px; border: 3px solid #d6f1fb; border-top-color: #0aa9dd; border-radius: 50%; animation: app-loading-spin .8s linear infinite; }
        .app-loading p { color: #5b7a8f; font-size: 15px; font-weight: 600; }
        html[data-theme="dark"] .app-loading { background: #10202b; }
        html[data-theme="dark"] .app-loading-ring { border-color: #24475a; border-top-color: #89dfef; }
        html[data-theme="dark"] .app-loading p { color: #c2d4df; }
        @keyframes app-loading-spin { to { transform: rotate(360deg); } }
        @keyframes app-loading-in { from { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .app-loading, .app-loading-ring { animation: none; } }
      `}</style>
    </div>
  );
}
