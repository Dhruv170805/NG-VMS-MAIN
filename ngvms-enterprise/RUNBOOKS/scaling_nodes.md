# Runbook: Resource Scaling & Node Allocations

This guide details how to scale NG-VMS computing and storage bounds to accommodate growing tenant visitor checks and face recognition queues.

---

## 💻 1. Scaling Host Container Allocations

The container orchestrator defines strict upper bounds on memory and CPU usages. If visitor face-matching pipelines show elevated latency:

### Step 1: Modify `docker-compose.yml` limits
Locate the `backend` and `mongo` service blocks and scale resource allocations:
```yaml
  backend:
    image: ngvms-backend:latest
    ...
    deploy:
      resources:
        limits:
          memory: 2g      # Scaled up from 1g
          cpus: "2.0"     # Scaled up from 1.0
        reservations:
          memory: 512m

  mongo:
    image: mongo:6
    ...
    deploy:
      resources:
        limits:
          memory: 4g      # Scaled up from 2g
        reservations:
          memory: 1g
```

### Step 2: Relaunch modified allocations
```bash
# Restart stack to apply resource updates
sudo docker compose up -d
```

---

## 💾 2. MongoDB Index Auditing & Optimization

If database document lookups in the visitor logs list show elevated query latency:
1.  Connect to the database terminal shell:
    ```bash
    sudo docker exec -it ngvms_mongo mongosh -u ngvms_root -p --authenticationDatabase admin
    ```
2.  Switch to the visitor collection database:
    ```javascript
    use ngvms;
    ```
3.  Check active index definitions:
    ```javascript
    db.visitors.getIndexes();
    ```
4.  Ensure dynamic queries (e.g. searching by card scan, passport details, or checkout status) are indexed:
    ```javascript
    // Create compound indices
    db.visitors.createIndex({ tenantId: 1, checkInTime: -1 });
    db.visitors.createIndex({ tenantId: 1, checkoutStatus: 1 });
    ```
