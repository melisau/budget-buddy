import { ImageResponse } from "next/og";
import { WalletMark } from "@/components/seo/wallet-mark";
import { BRAND_COLOR } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

const COPY = {
  tr: { headline: "Karmaşık tablolar olmadan paranın kontrolünü eline al.", features: "Bütçe · Birikim hedefleri · Aile bütçesi · Yapay zekâ", badges: ["Lansmanda ücretsiz", "Türkçe & English"] },
  en: { headline: "Take control of your money without complicated spreadsheets.", features: "Budgets · Savings goals · Family finances · AI insights", badges: ["Free during launch", "Türkçe & English"] },
} as const;

export function renderOpenGraphImage(language: "tr" | "en") {
  const copy = COPY[language];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "linear-gradient(135deg, #f6f7fb 0%, #e9ecff 100%)", color: "#17213c", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 84, height: 84, borderRadius: 22, background: BRAND_COLOR }}>
            <WalletMark size={52} />
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>
            <span>Budget</span><span style={{ color: BRAND_COLOR }}>Buddy</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>{copy.headline}</div>
          <div style={{ fontSize: 30, color: "#59637a" }}>{copy.features}</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {copy.badges.map((label) => (
            <div key={label} style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "#fff", border: "2px solid #d8ddff", fontSize: 26, fontWeight: 700, color: BRAND_COLOR }}>{label}</div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
