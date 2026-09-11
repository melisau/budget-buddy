"use client";

import {useContext,useState} from "react";
import {Eye,EyeOff,Sparkles} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {LanguageContext,LanguageSelect} from "@/components/providers/language-provider";
import {Logo} from "@/components/layout/logo";

type AuthView="landing"|"signin"|"signup"|"dashboard";

export function Auth({mode,go}:{mode:"signin"|"signup";go:(view:AuthView)=>void}){
 const {language}=useContext(LanguageContext);
 const tr=language==="tr";
 const [show,setShow]=useState(false);
 const signup=mode==="signup";
 return (
  <main className="auth">
   <aside>
    <Logo go={()=>go("landing")}/>
    <div>
     <span className="eyebrow"><Sparkles/>{tr?"Her gün finansal netlik":"Money clarity, every day"}</span>
     <h1>{tr?"Paranı yönetmeye daha az, yaşamaya daha çok zaman ayır.":"Spend less time managing money. Spend more time living."}</h1>
     <p>{tr?"Günlük harcamaların, bütçelerin ve hedeflerin tek yerde.":"One clean place for everyday spending, budgets and goals."}</p>
    </div>
    <blockquote>{tr?"“Ay bitmeden paramın nereye gittiğini biliyorum.”":"“I know where my money goes before the month gets away from me.”"}</blockquote>
   </aside>
   <section>
    <form onSubmit={event=>{event.preventDefault();go("dashboard");}}>
     <div className="auth-controls">
      <button type="button" onClick={()=>go("landing")}>{tr?"Ana sayfa":"Home"}</button>
      <LanguageSelect/>
     </div>
     <h2>{signup?(tr?"Hesabını oluştur":"Create your account"):(tr?"Tekrar hoş geldin":"Welcome back")}</h2>
     <p>{tr?"Demo görünümü: gerçek hesap oluşturulmaz. Lütfen gerçek şifrenizi kullanmayın.":"Demo preview: no account is created. Please do not use your real password."}</p>
     {signup&&<label htmlFor="auth-name">{tr?"Ad soyad":"Full name"}<Input id="auth-name" autoComplete="off" placeholder={tr?"Adınız ve soyadınız":"Your full name"}/></label>}
     <label htmlFor="auth-email">{tr?"E-posta adresi":"Email address"}<Input id="auth-email" type="email" autoComplete="off" placeholder="you@example.com"/></label>
     <label htmlFor="auth-password">{tr?"Şifre":"Password"}</label>
     <div className="password">
      <Input id="auth-password" type={show?"text":"password"} autoComplete="off" placeholder={tr?"Demo şifresi":"Demo password"}/>
      <button type="button" aria-label={show?(tr?"Şifreyi gizle":"Hide password"):(tr?"Şifreyi göster":"Show password")} aria-pressed={show} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button>
     </div>
     <Button type="submit" size="lg">{tr?"Demoyu aç":"Open demo"}</Button>
     <p className="switch">
      {signup?(tr?"Zaten kayıtlı mısın? ":"Already registered? "):(tr?"BudgetBuddy’de yeni misin? ":"New to BudgetBuddy? ")}
      <button type="button" onClick={()=>go(signup?"signin":"signup")}>{signup?(tr?"Giriş yap":"Sign in"):(tr?"Kayıt ol":"Create account")}</button>
     </p>
    </form>
   </section>
  </main>
 );
}
