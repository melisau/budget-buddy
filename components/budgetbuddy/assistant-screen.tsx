"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Mic, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { LanguageContext, useT } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/transactions/transaction-form";

type Message = readonly ["ai" | "user", string];
type AssistantSession = { id: string; conversation_id: string; question: string; response: string; created_at: string };
type VoiceTransactionDraft = { type: "expense" | "income"; amount: number; title: string; date: string };

type SpeechRecognitionResultEvent = Event & {
  results: { isFinal: boolean; 0: { transcript: string } }[];
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function initialMessages(turkish: boolean): Message[] { return [["ai", turkish ? "Merhaba — yetkili finans verilerini inceleyerek nasıl yardımcı olabilirim?" : "Hi — how can I help you understand your authorized financial data?"]]; }

function conversationMessages(sessions: AssistantSession[], id: string): Message[] {
  return sessions.filter((item) => item.conversation_id === id)
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .flatMap((item) => [["user", item.question] as Message, ["ai", item.response] as Message]);
}

function transactionDraftFromSpeech(transcript: string, turkish: boolean): VoiceTransactionDraft | null {
  const normalized = transcript.toLocaleLowerCase(turkish ? "tr-TR" : "en-US");
  const draftIntent = turkish
    ? /işlem taslağı|harcama ekle|gider ekle|gelir ekle/.test(normalized)
    : /transaction draft|add expense|add income/.test(normalized);
  if (!draftIntent) return null;

  const amountMatch = normalized.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:₺|tl|try|lira|eur|euro|usd|dolar)?/);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const title = transcript
    .replace(turkish ? /işlem taslağı|harcama ekle|gider ekle|gelir ekle/gi : /transaction draft|add expense|add income/gi, "")
    .replace(amountMatch[0], "")
    .replace(/\b(₺|tl|try|lira|eur|euro|usd|dolar)\b/gi, "")
    .trim() || (turkish ? "Sesli işlem" : "Voice transaction");

  return { type: turkish && /gelir/.test(normalized) || !turkish && /income/.test(normalized) ? "income" : "expense", amount, title, date: new Date().toISOString().slice(0, 10) };
}

export function AssistantScreen() {
  const t = useT();
  const { language } = useContext(LanguageContext);
  const turkish = language === "tr";
  const [listening, setListening] = useState(false);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(turkish));
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [historyVisible, setHistoryVisible] = useState(true);
  const [voiceDraft, setVoiceDraft] = useState<VoiceTransactionDraft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, isSending]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  useEffect(() => {
    setHistoryVisible(window.localStorage.getItem("budgetbuddy:show-ai-history") !== "false");
    void fetch("/api/assistant")
      .then(async (response) => response.ok ? response.json() as Promise<{ sessions?: AssistantSession[] }> : { sessions: [] })
      .then((payload) => {
        const loaded = payload.sessions ?? [];
        setSessions(loaded);
        const savedId = window.localStorage.getItem("budgetbuddy:active-ai-conversation");
        const activeId = savedId && loaded.some((item) => item.conversation_id === savedId) ? savedId : loaded[0]?.conversation_id;
        if (activeId) {
          setConversationId(activeId);
          setMessages(conversationMessages(loaded, activeId));
        } else {
          const nextId = crypto.randomUUID();
          setConversationId(nextId);
          window.localStorage.setItem("budgetbuddy:active-ai-conversation", nextId);
        }
      })
      .catch(() => setSessions([]));
  }, []);

  const setHistoryVisibility = (visible: boolean) => {
    setHistoryVisible(visible);
    window.localStorage.setItem("budgetbuddy:show-ai-history", String(visible));
  };

  const startConversation = () => {
    const nextId = crypto.randomUUID();
    setConversationId(nextId);
    setMessages(initialMessages(turkish));
    setValue("");
    window.localStorage.setItem("budgetbuddy:active-ai-conversation", nextId);
  };

  const openConversation = (id: string) => {
    setConversationId(id);
    setMessages(conversationMessages(sessions, id));
    window.localStorage.setItem("budgetbuddy:active-ai-conversation", id);
  };

  const deleteConversation = async (id: string) => {
    const response = await fetch(`/api/assistant?conversationId=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return;
    const remaining = sessions.filter((item) => item.conversation_id !== id);
    setSessions(remaining);
    if (conversationId === id) {
      const nextId = remaining[0]?.conversation_id;
      if (nextId) {
        setConversationId(nextId);
        setMessages(conversationMessages(remaining, nextId));
        window.localStorage.setItem("budgetbuddy:active-ai-conversation", nextId);
      } else startConversation();
    }
  };

  const send = async (question = value) => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) return;
    const activeId = conversationId || crypto.randomUUID();
    if (!conversationId) { setConversationId(activeId); window.localStorage.setItem("budgetbuddy:active-ai-conversation", activeId); }
    setMessages((current) => [...current, ["user", normalizedQuestion]]); setValue(""); setIsSending(true);
    try { const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: normalizedQuestion, language, conversationId: activeId }) }); const payload = await response.json() as { answer?: string; error?: string; session?: AssistantSession }; if (!response.ok || !payload.answer) throw new Error(payload.error); setMessages((current) => [...current, ["ai", payload.answer!]]); if (payload.session) setSessions((current) => [payload.session!, ...current]); } catch (error) { setMessages((current) => [...current, ["ai", error instanceof Error && error.message ? error.message : (turkish ? "Yanıt alınamadı." : "Unable to get an answer.")]]); } finally { setIsSending(false); }
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessages((current) => [...current, ["ai", turkish ? "Bu tarayıcı konuşmayı metne çevirme özelliğini desteklemiyor. Chrome veya Safari kullanmayı dene." : "This browser does not support speech-to-text. Try Chrome or Safari."]]);
      return;
    }

    const recognition = new Recognition();
    let finalTranscript = "";
    recognition.lang = turkish ? "tr-TR" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ").trim();
      setValue(transcript);
      if (Array.from(event.results).some((result) => result.isFinal)) finalTranscript = transcript;
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "aborted") {
        setMessages((current) => [...current, ["ai", turkish ? "Mikrofona erişilemedi. Tarayıcı ayarlarından mikrofon iznini kontrol et." : "The microphone could not be accessed. Check the browser microphone permission."]]);
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!finalTranscript) return;
      const draft = transactionDraftFromSpeech(finalTranscript, turkish);
      if (draft) {
        setVoiceDraft(draft);
      } else {
        void send(finalTranscript);
      }
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return <div className="assistant">
    <aside>
      <Button onClick={startConversation}><Plus />{t("New conversation")}</Button>
      <div className="assistant-history-head"><h3>{t("Recent")}</h3><button type="button" aria-label={historyVisible ? (turkish ? "Konuşma geçmişini gizle" : "Hide conversation history") : (turkish ? "Konuşma geçmişini göster" : "Show conversation history")} onClick={() => setHistoryVisibility(!historyVisible)}>{historyVisible ? <EyeOff /> : <Eye />}</button></div>
      {historyVisible && [...new Map([...sessions].reverse().map((session) => [session.conversation_id, session])).values()].reverse().slice(0, 5).map((session) => <div className={`assistant-history-item ${conversationId === session.conversation_id ? "active" : ""}`} key={session.conversation_id}><button type="button" onClick={() => openConversation(session.conversation_id)}><Sparkles />{session.question}</button><button type="button" aria-label={turkish ? "Sohbeti sil" : "Delete conversation"} onClick={() => void deleteConversation(session.conversation_id)}><Trash2 /></button></div>)}
      {historyVisible && sessions.length === 0 && <p className="assistant-history-empty">{turkish ? "Henüz konuşma yok." : "No conversations yet."}</p>}
      <small>{t("AI explains your tracked data. It is not investment advice.")}</small>
    </aside>
    <section>
      <header><i><Sparkles /></i><span><h2>{t("Ask BudgetBuddy")}</h2><p>{t("Your personal finance explainer")}</p></span></header>
      <div className="messages" ref={messageListRef}>{messages.map(([role, content], index) => <div className={role} key={`${role}-${index}`}>{role === "ai" && <i><Sparkles /></i>}<p>{content}</p></div>)}</div>
      <div className="prompts">{["Summarize this month", "Where am I overspending?", "Can I save more?", "Compare to last month"].map((label) => <button type="button" onClick={() => send(t(label))} key={label}>{t(label)}</button>)}</div>
      <div className={`chatbox ${listening ? "listening" : ""}`}>
        <button type="button" aria-label={listening ? t("Stop listening") : t("Start listening")} onClick={toggleListening}><Mic /></button>
        <Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder={listening ? t("Listening…") : t("Ask about your finances…")} />
        <Button aria-label={t("Send message")} size="icon" disabled={isSending} onClick={() => void send()}><Send /></Button>
      </div>
      <Dialog open={Boolean(voiceDraft)} onOpenChange={(open) => { if (!open) setVoiceDraft(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{turkish ? "Sesli işlem taslağı" : "Voice transaction draft"}</DialogTitle><DialogDescription>{turkish ? "Taslak henüz kaydedilmedi. Hesap ve kategoriyi seçip işlemi açıkça onaylayın." : "This draft has not been saved. Choose an account and category, then explicitly confirm the transaction."}</DialogDescription></DialogHeader>
          {voiceDraft && <TransactionForm initialDraft={voiceDraft} onSuccess={() => setVoiceDraft(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  </div>;
}
