# FlowForge AI — Quick Start Guide

Get FlowForge AI running locally in 5 minutes.

---

## Prerequisites

- **Docker** and **Docker Compose** installed
- **curl** (for testing API endpoints)

---

## 1. Start All Services

```bash
# Clone the repo (if not already)
cd flowforge-ai

# Start all services (Postgres, Redis, API, Worker, Web)
docker compose up --build
```

Wait for all services to start. You should see:
- ✓ Postgres ready on port 5432
- ✓ Redis ready on port 6379
- ✓ API ready on port 4000
- ✓ Worker running (background)
- ✓ Web ready on port 5173

---

## 2. Create Your First User

Open a new terminal and run:

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@flowforge.local",
    "password": "password123",
    "orgName": "Acme Corp"
  }'
```

**Expected response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "orgId": "org_abc123xyz"
}
```

**Save these values** — you'll need them for the next steps.

---

## 3. Set Token in Browser

1. Open **http://localhost:5173** in your browser
2. Open **DevTools Console** (F12)
3. Run this command (replace `YOUR_TOKEN_HERE`):

```js
localStorage.setItem("ff_token", "YOUR_TOKEN_HERE")
```

4. **Refresh the page** — you should now see the FlowForge UI!

---

## 4. Create Your First Workflow

### Step 1: Create a Project

```bash
export TOKEN="YOUR_TOKEN_HERE"
export ORG_ID="YOUR_ORG_ID"

curl -X POST http://localhost:4000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Demo Project\"}"
```

**Response:**
```json
{
  "id": "proj_demo123",
  "orgId": "org_abc123xyz",
  "name": "Demo Project",
  "createdAt": "2026-01-02T10:00:00.000Z"
}
```

Save the `id` as `PROJECT_ID`.

### Step 2: Create a Workflow

```bash
export PROJECT_ID="proj_demo123"

curl -X POST http://localhost:4000/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"name\": \"Hello World Workflow\",
    \"description\": \"Webhook to Slack draft\"
  }"
```

**Response:**
```json
{
  "id": "wf_hello123",
  "projectId": "proj_demo123",
  "name": "Hello World Workflow",
  ...
}
```

Save the `id` as `WORKFLOW_ID`.

### Step 3: Edit Workflow in UI

1. Go to **http://localhost:5173/#/builder**
2. Enter your `WORKFLOW_ID` in the input field
3. The canvas shows 3 default nodes:
   - `trigger.webhook` → `transform.jsonata` → `action.slack (draft)`
4. Click **Save Draft**

### Step 4: Publish Workflow

```bash
export WORKFLOW_ID="wf_hello123"

curl -X POST http://localhost:4000/workflows/$WORKFLOW_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "ok": true,
  "publishedVersionId": "wfv_published456"
}
```

Save `publishedVersionId` as `VERSION_ID`.

---

## 5. Trigger Your Workflow

```bash
export VERSION_ID="wfv_published456"

curl -X POST "http://localhost:4000/hook/hello?orgId=$ORG_ID&workflowVersionId=$VERSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

**Response:**
```json
{
  "ok": true,
  "runId": "run_xyz789"
}
```

---

## 6. View Run Results

1. Go to **http://localhost:5173/#/runs**
2. You should see your run with status `succeeded`
3. Click on it to see step-by-step execution details

Or via API:

```bash
export RUN_ID="run_xyz789"

curl -X GET http://localhost:4000/runs/$RUN_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## What Just Happened?

1. **Webhook trigger** received `{"name": "Alice"}`
2. **JSONata transform** ran: `{ "text": "Hello, " & body.name & "!" }`
   - Output: `{ "text": "Hello, Alice!" }`
3. **Slack action (draft mode)** created a draft message:
   - `{ "draft": { "channel": "#ops", "text": "Hello, Alice!" } }`

Since the Slack node is in `draft` mode, it didn't actually send anything — it just returned the message preview. To send, you'd need to:
1. Add an `approval.human` node before Slack
2. Change Slack config to `mode: "send"`
3. Approve the request via `/approvals` API

---

## Next Steps

### Test Approval Gating

Create a workflow with risky actions (e.g., HTTP POST) and an approval node:

```json
{
  "nodes": [
    { "id": "n1", "type": "trigger.webhook", ... },
    { "id": "n2", "type": "approval.human", "config": { "message": "Approve HTTP POST?" } },
    { "id": "n3", "type": "action.http", "config": { "method": "POST", "url": "https://httpbin.org/post" }, "risk": { "requiresApproval": true } }
  ],
  "edges": [
    { "source": "n1", "target": "n2" },
    { "source": "n2", "target": "n3" }
  ]
}
```

When you trigger this workflow:
1. Run pauses at approval node (status: `waiting_approval`)
2. View approval requests at **http://localhost:5173/#/approvals**
3. Approve via API:

```bash
curl -X POST http://localhost:4000/approvals/APR_ID/decide \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"decision": "APPROVED", "reason": "Looks good"}'
```

4. Run resumes and completes HTTP POST

---

### Test AI Agent Node

Create a workflow with an AI agent that extracts structured data:

```json
{
  "id": "a1",
  "type": "ai.agent",
  "config": {
    "agent": {
      "goal": "Extract quote fields from the input",
      "tools": [],
      "maxToolCalls": 0
    }
  },
  "io": {
    "outputSchema": {
      "type": "object",
      "properties": {
        "supplierName": { "type": "string" },
        "currency": { "type": "string" },
        "lineItems": { "type": "array" }
      },
      "required": ["supplierName", "currency", "lineItems"],
      "additionalProperties": false
    }
  }
}
```

The worker validates that the AI's output matches this schema **exactly**. If not, the step fails with `AI_OUTPUT_SCHEMA_VIOLATION`.

---

## Troubleshooting

### Postgres connection errors

If API fails to connect to Postgres:
- Ensure Postgres container is healthy: `docker compose ps`
- Check logs: `docker compose logs postgres`
- Wait a few seconds for migrations to run

### "Unauthorized" errors

- Ensure you set the token: `localStorage.setItem("ff_token", "...")`
- Check token hasn't expired (12h TTL)
- Verify `/auth/login` returns a valid token

### Web UI not loading

- Check API is running: `curl http://localhost:4000/health`
- Verify web container logs: `docker compose logs web`
- Ensure port 5173 isn't blocked

---

## Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (clears database)
docker compose down -v
```

---

## Development Mode (Without Docker)

If you prefer running services locally:

```bash
# Terminal 1: Start Postgres + Redis
docker compose up postgres redis

# Terminal 2: API
cd apps/api
pnpm install
npx prisma migrate dev --name init
pnpm dev

# Terminal 3: Worker
cd apps/worker
pnpm install
pnpm dev

# Terminal 4: Web
cd apps/web
pnpm install
pnpm dev
```

Then follow the same steps above for creating users/workflows.

---

## What's Next?

- Read the full [README.md](./README.md) for architecture details
- Explore the [PRD](./PRD.md) for feature roadmap
- Build custom connectors (see connector framework docs)
- Implement SSO/RBAC for enterprise use

---

**You're all set!** 🚀

Start building enterprise-grade workflow automations with safe AI agents.
