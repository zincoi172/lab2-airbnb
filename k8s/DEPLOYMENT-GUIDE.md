# Kubernetes Deployment Guide for Lab 2

## Prerequisites

1. **Enable Kubernetes in Docker Desktop:**
   - Open Docker Desktop
   - Go to Settings → Kubernetes
   - Check "Enable Kubernetes"
   - Click "Apply & Restart"
   - Wait for Kubernetes to start (green indicator)

2. **Verify Kubernetes is running:**
   ```bash
   kubectl version --client
   kubectl cluster-info
   ```

3. **Ensure Docker images are built:**
   ```bash
   cd ~/Desktop/lab2-airbnb
   docker-compose build
   docker images | grep lab2-airbnb
   ```

---

## File Placement

Create a `k8s` folder in your project root and place all the YAML files:

```
lab2-airbnb/
├── k8s/
│   ├── 00-namespace.yaml
│   ├── 01-configmap.yaml
│   ├── 02-secrets.yaml
│   ├── 03-backend.yaml
│   ├── 04-ai-agent.yaml
│   └── 05-frontend.yaml
├── docker-compose.yml
└── ...
```

---

## Deployment Steps

### Step 1: Stop Docker Compose (if running)
```bash
cd ~/Desktop/lab2-airbnb
docker-compose down
```

### Step 2: Create the namespace
```bash
kubectl apply -f k8s/00-namespace.yaml

# Verify
kubectl get namespaces
```

### Step 3: Create ConfigMap and Secrets
```bash
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml

# Verify
kubectl get configmap -n airbnb-app
kubectl get secrets -n airbnb-app
```

### Step 4: Deploy AI Agent (deploy first, backend depends on it)
```bash
kubectl apply -f k8s/04-ai-agent.yaml

# Wait for it to be ready
kubectl get pods -n airbnb-app -w
# Press Ctrl+C when ai-agent pod shows 1/1 READY
```

### Step 5: Deploy Backend
```bash
kubectl apply -f k8s/03-backend.yaml

# Wait for it to be ready
kubectl get pods -n airbnb-app -w
# Press Ctrl+C when backend pods show 1/1 READY
```

### Step 6: Deploy Frontend
```bash
kubectl apply -f k8s/05-frontend.yaml

# Wait for it to be ready
kubectl get pods -n airbnb-app -w
# Press Ctrl+C when frontend pods show 1/1 READY
```

### Step 7: Get all resources
```bash
kubectl get all -n airbnb-app
```

---

## Verification

### Check Pods Status
```bash
kubectl get pods -n airbnb-app

# Should see something like:
# NAME                        READY   STATUS    RESTARTS   AGE
# ai-agent-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
# backend-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
# backend-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
# frontend-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
# frontend-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
```

### Check Services
```bash
kubectl get services -n airbnb-app

# Should see:
# NAME               TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)
# ai-agent-service   ClusterIP      10.x.x.x         <none>        11500/TCP
# backend-service    LoadBalancer   10.x.x.x         localhost     4000:xxxxx/TCP
# frontend-service   LoadBalancer   10.x.x.x         localhost     80:xxxxx/TCP
```

### View Logs
```bash
# Backend logs
kubectl logs -n airbnb-app deployment/backend -f

# AI Agent logs
kubectl logs -n airbnb-app deployment/ai-agent -f

# Frontend logs
kubectl logs -n airbnb-app deployment/frontend -f
```

### Test the Application
```bash
# Test backend health
curl http://localhost:4000/health

# Test AI agent health
kubectl port-forward -n airbnb-app svc/ai-agent-service 11500:11500
# Then in another terminal:
curl http://localhost:11500/healthz

# Open frontend in browser
open http://localhost
```

---

## Scaling

### Scale Backend
```bash
# Scale to 3 replicas
kubectl scale deployment/backend -n airbnb-app --replicas=3

# Verify
kubectl get pods -n airbnb-app
```

### Scale Frontend
```bash
# Scale to 4 replicas
kubectl scale deployment/frontend -n airbnb-app --replicas=4

# Verify
kubectl get pods -n airbnb-app
```

---

## Troubleshooting

### Pod not starting?
```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n airbnb-app

# Check logs
kubectl logs <pod-name> -n airbnb-app

# Common issues:
# 1. Image not found → Make sure docker-compose build was run
# 2. ImagePullBackOff → Check imagePullPolicy is set to Never
# 3. CrashLoopBackOff → Check logs for application errors
```

### Can't connect to MySQL?
```bash
# Make sure local MySQL is running
ps aux | grep mysqld

# If not, start it
mysql.server start
```

### Service communication issues?
```bash
# Test service DNS resolution from inside a pod
kubectl run -it --rm debug --image=busybox --restart=Never -n airbnb-app -- sh

# Inside the pod:
nslookup ai-agent-service
nslookup backend-service
exit
```

---

## Cleanup

### Delete all resources
```bash
kubectl delete namespace airbnb-app
```

### Or delete individually
```bash
kubectl delete -f k8s/05-frontend.yaml
kubectl delete -f k8s/03-backend.yaml
kubectl delete -f k8s/04-ai-agent.yaml
kubectl delete -f k8s/02-secrets.yaml
kubectl delete -f k8s/01-configmap.yaml
kubectl delete -f k8s/00-namespace.yaml
```

---

## Screenshots for Report

Take these screenshots after deployment:

1. **Pods running:**
   ```bash
   kubectl get pods -n airbnb-app -o wide
   ```

2. **Services:**
   ```bash
   kubectl get services -n airbnb-app
   ```

3. **All resources:**
   ```bash
   kubectl get all -n airbnb-app
   ```

4. **Describe a pod (showing scaling):**
   ```bash
   kubectl describe deployment backend -n airbnb-app
   ```

5. **Application working in browser:**
   - Open http://localhost
   - Log in
   - Show properties

6. **Logs showing health checks:**
   ```bash
   kubectl logs deployment/backend -n airbnb-app | grep health
   ```

---

## Key Features Demonstrated

✅ **Containerization:** All services running in containers
✅ **Orchestration:** Kubernetes managing deployments
✅ **Service Discovery:** Services communicating via DNS (ai-agent-service, backend-service)
✅ **Scaling:** Multiple replicas of backend and frontend
✅ **Health Checks:** Liveness and readiness probes
✅ **Configuration Management:** ConfigMaps for config, Secrets for sensitive data
✅ **Load Balancing:** LoadBalancer services for external access
✅ **Resource Management:** CPU and memory limits set

---

## Notes

- **imagePullPolicy: Never** is used because we're using locally built images from docker-compose
- **host.docker.internal** allows pods to access services on the host machine (your local MySQL)
- **LoadBalancer** type services in Docker Desktop Kubernetes expose ports on localhost
- **Replicas:** Backend and frontend have 2 replicas for high availability, AI agent has 1 (stateless but resource-intensive)

---

## Next Steps After Kubernetes

Once Kubernetes is working:
1. ✅ Take screenshots for report
2. ✅ Commit k8s files to Git
3. Move on to Part 2: Kafka
4. Move on to Part 3: MongoDB
5. Deploy to AWS (optional but recommended)
