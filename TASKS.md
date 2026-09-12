# Budget Buddy görev planı

Kaynak: 11 Eylül 2026 tarihinde paylaşılan ürün açıklaması. Mevcut durum kullanıcı beyanıdır; kod ve canlı servisler ayrıca doğrulanacaktır.

Durumlar: Bekliyor / Devam ediyor / Engelli / Tamamlandı. Aşağıdaki uygulama görevlerinin tamamı başlangıçta **Bekliyor** durumundadır. Bu dosyanın oluşturulması özelliklerin uygulanmış olduğu anlamına gelmez.

## Başlangıç ve takip

- [x] Ürün açıklamasını okuyup sıralı görev planına dönüştür.
- [x] BB-00 — Kod, migration, ortam değişkeni adları ve bağlı servisleri incele; hazır olanlarla eksikleri ayır. Gizli anahtarları çıktılara yazma. Faz 1 arayüz, mobil navigasyon, TR/EN ve tarayıcı demo davranışlarını başlangıç noktası olarak kaydet.

## İlk çalışma paketi — Faz 2

- [ ] BB-01 — **Devam ediyor.** Clerk kimlik doğrulama. Mevcut projeyi bağla veya gerekli kurulumu belirle; kayıt, giriş, e-posta doğrulama, şifre sıfırlama, çıkış, korunan rotalar ve kalıcı oturum akışlarını tamamla. Clerk kimliğini Supabase kullanıcı kaydıyla eşleştir; ad, e-posta, fotoğraf, dil ve para birimi tercihlerini sakla. Bağımlılık: BB-00; profil kalıcılığı için BB-02. Kabul: Gerçek kullanıcı hesap açabilir, oturumu korunur ve kendi profiline erişir.
- [x] BB-02 — Supabase şeması ve bağlantısı. Mevcut migration taslağını incele; kullanıcı, hesap, kategori, işlem, bütçe, hedef, aile grubu, aile üyeliği ve AI geçmişi tablolarını tamamla ve uygulanmasını doğrula. Güncelleme tarihleri, indeksler, benzersizlik ve ilişkisel bütünlük kurallarını kur. Ayrıcalıklı anahtarları sunucuda tut. Bağımlılık: BB-00. Kabul: Migration sonucu ve sunucudan kalıcı veri erişimi doğrulanır.
- [ ] BB-03 — **Devam ediyor.** Veri erişim kuralları. Kişisel veri sahipliği, aile üyeliği ve yönetici/üye/görüntüleyici yetkilerini uygula; işlemi ekleyen ve adına işlem yapılan kişiyi ayrı kaydet. İsteklerde gönderilen kimliklere güvenme; çıkarılan üyelerin erişimini sonlandır. Bağımlılık: BB-01, BB-02. Kabul: Başka kullanıcı kimliği veya URL ile veri okunamaz/değiştirilemez; rol testleri geçer.
- [ ] BB-04 — **Devam ediyor.** Kalıcı hesap, kategori ve işlem yönetimi. İşlemler için ekleme, düzenleme, silme; tarih, kategori, hesap, açıklama, not ve kişisel/aile kapsamını kaydet. Gerçek listeleme, arama, tarih/hesap/kategori/tür filtreleri, yüklenme/başarı/hata durumları ve çift gönderim korumasını tamamla. Bağımlılık: BB-03. Kabul: Kaydedilen işlem ikinci cihazdan görünür; yetkisiz değişiklik reddedilir.

## Aile ve belgeler — Faz 2.5

- [x] BB-05 — Aile grupları ve üyelik. Grup oluşturma/adlandırma, uygulama içi davet kaydı ve kabul/ret, rol değiştirme, üye çıkarma, sahiplik devri, ayrılma ve grup silme kuralları tamamlandı. Kendisi/başka üye adına ortak işlem, gerçek toplamlar, kişi dağılımı ve ekleyen→adına eklenen kayıtları uygulanmıştır. Eşzamanlı düzenlemelerde yazma yetkisi her istekte tekrar kontrol edilir. Bağımlılık: BB-04. Kabul: İki geçici gerçek Clerk kullanıcısı ortak işlem ve rol izinleriyle doğrulandı. Gerçek kişilere e-posta göndermek için ayrıca açık gönderim yetkisi gerekir.
- [ ] BB-06 — **Devam ediyor.** Kalıcı fiş görselleri. Özel Supabase Storage alanı, sunucuda JPG/PNG/WEBP ve 5 MB doğrulaması, kullanıcı/aile erişim kuralları, süreli görüntüleme bağlantıları, değiştirme/kaldırma ve kullanılmayan dosya temizliğini uygula. Mobil kamera/galeri ve yükleme durumlarını tamamla. Bağımlılık: BB-05. Kabul: Yetkisiz görsel erişimi engellenir; fiş başka cihazda görüntülenir.

## Finans yönetimi — Faz 3

- [ ] BB-07 — Hesapları tamamla ve gerçek dashboard oluştur. Banka/nakit/birikim/kredi kartı/dijital cüzdan türleri, düzenleme/arşivleme, başlangıç bakiyesi, para birimi, kişisel/aile ayrımı ve hesaplar arası transferi uygula. Bakiye, aylık gelir/gider, tasarruf oranı, kategori dağılımı, altı aylık nakit akışı ve son işlemleri gerçek kayıtlardan hesapla. Kapsam ve tarih filtreleri ile boş durumları tamamla. Bağımlılık: BB-04, aile kapsamı için BB-05. Kabul: Hesaplanan değerler kayıtlarla tutarlıdır; demo verisi gerçek toplamlara karışmaz.
- [ ] BB-08 — Bütçeler ve hedefler. Aylık kategori bütçesi CRUD, gerçek kullanım, limit uyarıları, dönem geçişi, kişisel/aile kapsamı ve bildirimleri tamamla. Hedef tutarı/tarihi, ilerleme, işlem/hesap ilişkisi, düzenleme/tamamlama/silme, kalan tutar ve tahmini tamamlanmayı uygula. Dashboard bütçe ilerlemesini bağla. Bağımlılık: BB-07. Kabul: İşlem değişikliği ilgili bütçe ve hedef hesaplarına doğru yansır.
- [ ] BB-09 — CSV içe/dışa aktarma. Gerçek dosya seçimi, TR/EN sütunlar, virgül/noktalı virgül, Türkçe tarih/tutar biçimleri, alan eşleştirme, hatalı satır gösterimi ve düzeltme, tekrar önleme ve onay önizlemesini uygula. Onaylanan satırları atomik kaydet; kişisel ve aile verisini ayrı dışa aktar. Bağımlılık: BB-08. Kabul: Hatalı aktarım kısmi kayıt bırakmaz; aynı dosya tekrarında mükerrer işlem oluşmaz.
- [ ] BB-10 — Analiz ve raporlar. Grafik ve analizleri gerçek veritabanı hesaplarına bağla; tarih, hesap ve kişisel/aile kapsamını tutarlı uygula. Bağımlılık: BB-09. Kabul: Rapor toplamları filtrelenmiş işlemler ve dashboard ile uyuşur.

## AI ve ses — Faz 4–5

- [ ] BB-11 — Gerçek AI Asistanı. Sunucu üzerinden OpenAI bağlantısı, yalnızca yetkili finans verisi özeti, ay/hesap kapsamı, akış yanıtları, TR/EN, geçmiş, yeni sohbet/silme, kullanım ve maliyet limitleri ile servis hata durumlarını uygula. Yanıtın dayandığı veri ve dönemi göster; bulunmayan veriyi belirt. Para transferi veya işlem oluşturma yetkisi verme; yatırım tavsiyesi sınırını uygula. Bağımlılık: BB-10. Kabul: Yanıtlar gerçek yetkili kayıtlara dayanır; kapsam dışı veri modele gönderilmez.
- [ ] BB-12 — Sesli kullanım. Mikrofon izni, konuşmadan metne dönüşüm, TR/EN, dinleme/durdurma/hata durumları, metin onayı, finans soruları ve isteğe bağlı işlem taslağı akışını tamamla. Taslağı kaydetmeden açık onay al; yazılı kullanım alternatifini koru. Bağımlılık: BB-11. Kabul: Onaysız işlem kaydedilmez. Ücretli ses hizmeti açık onay olmadan etkinleştirilmez.

## Üretim hazırlığı ve isteğe bağlı ödeme — Faz 6–7

- [ ] BB-13 — Kalite, güvenlik ve üretim hazırlığı. Hesaplamalar, aile rolleri, dosya güvenliği, çift gönderim ve temel uçtan uca akışları test et. Mobil Chrome/Safari, tablet/masaüstü, klavye, ekran okuyucu, kontrast, %200 yakınlaştırma ve bağlantı sorunlarını doğrula. Hata izleme, API/AI limitleri, yedekleme, kullanıcı verisi dışa aktarımı, hesap/veri silme, gizlilik/koşullar ve geliştirme/üretim anahtar ayrımını tamamla. Bağımlılık: Önceki uygulanmış paketler. Kabul: Kritik akışlar ve erişim testleri geçer; bilinen engeller kaydedilir. Güvenlik kontrolleri ilgili paket sırasında da yapılır, bu faza ertelenmez.
- [ ] BB-14 — İsteğe bağlı üyelik ve ödeme. Free/Core/Pro özelliklerini ve yetkilerini belirle; ödeme altyapısı, güvenli ödeme, abonelik başlatma/yükseltme/iptal, deneme, webhook, başarısız ödeme/sona erme ve fatura geçmişini uygula. Bağımlılık: BB-13 ve kullanıcının ayrıca açık onayı. Kabul: Plan erişimi ve abonelik yaşam döngüsü doğrulanır. Onay verilene kadar başlatılmaz.

## Çalışma kuralları

- Sonraki iş BB-00; ilk teslim paketi BB-01–BB-04'tür.
- Her görevin durumunu, değişen dosyaları, doğrulamaları ve somut engelleri tamamlandıkça buraya ekle.
- Servis erişimi veya kullanıcı tercihi gerektiren bir engelde bağımsız yerel hazırlıklara devam et; eksik erişimi varmış gibi kabul etme.
- Faz 1 kullanıcı deneyimi ve TR/EN desteği korunur.
- Görev planı oluşturma isteği, bütün özellikleri bu turda uygulama veya ücretli servis açma talimatı olarak değerlendirilmez.

## İlerleme günlüğü

### 11 Eylül 2026 — BB-00 tamamlandı, BB-01 başladı

- Next.js 16/Vinext, Clerk v7 ve Supabase istemcisi mevcut. Clerk geliştirme anahtarları yerel ortamda tanımlı; Supabase bağlantı değişkenleri henüz tanımlı değil.
- Tüm uygulama sayfaları kaynak yanında sunucu tarafında Clerk oturumu doğruluyor. Girişsiz `/dashboard` isteğinin `/sign-in` sayfasına yönlendiği yerel üretim önizlemesinde doğrulandı.
- Kenar çubuğu ve ayarlar ekranındaki demo kullanıcı bilgileri gerçek Clerk kullanıcısına bağlandı; Clerk hesap yönetimi ve çıkış menüsü kullanılabilir.
- Clerk kullanıcısını `public.users` tablosuna güvenli sunucu istemcisiyle eşleyen kod eklendi. Supabase bağlantısı gelene kadar bu adım bilinçli olarak atlanıyor.
- Supabase taslağına `updated_at` alanları, otomatik güncelleme tetikleyicileri ve bütçe/kategori benzersizlik kuralları eklendi. Migration canlı projede henüz çalıştırılmadı.
- TypeScript, ESLint ve üretim derlemesi geçti. Yerel üretim sunucusunda açılış sayfası ile Clerk giriş ekranı görsel olarak doğrulandı.
- Vinext geliştirme modu bağımlılık taraması sırasında Windows üzerinde `ECONNRESET` ile kapanıyor; üretim derlemesi ve Wrangler önizlemesi çalışıyor. Bu, sonraki yerel geliştirme altyapısı incelemesinde ele alınacak.

### 11 Eylül 2026 — Yeni kullanıcı başlangıç verisi hazırlandı

- İlk başarılı Supabase kullanıcı eşleştirmesinden sonra üç örnek hesap, dört kategori ve dört güncel işlem oluşturan `0002_new_user_starter_data.sql` migration'ı eklendi.
- Başlangıç verisi tek bir veritabanı işlemi içinde oluşturuluyor. Kullanıcı satırı kilitleniyor ve `starter_data_seeded_at` alanı aynı kullanıcının tekrar tohumlanmasını engelliyor.
- Daha önce gerçek kayıt oluşturmuş kullanıcılar korunuyor; boş olmayan mevcut hesaplara başlangıç verisi eklenmiyor.
- Tohumlama işlevinin çalıştırma izni yalnızca sunucu tarafındaki Supabase `service_role` rolüne verildi. Tarayıcı doğrudan çalıştıramaz.
- Clerk kullanıcı eşleştirme kodu, kullanıcı kaydını oluşturduktan/güncelledikten sonra başlangıç verisi işlevini çağıracak şekilde güncellendi.
- TypeScript, ESLint ve üretim derlemesi geçti. Canlı Supabase bağlantısı bulunmadığı için migration ve gerçek ilk giriş sonucu henüz canlı veritabanında doğrulanmadı.

### 11 Eylül 2026 — BB-02 tamamlandı

- Supabase proje URL'si ve sunucu secret anahtarı yerel ortamdan değerleri açığa çıkarılmadan doğrulandı.
- `0001_budgetbuddy_foundation.sql` ve `0002_new_user_starter_data.sql` canlı Supabase SQL Editor'de başarıyla uygulandı.
- Kullanıcılar, hesaplar, kategoriler, işlemler, bütçeler, hedefler, aile tabloları ve AI oturumları canlı API üzerinden erişilebilir durumda.
- `starter_data_seeded_at` kolonu ve `seed_user_starter_data` işlevi canlı API üzerinden doğrulandı. Henüz Budget Buddy kullanıcısı giriş yapmadığı için tüm tablolar boş.

### 12 Eylül 2026 — BB-03 ve BB-04 uygulama katmanı eklendi

- Tüm işlem API uçları önce Clerk oturumunu, ardından uygulama kullanıcısını sunucuda doğrular. Supabase service role anahtarı tarayıcıya verilmez.
- Kişisel işlem oluşturma sırasında hesap ve kategori, oturumdaki kullanıcıya ait değilse istek reddedilir. Düzenleme ve silme, işlem sahibini; aile işlemlerinde ise kabul edilmiş aile rolünü denetler. Görüntüleyici rolü değişiklik yapamaz.
- İşlem ekranı Supabase verilerini listeler; ekleme, düzenleme, silme, arama ve tür/hesap/kategori/tarih filtreleri gerçek API üzerinden çalışır. Form, gönderim sürerken devre dışı kalır.
- Oturumsuz GET, POST ve DELETE istekleri yerel doğrulamada `401` ile reddedildi. Çok kullanıcılı aile rolü kabul testi BB-05 aile davet akışı ile birlikte tamamlanacak.

### 12 Eylül 2026 — BB-05 aile grubu akışı eklendi

- Aile grubu oluşturma, üyelik daveti kaydetme, e-posta eşleşmesiyle uygulama içinden kabul/ret, rol değiştirme, üye çıkarma, sahiplik devri, gruptan ayrılma ve grup silme için sunucu tarafı uçlar eklendi. Bu uçlar Clerk oturumunu ve grup rolünü her istekte doğrular.
- E-posta gönderimi kasten etkinleştirilmedi: davet, ilgili e-posta ile giriş yapan kullanıcının Aile Grubu sayfasında görünür. Gerçek kişilere dış e-posta göndermek için ayrıca açık gönderim yetkisi gerekir.
- Aile ekranı demo/localStorage verisini bırakıp gerçek grupları, üyeleri, bekleyen davetleri, ortak işlem toplamlarını ve işlem sahibi dağılımını gösterir. Üye ve yönetici aile işlemi ekleyebilir; görüntüleyici değiştiremez.
- TypeScript ve üretim derlemesi geçti. Oturumsuz aile oluşturma, davet oluşturma ve ayrılma denemeleri `401` ile reddedildi. İki ayrı gerçek Clerk kullanıcısıyla kabul testi henüz yapılmadı.
- Canlı Supabase üzerinde geçici iki kullanıcıyla oluşturulan grup, bekleyen davet, kabul edilmiş üyelik ve `member → viewer` rol değişimi doğrulandı; test kayıtları işlem sonunda silindi. Gerçek Clerk oturumu ile iki tarayıcıdan uçtan uca kabul testi, ikinci oturum bulunmadığı için ayrıca açık kalır.
- Geliştirme Clerk örneğinde iki geçici kullanıcı oluşturularak uygulamanın yetkilendirme fonksiyonları gerçek Clerk kullanıcı kimlikleriyle çalıştırıldı: davet kabulü, üyenin yönetici adına ortak işlem eklemesi, yöneticinin bu işlemi görmesi ve görüntüleyici yazma engeli geçti. İlgili Supabase ve Clerk kayıtları test sonunda silindi.

### 12 Eylül 2026 — BB-06 fiş görseli altyapısı eklendi

- Sunucu tarafında yalnızca özel `budgetbuddy-receipts` Storage alanını kullanan yükleme, imzalı görüntüleme bağlantısı ve kaldırma uçları eklendi. Alan ilk gerçek yüklemede, herkese açık olmadan oluşturulur.
- JPG/PNG/WEBP ve 5 MB sınırı hem Storage ayarında hem de sunucu doğrulamasında uygulanır. Görseller tarayıcıdan doğrudan Storage’a gönderilmez; işlem yazma yetkisi zorunludur. Görüntüleme bağlantısı 60 saniye geçerlidir ve kişisel/aile görüntüleme erişimi denetlenir.
- İşlem formuna mobil kamera/galeri seçimi, yükleme durumu ve kayıtlı fişi kaldırma eklendi. İşlem silindiğinde ilişkili dosya da temizlenir; depolama temizliği hata verse bile finans kaydı silinmiş kalır.
