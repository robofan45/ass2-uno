export type LlmProvider = {
  completeJson(prompt: string): Promise<string>;
};

class OpenAIProvider implements LlmProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async completeJson(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "{}";
  }
}

class AnthropicProvider implements LlmProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "claude-3-5-sonnet-20241022") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async completeJson(prompt: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || "{}";

    // Extract JSON if wrapped in markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return jsonMatch ? jsonMatch[1] : content;
  }
}

class MockProvider implements LlmProvider {
  async completeJson(_prompt: string): Promise<string> {
    // Always return a valid minimal JSON envelope for scaffold
    return JSON.stringify({
      type: "final",
      output: {
        supplierName: "ACME Corp",
        currency: "USD",
        lineItems: [
          { description: "Widget A", qty: 10, unitPrice: 25.50 },
          { description: "Widget B", qty: 5, unitPrice: 45.00 }
        ],
        confidence: 0.9
      }
    });
  }
}

export function getProvider(): LlmProvider {
  const mode = process.env.LLM_PROVIDER || "mock";

  switch (mode.toLowerCase()) {
    case "openai":
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) throw new Error("OPENAI_API_KEY required for OpenAI provider");
      return new OpenAIProvider(openaiKey, process.env.OPENAI_MODEL);

    case "anthropic":
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY required for Anthropic provider");
      return new AnthropicProvider(anthropicKey, process.env.ANTHROPIC_MODEL);

    case "mock":
      return new MockProvider();

    default:
      throw new Error(`Unknown LLM provider: ${mode}. Use 'openai', 'anthropic', or 'mock'`);
  }
}
