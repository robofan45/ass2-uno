import React from "react";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100vh" }}>
      <aside style={{ borderRight: "1px solid #2a2a2a", padding: 16, background: "#0f0f0f" }}>
        <div style={{ fontWeight: 700, marginBottom: 24, fontSize: 18 }}>FlowForge AI</div>
        <nav style={{ display: "grid", gap: 8 }}>
          <a href="#/workflows" style={{ color: "#60a5fa", textDecoration: "none", padding: "8px 12px", borderRadius: 6, transition: "background 0.2s" }}>
            Workflows
          </a>
          <a href="#/runs" style={{ color: "#60a5fa", textDecoration: "none", padding: "8px 12px", borderRadius: 6, transition: "background 0.2s" }}>
            Runs
          </a>
          <a href="#/approvals" style={{ color: "#60a5fa", textDecoration: "none", padding: "8px 12px", borderRadius: 6, transition: "background 0.2s" }}>
            Approvals
          </a>
          <a href="#/connectors" style={{ color: "#60a5fa", textDecoration: "none", padding: "8px 12px", borderRadius: 6, transition: "background 0.2s" }}>
            Connectors
          </a>
          <a href="#/templates" style={{ color: "#60a5fa", textDecoration: "none", padding: "8px 12px", borderRadius: 6, transition: "background 0.2s" }}>
            Templates
          </a>
          <a href="#/admin" style={{ color: "#60a5fa", textDecoration: "none", padding: "8px 12px", borderRadius: 6, transition: "background 0.2s" }}>
            Admin
          </a>
        </nav>
      </aside>
      <main style={{ padding: 24, overflowY: "auto" }}>{children}</main>
    </div>
  );
}
