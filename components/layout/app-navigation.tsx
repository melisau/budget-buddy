"use client";
import { UserButton, useUser } from "@clerk/react";
import type {ReactNode} from "react";
import {Bell,ChartNoAxesCombined,ChevronRight,Home,Landmark,LayoutDashboard,MoreHorizontal,PiggyBank,Plus,ReceiptText,Settings,Sparkles,Target,Users} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
import {LanguageContext,LanguageSelect,useT} from "@/components/providers/language-provider";
import {Logo} from "@/components/layout/logo";
import {useContext} from "react";

export type AppView="dashboard"|"family"|"transactions"|"budgets"|"accounts"|"goals"|"analytics"|"assistant"|"settings";
type Navigate=(view:AppView|"landing")=>void;
type Prefetch=(view:AppView)=>void;

export const APP_NAVIGATION=[
 ["dashboard","Dashboard",LayoutDashboard],
 ["family","Family Group",Users],
 ["transactions","Transactions",ReceiptText],
 ["budgets","Budgets",PiggyBank],
 ["accounts","Accounts",Landmark],
 ["goals","Goals",Target],
 ["analytics","Analytics",ChartNoAxesCombined],
 ["assistant","AI Assistant",Sparkles],
 ["settings","Settings",Settings],
] as const;

export function AppSidebar({view,go,prefetch}:{view:AppView;go:Navigate;prefetch?:Prefetch}){
 const t=useT();
 const {user}=useUser();
 const displayName=user?.fullName||user?.primaryEmailAddress?.emailAddress||"BudgetBuddy";
 const email=user?.primaryEmailAddress?.emailAddress||"";
 return <aside className="sidebar">
  <Logo go={()=>go("landing")}/>
  <small>{t("WORKSPACE")}</small>
  <nav aria-label={t("Main navigation")}>{APP_NAVIGATION.map(([id,label,Icon])=>
   <button type="button" className={view===id?"active":""} onClick={()=>go(id)} onMouseEnter={()=>prefetch?.(id)} onFocus={()=>prefetch?.(id)} key={id}><Icon/>{t(label)}{id==="assistant"&&<em>AI</em>}</button>
  )}</nav>
  <div className="plan"><b><Sparkles/>{t("Core plan")}</b><small>{t("12 days in trial")}</small><Progress value={60}/><button type="button">{t("View plan")}<ChevronRight/></button></div>
  <div className="profile"><UserButton/><b>{displayName}<small>{email}</small></b><MoreHorizontal/></div>
 </aside>;
}

export function AppHeader({view,quickAdd}:{view:AppView;quickAdd:ReactNode}){
 const t=useT();
 const {language}=useContext(LanguageContext);
 const label=APP_NAVIGATION.find(([id])=>id===view)?.[1]??"Dashboard";
 const locale=language==="tr"?"tr-TR":"en-US";
 const today=new Intl.DateTimeFormat(locale,{weekday:"long",day:"numeric",month:"long",timeZone:"Europe/Istanbul"}).format(new Date());
 const istanbulParts=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",timeZone:"Europe/Istanbul"}).formatToParts(new Date());
 const currentYear=Number(istanbulParts.find((part)=>part.type==="year")?.value);
 const currentMonth=Number(istanbulParts.find((part)=>part.type==="month")?.value)-1;
 const months=Array.from({length:3},(_,offset)=>{
  const date=new Date(Date.UTC(currentYear,currentMonth-offset,1));
  return {value:`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`,label:new Intl.DateTimeFormat(locale,{month:"long",year:"numeric",timeZone:"UTC"}).format(date)};
 });
 return <header>
  <div><h1>{t(label)}</h1><p>{view==="dashboard"?today:t("Manage your money with confidence.")}</p></div>
  <LanguageSelect/>
  <Select defaultValue={months[0].value}><SelectTrigger className="month-select" aria-label={t("Select month")}><SelectValue/></SelectTrigger><SelectContent>{months.map((month)=><SelectItem value={month.value} key={month.value}>{month.label}</SelectItem>)}</SelectContent></Select>
  <button type="button" aria-label={t("Notifications")}><Bell/></button>
  {quickAdd}
 </header>;
}

export function MobileNavigation({view,go,prefetch}:{view:AppView;go:Navigate;prefetch?:Prefetch}){
 const t=useT();
 const items=[["dashboard","Home",Home],["transactions","Transactions",ReceiptText],["add","Add",Plus],["budgets","Budgets",PiggyBank],["family","Family Group",Users]] as const;
 return <nav className="bottom" aria-label={t("Mobile navigation")}>{items.map(([id,label,Icon])=>
  <button type="button" className={(view===id?"active ":"")+(id==="add"?"add":"")} onClick={()=>go(id==="add"?"transactions":id)} onPointerEnter={()=>prefetch?.(id==="add"?"transactions":id)} onFocus={()=>prefetch?.(id==="add"?"transactions":id)} key={id}><Icon/>{t(label)}</button>
 )}</nav>;
}
