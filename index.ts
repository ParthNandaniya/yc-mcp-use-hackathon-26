import { MCPServer, object, text, widget } from "mcp-use/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { generatePulumiCode, updatePulumiCode } from "./src/generate-code.js";
import {
  buildGraphFromEvents,
  type PreviewEvent,
} from "./src/graph-converter.js";
import {
  checkSubprocessSupport,
  parseResourcesFromCode,
  runDeploy,
  runPreview,
  writeProgram,
} from "./src/pulumi-stack.js";
import { estimateMonthlyCost, totalEstimatedCost } from "./src/cost-estimator.js";
import { getStack, setStack } from "./src/stack-store.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new MCPServer({
  name: "yc-mcp-use-hackathon-26",
  title: "Infrastructure Visualizer",
  version: "1.0.0",
  description:
    "Design and visualize cloud infrastructure through natural language. Generates Pulumi TypeScript programs and renders interactive React Flow graphs.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// Check subprocess support at startup (cached)
let subprocessSupported = false;
checkSubprocessSupport().then((result) => {
  subprocessSupported = result;
  console.log(
    `Pulumi subprocess support: ${result ? "enabled" : "disabled (static parser fallback)"}`
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function generateGraph(
  pulumiCode: string,
  stackId: string,
  workDir: string
) {
  let events: PreviewEvent[];
  try {
    writeProgram(workDir, pulumiCode);
    events = await runPreview(stackId, workDir);
  } catch {
    events = parseResourcesFromCode(pulumiCode);
  }

  const { nodes, edges } = buildGraphFromEvents(events);

  const enrichedNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      estimatedCost: estimateMonthlyCost(node.data.resourceType),
    },
  }));

  const cost = totalEstimatedCost(enrichedNodes.map((n) => n.data.resourceType));
  return { nodes: enrichedNodes, edges, cost };
}

// ---------------------------------------------------------------------------
// Tool: generate_infrastructure
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "generate_infrastructure",
    description:
      "Generate an interactive cloud infrastructure diagram from a natural language description. Use this when the user wants to design, plan, or visualize cloud infrastructure.",
    schema: z.object({
      description: z
        .string()
        .describe(
          "Natural language description of the infrastructure, e.g. 'A Next.js app with Postgres database and S3 file storage'"
        ),
    }),
    widget: {
      name: "infrastructure-graph",
      invoking: "Generating infrastructure…",
      invoked: "Infrastructure graph ready",
    },
  },
  async ({ description }) => {
    const stackId = randomUUID().replace(/-/g, "").slice(0, 10);
    const workDir = `/tmp/infra-${stackId}`;

    const pulumiCode = await generatePulumiCode(description);
    const { nodes, edges, cost } = await generateGraph(pulumiCode, stackId, workDir);

    setStack({
      stackId,
      pulumiCode,
      workDir,
      nodes,
      edges,
      deployStatus: "idle",
      createdAt: new Date().toISOString(),
    });

    return widget({
      props: {
        nodes,
        edges,
        stackId,
        totalEstimatedCost: cost,
        description,
        subprocessSupported,
      },
      output: text(
        `Generated infrastructure with ${nodes.length} resources. Estimated cost: ~$${cost}/mo. Stack ID: ${stackId}`
      ),
    });
  }
);

// ---------------------------------------------------------------------------
// Tool: update_infrastructure
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "update_infrastructure",
    description:
      "Update an existing infrastructure diagram based on a change description. Use this when the user wants to add, remove, or modify resources in an existing design.",
    schema: z.object({
      change_description: z
        .string()
        .describe(
          "Description of the change to make, e.g. 'Add a Redis cache cluster' or 'Replace RDS with DynamoDB'"
        ),
      stack_id: z
        .string()
        .describe("The stack ID returned by generate_infrastructure"),
    }),
    widget: {
      name: "infrastructure-graph",
      invoking: "Updating infrastructure…",
      invoked: "Infrastructure updated",
    },
  },
  async ({ change_description, stack_id }) => {
    const record = getStack(stack_id);
    if (!record) {
      return text(
        `Error: Stack "${stack_id}" not found. Please call generate_infrastructure first.`
      );
    }

    const newCode = await updatePulumiCode(record.pulumiCode, change_description);
    const { nodes, edges, cost } = await generateGraph(newCode, stack_id, record.workDir);

    setStack({
      ...record,
      pulumiCode: newCode,
      nodes,
      edges,
    });

    return widget({
      props: {
        nodes,
        edges,
        stackId: stack_id,
        totalEstimatedCost: cost,
        description: change_description,
        subprocessSupported,
      },
      output: text(
        `Updated infrastructure: ${nodes.length} resources, ~$${cost}/mo. Stack ID: ${stack_id}`
      ),
    });
  }
);

// ---------------------------------------------------------------------------
// Tool: deploy
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "deploy",
    description:
      "Deploy a generated infrastructure stack to AWS using Pulumi. Called by the infrastructure graph widget's Deploy button.",
    schema: z.object({
      stackId: z.string().describe("The stack ID to deploy"),
    }),
  },
  async ({ stackId }) => {
    const record = getStack(stackId);
    if (!record) {
      return object({
        status: "failed",
        message: `Stack "${stackId}" not found`,
        logs: [],
      });
    }

    if (!subprocessSupported) {
      return object({
        status: "failed",
        message:
          "Deploy is not supported in this environment (subprocess blocked). Visualization is still available.",
        logs: [
          "[error] Pulumi subprocess is not supported in this sandbox environment.",
        ],
      });
    }

    const logs: string[] = [];
    try {
      setStack({ ...record, deployStatus: "deploying" });

      await runDeploy(record.workDir, stackId, (line) => {
        logs.push(line.trim());
      });

      setStack({ ...record, deployStatus: "deployed" });

      const created = logs.filter(
        (l) => l.toLowerCase().includes("created") || l.includes("+")
      ).length;

      return object({
        status: "deployed",
        message: `Deployed successfully. ~${created} resources created.`,
        logs,
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      logs.push(`[error] ${err}`);
      setStack({ ...record, deployStatus: "failed" });

      return object({
        status: "failed",
        message: `Deploy failed: ${err}`,
        logs,
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Smoke test (temporary — remove after Manufact Cloud subprocess test)
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "pulumi_smoke_test",
    description:
      "Test whether Pulumi subprocess execution is supported in this environment",
    schema: z.object({}),
  },
  async () => {
    try {
      const { LocalWorkspace } = await import("@pulumi/pulumi/automation");
      const { mkdirSync, writeFileSync } = await import("fs");
      const dir = "/tmp/pulumi-smoke-test-manual";
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/Pulumi.yaml`, "name: smoke\nruntime: nodejs\n");
      await LocalWorkspace.create({ workDir: dir });
      return text("Pulumi subprocess: CONFIRMED");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return text(`Pulumi subprocess FAILED: ${msg}`);
    }
  }
);

// ---------------------------------------------------------------------------

server.listen().then(() => {
  console.log("Infrastructure Visualizer MCP server running");
});
