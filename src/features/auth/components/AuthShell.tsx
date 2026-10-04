"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import "./auth.css";

/** Mascot illustrations from assets/branding (copied to public/assets/branding). */
export const AUTH_ART = {
  lightbulbClouds: "/assets/branding/actions-wit-clouds-2.png",
  laptop: "/assets/branding/auth-login-laptop.png",
  profileCard: "/assets/branding/actions-1.png",
  clipboard: "/assets/branding/actions-2.png",
  celebrate: "/assets/branding/actions-3.png",
  envelope: "/assets/branding/actions-4.png",
  lightbulb: "/assets/branding/actions-5.png",
  shield: "/assets/branding/actions-6.png",
  thumbsUp: "/assets/branding/actions-7.png",
} as const;

export type AuthArt = {
  src: string;
  /** Optional speech bubble shown beside the mascot (desktop only). */
  bubble?: ReactNode;
};

type AuthShellProps = {
  children: ReactNode;
  art?: AuthArt;
  /** Which side the mascot sits on for desktop. */
  artPosition?: "left" | "right";
  /** Retained for callers; all account screens show their mascot above the form on mobile. */
  showArtOnMobile?: boolean;
  /** Back button target (ignored when onBack is provided). */
  backHref?: string;
  /** In-flow back handler for multi-step screens. */
  onBack?: () => void;
  /** Changing this re-plays the step entrance animation. */
  stepKey?: string;
};

export function AuthShell({
  children,
  art,
  artPosition = "right",
  showArtOnMobile = false,
  backHref = "/",
  onBack,
  stepKey,
}: AuthShellProps) {
  const backIcon = <ChevronLeft size={22} strokeWidth={2.5} />;

  return (
    <main className={`auth-page auth-page-${stepKey ?? "form"}`}>
      <div className={`auth-panel${artPosition === "left" ? " auth-panel-art-left" : ""}`}>
        <header className="auth-header">
          {onBack ? (
            <button type="button" className="auth-back" onClick={onBack} aria-label="Go back" title="Go back">
              {backIcon}
            </button>
          ) : (
            <Link href={backHref} className="auth-back" aria-label="Go back" title="Go back">
              {backIcon}
            </Link>
          )}
          <Link href="/" className="auth-logo-link" aria-label="WattSnap home">
            <Image
              src="/assets/branding/wattsnap-logo.png"
              alt="WattSnap"
              width={1983}
              height={793}
              priority
                sizes="(max-width: 699px) 190px, 180px"
              className="auth-logo"
            />
          </Link>
        </header>

        <div key={stepKey} className={`auth-body ${art ? `art-${artPosition}` : "no-art"}`}>
          <section className="auth-content">{children}</section>

          {art && (
            <aside className={`auth-art${showArtOnMobile ? " show-mobile" : ""}`} aria-hidden="true">
              {art.bubble && <div className="auth-bubble">{art.bubble}</div>}
              <Image
                src={art.src}
                alt=""
                width={1254}
                height={1254}
                priority
                sizes="(max-width: 699px) 260px, 470px"
                className="auth-art-img"
              />
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
