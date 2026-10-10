"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { CreateAccountLabel } from "./CreateAccountLabel";

const links = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#about" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="landing-header">
      <div className="landing-nav-inner">
        <Link href="/" className="landing-brand" aria-label="WattSnap home">
          <Image
            src="/assets/branding/wattsnap-logo.png"
            alt="WattSnap"
            width={1983}
            height={793}
            sizes="(max-width: 600px) 140px, 160px"
            priority
          />
        </Link>
        <nav className="landing-desktop-links" aria-label="Main navigation">
          {links.map((link, index) => (
            <a key={link.href} href={link.href} className={`landing-nav-link${index === 0 ? " is-active" : ""}`}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="landing-account-actions">
          <Link href="/login" className="landing-login-link">Open household</Link>
          <Link href="/welcome" className="btn-primary landing-nav-signup landing-create-account">
            <CreateAccountLabel />
          </Link>
        </div>
        <button
          type="button"
          className="landing-menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>
      {menuOpen && (
        <nav id="landing-mobile-menu" className="landing-mobile-menu" aria-label="Mobile navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>
          ))}
          <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Household Dashboard</Link>
          <Link href="/login" onClick={() => setMenuOpen(false)}>Open household</Link>
          <Link href="/welcome" className="btn-primary landing-create-account" onClick={() => setMenuOpen(false)}>
            <CreateAccountLabel />
          </Link>
        </nav>
      )}
    </header>
  );
}
