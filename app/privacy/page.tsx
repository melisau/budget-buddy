"use client";

import Link from "next/link";
import { useContext } from "react";
import { LanguageContext, LanguageSelect } from "@/components/providers/language-provider";

export default function PrivacyPage() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  return <main className="legal" id="main-content" tabIndex={-1}>
    <header><Link href="/">BudgetBuddy</Link><LanguageSelect /></header>
    <h1>{tr ? "Gizlilik Politikası" : "Privacy Policy"}</h1>
    <p>{tr ? "Budget Buddy; hesap, işlem, hedef ve aile verilerini uygulama hizmetini sağlamak için işler. Veriler yalnızca yetkili kullanıcılar ve kabul edilmiş aile üyeleriyle paylaşılır." : "Budget Buddy processes account, transaction, goal, and family data to provide the application. Data is shared only with authorized users and accepted family members."}</p>
    <h2>{tr ? "Verileriniz" : "Your data"}</h2>
    <p>{tr ? "Ayarlar bölümünden kişisel işlem verilerinizi CSV olarak dışa aktarabilirsiniz. Hesabı sil seçeneği uygulama verilerinizi ve oturum hesabınızı kalıcı olarak siler." : "You can export your personal transaction data as CSV from Settings. Delete account permanently removes your application data and sign-in account."}</p>
    <h2>{tr ? "Güvenlik" : "Security"}</h2>
    <p>{tr ? "Fiş görselleri özel depolamada tutulur ve yalnızca kısa süreli güvenli bağlantılarla gösterilir. AI asistanı yalnızca soruyu yanıtlamak için gerekli yetkili finans özetiyle çalışır." : "Receipt images are kept in private storage and displayed through short-lived secure links. The AI assistant receives only the authorized financial summary needed to answer a question."}</p>
    <h2>{tr ? "Hizmet sağlayıcıları" : "Service providers"}</h2>
    <p>{tr ? "Kimlik doğrulama için Supabase Auth, veri saklama için Supabase ve AI yanıtları için Groq kullanılır. Bu hizmetler yalnızca kendi görevleri için gerekli verileri işler." : "Supabase provides authentication and stores application data, and Groq generates AI responses. Each service processes only the data needed for its role."}</p>
  </main>;
}
