import React, { useCallback, useMemo } from "react";
import ReactFlow, { addEdge, Background, Controls, MiniMap, useEdgesState, useNodesState } from "reactflow";
import "reactflow/dist/style.css";

const initialNodes = [
  { id: "n1", type: "default", position: { x: 100, y: 100 }, data: { label: "trigger.webhook" } },
  { id: "n2", type: "default", position: { x: 360, y: 100 }, data: { label: "transform.jsonata" } },
  { id: "n3", type: "default", position: { x: 640, y: 100 }, data: { label: "action.slack (draft)" } }
];
const initialEdges = [{ id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" }];

export function CanvasBuilder({ onChange }: { onChange?: (graph: any) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as any);

  const onConnect = useCallback((params: any) => setEdges(eds => addEdge(params, eds)), [setEdges]);

  const graph = useMemo(() => ({ nodes: nodes.map(n => ({ id: n.id, type: String(n.data?.label || "unknown"), config: {} })), edges }), [nodes, edges]);

  React.useEffect(() => onChange?.(graph), [graph, onChange]);

  return (
    <div style={{ height: "75vh", border: "1px solid #2a2a2a", borderRadius: 12, overflow: "hidden", background: "#0f0f0f" }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}>
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
