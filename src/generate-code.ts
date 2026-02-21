import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an expert Pulumi TypeScript infrastructure engineer.
Output raw TypeScript code only — no markdown, no code fences, no explanation.

Rules:
- Default to AWS unless the user explicitly requests GCP or Azure
- For AWS: import from "@pulumi/aws"
- For GCP: import from "@pulumi/gcp"; use gcp.compute, gcp.storage, gcp.sql, gcp.cloudfunctions, gcp.container, gcp.pubsub, etc.
- Import "@pulumi/pulumi" for types and stack exports
- Assign all resources to const variables with descriptive camelCase names
- Set explicit parent or dependsOn relationships where logical
- Do NOT use config.require(), async/await, or hardcoded secrets
- Do NOT wrap code in an async function — Pulumi programs are synchronous at the top level
- Export useful stack outputs at the end using exports
- Use the latest stable resource types for the chosen provider

AWS example:
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const vpc = new aws.ec2.Vpc("main-vpc", {
  cidrBlock: "10.0.0.0/16",
  tags: { Name: "main" },
});

export const vpcId = vpc.id;

GCP example:
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const bucket = new gcp.storage.Bucket("app-bucket", {
  location: "US",
  uniformBucketLevelAccess: true,
});

export const bucketUrl = bucket.url;`;

function stripCodeFences(code: string): string {
  return code
    .replace(/^```(?:typescript|ts|javascript|js)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
}

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export async function generatePulumiCode(description: string): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    max_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate a Pulumi TypeScript program for the following infrastructure:\n\n${description}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return stripCodeFences(raw);
}

export async function updatePulumiCode(
  existingCode: string,
  changeDescription: string
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    max_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is an existing Pulumi TypeScript program:\n\n${existingCode}\n\nApply the following change and return the complete updated program:\n\n${changeDescription}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return stripCodeFences(raw);
}
