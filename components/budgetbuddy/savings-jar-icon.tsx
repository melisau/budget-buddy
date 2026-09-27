import type { SVGProps } from "react";

export function SavingsJarIcon({ className = "size-5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 3h8v3H8z" />
      <path d="M7 6h10l1 2v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8l1-2Z" />
      <circle cx="12" cy="14" r="3" />
      <path d="M12 12v4" />
    </svg>
  );
}