"use client";
import {createContext,useContext,useEffect,useSyncExternalStore,type ReactNode} from "react";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
export type Language="en"|"tr";
export const LanguageContext=createContext<{language:Language;setLanguage:(language:Language)=>void}>({language:"en",setLanguage:()=>{}});
const translations:Record<string,string>={
 "Features":"Özellikler","How it works":"Nasıl çalışır","Pricing":"Fiyatlandırma","About":"Hakkında","Sign in":"Giriş yap","Get started":"Başla","Open menu":"Menüyü aç","Close menu":"Menüyü kapat",
 "Dashboard":"Genel Bakış","Family Group":"Aile Grubu","Transactions":"İşlemler","Budgets":"Bütçeler","Accounts":"Hesaplar","Goals":"Hedefler","Analytics":"Analizler","AI Assistant":"AI Asistanı","Settings":"Ayarlar",
 "Total balance":"Toplam bakiye","Monthly income":"Aylık gelir","Monthly expenses":"Aylık gider","Savings rate":"Tasarruf oranı",
 "Cash flow":"Nakit akışı","Spending by category":"Kategoriye göre harcama","Budget progress":"Bütçe ilerlemesi","Recent transactions":"Son işlemler",
 "Income and expenses · Last 6 months":"Gelir ve giderler · Son 6 ay","Latest activity":"Son hareketler","View all":"Tümünü gör",
 "Know where your money goes. Plan where it should go.":"Paranın nereye gittiğini bil. Nereye gitmesi gerektiğini planla.",
 "Take control of your money without complicated spreadsheets.":"Karmaşık tablolar olmadan paranı kontrol altına al.",
 "Track income, expenses and budgets in one place, then let BudgetBuddy turn your financial data into simple, useful insights.":"Gelirlerini, giderlerini ve bütçelerini tek yerde takip et; BudgetBuddy finansal verilerini basit ve faydalı içgörülere dönüştürsün.",
 "Start for free":"Ücretsiz başla","See how it works":"Nasıl çalıştığını gör","No credit card":"Kredi kartı gerekmez","Setup in 2 minutes":"2 dakikada hazır","Private by design":"Gizlilik odaklı",
 "Everything in one calm place":"Her şey sade bir yerde","Your finances, finally easy to understand.":"Finansını anlamak artık çok daha kolay.","Everyday transactions become a clear plan you can act on.":"Günlük işlemlerin uygulayabileceğin net bir plana dönüşsün.",
 "Your financial overview is ready.":"Finansal özetin hazır.","Manage your money with confidence.":"Paranı güvenle yönet.","Add transaction":"İşlem ekle","Import CSV":"CSV içe aktar",
 "Search transactions":"İşlemlerde ara","September budgets":"Eylül bütçeleri","Your accounts":"Hesapların","Your savings goals":"Tasarruf hedeflerin","Your financial patterns":"Finansal eğilimlerin",
 "Home":"Ana Sayfa","Add":"Ekle","More":"Diğer","WORKSPACE":"ÇALIŞMA ALANI","Core plan":"Temel plan","View plan":"Planı gör","Current month":"Geçerli ay","Close":"Kapat",
 "Main navigation":"Ana navigasyon","Mobile navigation":"Mobil navigasyon","12 days in trial":"Deneme süresinde 12 gün kaldı",
 "Thursday, September 10":"10 Eylül Perşembe","Select month":"Ay seç","Notifications":"Bildirimler","September 2026":"Eylül 2026","August 2026":"Ağustos 2026","July 2026":"Temmuz 2026",
 "September":"Eylül","This month":"Bu ay","Last 6 months":"Son 6 ay","3 months":"3 ay","6 months":"6 ay","1 year":"1 yıl","Apr":"Nis","May":"May","Jun":"Haz","Jul":"Tem","Aug":"Ağu","Sep":"Eyl",
 "Spent":"Harcanan","3 of 4 budgets on track":"4 bütçenin 3'ü yolunda","BUDGETBUDDY INSIGHT":"BUDGETBUDDY ÖNERİSİ",
 "Your food budget needs a small adjustment.":"Yemek bütçen küçük bir düzenleme gerektiriyor.",
 "Restaurant spending is 24% higher. Reducing dining expenses by ₺800 would keep your food budget on track.":"Restoran harcamaların %24 daha yüksek. Dışarıda yemek harcamalarını ₺800 azaltmak bütçeni yolunda tutar.",
 "Ask BudgetBuddy":"BudgetBuddy'ye sor","View analysis":"Analizi gör","Food budget used":"Yemek bütçesi kullanıldı",
 "Record a new income or expense.":"Yeni bir gelir veya gider kaydet.",
 "Import transactions":"İşlemleri içe aktar","Nothing is added until you review and approve it.":"İnceleyip onaylayana kadar hiçbir işlem eklenmez.",
 "Upload":"Yükle","Map columns":"Sütunları eşleştir","Review":"İncele","Drop your CSV here":"CSV dosyanı buraya bırak",
 "date, description and amount required":"tarih, açıklama ve tutar zorunludur","Choose CSV":"CSV seç","Continue to review":"İncelemeye devam et",
 "24 rows ready":"24 satır hazır","2 rows need attention before import.":"İçe aktarmadan önce 2 satır düzeltilmeli.","Row 14 · Missing category":"14. satır · Kategori eksik","Fix row":"Satırı düzelt","Import 24 transactions":"24 işlemi içe aktar",
 "Transaction":"İşlem","Category":"Kategori","Date":"Tarih","Account":"Hesap","Amount":"Tutar","Everyday account":"Günlük hesap",
 "No matching transactions":"Eşleşen işlem yok","Try a different search, or add your first income or expense.":"Başka bir arama deneyin veya ilk gelir ya da giderinizi ekleyin.",
 "Create budget":"Bütçe oluştur","₺27,680 of ₺32,200 planned spending used":"Planlanan ₺32.200 harcamanın ₺27.680'i kullanıldı",
 "Overall progress":"Genel ilerleme","₺4,520 remaining":"₺4.520 kaldı","20 days left":"20 gün kaldı","Edit":"Düzenle","Delete":"Sil",
 "Delete this item?":"Bu öğe silinsin mi?","This action cannot be undone.":"Bu işlem geri alınamaz.","Cancel":"Vazgeç",
 "Track every place you keep or spend money.":"Paranı tuttuğun veya harcadığın tüm hesapları takip et.","Add account":"Hesap ekle",
 "Across 4 active accounts":"4 aktif hesapta","Current balance":"Güncel bakiye","Savings":"Birikim","Cash wallet":"Nakit cüzdan","Travel card":"Seyahat kartı",
 "Big plans become easier when progress is visible.":"İlerleme görünür olduğunda büyük planlar kolaylaşır.","Create goal":"Hedef oluştur",
 "Germany Relocation Fund":"Almanya taşınma fonu","Emergency Fund":"Acil durum fonu","New Laptop":"Yeni dizüstü bilgisayar",
 "Target date":"Hedef tarihi","of":"toplam","complete":"tamamlandı","to go":"kaldı","Update progress":"İlerlemeyi güncelle",
 "December 2026":"Aralık 2026","March 2027":"Mart 2027","June 2027":"Haziran 2027",
 "Focus on trends that help you make better decisions.":"Daha iyi kararlar vermene yardımcı olan eğilimlere odaklan.",
 "Income vs expense":"Gelir ve gider","Largest expenses":"En büyük giderler","Budget performance":"Bütçe performansı","+6.7% from last month":"Geçen aya göre +%6,7",
 "New conversation":"Yeni konuşma","Recent":"Son konuşmalar","September overview":"Eylül özeti","Food budget check":"Yemek bütçesi kontrolü","Saving ₺5,000":"₺5.000 tasarruf","August comparison":"Ağustos karşılaştırması",
 "AI explains your tracked data. It is not investment advice.":"AI yalnızca takip ettiğiniz verileri açıklar; yatırım tavsiyesi vermez.",
 "Your personal finance explainer":"Kişisel finans açıklayıcınız","Summarize this month":"Bu ayı özetle","Where am I overspending?":"Nerede fazla harcıyorum?","Can I save more?":"Daha fazla tasarruf edebilir miyim?","Compare to last month":"Geçen ayla karşılaştır",
 "Listening…":"Dinliyor…","Ask about your finances…":"Finansınla ilgili bir şey sor…",
 "Select period":"Dönem seç","Start listening":"Dinlemeyi başlat","Stop listening":"Dinlemeyi durdur","Send message":"Mesaj gönder","Settings sections":"Ayar bölümleri",
 "Today, 09:00":"Bugün, 09:00","Sep 8, 09:00":"8 Eyl, 09:00","Sep 7, 18:30":"7 Eyl, 18:30","Sep 6, 12:10":"6 Eyl, 12:10","Sep 6, 10:12":"6 Eyl, 10:12",
 "Checking · TRY":"Vadesiz hesap · TRY","Savings · TRY":"Birikim · TRY","Cash · TRY":"Nakit · TRY","Credit Card · EUR":"Kredi kartı · EUR",
 "Profile":"Profil","Preferences":"Tercihler","Categories":"Kategoriler","Subscription":"Abonelik","Data":"Veriler","Email":"E-posta",
 "Update your personal details.":"Kişisel bilgilerinizi güncelleyin.","Change photo":"Fotoğrafı değiştir","Full name":"Ad soyad","Save changes":"Değişiklikleri kaydet","Manage account":"Hesabı yönet",
 "Customize currency and appearance.":"Para birimini ve görünümü özelleştirin.","Currency":"Para birimi","Used across balances and reports.":"Bakiye ve raporların tamamında kullanılır.",
 "Dark mode":"Karanlık mod","Use a darker color theme.":"Koyu renk temasını kullanın.","Budget notifications":"Bütçe bildirimleri","Get notified near a limit.":"Limite yaklaştığınızda bildirim alın.",
 "Export data":"Verileri dışa aktar","Download your records as CSV.":"Kayıtlarınızı CSV olarak indirin.","Export":"Dışa aktar","Delete account":"Hesabı sil","Permanently remove all data.":"Tüm verileri kalıcı olarak silin.",
 "Safe":"Güvenli","Approaching limit":"Limite yaklaşıyor","Critical":"Kritik","Exceeded":"Aşıldı",
 "Rent payment":"Kira ödemesi","Salary":"Maaş","Migros Market":"Migros Market","Shell":"Shell","Coffee Shop":"Kahve dükkânı",
 "Housing":"Konut","Groceries":"Market","Dining":"Dışarıda yemek","Food & Dining":"Yemek","Entertainment":"Eğlence","Shopping":"Alışveriş","Transport":"Ulaşım","Utilities":"Faturalar","Income":"Gelir"
 ,"All accounts":"Tüm hesaplar","Expenses":"Giderler","Saved":"Birikim","On track, Melisa":"Yolundasın, Melisa","You saved ₺24,300 this month.":"Bu ay ₺24.300 biriktirdin."
 ,"See where your money goes":"Paranın nereye gittiğini gör","Simple cash-flow and category views reveal the patterns that matter.":"Basit nakit akışı ve kategori görünümleri önemli harcama alışkanlıklarını gösterir."
 ,"Ask in plain language":"Günlük dille sor","Get explanations grounded in your spending—not generic financial advice.":"Genel finans tavsiyeleri yerine kendi harcamalarına dayanan açıklamalar al."
 ,"Dining is 24% higher than last month.":"Dışarıda yemek harcamaların geçen aya göre %24 daha yüksek."
 ,"Review-first CSV import":"Kontrollü CSV aktarımı","Add manually or approve imported rows.":"İşlemleri elle ekle veya aktarılan satırları onayla."
 ,"All accounts, one view":"Tüm hesaplar tek görünümde","Cash, checking, savings, cards and wallets.":"Nakit, vadesiz hesap, birikim, kart ve cüzdanlar."
 ,"Goals that feel reachable":"Ulaşılabilir görünen hedefler","Turn big plans into visible milestones.":"Büyük planları görünür adımlara dönüştür."
 ,"From scattered numbers to a clear next step.":"Dağınık rakamlardan net bir sonraki adıma."
 ,"Add your money":"Paranı ekle","Enter transactions manually or import a CSV.":"İşlemleri elle gir veya CSV dosyasından aktar."
 ,"Set your plan":"Planını oluştur","Create budgets and savings goals that fit your life.":"Hayatına uygun bütçeler ve tasarruf hedefleri oluştur."
 ,"See what matters":"Önemli olanı gör","Use your dashboard and focused AI insights.":"Genel bakışını ve odaklanmış AI önerilerini kullan."
 ,"Questions, answered":"Merak ettiklerin yanıtlandı","Know before you start.":"Başlamadan önce bilmen gerekenler."
 ,"BudgetBuddy helps you understand your own data. It does not provide investment advice.":"BudgetBuddy kendi verilerini anlamana yardımcı olur; yatırım tavsiyesi sunmaz."
 ,"Do I need a CSV?":"CSV dosyası gerekli mi?","No. Manual transaction entry is always available.":"Hayır. İşlemleri her zaman elle ekleyebilirsin."
 ,"Does BudgetBuddy move money?":"BudgetBuddy para transferi yapar mı?","No. This demo organizes information and cannot move funds.":"Hayır. Bu demo yalnızca bilgileri düzenler ve para transferi yapamaz."
 ,"Is AI financial advice?":"AI finansal tavsiye verir mi?","No. It summarizes your tracked data and budgeting patterns.":"Hayır. Yalnızca takip ettiğin verileri ve bütçe alışkanlıklarını özetler."
 ,"Does it work on mobile?":"Mobilde çalışır mı?","Yes. Every view adapts to mobile screens.":"Evet. Tüm ekranlar mobil cihazlara uyum sağlar."
 ,"A calmer money routine starts here":"Daha sakin bir para düzeni burada başlar","Make your money make sense.":"Paranı anlaşılır hâle getir."
 ,"Personal finance clarity, without the clutter.":"Karmaşa olmadan kişisel finans netliği.","Privacy · Terms · Help":"Gizlilik · Koşullar · Yardım","© 2026 BudgetBuddy. Demo experience.":"© 2026 BudgetBuddy. Demo deneyimi."
 ,"Simple plans":"Basit planlar","Start free. Grow when you need to.":"Ücretsiz başla, ihtiyaç duyduğunda büyüt.","Preview only—no payment system is connected.":"Yalnızca önizleme — ödeme sistemi bağlı değildir."
 ,"Free":"Ücretsiz","Manual tracking":"Manuel takip","Basic dashboard":"Temel genel bakış","Core categories":"Temel kategoriler","Basic budgets":"Temel bütçeler"
 ,"Multiple accounts":"Çoklu hesap","Reviewed CSV import":"Kontrollü CSV aktarımı","Advanced reports":"Gelişmiş raporlar","AI insights":"AI finansal önerileri","Voice coach UI":"Sesli koç arayüzü"
 ,"Most popular":"En popüler","/month":"/ay","Clear money management for your next step.":"Sonraki adımın için anlaşılır para yönetimi.","Choose":"Seç"
 ,"Compare each plan before choosing the features that fit your needs.":"İhtiyacına en uygun özellikleri seçmeden önce planları karşılaştır.","Full access during your trial":"Deneme süresince tüm özellikler açık","Every new account can use all Budget Buddy features during the trial, including AI, voice, family groups and CSV tools.":"Her yeni hesap deneme süresince AI, sesli kullanım, aile grupları ve CSV araçları dahil tüm Budget Buddy özelliklerini kullanabilir.","Start full trial":"Tüm özelliklerle dene","Start with your full trial access.":"Tüm özelliklerin açık olduğu deneme ile başla.","For connected money management.":"Daha kapsamlı para yönetimi için.","For deeper analysis and guidance.":"Daha derin analiz ve rehberlik için.","Everything in Free":"Ücretsiz plandaki her şey","Everything in Core":"Core plandaki her şey","Accounts and receipt uploads":"Hesaplar ve fiş yükleme","CSV import and export":"CSV içe ve dışa aktarma","Goals and family groups":"Hedefler ve aile grupları","Voice questions":"Sesli sorular","Compare plans":"Planları karşılaştır","Choose the plan that fits your routine":"Düzenine uygun planı seç","Trial access is active":"Deneme erişimi aktif","Feature":"Özellik","Income and expense tracking":"Gelir ve gider takibi","Basic dashboard and budgets":"Temel genel bakış ve bütçeler","Savings goals and family groups":"Tasarruf hedefleri ve aile grupları","CSV import and data export":"CSV aktarma ve veri dışa aktarma","Advanced reports and filters":"Gelişmiş raporlar ve filtreler","AI Assistant and insights":"AI Asistanı ve içgörüler","Included":"Dahil","Included in trial":"Denemede dahil"
};
const transactionTranslations:Record<string,string>={"Transaction type":"İşlem türü","All types":"Tüm türler","All categories":"Tüm kategoriler","From date":"Başlangıç tarihi","To date":"Bitiş tarihi","Actions":"İşlemler","Edit":"Düzenle","Edit transaction":"İşlemi düzenle","Update the transaction details.":"İşlem bilgilerini güncelleyin.","Delete transaction":"İşlemi sil","Delete this transaction?":"Bu işlem silinsin mi?","No transactions yet":"Henüz işlem yok","Add your first income or expense to start tracking your money.":"Para takibine başlamak için ilk gelir veya giderinizi ekleyin.","Loading transactions…":"İşlemler yükleniyor…","Try again":"Tekrar dene","Save changes":"Değişiklikleri kaydet","Transaction updated.":"İşlem güncellendi.","Transaction deleted.":"İşlem silindi.","Unable to save the transaction.":"İşlem kaydedilemedi.","Unable to delete the transaction.":"İşlem silinemedi.","CSV import will be completed in the next phase.":"CSV aktarımı bir sonraki aşamada tamamlanacak."};
export const useT=()=>{const {language}=useContext(LanguageContext);return (text:string)=>language==="tr"?(translations[text]||transactionTranslations[text]||text):text};
export function LanguageSelect(){const {language,setLanguage}=useContext(LanguageContext);return <Select value={language} onValueChange={value=>setLanguage(value as Language)}><SelectTrigger className="language-select" aria-label={language==="tr"?"Dil seç":"Select language"}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="en">EN</SelectItem><SelectItem value="tr">TR</SelectItem></SelectContent></Select>}

const languageEvent="budgetbuddy-language-change";
let fallbackLanguage:Language="en";
function readLanguage():Language{
 try {
  const saved=window.localStorage.getItem("budgetbuddy-language");
  return saved==="tr"||saved==="en"?saved:fallbackLanguage;
 } catch { return fallbackLanguage; }
}
function subscribe(onChange:()=>void){
 window.addEventListener(languageEvent,onChange);
 window.addEventListener("storage",onChange);
 return ()=>{
  window.removeEventListener(languageEvent,onChange);
  window.removeEventListener("storage",onChange);
 };
}
function setLanguage(next:Language){
 fallbackLanguage=next;
 try {window.localStorage.setItem("budgetbuddy-language",next);} catch {}
 window.dispatchEvent(new Event(languageEvent));
}
export function LanguageProvider({children}:{children:ReactNode}){
 const language=useSyncExternalStore(subscribe,readLanguage,()=>"en" as Language);
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
