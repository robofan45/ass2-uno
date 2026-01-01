import React from "react";
import { RunsPage } from "./pages/runs";
import { BuilderPage } from "./pages/builder";
import { TemplatesPage } from "./pages/templates";

function route() {
  const h = window.location.hash || "#/runs";
  if (h.startsWith("#/builder")) return <BuilderPage />;
  if (h.startsWith("#/templates")) return <TemplatesPage />;
  return <RunsPage />;
}

export default function App() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const onHash = () => setTick(x => x + 1);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route();
}
