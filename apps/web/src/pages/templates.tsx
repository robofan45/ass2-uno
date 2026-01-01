import React from "react";
import { Shell } from "../components/Shell";

export function TemplatesPage() {
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("http://localhost:4000/templates")
      .then(r => r.json())
      .then(setTemplates)
      .catch(console.error);
  }, []);

  async function viewTemplate(id: string) {
    const res = await fetch(`http://localhost:4000/templates/${id}`);
    const template = await res.json();
    setSelectedTemplate(template);
  }

  if (selectedTemplate) {
    return (
      <Shell>
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setSelectedTemplate(null)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              color: "#e0e0e0",
              cursor: "pointer"
            }}
          >
            ← Back to Templates
          </button>
        </div>

        <h2 style={{ marginBottom: 8 }}>{selectedTemplate.name}</h2>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>{selectedTemplate.description}</p>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Category</h3>
            <div style={{ opacity: 0.8 }}>{selectedTemplate.category}</div>
          </div>

          <div style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Connectors Required</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedTemplate.connectors.map((c: string) => (
                <span
                  key={c}
                  style={{
                    background: "#1a1a2e",
                    color: "#60a5fa",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 13
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Tags</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedTemplate.tags.map((t: string) => (
                <span
                  key={t}
                  style={{
                    background: "#1a1a1a",
                    color: "#a0a0a0",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 13
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Workflow Graph</h3>
            <div style={{ marginBottom: 12, opacity: 0.8, fontSize: 14 }}>
              {selectedTemplate.graph.nodes.length} nodes, {selectedTemplate.graph.edges.length} edges
            </div>
            <pre
              style={{
                background: "#1a1a1a",
                padding: 16,
                borderRadius: 8,
                overflow: "auto",
                fontSize: 12,
                maxHeight: "400px"
              }}
            >
              {JSON.stringify(selectedTemplate.graph, null, 2)}
            </pre>
          </div>

          <div>
            <button
              onClick={() => alert("To use this template: Copy the graph JSON and create a new workflow via API or use the workflow builder.")}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                background: "#60a5fa",
                border: "none",
                color: "#000",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 15
              }}
            >
              Use This Template
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h2 style={{ marginBottom: 16 }}>Workflow Templates</h2>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Pre-built workflows to get started quickly
      </p>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
        {templates.map(t => (
          <div
            key={t.id}
            style={{
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              padding: 20,
              background: "#0f0f0f",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onClick={() => viewTemplate(t.id)}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#60a5fa")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{t.name}</div>
            <div style={{ opacity: 0.7, marginBottom: 12, fontSize: 14, minHeight: "40px" }}>
              {t.description}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {t.tags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  style={{
                    background: "#1a1a1a",
                    color: "#a0a0a0",
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 12
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Category: {t.category}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
