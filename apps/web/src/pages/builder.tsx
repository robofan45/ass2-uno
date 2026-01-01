import React from "react";
import { api } from "../api";
import { Shell } from "../components/Shell";
import { CanvasBuilder } from "../components/CanvasBuilder";

export function BuilderPage() {
  const [workflowId, setWorkflowId] = React.useState<string>("");
  const [graph, setGraph] = React.useState<any>(null);

  async function saveDraft() {
    if (!workflowId) return alert("Set workflowId in URL hash (MVP scaffold).");
    await api(`/workflows/${workflowId}/draft`, {
      method: "PUT",
      body: JSON.stringify({ graphJson: { nodes: graph.nodes, edges: graph.edges } })
    });
    alert("Saved draft");
  }

  return (
    <Shell>
      <h2 style={{ marginBottom: 16 }}>Workflow Builder</h2>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>MVP scaffold: edit nodes/edges, then save draft.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="workflowId"
          value={workflowId}
          onChange={e => setWorkflowId(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #2a2a2a",
            width: 280,
            background: "#0f0f0f",
            color: "#e0e0e0"
          }}
        />
        <button
          onClick={saveDraft}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "#60a5fa",
            border: "none",
            color: "#000",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Save Draft
        </button>
      </div>

      <CanvasBuilder onChange={setGraph} />
    </Shell>
  );
}
