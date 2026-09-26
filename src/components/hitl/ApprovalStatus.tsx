interface ApprovalStatusProps {
  status: "pending" | "approved" | "rejected";
  action: string;
}

export default function ApprovalStatus({
  status,
  action,
}: ApprovalStatusProps) {
  const statusConfig = {
    pending: { icon: "⏳", label: "Pending approval", className: "pending" },
    approved: { icon: "✓", label: "Approved", className: "approved" },
    rejected: { icon: "✗", label: "Rejected", className: "rejected" },
  };

  const config = statusConfig[status];

  return (
    <div className={`approval-status ${config.className}`}>
      <span className="approval-icon">{config.icon}</span>
      <span className="approval-action">{action}</span>
      <span className="approval-label">{config.label}</span>
    </div>
  );
}
