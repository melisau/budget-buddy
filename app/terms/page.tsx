"use client";

import Link from "next/link";
import { useContext } from "react";
import { LanguageContext, LanguageSelect } from "@/components/providers/language-provider";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTROLLER_NAME } from "@/lib/legal";

export default function TermsPage() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  return <main className="legal" id="main-content" tabIndex={-1}>
    <header><Link href="/">BudgetBuddy</Link><LanguageSelect /></header>
    <h1>{tr ? "Kullanım Koşulları" : "Terms of Use"}</h1>
    <p>{tr ? "Budget Buddy kişisel finans kayıtlarını düzenlemeye yardımcı olur; yatırım, kredi veya hukuki tavsiye vermez." : "Budget Buddy helps organize personal finance records. It does not provide investment, credit, or legal advice."}</p>
    <h2>{tr ? "Kullanım" : "Use"}</h2>
    <p>{tr ? "Hesabınızın güvenliğinden ve girdiğiniz verilerin doğruluğundan siz sorumlusunuz. Aile grubunda paylaşılan işlemler kabul edilmiş grup üyeleri tarafından görüntülenebilir." : "You are responsible for account security and the accuracy of the data you enter. Transactions shared with a family group can be viewed by accepted group members."}</p>
    <h2>{tr ? "Hizmet" : "Service"}</h2>
    <p>{tr ? "Özellikler ve ücretsiz kullanım kotaları zaman içinde değişebilir. Ücretli bir plan etkinleştirilmeden önce fiyat ve kapsam gösterilir." : "Features and free usage quotas may change over time. Pricing and scope are shown before a paid plan is activated."}</p>
    <h2>{tr ? "Hesabın sona erdirilmesi" : "Account termination"}</h2>
    <p>{tr ? "Hesabınızı Ayarlar bölümünden silebilirsiniz. Kötüye kullanım veya hizmet güvenliğini tehdit eden davranışlar erişimin kısıtlanmasına neden olabilir." : "You may delete your account from Settings. Abuse or activity that threatens service security may result in restricted access."}</p>
    <h2>{tr ? "AI asistanı" : "AI assistant"}</h2>
    <p>{tr ? "AI asistanının yanıtları kayıtlarınızın otomatik bir özetidir ve hatalı olabilir. Finansal kararlarınızı vermeden önce kendi kayıtlarınızı kontrol edin." : "AI assistant answers are an automated summary of your records and may contain mistakes. Check your own records before making financial decisions."}</p>
    <h2>{tr ? "İletişim" : "Contact"}</h2>
    <p>{tr ? `Budget Buddy ${LEGAL_CONTROLLER_NAME} tarafından işletilir. Sorularınız için: ${LEGAL_CONTACT_EMAIL}. Kişisel verilerin işlenmesi ` : `Budget Buddy is operated by ${LEGAL_CONTROLLER_NAME}. Questions: ${LEGAL_CONTACT_EMAIL}. How personal data is processed is described in the `}<Link href="/privacy">{tr ? "Gizlilik Politikası ve KVKK Aydınlatma Metni" : "Privacy Policy and KVKK Notice"}</Link>{tr ? "'nde açıklanmıştır." : "."}</p>
  </main>;
}
