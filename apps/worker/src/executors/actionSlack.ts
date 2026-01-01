export async function actionSlack({ node, input }: any) {
  const mode = node.config?.mode || "draft";
  const channel = node.config?.channel || "#general";
  const text = input?.text || input?.n2?.text || "Hello from FlowForge";

  if (mode === "draft") {
    return { draft: { channel, text } };
  }

  // Sending would be implemented via Slack webhook/API and MUST be approval-gated in policy.
  throw new Error("Slack send not enabled in MVP scaffold (use draft + approval-gated send node in V1).");
}
