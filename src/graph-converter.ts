import dagre from "dagre";
import type { InfraNode, InfraEdge } from "./stack-store.js";

export interface PreviewEvent {
  metadata: {
    urn: string;
    type: string;
    op: string;
    parent?: string;
    dependencies?: string[];
  };
}

interface ParsedUrn {
  provider: string;
  resourceType: string;
  name: string;
}

const displayNameMap: Record<string, string> = {
  "aws:s3/bucket:Bucket": "S3 Bucket",
  "aws:s3/bucketV2:BucketV2": "S3 Bucket",
  "aws:ec2/instance:Instance": "EC2 Instance",
  "aws:ec2/vpc:Vpc": "VPC",
  "aws:ec2/subnet:Subnet": "Subnet",
  "aws:ec2/securityGroup:SecurityGroup": "Security Group",
  "aws:ec2/internetGateway:InternetGateway": "Internet Gateway",
  "aws:ec2/routeTable:RouteTable": "Route Table",
  "aws:ec2/routeTableAssociation:RouteTableAssociation": "Route Table Assoc.",
  "aws:ec2/eip:Eip": "Elastic IP",
  "aws:ec2/natGateway:NatGateway": "NAT Gateway",
  "aws:rds/instance:Instance": "RDS Instance",
  "aws:rds/cluster:Cluster": "RDS Cluster",
  "aws:rds/subnetGroup:SubnetGroup": "DB Subnet Group",
  "aws:elasticache/cluster:Cluster": "ElastiCache Cluster",
  "aws:elasticache/replicationGroup:ReplicationGroup": "Redis Cluster",
  "aws:elasticache/subnetGroup:SubnetGroup": "Cache Subnet Group",
  "aws:lambda/function:Function": "Lambda Function",
  "aws:apigateway/restApi:RestApi": "API Gateway",
  "aws:apigatewayv2/api:Api": "HTTP API",
  "aws:ecs/cluster:Cluster": "ECS Cluster",
  "aws:ecs/service:Service": "ECS Service",
  "aws:ecs/taskDefinition:TaskDefinition": "Task Definition",
  "aws:ecr/repository:Repository": "ECR Repo",
  "aws:cloudfront/distribution:Distribution": "CloudFront CDN",
  "aws:route53/zone:Zone": "Route53 Zone",
  "aws:route53/record:Record": "DNS Record",
  "aws:iam/role:Role": "IAM Role",
  "aws:iam/policy:Policy": "IAM Policy",
  "aws:iam/rolePolicyAttachment:RolePolicyAttachment": "Policy Attach",
  "aws:lb/loadBalancer:LoadBalancer": "Load Balancer",
  "aws:lb/targetGroup:TargetGroup": "Target Group",
  "aws:lb/listener:Listener": "LB Listener",
  "aws:alb/loadBalancer:LoadBalancer": "ALB",
  "aws:sns/topic:Topic": "SNS Topic",
  "aws:sqs/queue:Queue": "SQS Queue",
  "aws:dynamodb/table:Table": "DynamoDB Table",
  "aws:cognito/userPool:UserPool": "Cognito User Pool",
};

function parseUrn(urn: string): ParsedUrn {
  // Format: urn:pulumi:<stack>::<project>::<type>::<name>
  const parts = urn.split("::");
  const typePart = parts[2] ?? "";
  const name = parts[3] ?? urn;

  // type is like aws:s3/bucket:Bucket
  const typeParts = typePart.split(":");
  const providerPart = typeParts[0] ?? "unknown";
  const provider = providerPart.split("/")[0] ?? providerPart;

  return { provider, resourceType: typePart, name };
}

function shouldFilter(type: string): boolean {
  return (
    type === "pulumi:pulumi:Stack" ||
    type.startsWith("pulumi:providers:") ||
    type === "pulumi:pulumi:StackReference"
  );
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

export function buildGraphFromEvents(events: PreviewEvent[]): {
  nodes: InfraNode[];
  edges: InfraEdge[];
} {
  const filtered = events.filter((e) => !shouldFilter(e.metadata.type));

  // Build urn → id mapping
  const urnToId = new Map<string, string>();
  filtered.forEach((e, i) => {
    urnToId.set(e.metadata.urn, `node-${i}`);
  });

  // Create dagre graph for layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120 });

  const rawNodes: InfraNode[] = filtered.map((e, i) => {
    const id = `node-${i}`;
    const { provider, resourceType, name } = parseUrn(e.metadata.urn);
    const shortType = displayNameMap[resourceType] ?? resourceType.split(":").pop() ?? resourceType;

    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });

    return {
      id,
      position: { x: 0, y: 0 },
      data: {
        label: name,
        shortType,
        provider,
        op: e.metadata.op ?? "create",
        estimatedCost: null,
        resourceType,
      },
      type: "resourceNode",
    };
  });

  // Build edges from parent and dependencies
  const rawEdges: InfraEdge[] = [];
  filtered.forEach((e) => {
    const targetId = urnToId.get(e.metadata.urn);
    if (!targetId) return;

    if (e.metadata.parent) {
      const sourceId = urnToId.get(e.metadata.parent);
      if (sourceId) {
        rawEdges.push({
          id: `e-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
        });
        g.setEdge(sourceId, targetId);
      }
    }

    (e.metadata.dependencies ?? []).forEach((dep) => {
      const sourceId = urnToId.get(dep);
      if (sourceId && sourceId !== urnToId.get(e.metadata.parent ?? "")) {
        const edgeId = `e-dep-${sourceId}-${targetId}`;
        if (!rawEdges.find((ed) => ed.id === edgeId)) {
          rawEdges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            animated: true,
          });
          g.setEdge(sourceId, targetId);
        }
      }
    });
  });

  // Run dagre layout
  dagre.layout(g);

  // Apply positions
  const nodes = rawNodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
    };
  });

  // Deduplicate edges
  const seen = new Set<string>();
  const edges = rawEdges.filter((e) => {
    const key = `${e.source}-${e.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { nodes, edges };
}
