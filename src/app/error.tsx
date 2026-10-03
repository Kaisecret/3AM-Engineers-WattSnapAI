"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
        maxWidth: "480px",
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "1.5rem",
        padding: "2.5rem",
        textAlign: "center",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        border: "1px solid #e2e8f0"
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#fee2e2",
          color: "#ef4444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem auto"
        }}>
          <AlertCircle size={28} />
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
          Something went wrong
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "2rem" }}>
          An unexpected error occurred while loading this page. Please try refreshing or return home.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            className="btn-primary"
            style={{ padding: "0.75rem 1.25rem", fontSize: "0.9rem" }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
          <Link
            href="/"
            className="btn-secondary"
            style={{ padding: "0.75rem 1.25rem", fontSize: "0.9rem" }}
          >
            <Home size={16} /> Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
