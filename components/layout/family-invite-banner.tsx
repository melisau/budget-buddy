"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { LanguageContext } from "@/components/providers/language-provider";

type Invitation = { id: string; groupName: string };

/**
 * Points to pending family invitations from every page. A new account lands
 * on the dashboard after confirming its e-mail, so without this the
 * invitation would only show on the Family page.
 */
export function FamilyInviteBanner() {
  const pathname = usePathname();
  const tr = useContext(LanguageContext).language === "tr";
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (pathname === "/family") return;
    let active = true;
    fetch("/api/family/invitations", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { invitations: [] }))
      .then((data: { invitations?: Invitation[] }) => { if (active) setInvitations(data.invitations ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, [pathname]);

  if (pathname === "/family" || invitations.length === 0) return null;
  const name = invitations[0].groupName;
  const text = invitations.length > 1
    ? (tr ? `${invitations.length} aile grubu davetin var.` : `You have ${invitations.length} family group invitations.`)
    : (tr ? `“${name}” aile grubuna davet edildin.` : `You were invited to the family group “${name}”.`);
  return (
    <div className="family-invite-banner" role="status">
      <Users aria-hidden="true" />
      <span>{text}</span>
      <Link href="/family">{tr ? "Daveti gör" : "View invitation"}</Link>
    </div>
  );
}
