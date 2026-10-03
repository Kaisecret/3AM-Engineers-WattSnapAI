"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, LayoutDashboard, Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      width: "100%",
      backgroundColor: "rgba(255, 255, 255, 0.85)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
      transition: "all 0.2s ease"
    }}>
      <div className="landing-container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "4.75rem"
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Image
            src="/assets/branding/wattsnap-logo.png"
            alt="WattSnap Logo"
            width={160}
            height={50}
            priority
            style={{ objectFit: "contain", height: "auto" }}
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          gap: "2.25rem"
        }} className="desktop-nav">
          <Link
            href="/"
            style={{
              fontSize: "0.975rem",
              fontWeight: 700,
              color: "var(--primary-blue)",
              position: "relative",
              padding: "0.25rem 0"
            }}
          >
            Home
            <span style={{
              position: "absolute",
              bottom: "-4px",
              left: "20%",
              width: "60%",
              height: "2.5px",
              backgroundColor: "var(--primary-blue)",
              borderRadius: "9999px"
            }} />
          </Link>
          <Link
            href="#features"
            className="nav-link"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="nav-link"
          >
            How It Works
          </Link>
          <Link
            href="#about"
            className="nav-link"
          >
            About
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }} className="desktop-nav">
          <Link
            href="/dashboard"
            className="dashboard-btn"
          >
            <LayoutDashboard size={15} /> Dashboard
          </Link>

          <Link
            href="#download"
            className="btn-primary"
            style={{
              padding: "0.65rem 1.35rem",
              fontSize: "0.925rem"
            }}
          >
            <Download size={16} /> Download App
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          className="mobile-toggle"
          style={{
            display: "none",
            padding: "0.5rem",
            color: "var(--text-primary)"
          }}
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary-blue)" }}
          >
            Home
          </Link>
          <Link
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)" }}
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)" }}
          >
            How It Works
          </Link>
          <Link
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)" }}
          >
            About
          </Link>
          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "0.5rem 0" }} />
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--primary-blue)"
            }}
          >
            <LayoutDashboard size={18} /> Household Dashboard
          </Link>
          <Link
            href="#download"
            onClick={() => setMobileMenuOpen(false)}
            className="btn-primary"
            style={{ textAlign: "center", marginTop: "0.5rem" }}
          >
            <Download size={18} /> Download App
          </Link>
        </div>
      )}

    </header>
  );
}
