import { z } from "zod";

const nodeDataSchema = z.object({
  label: z.string(),
  shortType: z.string(),
  provider: z.string(),
  op: z.string(),
  estimatedCost: z.number().nullable(),
  resourceType: z.string(),
});

const nodeSchema = z.object({
  id: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: nodeDataSchema,
  type: z.string(),
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  animated: z.boolean().optional(),
});

export const propSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  stackId: z.string(),
  totalEstimatedCost: z.number(),
  description: z.string(),
  subprocessSupported: z.boolean(),
});

export const stateSchema = z.object({
  deployStatus: z.enum(["idle", "deploying", "deployed", "failed"]),
  logs: z.array(z.string()),
});

export type InfraGraphProps = z.infer<typeof propSchema>;
export type InfraGraphState = z.infer<typeof stateSchema>;
