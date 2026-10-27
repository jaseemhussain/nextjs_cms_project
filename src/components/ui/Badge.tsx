import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  brand: "bg-brand-soft text-brand-dark",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
