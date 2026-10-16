variable "aws_region" {
  description = "The AWS region to deploy infrastructure into"
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "Name of the Amazon EKS cluster"
  type        = string
  default     = "cloudpulse-eks"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the CloudPulse VPC"
  type        = string
  default     = "10.30.0.0/16"
}
