# Google Play'e yayın rehberi

BudgetBuddy, Play Store'da bir **Trusted Web Activity (TWA)** olarak yayınlanır:
`android/` klasöründeki küçük Android uygulaması, https://budgetbuddy.melisauyar.com
adresini adres çubuğu olmadan, tam ekran açar. Web sitesinde yapılan her
güncelleme uygulamaya da anında yansır; yeni paket yalnızca Android tarafında
bir şey değiştiğinde gerekir.

| Bilgi | Değer |
| --- | --- |
| Paket adı | `com.melisauyar.budgetbuddy` (bir kez seçilir, sonra değiştirilemez) |
| Hedef API | 36 (Android 16) — 31 Ağustos 2026'dan beri yeni uygulamalar için zorunlu |
| En düşük Android | 8.0 (API 26) |
| Paket | GitHub Actions → **Android app bundle** → imzalı `.aab` |

## 0. Tek seferlik hazırlık

1. **Yükleme anahtarı:** `budgetbuddy-upload.p12` ve parolası güvenli bir yerde
   (şifre yöneticisi) saklanmalı. Repoya **asla** konmaz.
2. **GitHub secret'ları** (Settings → Secrets and variables → Actions):
   `ANDROID_UPLOAD_KEYSTORE_BASE64`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD`,
   `ANDROID_UPLOAD_KEY_ALIAS` (= `upload`).
3. **Supabase:** `supabase/migrations/0016_error_events_retention.sql` çalıştırılmış olmalı.

## 1. Geliştirici hesabı

1. https://play.google.com/console → **Kişisel (Personal)** hesap, tek seferlik 25 USD.
2. Kimlik ve iletişim doğrulamasını tamamla (birkaç gün sürebilir).
3. Kişisel hesaplar için kural: üretime çıkmadan önce **en az 12 test kullanıcısı,
   14 gün kesintisiz** kapalı testte kalmalı. Sonra "Üretim erişimi başvurusu" yapılır.

## 2. Uygulamayı oluştur

**Uygulama oluştur** → Ad: `BudgetBuddy: Bütçe Takibi` · Varsayılan dil: Türkçe ·
Uygulama · Ücretsiz. Ücretsiz olarak yayınlanan uygulama sonradan ücretliye
çevrilemez; ileride abonelik eklemek ise mümkündür.

## 3. İlk paketi derle

1. GitHub → **Actions → Android app bundle → Run workflow**
   (versionCode `1`, versionName `1.0.0`). Her yeni yüklemede versionCode artırılır.
2. Bitince çalışmanın sayfasından **budgetbuddy-1.0.0-1** paketini indir (zip içinde `app-release.aab`).

## 4. Kapalı test

1. **Test et ve yayınla → Kapalı test → Yeni kanal** → `.aab` dosyasını yükle.
2. **Play Uygulama İmzalama**'yı kabul et (Google uygulama imzalama anahtarını kendisi saklar).
3. Test kullanıcılarının Gmail adreslerini bir listeye ekle, katılım bağlantısını onlara gönder.
   12 kişi bağlantıdan katılıp uygulamayı yüklemeli ve 14 gün testte kalmalı.

## 5. Uygulamayı web sitesine bağla (adres çubuğunu kaldırır)

Bu adım olmadan uygulama, üstte bir adres çubuğu ile açılır.

1. Play Console → **Test et ve yayınla → Uygulama bütünlüğü → Uygulama imzalama**.
2. **Uygulama imzalama anahtarı sertifikası → SHA-256** değerini kopyala.
3. Vercel → **Environment Variables** (Production):
   `ANDROID_CERT_SHA256` = `<uygulama imzalama SHA-256>,<yükleme anahtarı SHA-256>`
   (virgülle ayrılmış; yükleme anahtarınınki GitHub Actions özetinde ve anahtar dosyasıyla gelen notta).
4. Redeploy → https://budgetbuddy.melisauyar.com/.well-known/assetlinks.json içinde iki parmak izi görünmeli.

## 6. Mağaza kaydı

**Grafikler** (`android-assets/`): uygulama ikonu `play-store-icon-512.png`, öne çıkan
grafik `feature-graphic-1024x500.png`. **Telefon ekran görüntüleri:** en az 2 (önerilen 4–8),
gerçek uygulamadan: Genel bakış, İşlemler, Bütçeler, Aile grubu.

### Türkçe (varsayılan)

- **Uygulama adı (≤30):** BudgetBuddy: Bütçe Takibi
- **Kısa açıklama (≤80):** Gelir-gider takibi, bütçe, birikim hedefleri ve aile bütçesi tek yerde.
- **Tam açıklama:**

> BudgetBuddy, karmaşık tablolar olmadan paranı yönetmen için tasarlanmış sade bir kişisel finans uygulaması.
>
> • Gelir ve giderlerini kolayca kaydet, kategorilere ayır
> • Aylık bütçeler oluştur, limite yaklaşınca uyarı al
> • Birikim hedefleri belirle, ilerlemeni takip et
> • Nakit, banka, birikim ve kredi kartı hesaplarını tek ekranda gör
> • Aile grubu kur: ortak harcamaları, harçlık planını, alışveriş ve dilek listelerini paylaş
> • Fiş fotoğraflarını işlemlerine ekle
> • CSV ile içe ve dışa aktar
> • Harcamalarını yapay zekâ asistanına sor, sade açıklamalar al
> • Türkçe ve İngilizce
>
> BudgetBuddy banka hesaplarına bağlanmaz, kart bilgisi istemez ve para transferi yapmaz. Verilerin yalnızca senin ve izin verdiğin aile üyelerinin erişimindedir. Yapay zekâ yanıtları yatırım tavsiyesi değildir.
>
> Lansman döneminde tüm özellikler ücretsiz.

### English

- **App name:** BudgetBuddy: Budget Tracker
- **Short description:** Track income and expenses, budgets, savings goals and family finances.
- **Full description:**

> BudgetBuddy is a simple personal finance app that helps you manage money without complicated spreadsheets.
>
> • Record income and expenses and organize them by category
> • Create monthly budgets and get warned before you overspend
> • Set savings goals and track your progress
> • See cash, bank, savings and credit card accounts in one place
> • Create a family group to share expenses, allowance plans, shopping lists and wishlists
> • Attach receipt photos to transactions
> • Import and export CSV
> • Ask the AI assistant about your spending in plain language
> • Turkish and English
>
> BudgetBuddy does not connect to your bank, never asks for card details and cannot move money. Your data is visible only to you and the family members you invite. AI answers are not investment advice.
>
> Every feature is free during launch.

## 7. Uygulama içeriği (App content)

| Bölüm | Cevap |
| --- | --- |
| Gizlilik politikası | https://budgetbuddy.melisauyar.com/privacy |
| Reklamlar | Uygulama reklam içermiyor |
| Uygulama erişimi | "Bazı işlevler kısıtlı": inceleme ekibi için bir test hesabı (e-posta + şifre) gir |
| İçerik derecelendirmesi | Anketi doğru yanıtla (şiddet, kumar vb. yok; kullanıcılar arası paylaşım: aile grubu içinde var) |
| Hedef kitle | 18 ve üzeri |
| Haber uygulaması | Hayır |
| Finansal özellikler beyanı | Uygulama para tutmaz, kredi vermez, yatırım/kripto/ödeme işlemi yapmaz. Listede bütçe veya kişisel finans yönetimi seçeneği varsa onu, yoksa "finansal özellik yok"u seç |
| Sağlık uygulaması | Hayır |
| Hükümet uygulaması | Hayır |
| Hesap silme | Uygulama içi: Ayarlar → Hesabı sil. Web: https://budgetbuddy.melisauyar.com/account-deletion |

### Veri güvenliği (Data safety)

Genel: veriler aktarım sırasında **şifreleniyor (HTTPS)**; kullanıcı **silme talep edebilir**;
veriler **üçüncü taraflarla paylaşılmıyor** (Supabase, Vercel, Groq, Sentry, Resend
yalnızca BudgetBuddy adına işlem yapan hizmet sağlayıcılardır; Google'ın tanımında
bu "paylaşım" sayılmaz).

| Veri türü | Toplanıyor | Amaç | Zorunlu mu |
| --- | --- | --- | --- |
| Ad | Evet | Hesap yönetimi, uygulama işlevi | Evet |
| E-posta adresi | Evet | Hesap yönetimi, uygulama işlevi | Evet |
| Diğer finansal bilgiler (kullanıcının girdiği işlemler, bütçeler, hedefler) | Evet | Uygulama işlevi | Evet |
| Fotoğraflar (fiş görselleri) | Evet | Uygulama işlevi | Hayır (isteğe bağlı) |
| Diğer kullanıcı içeriği (AI asistanı soruları) | Evet | Uygulama işlevi | Hayır (isteğe bağlı) |
| Kilitlenme günlükleri, tanılama | Evet | Uygulama işlevi (hata giderme) | Evet |

Konum, kişiler, rehber, mesajlar, sağlık, ödeme/kart bilgisi **toplanmıyor**.
IP adresi yalnızca kötüye kullanımı önlemek için en fazla bir gün tutulur.

## 8. Üretime çıkış

12 test kullanıcısı 14 gün tamamladıktan sonra: **Kontrol paneli → Üretim erişimi başvurusu**.
Onaydan sonra **Üretim → Yeni sürüm** ile kapalı testteki paketi üretime taşı.
İlk incelemeler genellikle birkaç gün sürer.

## Güncelleme

Web sitesi değişiklikleri için yeni paket gerekmez. Android projesi değişirse
(ör. yeni hedef API zorunluluğu — her yıl Ağustos'ta), versionCode'u artırıp
workflow'u yeniden çalıştır ve yeni `.aab`'ı yükle.
