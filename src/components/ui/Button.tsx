import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warning";

const styles: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark border border-transparent disabled:opacity-50",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-slate-50 disabled:opacity-50",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-slate-100 hover:text-foreground disabled:opacity-50",
  danger:
    "bg-danger-soft text-danger border border-red-200 hover:bg-red-100 disabled:opacity-50",
  warning:
    "bg-warning-soft text-warning border border-amber-200 hover:bg-amber-100 disabled:opacity-50",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
