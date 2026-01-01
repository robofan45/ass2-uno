export type LlmProvider = {
  completeJson(prompt: string): Promise<string>;
};

export function getProvider(): LlmProvider {
  const mode = process.env.LLM_PROVIDER || "mock";
  if (mode === "mock") {
    return {
      async completeJson(_prompt: string) {
        // Always return a valid minimal JSON envelope for scaffold
        return JSON.stringify({ type: "final", output: { supplierName: "ACME", currency: "USD", lineItems: [], confidence: 0.9 } });
      }
    };
  }
  throw new Error("Real LLM provider not wired in scaffold. Add OpenAI/other adapter here.");
}
