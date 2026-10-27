import type { ReactNode } from "react";

export function Alert({
  children,
  tone = "danger",
}: {
  children: ReactNode;
  tone?: "danger" | "success" | "info";
}) {
  const map = {
    danger: "border-red-200 bg-danger-soft text-danger",
    success: "border-emerald-200 bg-success-soft text-success",
    info: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${map[tone]}`}>
      {children}
    </div>
  );
}
