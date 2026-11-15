"use client";

import Link from "next/link";
import { useCallback, useContext, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { LanguageContext } from "@/components/providers/language-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { renderNotification } from "@/lib/notifications/messages";
import type { NotificationData, NotificationKind } from "@/lib/notifications/rules";

type Item = { id: string; kind: NotificationKind; data: NotificationData; readAt: string | null; createdAt: string };
type State = { status: "loading" | "ready" | "error" | "unavailable"; items: Item[]; unread: number };

/** Header bell: unread count, the latest notifications, and a link to each one's page. */
export function NotificationBell() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [state, setState] = useState<State>({ status: "loading", items: [], unread: 0 });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { available: boolean; notifications: Item[]; unreadCount: number };
      setState(data.available ? { status: "ready", items: data.notifications, unread: data.unreadCount } : { status: "unavailable", items: [], unread: 0 });
    } catch {
      setState((current) => ({ ...current, status: current.items.length ? "ready" : "error" }));
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void load(), 5 * 60_000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  async function changeOpen(next: boolean) {
    setOpen(next);
    if (!next || state.unread === 0) return;
    // Items keep their highlight for this visit; the badge clears right away.
    setState((current) => ({ ...current, unread: 0 }));
    try {
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    } catch { /* the badge returns on the next refresh */ }
  }

  // The notification table does not exist until migration 0019 is applied.
  if (state.status === "unavailable") return null;
  const label = tr ? "Bildirimler" : "Notifications";

  // A wrapper, not a direct child of the header: the header hides its own direct buttons on phones.
  return (
    <div className="mr-[10px] shrink-0 max-[820px]:mr-0">
    <Popover open={open} onOpenChange={(next) => void changeOpen(next)}>
      <PopoverTrigger asChild>
        <button type="button" className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-[#dfe3ed] bg-white text-[#34415f] hover:text-[#4258d5]" aria-label={state.unread > 0 ? `${label} (${state.unread})` : label}>
          <Bell className="size-5" aria-hidden="true" />
          {state.unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#e0483f] px-1 text-[11px] font-bold leading-5 text-white" aria-hidden="true">{state.unread > 9 ? "9+" : state.unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <p className="border-b px-4 py-3 text-sm font-semibold">{label}</p>
        <div className="max-h-96 overflow-y-auto" aria-live="polite">
          {state.status === "loading" && <p className="px-4 py-6 text-center text-sm text-muted-foreground">{tr ? "Yükleniyor…" : "Loading…"}</p>}
          {state.status === "error" && <div className="px-4 py-6 text-center text-sm"><p>{tr ? "Bildirimler yüklenemedi." : "Unable to load notifications."}</p><button type="button" className="mt-2 font-semibold text-[#4258d5] underline" onClick={() => { setState({ status: "loading", items: [], unread: 0 }); void load(); }}>{tr ? "Tekrar dene" : "Try again"}</button></div>}
          {state.status === "ready" && state.items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">{tr ? "Henüz bildirimin yok. Bütçe, hedef ve aile davetleri burada görünür." : "No notifications yet. Budget, goal and family invitation updates appear here."}</p>}
          {state.status === "ready" && <ul>{state.items.map((item) => {
            const text = renderNotification(item.kind, item.data, language);
            return <li key={item.id} className="border-b last:border-b-0"><Link href={text.href} onClick={() => setOpen(false)} className={`block px-4 py-3 text-sm hover:bg-muted ${item.readAt ? "" : "bg-[#f1f4ff]"}`}><span className="block font-semibold">{text.title}</span><span className="mt-0.5 block text-muted-foreground">{text.body}</span></Link></li>;
          })}</ul>}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}
