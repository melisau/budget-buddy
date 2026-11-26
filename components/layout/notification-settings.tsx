"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { LanguageContext } from "@/components/providers/language-provider";
import { Switch } from "@/components/ui/switch";
import { localized } from "@/lib/i18n/localized";

/** Settings row: whether budget and goal notifications are also sent by e-mail. */
export function NotificationSettings() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { available: boolean; emailEnabled: boolean };
      setEnabled(data.emailEnabled);
      setState(data.available ? "ready" : "hidden");
    } catch {
      setState("hidden");
    }
  }, []);

  useEffect(() => { const timeout = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timeout); }, [load]);

  async function change(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailEnabled: next }) });
      if (!response.ok) throw new Error();
    } catch {
      setEnabled(previous);
      toast.error(tr ? "Tercih kaydedilemedi." : localized("Unable to save the preference."));
    } finally {
      setSaving(false);
    }
  }

  if (state === "hidden") return null;
  const title = tr ? "E-posta bildirimleri" : localized("E-mail notifications");
  return (
    <div className="settings-option-row">
      <span className="settings-row-icon" aria-hidden="true"><Mail /></span>
      <span className="settings-option-text"><b id="notify-email-label">{title}</b><small>{tr ? "Bütçe ve hedef hatırlatmaları" : localized("Budget and goal reminders")}</small></span>
      <Switch checked={enabled} disabled={state === "loading" || saving} onCheckedChange={(next) => void change(next)} aria-labelledby="notify-email-label" />
    </div>
  );
}
