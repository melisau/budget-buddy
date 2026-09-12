import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { listTransactionData } from "@/lib/finance/transaction-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function answerFromVapi(payload: unknown) {
  const output = (payload as { output?: { content?: { text?: string; type?: string }[] }[] }).output ?? [];
  return output.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text" && item.text)?.text;
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const { question, language } = await request.json() as { question?: unknown; language?: unknown };
    if (typeof question !== "string" || question.trim().length < 2 || question.length > 800) throw new AccessError("Enter a valid question.", 404);
    const data = await listTransactionData(user);
    const transactions = data.transactions.slice(0, 100).map((item) => ({ date: item.transaction_date, type: item.type, amount: Number(item.amount), title: item.title, family: Boolean(item.family_group_id) }));
    const context = { currency: "TRY", transactions, instruction: "Use only this financial data. Explain patterns plainly, do not make investment recommendations, and do not claim actions were performed." };
    const key = process.env.VAPI_PRIVATE_API_KEY; const assistantId = process.env.VAPI_ASSISTANT_ID;
    if (!key || !assistantId) throw new Error("Vapi configuration is unavailable.");
    const response = await fetch("https://api.vapi.ai/chat/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ assistantId, input: `Financial context: ${JSON.stringify(context)}\n\nUser question (${language === "tr" ? "Turkish" : "English"}): ${question.trim()}` }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Vapi request failed: ${(payload as { message?: string }).message ?? response.status}`);
    const answer = answerFromVapi(payload);
    if (!answer) throw new Error("Vapi returned no assistant answer.");
    const { error } = await getSupabaseServerClient().from("ai_sessions").insert({ user_id: user.id, question: question.trim(), response: answer, context_summary: { transactionCount: transactions.length, language: language === "tr" ? "tr" : "en" } });
    if (error) throw new Error(`Unable to save AI history: ${error.message}`);
    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[assistant] request failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to answer this question." }, { status: 500 });
  }
}
