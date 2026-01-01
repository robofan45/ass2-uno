import React from "react";
import { api } from "../api";
import { Shell } from "../components/Shell";

export function RunsPage() {
  const [runs, setRuns] = React.useState<any[]>([]);
  React.useEffect(() => { api("/runs").then(setRuns).catch(console.error); }, []);

  return (
    <Shell>
      <h2 style={{ marginBottom: 16 }}>Runs</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {runs.length === 0 && (
          <p style={{ opacity: 0.6 }}>No runs yet. Create a workflow and trigger it!</p>
        )}
        {runs.map(r => (
          <div
            key={r.id}
            style={{
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              padding: 16,
              background: "#0f0f0f"
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.id}</div>
            <div style={{ opacity: 0.8, fontSize: 14 }}>
              Status: <span style={{
                color: r.status === 'succeeded' ? '#4ade80' : r.status === 'failed' ? '#f87171' : '#60a5fa'
              }}>{r.status}</span>
            </div>
            <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
              Version: {r.workflowVersionId}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
