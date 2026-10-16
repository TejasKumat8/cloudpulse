# Kubernetes Troubleshooting Lab Guide

This guide demonstrates how to diagnose and resolve real-world Kubernetes failures using `kubectl`.

---

## Lab 1: ImagePullBackOff / ErrImagePull

### 1. Apply Broken Manifest
```bash
kubectl apply -f troubleshooting/broken-image.yaml
```

### 2. Diagnose Failure
Check the Pod status:
```bash
kubectl get pods -n cloudpulse
```
Expected output:
```text
NAME                                     READY   STATUS             RESTARTS   AGE
cloudpulse-broken-image-78df6568b9-x29z   0/1     ImagePullBackOff   0          45s
```

Inspect the events inside the Pod:
```bash
kubectl describe pod -l app=broken-image-lab -n cloudpulse
```
Notice the Event log:
```text
Failed to pull image "ghcr.io/cloudpulse-org/cloudpulse-backend:invalid-tag-v999": rpc error: code = NotFound
Error: ImagePullBackOff
```

### 3. Resolution
Update the image to a valid reachable container image:
```bash
kubectl set image deployment/cloudpulse-broken-image backend=ghcr.io/cloudpulse-org/cloudpulse-backend:latest -n cloudpulse
```
Verify the replacement Pod transitions to `Running`:
```bash
kubectl get pods -l app=broken-image-lab -n cloudpulse
```

---

## Lab 2: Broken Service Routing (Zero Endpoints)

### 1. Apply Broken Manifest
```bash
kubectl apply -f troubleshooting/broken-service.yaml
```

### 2. Diagnose Failure
Inspect the Service and its Endpoints:
```bash
kubectl get svc cloudpulse-broken-service -n cloudpulse
kubectl get endpoints cloudpulse-broken-service -n cloudpulse
```
Notice that `ENDPOINTS` is `<none>`:
```text
NAME                        ENDPOINTS   AGE
cloudpulse-broken-service   <none>      20s
```

Check what selector the Service is using:
```bash
kubectl get svc cloudpulse-broken-service -n cloudpulse -o jsonpath='{.spec.selector}'
```
Output:
```json
{"app":"non-existent-workload-selector"}
```

Compare against the labels on running backend Pods:
```bash
kubectl get pods -n cloudpulse --show-labels
```
Running Pods have label `app=cloudpulse-backend`, but the Service is querying `app=non-existent-workload-selector`.

### 3. Resolution
Patch the Service selector to match the real Pod label:
```bash
kubectl patch svc cloudpulse-broken-service -n cloudpulse -p '{"spec":{"selector":{"app":"cloudpulse-backend"}}}'
```

Verify endpoints are now populated:
```bash
kubectl get endpoints cloudpulse-broken-service -n cloudpulse
```
Output:
```text
NAME                        ENDPOINTS                                 AGE
cloudpulse-broken-service   10.244.1.4:8000,10.244.2.7:8000           2m
```
Traffic is now successfully routed to backend Pods!
