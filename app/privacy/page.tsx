"use client";

import Link from "next/link";
import { useContext } from "react";
import { LanguageContext, LanguageSelect } from "@/components/providers/language-provider";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTROLLER_NAME, LEGAL_LAST_UPDATED } from "@/lib/legal";

type Section = { title: string; paragraphs?: string[]; items?: string[]; note?: string };

const tr: Section[] = [
  {
    title: "1. Veri sorumlusu",
    paragraphs: [
      `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu ${LEGAL_CONTROLLER_NAME}'dır. Budget Buddy bireysel olarak geliştirilen ve işletilen bir uygulamadır.`,
      `Kişisel verilerinizle ilgili tüm talepleriniz için ${LEGAL_CONTACT_EMAIL} adresine yazabilirsiniz.`,
    ],
  },
  {
    title: "2. İşlenen kişisel veriler",
    items: [
      "Kimlik ve iletişim: ad, e-posta adresi, profil fotoğrafı (giriş yönteminize göre).",
      "Hesap tercihleri: dil ve para birimi.",
      "Finansal kayıtlar: sizin girdiğiniz hesaplar, gelir ve gider işlemleri, kategoriler, bütçeler, birikim hedefleri ve CSV ile aktardığınız veriler.",
      "Fiş görselleri: işlemlere eklediğiniz JPG, PNG veya WEBP dosyaları.",
      "Aile grubu verileri: üyesi olduğunuz gruplar, roller, davetler, grupla paylaştığınız işlemler ve hedefler, harçlık planları, ortak alışveriş listeleri ve dilek listeleri.",
      "AI asistanı: sorduğunuz sorular, verilen yanıtlar ve sohbet geçmişi.",
      "Teknik veriler: oturum bilgileri, uygulama hata kayıtları (hata mesajı, sayfa yolu, tarayıcı bilgisi) ve kötüye kullanımı önlemek için IP adresi.",
    ],
    note: "Budget Buddy banka hesaplarınıza bağlanmaz, kart veya banka hesap numarası istemez ve para transferi yapamaz. Lütfen işlem açıklamalarına bu tür bilgileri yazmayın.",
  },
  {
    title: "3. İşleme amaçları ve hukuki sebepler",
    items: [
      "Hesabınızı oluşturmak, oturumunuzu yönetmek ve uygulamanın özelliklerini sunmak: sözleşmenin kurulması ve ifası (KVKK m. 5/2-c).",
      "Aile grubunda paylaştığınız verileri grup üyelerine göstermek: sözleşmenin ifası ve sizin paylaşım tercihiniz (m. 5/2-c).",
      "Güvenlik, hata tespiti, kötüye kullanımın ve aşırı isteklerin önlenmesi: meşru menfaat (m. 5/2-f).",
      "Yasal yükümlülüklerin yerine getirilmesi ve olası hukuki uyuşmazlıklar: m. 5/2-ç ve m. 5/2-e.",
    ],
  },
  {
    title: "4. Verilerin aktarıldığı hizmet sağlayıcılar",
    paragraphs: [
      "Uygulama aşağıdaki hizmet sağlayıcılarla çalışır; her biri yalnızca kendi görevi için gerekli veriyi işler. Bu sağlayıcıların sunucuları Türkiye dışında (ABD ve/veya Avrupa Birliği) bulunduğundan verileriniz yurt dışına aktarılır. Aktarımlar KVKK m. 9'da öngörülen güvencelere dayanır ve hizmetin sunulması için zorunludur.",
    ],
    items: [
      "Supabase: hesap oluşturma, giriş ve oturum yönetimi; veritabanı ve fiş görsellerinin saklandığı özel depolama.",
      "E-posta gönderim hizmeti (Resend): hesap doğrulama ve şifre sıfırlama e-postalarının iletilmesi. Yalnızca e-posta adresiniz ve ilgili bağlantı gönderilir.",
      "Vercel: uygulamanın barındırılması.",
      "Groq: AI asistanının yanıt üretmesi. Yalnızca sorunuz ve sorunun yanıtlanması için gereken özet finans bilgisi gönderilir.",
      "Sentry: hata izleme. Yalnızca uygulama içi kullanıcı numaranız gönderilir; adınız ve e-postanız gönderilmez.",
    ],
  },
  {
    title: "5. Saklama süresi",
    paragraphs: [
      "Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı Ayarlar bölümünden sildiğinizde giriş hesabınız, kişisel finans kayıtlarınız, sahibi olduğunuz aile grupları ve fiş görselleriniz silinir. Başka üyelerin oluşturduğu aile grubu işlemleri o üyelerin kaydı olarak kalır.",
      "Hata kayıtları ve sistem günlükleri güvenlik ve hata giderme amacıyla sınırlı bir süre tutulur. Yasal bir saklama yükümlülüğü bulunan veriler ilgili süre boyunca saklanır.",
    ],
  },
  {
    title: "6. Güvenlik",
    paragraphs: [
      "Veritabanına tarayıcıdan doğrudan erişim kapalıdır; tüm istekler sunucuda kimliğiniz ve yetkiniz doğrulandıktan sonra işlenir. Fiş görselleri özel depolamada tutulur ve yalnızca 60 saniye geçerli bağlantılarla gösterilir. Tüm bağlantılar şifrelidir (HTTPS).",
    ],
  },
  {
    title: "7. Çerezler",
    paragraphs: [
      "Yalnızca oturumunuzu sürdürmek ve dil tercihinizi hatırlamak için zorunlu çerezler ve tarayıcı depolaması kullanılır. Reklam veya izleme çerezi kullanılmaz.",
    ],
  },
  {
    title: "8. KVKK kapsamındaki haklarınız",
    paragraphs: ["KVKK m. 11 uyarınca veri sorumlusuna başvurarak şunları talep edebilirsiniz:"],
    items: [
      "Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme,",
      "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,",
      "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,",
      "Eksik veya yanlış işlenmişse düzeltilmesini isteme,",
      "Silinmesini veya yok edilmesini isteme,",
      "Düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,",
      "Yalnızca otomatik sistemlerle yapılan analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme,",
      "Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme.",
    ],
  },
  {
    title: "9. Başvuru",
    paragraphs: [
      `Taleplerinizi kayıtlı e-posta adresinizden ${LEGAL_CONTACT_EMAIL} adresine iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak yanıtlanır. İşlem verilerinizi Ayarlar bölümünden CSV olarak dışa aktarabilir, hesabınızı da aynı bölümden silebilirsiniz.`,
      "Başvurunuzun sonucundan memnun kalmazsanız Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsiniz.",
    ],
  },
];

const en: Section[] = [
  {
    title: "1. Data controller",
    paragraphs: [
      `Under the Turkish Personal Data Protection Law No. 6698 ("KVKK"), the data controller is ${LEGAL_CONTROLLER_NAME}. Budget Buddy is developed and operated by an individual.`,
      `For any request about your personal data, write to ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "2. Personal data we process",
    items: [
      "Identity and contact: name, email address, profile photo (depending on how you sign in).",
      "Account preferences: language and currency.",
      "Financial records you enter: accounts, income and expense transactions, categories, budgets, savings goals and CSV imports.",
      "Receipt images: JPG, PNG or WEBP files you attach to transactions.",
      "Family group data: groups you belong to, roles, invitations, transactions and goals you share with a group, allowance plans, shared shopping lists and wishlists.",
      "AI assistant: your questions, the answers and conversation history.",
      "Technical data: session information, application error reports (error message, page path, browser details) and IP address for abuse prevention.",
    ],
    note: "Budget Buddy does not connect to your bank, never asks for card or bank account numbers and cannot move money. Please do not put such details in transaction descriptions.",
  },
  {
    title: "3. Purposes and legal grounds",
    items: [
      "Creating your account, managing your session and providing the app's features: performance of a contract (KVKK Art. 5/2-c).",
      "Showing data you share with a family group to its members: performance of a contract and your sharing choice (Art. 5/2-c).",
      "Security, error detection and preventing abuse or excessive requests: legitimate interest (Art. 5/2-f).",
      "Complying with legal obligations and handling legal claims: Art. 5/2-ç and Art. 5/2-e.",
    ],
  },
  {
    title: "4. Service providers and transfers abroad",
    paragraphs: [
      "The app relies on the providers below, each processing only what its role requires. Their servers are located outside Türkiye (the United States and/or the European Union), so your data is transferred abroad. Transfers rely on the safeguards set out in KVKK Art. 9 and are necessary to provide the service.",
    ],
    items: [
      "Supabase: sign-up, sign-in and session management; database and private storage for receipt images.",
      "Email delivery (Resend): sending account verification and password reset emails. Only your email address and the relevant link are sent.",
      "Vercel: application hosting.",
      "Groq: generating AI assistant answers. Only your question and the summary financial data needed to answer it are sent.",
      "Sentry: error monitoring. Only your internal user ID is sent, never your name or email.",
    ],
  },
  {
    title: "5. Retention",
    paragraphs: [
      "Your data is kept while your account is open. When you delete your account from Settings, your sign-in account, personal financial records, family groups you own and your receipt images are deleted. Family transactions created by other members remain as their records.",
      "Error reports and system logs are kept for a limited time for security and troubleshooting. Data subject to a legal retention obligation is kept for the required period.",
    ],
  },
  {
    title: "6. Security",
    paragraphs: [
      "The database cannot be accessed directly from the browser; every request is processed on the server after your identity and permissions are verified. Receipt images are kept in private storage and shown only through links valid for 60 seconds. All connections are encrypted (HTTPS).",
    ],
  },
  {
    title: "7. Cookies",
    paragraphs: [
      "Only essential cookies and browser storage are used, to keep you signed in and remember your language. No advertising or tracking cookies are used.",
    ],
  },
  {
    title: "8. Your rights under KVKK",
    paragraphs: ["Under KVKK Art. 11 you may ask the data controller to:"],
    items: [
      "Confirm whether your personal data is processed and request information about it,",
      "Tell you the purpose of processing and whether it is used accordingly,",
      "Name the third parties in Türkiye or abroad it is transferred to,",
      "Correct incomplete or inaccurate data,",
      "Delete or destroy your data,",
      "Notify corrections and deletions to the third parties it was transferred to,",
      "Reconsider an outcome against you that results solely from automated analysis,",
      "Compensate damage caused by unlawful processing.",
    ],
  },
  {
    title: "9. How to apply",
    paragraphs: [
      `Send your request from your registered email address to ${LEGAL_CONTACT_EMAIL}. Requests are answered free of charge within 30 days. You can export your transactions as CSV and delete your account from Settings at any time.`,
      "If you are not satisfied with the response, you may file a complaint with the Turkish Personal Data Protection Board.",
    ],
  },
];

export default function PrivacyPage() {
  const { language } = useContext(LanguageContext);
  const isTr = language === "tr";
  const sections = isTr ? tr : en;
  return <main className="legal" id="main-content" tabIndex={-1}>
    <header><Link href="/">BudgetBuddy</Link><LanguageSelect /></header>
    <h1>{isTr ? "Gizlilik Politikası ve KVKK Aydınlatma Metni" : "Privacy Policy and KVKK Notice"}</h1>
    <p className="legal-updated">{isTr ? `Son güncelleme: ${LEGAL_LAST_UPDATED.tr}` : `Last updated: ${LEGAL_LAST_UPDATED.en}`}</p>
    {sections.map((section) => <section key={section.title}>
      <h2>{section.title}</h2>
      {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
      {section.note && <p>{section.note}</p>}
    </section>)}
    <p><Link href="/terms">{isTr ? "Kullanım Koşulları" : "Terms of Use"}</Link></p>
  </main>;
}
