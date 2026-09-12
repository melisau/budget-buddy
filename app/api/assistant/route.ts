import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { listTransactionData } from "@/lib/finance/transaction-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type OllamaResponse = { message?: { content?: string } };

function getOllamaConfiguration() {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
  return { baseUrl, model };
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const { question, language } = (await request.json()) as { question?: unknown; language?: unknown };
    if (typeof question !== "string" || question.trim().length < 2 || question.length > 800) {
      throw new AccessError("Enter a valid question.", 404);
    }

    const data = await listTransactionData(user);
    const transactions = data.transactions.slice(0, 100).map((item) => ({
      date: item.transaction_date,
      type: item.type,
      amount: Number(item.amount),
      title: item.title,
      family: Boolean(item.family_group_id),
    }));
    const selectedLanguage = language === "tr" ? "Turkish" : "English";
    const { baseUrl, model } = getOllamaConfiguration();
    const systemPrompt = [
      "You are Budget Buddy's financial activity assistant.",
      "Use only the financial data supplied below. If the data cannot answer the question, say so clearly.",
      "Explain spending patterns plainly. Do not make investment recommendations and do not claim that you performed an action.",
      `Reply in ${selectedLanguage}.`,
      `Financial context: ${JSON.stringify({ currency: "TRY", transactions })}`,
    ].join("\n\n");

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          options: { temperature: 0.2 },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question.trim() },
          ],
        }),
      });
    } catch {
      throw new Error(`Ollama is unavailable. Install Ollama, then run: ollama pull ${model}`);
    }

    const payload = (await response.json().catch(() => ({}))) as OllamaResponse & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? `Ollama request failed with status ${response.status}.`);

    const answer = payload.message?.content?.trim();
    if (!answer) throw new Error("Ollama returned no assistant answer.");

    const { error } = await getSupabaseServerClient().from("ai_sessions").insert({
      user_id: user.id,
      question: question.trim(),
      response: answer,
      context_summary: { transactionCount: transactions.length, language: language === "tr" ? "tr" : "en", provider: "ollama", model },
    });
    if (error) throw new Error(`Unable to save AI history: ${error.message}`);

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[assistant] request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to answer this question." }, { status: 500 });
  }
}
