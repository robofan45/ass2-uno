import Ajv from "ajv";
import { getProvider } from "../llm/provider.js";
import { buildAgentPrompt } from "../llm/prompt.js";

const ajv = new Ajv({ allErrors: true, strict: false });

const envelopeSchema = {
  type: "object",
  required: ["type"],
  properties: {
    type: { enum: ["tool_call", "final"] },
    tool: { type: "string" },
    args: { type: "object" },
    output: { type: "object" }
  },
  additionalProperties: false
};

export async function aiAgent({ node, input }: any) {
  const goal = node.config?.agent?.goal || "You are a helpful extractor.";
  const tools = node.config?.agent?.tools || [];
  const maxToolCalls = node.config?.agent?.maxToolCalls ?? 0;

  const outputSchema = node.io?.outputSchema;
  if (!outputSchema) throw new Error("Agent node missing outputSchema");

  const provider = getProvider();
  const prompt = buildAgentPrompt({ goal, inputJson: input, outputSchemaJson: outputSchema, tools });

  // MVP scaffold: no tool calls, just final
  if (maxToolCalls > 0) {
    // In V1: implement loop executing approved tools server-side
  }

  const raw = await provider.completeJson(prompt);

  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { throw new Error("AI returned non-JSON"); }

  const validateEnvelope = ajv.compile(envelopeSchema);
  if (!validateEnvelope(parsed)) throw new Error("AI envelope schema violation");

  if (parsed.type !== "final") throw new Error("Tool calls not enabled in scaffold; expected final");

  const validateOut = ajv.compile(outputSchema);
  if (!validateOut(parsed.output)) {
    throw new Error("AI_OUTPUT_SCHEMA_VIOLATION: " + ajv.errorsText(validateOut.errors));
  }

  return parsed.output;
}
