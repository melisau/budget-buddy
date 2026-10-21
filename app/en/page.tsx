import type { Metadata } from "next";
import { LandingPage } from "@/components/budgetbuddy/landing-page";
import { landingMetadata, landingStructuredData } from "@/lib/seo/landing-metadata";

const LANGUAGE = "en";

export const metadata: Metadata = landingMetadata(LANGUAGE);

export default function Page() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(landingStructuredData(LANGUAGE)).replace(/</g, "\\u003c") }} />
    <LandingPage language={LANGUAGE} />
  </>;
}
