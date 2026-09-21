import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { listTransactionData } from "@/lib/finance/transaction-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};
type ExchangeRateResponse = { rate?: number; date?: string };

function getGroqConfiguration() {
  return {
    apiKey: process.env.GROQ_API_KEY?.trim(),
    model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
  };
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const { data, error } = await getSupabaseServerClient()
      .from("ai_sessions")
      .select("id, conversation_id, question, response, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(`Unable to load AI history: ${error.message}`);
    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[assistant] history failed", error);
    return NextResponse.json({ error: "Unable to load AI history." }, { status: 500 });
  }
}

function requestsCurrentEurTryRate(question: string) {
  const normalized = question.toLocaleLowerCase("tr-TR");
  const mentionsEuro = /\b(euro|eur)\b/.test(normalized);
  const asksForCurrentValue = /güncel|bugün|şu an|şuan|kaç|kur/.test(normalized);
  return mentionsEuro && asksForCurrentValue;
}

async function getCurrentEurTryAnswer(language: "tr" | "en") {
  let response: Response;
  try {
    response = await fetch("https://api.frankfurter.dev/v2/rate/eur/try", {
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 3_600 },
    });
  } catch {
    throw new Error(language === "tr" ? "Güncel EUR/TRY kuru şu anda alınamıyor. Lütfen biraz sonra tekrar dene." : "The current EUR/TRY rate is unavailable. Please try again shortly.");
  }

  const rate = (await response.json().catch(() => ({}))) as ExchangeRateResponse;
  if (!response.ok || typeof rate.rate !== "number" || !rate.date) {
    throw new Error(language === "tr" ? "Güncel EUR/TRY kuru şu anda alınamıyor. Lütfen biraz sonra tekrar dene." : "The current EUR/TRY rate is unavailable. Please try again shortly.");
  }

  const formattedRate = new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(rate.rate);
  return language === "tr"
    ? `1 EUR = ${formattedRate} TRY. Kur tarihi: ${rate.date}. Bu bir referans kurdur; banka alış ve satış fiyatları farklı olabilir.`
    : `1 EUR = ${formattedRate} TRY. Rate date: ${rate.date}. This is a reference rate; bank buy and sell prices can differ.`;
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const limit = checkRateLimit(`assistant:${user.id}`, 12, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many assistant requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const { question, language, conversationId } = (await request.json()) as { question?: unknown; language?: unknown; conversationId?: unknown };
    if (typeof question !== "string" || question.trim().length < 2 || question.length > 800) {
      throw new AccessError("Enter a valid question.", 404);
    }

    const selectedLanguage = language === "tr" ? "tr" : "en";
    if (requestsCurrentEurTryRate(question)) {
      const answer = await getCurrentEurTryAnswer(selectedLanguage);
      const { data: session, error } = await getSupabaseServerClient().from("ai_sessions").insert({
        user_id: user.id, conversation_id: typeof conversationId === "string" ? conversationId : crypto.randomUUID(), question: question.trim(), response: answer,
        context_summary: { language: selectedLanguage, provider: "frankfurter", currencyPair: "EUR/TRY" },
      }).select("id, conversation_id, question, response, created_at").single();
      if (error) throw new Error(`Unable to save AI history: ${error.message}`);
      return NextResponse.json({ answer, session });
    }

    const data = await listTransactionData(user);
    const transactions = data.transactions.slice(0, 100).map((item) => ({
      date: item.transaction_date,
      type: item.type,
      amount: Number(item.amount),
      title: item.title,
      family: Boolean(item.family_group_id),
    }));
    const selectedLanguageName = selectedLanguage === "tr" ? "Turkish" : "English";
    const { apiKey, model } = getGroqConfiguration();
    if (!apiKey) {
      return NextResponse.json({
        error: selectedLanguage === "tr"
          ? "AI Asistanı için Groq API anahtarı henüz yapılandırılmadı."
          : "The AI Assistant is not configured for this live deployment yet.",
      }, { status: 503 });
    }
    const systemPrompt = [
      "You are Budget Buddy's financial activity assistant.",
      "Use only the financial data supplied below. If the data cannot answer the question, say so clearly.",
      "Explain spending patterns plainly. Do not make investment recommendations and do not claim that you performed an action.",
      `Reply in ${selectedLanguageName}.`,
      `Financial context: ${JSON.stringify({ currency: "TRY", transactions })}`,
    ].join("\n\n");

    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_completion_tokens: 700,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question.trim() },
          ],
        }),
      });
    } catch {
      throw new Error(selectedLanguage === "tr" ? "Groq servisine şu anda ulaşılamıyor. Lütfen biraz sonra tekrar dene." : "Groq is currently unavailable. Please try again shortly.");
    }

    const payload = (await response.json().catch(() => ({}))) as GroqResponse;
    if (!response.ok) throw new Error(payload.error?.message ?? `Groq request failed with status ${response.status}.`);

    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Groq returned no assistant answer.");

    const { data: session, error } = await getSupabaseServerClient().from("ai_sessions").insert({
      user_id: user.id, conversation_id: typeof conversationId === "string" ? conversationId : crypto.randomUUID(),
      question: question.trim(),
      response: answer,
      context_summary: { transactionCount: transactions.length, language: selectedLanguage, provider: "groq", model },
    }).select("id, conversation_id, question, response, created_at").single();
    if (error) throw new Error(`Unable to save AI history: ${error.message}`);

    return NextResponse.json({ answer, session });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[assistant] request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to answer this question." }, { status: 500 });
  }
}
