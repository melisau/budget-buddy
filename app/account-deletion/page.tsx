import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTROLLER_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Hesap ve veri silme · Account and data deletion",
  description: "BudgetBuddy hesabınızı ve verilerinizi nasıl silebileceğiniz. How to delete your BudgetBuddy account and data.",
  alternates: { canonical: "/account-deletion" },
};

const mailto = (subject: string) => `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

// Server-rendered and bilingual on one page, so it works without JavaScript
// and without installing the app, as Google Play requires.
export default function AccountDeletionPage() {
  return <main className="legal" id="main-content" tabIndex={-1}>
    <header><Link href="/">BudgetBuddy</Link></header>

    <section lang="tr" id="tr">
      <h1>BudgetBuddy hesabını ve verilerini silme</h1>
      <p>Bu sayfa, Google Play&apos;de <strong>BudgetBuddy</strong> adıyla yayınlanan uygulamanın (geliştirici: {LEGAL_CONTROLLER_NAME}) hesap ve veri silme yöntemlerini açıklar.</p>

      <h2>1. Uygulama içinden (hemen)</h2>
      <ol>
        <li>BudgetBuddy&apos;ye giriş yap.</li>
        <li><strong>Ayarlar</strong> sayfasını aç.</li>
        <li><strong>Hesabı sil</strong> → <strong>Kalıcı olarak sil</strong>&apos;e dokun.</li>
      </ol>
      <p>Hesabın ve verilerin anında silinir.</p>

      <h2>2. Uygulamayı kullanmadan (e-posta ile)</h2>
      <p>Hesabına kayıtlı e-posta adresinden <a href={mailto("Hesap silme talebi")}>{LEGAL_CONTACT_EMAIL}</a> adresine &quot;Hesap silme talebi&quot; konulu bir e-posta gönder. Kimliğini doğruladıktan sonra hesabını en geç 30 gün içinde siler ve sana bilgi veririz.</p>

      <h2>Silinen veriler</h2>
      <ul>
        <li>Giriş hesabın (e-posta adresi, ad, şifre)</li>
        <li>Hesaplar, işlemler, kategoriler, bütçeler ve birikim hedefleri</li>
        <li>Fiş görselleri</li>
        <li>AI asistanı sohbet geçmişi</li>
        <li>Sahibi olduğun aile grupları, harçlık planları, alışveriş ve dilek listeleri</li>
      </ul>

      <h2>Saklanabilecek veriler</h2>
      <ul>
        <li>Başka aile üyelerinin kendi adlarına eklediği ortak işlemler, o üyelerin kaydı olarak kalır.</li>
        <li>Adın ve e-postan olmadan tutulan teknik hata kayıtları, güvenlik ve hata giderme amacıyla en fazla 90 gün saklanır.</li>
        <li>Yasal bir saklama yükümlülüğü olan veriler, ilgili süre boyunca saklanır.</li>
      </ul>
      <p>Ücretli bir aboneliğin varsa hesap silinirken otomatik olarak iptal edilir. Ayrıntılar için <Link href="/privacy">Gizlilik Politikası ve KVKK Aydınlatma Metni</Link>&apos;ne bakabilirsin.</p>
    </section>

    <hr />

    <section lang="en" id="en">
      <h1>Delete your BudgetBuddy account and data</h1>
      <p>This page explains how to delete your account and data for the app published on Google Play as <strong>BudgetBuddy</strong> (developer: {LEGAL_CONTROLLER_NAME}).</p>

      <h2>1. In the app (immediately)</h2>
      <ol>
        <li>Sign in to BudgetBuddy.</li>
        <li>Open <strong>Settings</strong>.</li>
        <li>Tap <strong>Delete account</strong> → <strong>Delete permanently</strong>.</li>
      </ol>
      <p>Your account and data are deleted immediately.</p>

      <h2>2. Without the app (by email)</h2>
      <p>Email <a href={mailto("Account deletion request")}>{LEGAL_CONTACT_EMAIL}</a> from the address registered to your account with the subject &quot;Account deletion request&quot;. After verifying your identity we delete your account within 30 days and confirm by email.</p>

      <h2>Data that is deleted</h2>
      <ul>
        <li>Your sign-in account (email address, name, password)</li>
        <li>Accounts, transactions, categories, budgets and savings goals</li>
        <li>Receipt images</li>
        <li>AI assistant conversation history</li>
        <li>Family groups you own, allowance plans, shopping lists and wishlists</li>
      </ul>

      <h2>Data that may be kept</h2>
      <ul>
        <li>Shared family transactions that other members added in their own name remain as their records.</li>
        <li>Technical error logs without your name or email are kept for up to 90 days for security and troubleshooting.</li>
        <li>Data subject to a legal retention obligation is kept for the required period.</li>
      </ul>
      <p>Any paid subscription is cancelled automatically when the account is deleted. See the <Link href="/privacy">Privacy Policy</Link> for details.</p>
    </section>
  </main>;
}
