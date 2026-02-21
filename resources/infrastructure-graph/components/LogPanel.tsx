import React, { useEffect, useRef } from "react";

interface LogPanelProps {
  logs: string[];
  deployStatus: "idle" | "deploying" | "deployed" | "failed";
}

function lineColor(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("failed") || lower.includes("fail")) {
    return "text-red-400";
  }
  if (lower.includes("warn")) {
    return "text-yellow-400";
  }
  if (lower.includes("created") || lower.includes("success") || lower.includes("complete")) {
    return "text-green-400";
  }
  return "text-gray-400";
}

const statusLabels: Record<string, string> = {
  deploying: "⏳ Deploying…",
  deployed: "✅ Deployed",
  failed: "❌ Deploy failed",
};

export const LogPanel: React.FC<LogPanelProps> = ({ logs, deployStatus }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (deployStatus === "idle") return null;

  return (
    <div className="border-t border-gray-200 bg-gray-950 rounded-b-3xl">
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-800">
        <span className="text-xs font-medium text-gray-300">
          {statusLabels[deployStatus] ?? deployStatus}
        </span>
        {deployStatus === "deploying" && (
          <div className="w-3 h-3 rounded-full bg-yellow-400 animate-ping" />
        )}
      </div>
      <div className="font-mono text-xs px-4 py-3 max-h-48 overflow-y-auto space-y-0.5">
        {logs.length === 0 && deployStatus === "deploying" && (
          <div className="text-gray-500">Connecting to Pulumi…</div>
        )}
        {logs.map((line, i) => (
          <div key={i} className={lineColor(line)}>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
