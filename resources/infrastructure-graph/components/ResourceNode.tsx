import { Handle, Position } from "@xyflow/react";
import React from "react";

export interface ResourceNodeData {
  label: string;
  shortType: string;
  provider: string;
  op: string;
  estimatedCost: number | null;
  resourceType: string;
  deployState?: "idle" | "creating" | "created" | "failed";
}

// Category derived from the resource type token (middle segment, e.g. "ec2", "s3", "rds")
type Category =
  | "networking"
  | "compute"
  | "storage"
  | "database"
  | "cdn"
  | "iam"
  | "dns"
  | "api"
  | "messaging"
  | "containers"
  | "other";

function getCategory(resourceType: string): Category {
  // resourceType looks like "aws:ec2/vpc:Vpc" — pull out the middle segment
  const mid = resourceType.split(":")[1]?.split("/")[0] ?? "";
  if (["ec2", "vpc"].includes(mid)) return "networking";
  if (["lambda", "ecs", "eks", "batch", "apprunner"].includes(mid)) return "compute";
  if (["s3", "efs", "fsx", "glacier"].includes(mid)) return "storage";
  if (["rds", "dynamodb", "elasticache", "redshift", "docdb", "neptune"].includes(mid)) return "database";
  if (["cloudfront"].includes(mid)) return "cdn";
  if (["iam"].includes(mid)) return "iam";
  if (["route53"].includes(mid)) return "dns";
  if (["apigateway", "apigatewayv2"].includes(mid)) return "api";
  if (["sns", "sqs", "kinesis", "eventbridge", "ses"].includes(mid)) return "messaging";
  if (["ecr"].includes(mid)) return "containers";
  return "other";
}

// bg / border / icon / label-color per category
const categoryTheme: Record<
  Category,
  { bg: string; border: string; icon: string; label: string }
> = {
  networking: {
    bg: "bg-blue-50",
    border: "border-blue-400",
    icon: "🔗",
    label: "text-blue-800",
  },
  compute: {
    bg: "bg-orange-50",
    border: "border-orange-400",
    icon: "⚡",
    label: "text-orange-800",
  },
  storage: {
    bg: "bg-green-50",
    border: "border-green-400",
    icon: "🪣",
    label: "text-green-800",
  },
  database: {
    bg: "bg-purple-50",
    border: "border-purple-400",
    icon: "🗄️",
    label: "text-purple-800",
  },
  cdn: {
    bg: "bg-pink-50",
    border: "border-pink-400",
    icon: "🌍",
    label: "text-pink-800",
  },
  iam: {
    bg: "bg-gray-50",
    border: "border-gray-400",
    icon: "🔑",
    label: "text-gray-700",
  },
  dns: {
    bg: "bg-teal-50",
    border: "border-teal-400",
    icon: "📡",
    label: "text-teal-800",
  },
  api: {
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    icon: "🔌",
    label: "text-yellow-800",
  },
  messaging: {
    bg: "bg-rose-50",
    border: "border-rose-400",
    icon: "📨",
    label: "text-rose-800",
  },
  containers: {
    bg: "bg-cyan-50",
    border: "border-cyan-400",
    icon: "📦",
    label: "text-cyan-800",
  },
  other: {
    bg: "bg-slate-50",
    border: "border-slate-300",
    icon: "☁️",
    label: "text-slate-700",
  },
};

const opColors: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-yellow-100 text-yellow-700",
  delete: "bg-red-100 text-red-700",
  same: "bg-gray-100 text-gray-500",
  read: "bg-blue-100 text-blue-600",
};

const deployStateRings: Record<string, string> = {
  idle: "",
  creating: "animate-pulse ring-2 ring-yellow-400",
  created: "ring-2 ring-green-400",
  failed: "ring-2 ring-red-400",
};

export const ResourceNode: React.FC<{ data: ResourceNodeData; selected?: boolean }> = ({
  data,
  selected,
}) => {
  const category = getCategory(data.resourceType);
  const theme = categoryTheme[category];
  const opBadge = opColors[data.op] ?? "bg-gray-100 text-gray-500";
  const ringClass = deployStateRings[data.deployState ?? "idle"] ?? "";
  const selectedClass = selected ? "ring-2 ring-offset-1 ring-gray-700 shadow-lg scale-105" : "";

  return (
    <div
      className={`${theme.bg} rounded-xl border-2 ${theme.border} ${ringClass} ${selectedClass} px-3 py-2 shadow-sm w-44 select-none transition-transform`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />

      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-xs leading-none">{theme.icon}</span>
            <span className={`text-xs font-semibold truncate ${theme.label}`}>
              {data.label}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 truncate">{data.shortType}</div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${opBadge}`}>
            {data.op}
          </span>
          {data.estimatedCost !== null && data.estimatedCost > 0 && (
            <span className="text-[9px] text-gray-400">${data.estimatedCost}/mo</span>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
};
