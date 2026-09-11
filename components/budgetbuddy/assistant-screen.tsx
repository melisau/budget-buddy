"use client";

import { useContext, useState } from "react";
import { Mic, Plus, Send, Sparkles } from "lucide-react";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = readonly ["ai" | "user", string];

function initialMessages(turkish: boolean): Message[] {
  return turkish
    ? [["ai", "Merhaba Melisa — finansınla ilgili neyi anlamak istersin?"], ["user", "Bu ay en çok neye para harcadım?"], ["ai", "Bu ay en büyük harcama kategorin Konut: ₺7.400. Toplam giderinin yaklaşık %40'ı. Yemek ₺3.250 ile ikinci sırada."]]
    : [["ai", "Hi Melisa — what would you like to understand about your money?"], ["user", "What did I spend the most on this month?"], ["ai", "Housing is your largest category this month at ₺7,400, about 40% of total spending. Food & Dining is second at ₺3,250."]];
}

export function AssistantScreen() {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const turkish = language === "tr";
  const [listening, setListening] = useState(false);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(turkish));

  const send = (question = value) => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) return;
    const answer = turkish
      ? "Eylül verilerine göre yemek ve eğlence harcamalarında küçük bir azaltma, ₺5.000 tasarruf hedefine yaklaşmana yardımcı olur. Bu bir bütçeleme değerlendirmesidir; yatırım tavsiyesi değildir."
      : "Based on September data, a small reduction in dining and entertainment would help you reach your ₺5,000 savings goal. This is budgeting guidance, not investment advice.";
    setMessages((current) => [...current, ["user", normalizedQuestion], ["ai", answer]]);
    setValue("");
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
        <Button aria-label={t("Send message")} size="icon" onClick={() => send()}><Send /></Button>
      </div>
    </section>
  </div>;
}
