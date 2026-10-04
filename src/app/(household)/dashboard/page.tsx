import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Home, Zap, BarChart3, Bell, Settings } from "lucide-react";
import "./dashboard.css";

export default function HouseholdDashboardPage() {
  return (
    <div className="household-dashboard">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <Link
            href="/"
            className="dashboard-back"
            aria-label="Back to Landing Page"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#0284c7",
              backgroundColor: "#f0f9ff",
              textDecoration: "none"
            }}
          >
            <ArrowLeft size={16} /> <span>Back to Landing Page</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Image
              src="/assets/branding/wattsnap-logo.png"
              alt="WattSnap Logo"
              width={130}
              height={40}
              style={{ objectFit: "contain", height: "auto" }}
            />
          </div>
        </div>

        <div className="dashboard-household">
          <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Household: <strong>Maria's Home</strong> (ANTECO)</span>
          <div className="dashboard-avatar" style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#0284c7",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: "0.875rem"
          }}>
            M
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="dashboard-main">
        <div className="dashboard-intro">
          <Image className="dashboard-mobile-art" src="/assets/branding/actions-1.png" alt="" width={200} height={200} sizes="260px" />
          <h1 className="dashboard-title">
            Household Dashboard
          </h1>
          <p className="dashboard-description">
            Welcome to your household energy portal. Manage bills, appliances, and advisories in one place.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          <div className="dashboard-summary">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
                <Zap size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Current Month Estimate</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>₱ 2,480.00</div>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>↓ 8% lower than last billing period</p>
          </div>

          <div className="dashboard-summary">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
                <BarChart3 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Monthly Consumption</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>185 kWh</div>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>On track for monthly budget of 200 kWh</p>
          </div>

          <div className="dashboard-summary">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                <Bell size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Provider Status</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Normal Operation</div>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>ANTECO: No maintenance scheduled today</p>
          </div>
        </div>
      </main>
    </div>
  );
}
