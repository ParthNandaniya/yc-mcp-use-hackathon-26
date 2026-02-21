const costTable: Record<string, number> = {
  "aws:ec2/instance:Instance": 30,
  "aws:ec2/vpc:Vpc": 0,
  "aws:ec2/subnet:Subnet": 0,
  "aws:ec2/securityGroup:SecurityGroup": 0,
  "aws:ec2/internetGateway:InternetGateway": 0,
  "aws:ec2/routeTable:RouteTable": 0,
  "aws:ec2/routeTableAssociation:RouteTableAssociation": 0,
  "aws:ec2/eip:Eip": 4,
  "aws:ec2/natGateway:NatGateway": 45,
  "aws:s3/bucket:Bucket": 3,
  "aws:s3/bucketV2:BucketV2": 3,
  "aws:rds/instance:Instance": 25,
  "aws:rds/cluster:Cluster": 50,
  "aws:rds/subnetGroup:SubnetGroup": 0,
  "aws:elasticache/cluster:Cluster": 20,
  "aws:elasticache/replicationGroup:ReplicationGroup": 40,
  "aws:elasticache/subnetGroup:SubnetGroup": 0,
  "aws:lambda/function:Function": 2,
  "aws:apigateway/restApi:RestApi": 5,
  "aws:apigatewayv2/api:Api": 5,
  "aws:ecs/cluster:Cluster": 0,
  "aws:ecs/service:Service": 30,
  "aws:ecs/taskDefinition:TaskDefinition": 0,
  "aws:ecr/repository:Repository": 2,
  "aws:cloudfront/distribution:Distribution": 10,
  "aws:route53/zone:Zone": 1,
  "aws:route53/record:Record": 0,
  "aws:iam/role:Role": 0,
  "aws:iam/policy:Policy": 0,
  "aws:iam/rolePolicyAttachment:RolePolicyAttachment": 0,
  "aws:lb/loadBalancer:LoadBalancer": 20,
  "aws:lb/targetGroup:TargetGroup": 0,
  "aws:lb/listener:Listener": 0,
  "aws:alb/loadBalancer:LoadBalancer": 20,
  "aws:alb/targetGroup:TargetGroup": 0,
  "aws:alb/listener:Listener": 0,
  "aws:sns/topic:Topic": 1,
  "aws:sqs/queue:Queue": 1,
  "aws:dynamodb/table:Table": 5,
  "aws:ses/emailIdentity:EmailIdentity": 0,
  "aws:cognito/userPool:UserPool": 5,
};

export function estimateMonthlyCost(type: string): number | null {
  return costTable[type] ?? null;
}

export function totalEstimatedCost(types: string[]): number {
  return types.reduce((sum, type) => sum + (costTable[type] ?? 5), 0);
}
