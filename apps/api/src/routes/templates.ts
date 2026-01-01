import { FastifyInstance } from "fastify";

/**
 * Pre-built workflow templates
 */
export const TEMPLATES = [
  {
    id: "hello-world",
    name: "Hello World",
    description: "Simple webhook to Slack draft workflow",
    category: "Getting Started",
    tags: ["webhook", "slack", "beginner"],
    connectors: ["webhook", "slack"],
    graph: {
      nodes: [
        {
          id: "n1",
          type: "trigger.webhook",
          name: "Incoming Webhook",
          position: { x: 100, y: 120 },
          config: { path: "/hook/hello", method: "POST" },
          io: {
            inputSchema: { type: "object" },
            outputSchema: { type: "object" }
          }
        },
        {
          id: "n2",
          type: "transform.jsonata",
          name: "Format Message",
          position: { x: 420, y: 120 },
          config: { expression: "{ \"text\": \"Hello, \" & body.name & \"!\" }" },
          io: {
            inputSchema: { type: "object" },
            outputSchema: { type: "object", properties: { text: { type: "string" } } }
          }
        },
        {
          id: "n3",
          type: "action.slack",
          name: "Slack Draft",
          position: { x: 740, y: 120 },
          config: { mode: "draft", channel: "#general" },
          io: {
            inputSchema: { type: "object", properties: { text: { type: "string" } } },
            outputSchema: { type: "object" }
          }
        }
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" }
      ]
    }
  },
  {
    id: "ai-extraction-approval",
    name: "AI Extraction with Approval",
    description: "Extract structured data from email/PDF, validate, and update CRM with approval",
    category: "AI Workflows",
    tags: ["ai", "approval", "extraction", "crm"],
    connectors: ["webhook", "ai", "approval", "http"],
    graph: {
      nodes: [
        {
          id: "t1",
          type: "trigger.webhook",
          name: "Email/PDF Webhook",
          position: { x: 80, y: 160 },
          config: { path: "/hook/extract", method: "POST" }
        },
        {
          id: "a1",
          type: "ai.agent",
          name: "Extract Quote Fields",
          position: { x: 380, y: 160 },
          config: {
            agent: {
              goal: "Extract structured quote data from the email. Return ONLY valid JSON.",
              tools: [],
              maxToolCalls: 0
            }
          },
          io: {
            inputSchema: {
              type: "object",
              properties: {
                emailText: { type: "string" },
                documentText: { type: "string" }
              }
            },
            outputSchema: {
              type: "object",
              properties: {
                supplierName: { type: "string" },
                quoteNumber: { type: "string" },
                currency: { type: "string" },
                lineItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      qty: { type: "number" },
                      unitPrice: { type: "number" }
                    },
                    required: ["description", "qty", "unitPrice"]
                  }
                },
                confidence: { type: "number", minimum: 0, maximum: 1 }
              },
              required: ["supplierName", "currency", "lineItems", "confidence"],
              additionalProperties: false
            }
          }
        },
        {
          id: "h1",
          type: "approval.human",
          name: "Approve CRM Update",
          position: { x: 680, y: 160 },
          config: {
            message: "Approve extracted quote and CRM update?",
            expiresInHours: 72,
            scope: { allowedNodeIds: ["c1"] }
          }
        },
        {
          id: "c1",
          type: "action.http",
          name: "CRM Update",
          position: { x: 980, y: 160 },
          config: {
            method: "POST",
            url: "https://api.example.com/crm/quotes"
          },
          risk: { requiresApproval: true, riskLevel: "high" }
        }
      ],
      edges: [
        { id: "e1", source: "t1", target: "a1" },
        { id: "e2", source: "a1", target: "h1" },
        { id: "e3", source: "h1", target: "c1" }
      ]
    }
  },
  {
    id: "lead-routing",
    name: "Lead Routing & Enrichment",
    description: "Receive lead from webhook, enrich with external data, route to appropriate team",
    category: "Sales & Marketing",
    tags: ["sales", "leads", "routing", "jira"],
    connectors: ["webhook", "http", "jira"],
    graph: {
      nodes: [
        {
          id: "n1",
          type: "trigger.webhook",
          name: "Lead Webhook",
          position: { x: 100, y: 120 },
          config: { path: "/hook/lead", method: "POST" }
        },
        {
          id: "n2",
          type: "action.http",
          name: "Enrich with Clearbit",
          position: { x: 400, y: 120 },
          config: {
            method: "GET",
            url: "https://company.clearbit.com/v2/companies/find"
          }
        },
        {
          id: "n3",
          type: "transform.jsonata",
          name: "Route Decision",
          position: { x: 700, y: 120 },
          config: {
            expression: "{ \"team\": revenue > 10000000 ? \"enterprise\" : \"smb\", \"priority\": employees > 100 ? \"high\" : \"normal\" }"
          }
        },
        {
          id: "n4",
          type: "action.jira",
          name: "Create Jira Issue",
          position: { x: 1000, y: 120 },
          config: {
            action: "create",
            issueType: "Task"
          },
          risk: { requiresApproval: true }
        }
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" }
      ]
    }
  },
  {
    id: "daily-report",
    name: "Daily Ops Report",
    description: "Aggregate database metrics, generate narrative summary, send via email",
    category: "Reporting",
    tags: ["reporting", "database", "ai", "email"],
    connectors: ["postgres", "ai", "gmail"],
    graph: {
      nodes: [
        {
          id: "n1",
          type: "trigger.webhook",
          name: "Scheduled Trigger",
          position: { x: 100, y: 120 },
          config: { path: "/hook/daily-report", method: "POST" }
        },
        {
          id: "n2",
          type: "action.postgres",
          name: "Query Metrics",
          position: { x: 400, y: 120 },
          config: {
            action: "query",
            query: "SELECT * FROM daily_metrics WHERE date = CURRENT_DATE"
          }
        },
        {
          id: "n3",
          type: "ai.agent",
          name: "Generate Summary",
          position: { x: 700, y: 120 },
          config: {
            agent: {
              goal: "Generate a concise executive summary from the metrics data",
              maxToolCalls: 0
            }
          },
          io: {
            outputSchema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                keyMetrics: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } }
              },
              required: ["summary"],
              additionalProperties: false
            }
          }
        },
        {
          id: "n4",
          type: "action.gmail",
          name: "Send Report",
          position: { x: 1000, y: 120 },
          config: {
            mode: "draft"
          }
        }
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" }
      ]
    }
  },
  {
    id: "customer-onboarding",
    name: "Customer Onboarding Checklist",
    description: "Multi-step onboarding workflow with task creation and status tracking",
    category: "Customer Success",
    tags: ["onboarding", "tasks", "tracking"],
    connectors: ["webhook", "jira", "slack"],
    graph: {
      nodes: [
        {
          id: "n1",
          type: "trigger.webhook",
          name: "New Customer Webhook",
          position: { x: 100, y: 120 },
          config: { path: "/hook/onboard", method: "POST" }
        },
        {
          id: "n2",
          type: "action.jira",
          name: "Create Onboarding Epic",
          position: { x: 400, y: 120 },
          config: {
            action: "create",
            issueType: "Epic"
          },
          risk: { requiresApproval: false }
        },
        {
          id: "n3",
          type: "action.slack",
          name: "Notify Team",
          position: { x: 700, y: 120 },
          config: {
            mode: "draft",
            channel: "#customer-success"
          }
        }
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" }
      ]
    }
  }
];

export async function templatesRoutes(app: FastifyInstance) {
  app.get("/templates", async () => {
    return TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      connectors: t.connectors
    }));
  });

  app.get("/templates/:id", async (req: any) => {
    const template = TEMPLATES.find(t => t.id === req.params.id);
    if (!template) throw new Error("Template not found");
    return template;
  });
}
