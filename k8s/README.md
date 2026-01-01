# FlowForge AI - Kubernetes Deployment

This directory contains Kubernetes manifests for deploying FlowForge AI to production.

## Prerequisites

- Kubernetes cluster (1.24+)
- `kubectl` configured
- Docker images built and pushed to a registry
- Persistent storage provisioner
- (Optional) Ingress controller (nginx, traefik, etc.)
- (Optional) cert-manager for TLS certificates

## Quick Start

### 1. Build and Push Docker Images

```bash
# Build images
docker build -t your-registry/flowforge-api:latest -f apps/api/Dockerfile .
docker build -t your-registry/flowforge-worker:latest -f apps/worker/Dockerfile .
docker build -t your-registry/flowforge-web:latest -f apps/web/Dockerfile .

# Push to registry
docker push your-registry/flowforge-api:latest
docker push your-registry/flowforge-worker:latest
docker push your-registry/flowforge-web:latest
```

### 2. Update Image References

Edit the deployment files and replace `flowforge-api:latest`, `flowforge-worker:latest`, and `flowforge-web:latest` with your actual image URLs.

### 3. Configure Secrets

**IMPORTANT:** Do NOT use the default secrets in production!

```bash
# Create secrets using kubectl
kubectl create secret generic flowforge-secrets \
  --from-literal=DATABASE_URL='postgresql://user:password@postgres-service:5432/flowforge' \
  --from-literal=REDIS_URL='redis://redis-service:6379' \
  --from-literal=JWT_SECRET='your-random-secret-here' \
  --from-literal=VAULT_MASTER_KEY='32-byte-random-key-here' \
  --from-literal=OPENAI_API_KEY='your-openai-key' \
  --from-literal=ANTHROPIC_API_KEY='your-anthropic-key' \
  --namespace=flowforge
```

Or use [sealed-secrets](https://github.com/bitnami-labs/sealed-secrets) or your cloud provider's secret management.

### 4. Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy infrastructure
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n flowforge --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n flowforge --timeout=300s

# Deploy applications
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/worker.yaml
kubectl apply -f k8s/web.yaml

# (Optional) Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### 5. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n flowforge

# Check services
kubectl get svc -n flowforge

# View logs
kubectl logs -f deployment/api -n flowforge
kubectl logs -f deployment/worker -n flowforge
kubectl logs -f deployment/web -n flowforge
```

## Accessing the Application

### Via LoadBalancer (Default)

```bash
# Get external IP
kubectl get svc web-service -n flowforge

# Access at http://<EXTERNAL-IP>
```

### Via Ingress

If you configured ingress, access at:
- Web UI: https://flowforge.yourdomain.com
- API: https://api.flowforge.yourdomain.com

## Database Migrations

Migrations run automatically when the API starts (via `CMD` in Dockerfile).

To run migrations manually:

```bash
kubectl exec -it deployment/api -n flowforge -- npx prisma migrate deploy
```

## Scaling

### Manual Scaling

```bash
# Scale API
kubectl scale deployment api -n flowforge --replicas=5

# Scale workers
kubectl scale deployment worker -n flowforge --replicas=3
```

### Auto-scaling

Workers have HPA enabled by default. To enable for API:

```bash
kubectl autoscale deployment api -n flowforge --min=3 --max=10 --cpu-percent=70
```

## Monitoring & Logs

### View Logs

```bash
# API logs
kubectl logs -f -l app=api -n flowforge

# Worker logs
kubectl logs -f -l app=worker -n flowforge

# Postgres logs
kubectl logs -f -l app=postgres -n flowforge
```

### Metrics

If using Prometheus:

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View resource usage
kubectl top pods -n flowforge
kubectl top nodes
```

## Backup & Restore

### Database Backup

```bash
# Backup Postgres
kubectl exec -it postgres-0 -n flowforge -- pg_dump -U flowforge flowforge > backup.sql

# Restore
kubectl exec -i postgres-0 -n flowforge -- psql -U flowforge flowforge < backup.sql
```

### Automated Backups

Use [Velero](https://velero.io/) or your cloud provider's backup solution.

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n flowforge

# Check events
kubectl get events -n flowforge --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Test connection from API pod
kubectl exec -it deployment/api -n flowforge -- sh -c 'nc -zv postgres-service 5432'

# Check Postgres logs
kubectl logs -f -l app=postgres -n flowforge
```

### Redis Connection Issues

```bash
# Test connection
kubectl exec -it deployment/worker -n flowforge -- sh -c 'nc -zv redis-service 6379'
```

## Production Recommendations

1. **Use managed databases** (AWS RDS, Google Cloud SQL, Azure Database)
   - Better backups, monitoring, and high availability
   - Update `DATABASE_URL` in secrets to point to managed instance

2. **Use managed Redis** (AWS ElastiCache, Google Memorystore)
   - Better performance and reliability

3. **Enable TLS/SSL**
   - Use cert-manager with Let's Encrypt
   - Configure ingress for HTTPS only

4. **Set resource limits**
   - Already configured in manifests
   - Adjust based on your workload

5. **Configure monitoring**
   - Prometheus + Grafana
   - Cloud provider monitoring (CloudWatch, Stackdriver, Azure Monitor)

6. **Set up alerts**
   - Pod restarts
   - High CPU/memory usage
   - Failed workflow runs

7. **Use namespaces for environments**
   ```bash
   kubectl create namespace flowforge-prod
   kubectl create namespace flowforge-staging
   ```

8. **Implement GitOps**
   - Use ArgoCD or Flux for declarative deployments
   - Version control all manifests

## Cleanup

```bash
# Delete all resources
kubectl delete namespace flowforge

# Or delete individual resources
kubectl delete -f k8s/web.yaml
kubectl delete -f k8s/worker.yaml
kubectl delete -f k8s/api.yaml
kubectl delete -f k8s/redis.yaml
kubectl delete -f k8s/postgres.yaml
kubectl delete -f k8s/secrets.yaml
kubectl delete -f k8s/namespace.yaml
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourorg/flowforge-ai/issues
- Documentation: https://docs.flowforge.ai
