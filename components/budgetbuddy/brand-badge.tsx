import { brandFor } from "@/lib/finance/recurring";
import { BRAND_ICON_PATHS } from "@/lib/finance/brand-icons";

/**
 * The service's own mark in its brand color (Simple Icons, CC0), or a round
 * badge with a short mark when no icon is available. Nothing for other names.
 */
export function BrandBadge({ name, size = 20 }: { name: string; size?: number }) {
  const brand = brandFor(name);
  if (!brand) return null;
  const path = BRAND_ICON_PATHS[brand.name];
  if (path) return <svg className="brand-icon" role="img" aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill={brand.color}><path d={path} /></svg>;
  return <span className="brand-badge" aria-hidden="true" style={{ background: brand.color, width: size, height: size, fontSize: Math.round(size * (brand.mark.length > 1 ? 0.42 : 0.55)) }}>{brand.mark}</span>;
}
