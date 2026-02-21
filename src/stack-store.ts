import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";

export interface InfraNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    shortType: string;
    provider: string;
    op: string;
    estimatedCost: number | null;
    resourceType: string;
  };
  type: string;
}

export interface InfraEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface StackRecord {
  stackId: string;
  pulumiCode: string;
  workDir: string;
  nodes: InfraNode[];
  edges: InfraEdge[];
  deployStatus: "idle" | "deploying" | "deployed" | "failed";
  createdAt: string;
}

const memoryStore = new Map<string, StackRecord>();

function getStatePath(stackId: string): string {
  return `/tmp/infra-${stackId}/state.json`;
}

export function setStack(record: StackRecord): void {
  memoryStore.set(record.stackId, record);
  try {
    const dir = `/tmp/infra-${record.stackId}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(getStatePath(record.stackId), JSON.stringify(record, null, 2));
  } catch {
    // ignore write errors in sandboxed environments
  }
}

export function getStack(stackId: string): StackRecord | null {
  if (memoryStore.has(stackId)) {
    return memoryStore.get(stackId)!;
  }
  const path = getStatePath(stackId);
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, "utf-8")) as StackRecord;
      memoryStore.set(stackId, data);
      return data;
    } catch {
      return null;
    }
  }
  return null;
}
