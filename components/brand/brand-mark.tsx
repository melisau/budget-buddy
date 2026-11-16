/** The BudgetBuddy app icon (public/brand). Decorative: the name is always written next to it. */
export function BrandMark({ size, className }: { size: number; className?: string }) {
  const src = size > 64 ? "/brand/icon-256.png" : size > 24 ? "/brand/icon-128.png" : "/brand/icon-48.png";
  // eslint-disable-next-line @next/next/no-img-element -- a fixed-size static icon; no optimization needed.
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} className={className} style={{ display: "block", flexShrink: 0 }} />;
}
