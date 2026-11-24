import { brandFor } from "@/lib/finance/recurring";

/**
 * A round badge in a subscription's brand color with a short mark (not the
 * brand's logo). Renders nothing for names that are not a known preset.
 */
export function BrandBadge({ name, size = 20 }: { name: string; size?: number }) {
  const brand = brandFor(name);
  if (!brand) return null;
  return <span className="brand-badge" aria-hidden="true" style={{ background: brand.color, width: size, height: size, fontSize: Math.round(size * (brand.mark.length > 1 ? 0.42 : 0.55)) }}>{brand.mark}</span>;
}
