import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8fafc",
      padding: "2rem",
      fontFamily: "var(--font-sans, system-ui)"
    }}>
      <div style={{
        maxWidth: "460px",
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "1.5rem",
        padding: "2.5rem",
        textAlign: "center",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
        border: "1px solid #e2e8f0"
      }}>
        <div style={{
          fontSize: "4rem",
          fontWeight: 900,
          color: "var(--primary-blue, #0284c7)",
          lineHeight: 1,
          marginBottom: "1rem"
        }}>
          404
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
          Page Not Found
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "2rem" }}>
          The page you are looking for does not exist or may have been moved.
        </p>

        <Link
          href="/"
          className="btn-primary"
          style={{ display: "inline-flex", padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}
        >
          <Home size={16} /> Return to Homepage
        </Link>
      </div>
    </div>
  );
}
