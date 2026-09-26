interface ToolStatusProps {
  name: string;
  status: "running" | "complete" | "error";
}

export default function ToolStatus({ name, status }: ToolStatusProps) {
  const icon =
    status === "running" ? "spinner" : status === "complete" ? "check" : "error";

  return (
    <div className={`tool-status ${status}`}>
      <span className={`tool-icon ${icon}`}>
        {status === "running" && "⏳"}
        {status === "complete" && "✓"}
        {status === "error" && "✗"}
      </span>
      <span className="tool-name">{name}</span>
      {status === "running" && <span className="tool-dots">...</span>}
    </div>
  );
}
