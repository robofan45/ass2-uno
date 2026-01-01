# FlowForge AI

**Enterprise-grade workflow automation + safe AI agent nodes**

FlowForge AI is a multi-tenant SaaS platform that combines workflow automation with safe, governed AI agent nodes. Built for enterprise teams who need reliability, auditability, and strict human control over automated workflows.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Web (React + Vite)                      │
│              Canvas Builder + Run Inspector                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS/JWT
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API (Fastify + Prisma)                    │
│    Workflows │ Runs │ Approvals │ Secrets │ RBAC │ Audit    │
└──────┬──────────────────────────────────────────┬───────────┘
       │                                           │
   Postgres                                   Redis Queue
  (SoT + State)                              (BullMQ Jobs)
       │                                           │
       └───────────────┬───────────────────────────┘
                       ▼
            ┌──────────────────────┐
            │   Worker Pool        │
            │  (Execution Engine)  │
            └──────────┬───────────┘
                       │
         External Systems (Slack/Gmail/HTTP/etc)
```

### Key Components

1. **API** — Fastify REST API with JWT auth, RBAC, workflow CRUD, run management, approval handling
2. **Worker** — BullMQ worker pool executing durable, resumable workflow runs via Postgres state machine
3. **Web** — React + React Flow canvas for visual workflow building and run inspection
4. **Database** — PostgreSQL for all state (workflows, runs, steps, approvals, secrets, audit logs)
5. **Queue** — Redis + BullMQ for reliable job scheduling and retries

---

## Core Features

### 🔐 Enterprise-Grade Security

- **Encrypted secrets** — AES-256-GCM vault for API keys, OAuth tokens
- **RBAC** — Owner, Admin, Builder, Operator, Viewer roles
- **Audit logs** — Immutable append-only trail of all changes
- **Multi-tenant isolation** — Org-scoped data access enforced at DB + API layers

### ⚡ Durable Execution Engine

- **Postgres-backed state machine** — All run/step state persisted; crashes resume seamlessly
- **Retries with exponential backoff** — Configurable per-node retry policies
- **Idempotency** — Prevents duplicate side effects via idempotency keys
- **Timeout enforcement** — Per-node timeout with AbortController
- **Approval gating** — Human-in-the-loop pauses for risky actions

### 🤖 Safe AI Agent Nodes

- **Schema-validated outputs** — Agent responses MUST pass strict JSON Schema validation (Ajv)
- **Tool allowlisting** — Only approved tools callable; no arbitrary code execution
- **Prompt injection defenses** — System policies immutable; untrusted content isolated
- **No secret exposure** — Secrets NEVER passed to LLM prompts
- **Cost/token caps** — Per-run limits enforced

### 🔄 Workflow Features

- **Visual canvas** — Drag-and-drop node graph builder (React Flow)
- **Draft + Published versions** — Immutable published versions; drafts for safe iteration
- **Policy enforcement** — Risky nodes require approval nodes in graph (validated at publish)
- **Node types** — Triggers (webhook), Actions (HTTP, Slack, etc), Logic (if/switch), Transform (JSONata), AI agents, Approvals

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + React Flow |
| **API** | Node.js + Fastify + TypeScript + Prisma |
| **Worker** | BullMQ + Prisma + TypeScript |
| **Database** | PostgreSQL 16 |
| **Queue** | Redis 7 + BullMQ |
| **Auth** | JWT (pluggable for SSO later) |
| **Validation** | Zod (API), Ajv (Agent schemas) |
| **Logs** | Pino (structured JSON logs) |

---

## Quick Start (Local Development)

### Prerequisites

- **Docker** + **Docker Compose** (for services)
- **Node.js 20+** (if running outside Docker)
- **pnpm 9+** (package manager)

### 1. Clone and Setup

```bash
git clone <repo-url>
cd flowforge-ai

# Copy environment template
cp .env.example .env

# Install dependencies
pnpm install
```

### 2. Start Services with Docker Compose

```bash
# Start Postgres, Redis, API, Worker, Web
docker compose up --build
```

This will start:
- **Postgres** on `localhost:5432`
- **Redis** on `localhost:6379`
- **API** on `localhost:4000`
- **Worker** (background process)
- **Web** on `localhost:5173`

### 3. Run Database Migrations

In a new terminal:

```bash
# Enter API container
docker compose exec api sh

# Run Prisma migrations
npx prisma migrate dev --name init

# Exit container
exit
```

### 4. Create Your First User

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepass123",
    "orgName": "Acme Corp"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "orgId": "org_abc123"
}
```

Copy the `token` value.

### 5. Set Token in Browser

Open `http://localhost:5173` in your browser, then open DevTools Console and run:

```js
localStorage.setItem("ff_token", "YOUR_TOKEN_HERE")
```

Refresh the page. You should now see the FlowForge UI.

---

## Creating Your First Workflow

### Via API

```bash
# 1. Create a project
curl -X POST http://localhost:4000/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "YOUR_ORG_ID",
    "name": "Demo Project"
  }'

# Response: {"id": "proj_xyz", ...}

# 2. Create a workflow
curl -X POST http://localhost:4000/workflows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_xyz",
    "name": "Hello World",
    "description": "Simple webhook to Slack workflow"
  }'

# Response: {"id": "wf_abc", ...}
```

### Via Web UI

1. Go to `http://localhost:5173/#/builder`
2. Enter your workflow ID in the input field
3. Edit the canvas (add/remove/connect nodes)
4. Click **Save Draft**

### Example Workflow Graph

```json
{
  "nodes": [
    {
      "id": "n1",
      "type": "trigger.webhook",
      "name": "Incoming Webhook",
      "position": { "x": 100, "y": 120 },
      "config": { "path": "/hook/hello", "method": "POST" }
    },
    {
      "id": "n2",
      "type": "transform.jsonata",
      "name": "Format Message",
      "position": { "x": 420, "y": 120 },
      "config": { "expression": "{ \"text\": \"Hello, \" & body.name & \"!\" }" }
    },
    {
      "id": "n3",
      "type": "action.slack",
      "name": "Slack Draft",
      "position": { "x": 740, "y": 120 },
      "config": { "mode": "draft", "channel": "#ops" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "n1", "target": "n2" },
    { "id": "e2", "source": "n2", "target": "n3" }
  ]
}
```

### Publish Workflow

```bash
curl -X POST http://localhost:4000/workflows/wf_abc/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This validates the graph (policy checks) and creates an immutable published version.

### Trigger Workflow via Webhook

```bash
curl -X POST "http://localhost:4000/hook/hello?orgId=YOUR_ORG_ID&workflowVersionId=wfv_published123" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

Check runs at `http://localhost:5173/#/runs`.

---

## Node Types Reference

### Triggers

- **`trigger.webhook`** — Receive HTTP POST/GET requests

### Actions

- **`action.http`** — Make HTTP requests (GET/POST/PUT/PATCH/DELETE)
  - Risky methods (POST/PUT/PATCH/DELETE) require approval gating
- **`action.slack`** — Send Slack messages
  - `mode: "draft"` (safe, returns message preview)
  - `mode: "send"` (requires approval)
- **`action.postgres`** — Query Postgres (V1)
- **`action.s3`** — Get/Put objects in S3-compatible storage (V1)
- **`action.jira`** — Create/update Jira issues (V1)

### Logic

- **`logic.if`** — Conditional branching (V1)
- **`logic.switch`** — Multi-way branching (V1)

### Transform

- **`transform.jsonata`** — Transform data with JSONata expressions

### AI

- **`ai.agent`** — AI agent with strict JSON Schema output validation
  - Requires `io.outputSchema` (JSON Schema)
  - Supports approved tool calls (V1)
  - Prompt injection defenses built-in

### Approvals

- **`approval.human`** — Pause workflow for human approval
  - Creates approval request in DB
  - Run status → `waiting_approval`
  - Resumes when approved via API/UI

---

## Safety Features

### Approval Gating

**Policy Rule:** If any node in the graph has `risk.requiresApproval = true`, the graph MUST contain at least one `approval.human` node upstream.

This is enforced at **publish time** via `validateApprovalGating()`.

Example:
```json
{
  "id": "n4",
  "type": "action.http",
  "config": { "method": "POST", "url": "https://api.example.com/charge" },
  "risk": { "requiresApproval": true }
}
```

The publish API will reject this workflow unless an `approval.human` node exists in the graph.

### Agent Output Schema Validation

Every `ai.agent` node MUST define `io.outputSchema` (JSON Schema).

The worker validates the LLM's JSON output with **Ajv**:
- Must be valid JSON
- Must pass schema validation
- No additional properties (unless explicitly allowed)
- If validation fails → step FAILS with `AI_OUTPUT_SCHEMA_VIOLATION`

Example:
```json
{
  "id": "a1",
  "type": "ai.agent",
  "config": {
    "agent": {
      "goal": "Extract quote fields from email",
      "tools": ["tool.extract_from_text"],
      "maxToolCalls": 2
    }
  },
  "io": {
    "outputSchema": {
      "type": "object",
      "properties": {
        "supplierName": { "type": "string" },
        "currency": { "type": "string" },
        "lineItems": { "type": "array", "items": { "type": "object" } }
      },
      "required": ["supplierName", "currency", "lineItems"],
      "additionalProperties": false
    }
  }
}
```

### Secrets Encryption

All secrets stored in `Secret` table are encrypted with **AES-256-GCM** using `VAULT_MASTER_KEY`.

- **Never** passed to LLM prompts
- **Decrypted** only when needed by worker executors (e.g., HTTP headers)
- **Redacted** in logs/audit trails

---

## Development Workflow

### Running Locally (Without Docker)

```bash
# Terminal 1: Start Postgres + Redis
docker compose up postgres redis

# Terminal 2: Run API
cd apps/api
pnpm install
npx prisma migrate dev
pnpm dev

# Terminal 3: Run Worker
cd apps/worker
pnpm install
pnpm dev

# Terminal 4: Run Web
cd apps/web
pnpm install
pnpm dev
```

### Database Migrations

```bash
cd apps/api

# Create migration
npx prisma migrate dev --name add_new_field

# Apply migrations (prod)
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

### Type Checking

```bash
# Check all packages
pnpm typecheck

# Check specific app
cd apps/api && pnpm typecheck
```

### Build Production Bundles

```bash
pnpm build
```

---

## API Reference

### Authentication

**Signup**
```bash
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "pass123",
  "orgName": "My Org"
}

Response: { "token": "...", "orgId": "..." }
```

**Login**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "pass123"
}

Response: { "token": "...", "orgId": "..." }
```

### Workflows

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workflows` | GET | List workflows for org |
| `/workflows` | POST | Create workflow |
| `/workflows/:id/draft` | GET | Get draft version |
| `/workflows/:id/draft` | PUT | Update draft |
| `/workflows/:id/publish` | POST | Publish workflow (validates policies) |

### Runs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/runs` | GET | List runs for org |
| `/runs/:id` | GET | Get run details (includes steps + approvals) |
| `/runs/start` | POST | Start a run |

### Approvals

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/approvals` | GET | List approval requests |
| `/approvals/:id/decide` | POST | Approve/reject (`{ "decision": "APPROVED"/"REJECTED", "reason": "..." }`) |

### Secrets

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/secrets` | GET | List secrets (metadata only) |
| `/secrets` | POST | Create secret (`{ "name": "...", "kind": "apiKey", "value": "..." }`) |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/hook/:key?orgId=X&workflowVersionId=Y` | POST | Trigger workflow run |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://flowforge:flowforge@localhost:5432/flowforge` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for signing JWTs | `dev` |
| `VAULT_MASTER_KEY` | 32-byte key for encrypting secrets | *(required)* |
| `VITE_API_URL` | API base URL (web only) | `http://localhost:4000` |
| `LLM_PROVIDER` | LLM provider (`mock` or implement real) | `mock` |
| `OPENAI_API_KEY` | OpenAI API key (if using real provider) | — |

---

## Testing

### Manual Testing Checklist

- [ ] Create user via signup
- [ ] Create workflow via API
- [ ] Save draft via web UI
- [ ] Publish workflow (should validate policies)
- [ ] Trigger via webhook
- [ ] Check run status in UI
- [ ] Create approval-gated workflow
- [ ] Approve/reject approval request
- [ ] Test retry on transient failure
- [ ] Test AI agent node with schema validation

### Unit Tests (Future)

- Node executors (transform, http, agent)
- Schema validators
- Encryption/decryption
- Graph topology (DAG validation)

### Integration Tests (Future)

- Full workflow execution end-to-end
- Approval gating enforcement
- Secret resolution in HTTP actions
- Prompt injection defense tests

---

## Security Best Practices

1. **Change `VAULT_MASTER_KEY` in production** — Use a cryptographically random 32-byte key
2. **Use strong `JWT_SECRET`** — Rotate periodically
3. **Enable HTTPS** — Terminate TLS at load balancer or reverse proxy
4. **Rotate secrets** — Implement secret rotation flows for API keys/OAuth tokens
5. **Audit logs** — Export to SIEM for compliance
6. **RBAC enforcement** — Review roles before granting admin/owner access
7. **Rate limiting** — Add API rate limits (via Fastify plugin or reverse proxy)

---

## Deployment (Production)

### Docker Images

Build production images:

```bash
# Build API
docker build -f apps/api/Dockerfile -t flowforge-api:latest .

# Build Worker
docker build -f apps/worker/Dockerfile -t flowforge-worker:latest .

# Build Web
docker build -f apps/web/Dockerfile -t flowforge-web:latest .
```

### Kubernetes Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flowforge-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: flowforge-api
  template:
    metadata:
      labels:
        app: flowforge-api
    spec:
      containers:
      - name: api
        image: flowforge-api:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: flowforge-secrets
              key: database-url
        - name: REDIS_URL
          value: redis://redis-service:6379
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: flowforge-secrets
              key: jwt-secret
        - name: VAULT_MASTER_KEY
          valueFrom:
            secretKeyRef:
              name: flowforge-secrets
              key: vault-key
        ports:
        - containerPort: 4000
```

### Database Setup

- **Managed Postgres** (AWS RDS, Google Cloud SQL, etc)
- Enable **connection pooling** (PgBouncer)
- **Backups** — Daily automated backups + point-in-time recovery
- **Migrations** — Run via CI/CD job on deploy

### Worker Scaling

- Deploy multiple worker pods/containers
- BullMQ handles job distribution automatically
- Scale horizontally based on queue depth

---

## Roadmap (Post-MVP)

### V1 Features

- [ ] SSO (SAML/OIDC) + SCIM provisioning
- [ ] Environments (dev/stage/prod) with promotion flows
- [ ] Custom connector builder (OpenAPI spec upload)
- [ ] Advanced branching (parallel execution, joins)
- [ ] DLP/PII detection and redaction
- [ ] Usage-based billing + quotas
- [ ] Customer-managed encryption keys (CMK)
- [ ] On-prem hybrid runners

### V2 Features

- [ ] Marketplace for community connectors
- [ ] Advanced AI agent tool orchestration
- [ ] Real-time collaboration on canvas
- [ ] Workflow templates gallery
- [ ] Advanced analytics + dashboards

---

## Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — See LICENSE file for details.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/yourorg/flowforge-ai/issues)
- **Docs:** [Full Documentation](https://docs.flowforge.ai)
- **Community:** [Discord](https://discord.gg/flowforge)

---

## Acknowledgments

Built with:
- [Fastify](https://www.fastify.io/)
- [Prisma](https://www.prisma.io/)
- [BullMQ](https://docs.bullmq.io/)
- [React Flow](https://reactflow.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

**FlowForge AI** — Safe, governed, enterprise-grade workflow automation with AI.
