"use client";

import { useContext, useState } from "react";
import { Mic, Plus, Send, Sparkles } from "lucide-react";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = readonly ["ai" | "user", string];

function initialMessages(turkish: boolean): Message[] { return [["ai", turkish ? "Merhaba — yetkili finans verilerini inceleyerek nasıl yardımcı olabilirim?" : "Hi — how can I help you understand your authorized financial data?"]]; }

export function AssistantScreen() {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const turkish = language === "tr";
  const [listening, setListening] = useState(false);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(turkish));
  const [isSending, setIsSending] = useState(false);

  const send = async (question = value) => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) return;
    setMessages((current) => [...current, ["user", normalizedQuestion]]); setValue(""); setIsSending(true);
    try { const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: normalizedQuestion, language }) }); const payload = await response.json() as { answer?: string; error?: string }; if (!response.ok || !payload.answer) throw new Error(payload.error); setMessages((current) => [...current, ["ai", payload.answer!]]); } catch (error) { setMessages((current) => [...current, ["ai", error instanceof Error && error.message ? error.message : (turkish ? "Yanıt alınamadı." : "Unable to get an answer.")]]); } finally { setIsSending(false); }
  };

  return <div className="assistant">
    <aside>
      <Button><Plus />{t("New conversation")}</Button>
      <h3>{t("Recent")}</h3>
      {["September overview", "Food budget check", "Saving ₺5,000", "August comparison"].map((label, index) => <button type="button" className={index === 0 ? "active" : ""} key={label}><Sparkles />{t(label)}</button>)}
      <small>{t("AI explains your tracked data. It is not investment advice.")}</small>
    </aside>
    <section>
      <header><i><Sparkles /></i><span><h2>{t("Ask BudgetBuddy")}</h2><p>{t("Your personal finance explainer")}</p></span></header>
      <div className="messages">{messages.map(([role, content], index) => <div className={role} key={`${role}-${index}`}>{role === "ai" && <i><Sparkles /></i>}<p>{content}</p></div>)}</div>
      <div className="prompts">{["Summarize this month", "Where am I overspending?", "Can I save more?", "Compare to last month"].map((label) => <button type="button" onClick={() => send(t(label))} key={label}>{t(label)}</button>)}</div>
      <div className={`chatbox ${listening ? "listening" : ""}`}>
        <button type="button" aria-label={listening ? t("Stop listening") : t("Start listening")} onClick={() => setListening((current) => !current)}><Mic /></button>
        <Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder={listening ? t("Listening…") : t("Ask about your finances…")} />
        <Button aria-label={t("Send message")} size="icon" disabled={isSending} onClick={() => void send()}><Send /></Button>
      </div>
    </section>
  </div>;
}
