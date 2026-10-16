# CloudPulse Terraform Infrastructure

This directory provisions the production AWS cloud infrastructure for CloudPulse using Infrastructure as Code (IaC).

## Architecture

- **AWS VPC**:
  - CIDR: `10.30.0.0/16`
  - 2 Availability Zones (`ap-south-1a`, `ap-south-1b`)
  - 2 Public Subnets with Internet Gateway
  - 2 Private Subnets with NAT Gateway
  - DNS hostnames and resolution enabled
- **AWS EKS (Kubernetes 1.31)**:
  - Managed Node Group with `t3.medium` instances
  - Autoscaling: min 2, max 4, desired 2 worker nodes
  - Deployed safely in private subnets
  - Public endpoint access enabled for administrative control

## Prerequisites

1. AWS CLI configured with appropriate IAM permissions:
   ```bash
   aws configure
   ```
2. Terraform >= 1.7.0 installed.

## Execution Workflow

1. **Initialize Terraform working directory**:
   ```bash
   terraform init
   ```
2. **Review execution plan**:
   ```bash
   terraform plan
   ```
3. **Apply and provision infrastructure**:
   ```bash
   terraform apply
   ```
4. **Connect kubectl to the new EKS cluster**:
   ```bash
   aws eks --region ap-south-1 update-kubeconfig --name cloudpulse-eks
   kubectl get nodes
   ```
5. **Teardown & Cleanup (Prevents runaway AWS bills)**:
   ```bash
   terraform destroy
   ```
