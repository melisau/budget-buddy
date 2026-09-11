"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import type {ReactNode} from "react";
import {Bell,ChartNoAxesCombined,ChevronRight,Home,Landmark,LayoutDashboard,MoreHorizontal,PiggyBank,Plus,ReceiptText,Settings,Sparkles,Target,Users} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "@/components/ui/select";
import {LanguageSelect,useT} from "@/components/providers/language-provider";
import {Logo} from "@/components/layout/logo";

export type AppView="dashboard"|"family"|"transactions"|"budgets"|"accounts"|"goals"|"analytics"|"assistant"|"settings";
type Navigate=(view:AppView|"landing")=>void;

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

export function AppSidebar({view,go}:{view:AppView;go:Navigate}){
 const t=useT();
 const {user}=useUser();
 const displayName=user?.fullName||user?.primaryEmailAddress?.emailAddress||"BudgetBuddy";
 const email=user?.primaryEmailAddress?.emailAddress||"";
 return <aside className="sidebar">
  <Logo go={()=>go("landing")}/>
  <small>{t("WORKSPACE")}</small>
  <nav aria-label={t("Main navigation")}>{APP_NAVIGATION.map(([id,label,Icon])=>
   <button type="button" className={view===id?"active":""} onClick={()=>go(id)} key={id}><Icon/>{t(label)}{id==="assistant"&&<em>AI</em>}</button>
  )}</nav>
  <div className="plan"><b><Sparkles/>{t("Core plan")}</b><small>{t("12 days in trial")}</small><Progress value={60}/><button type="button">{t("View plan")}<ChevronRight/></button></div>
  <div className="profile"><UserButton/><b>{displayName}<small>{email}</small></b><MoreHorizontal/></div>
 </aside>;
}

export function AppHeader({view,quickAdd}:{view:AppView;quickAdd:ReactNode}){
 const t=useT();
 const label=APP_NAVIGATION.find(([id])=>id===view)?.[1]??"Dashboard";
 return <header>
  <div><h1>{t(label)}</h1><p>{view==="dashboard"?t("Thursday, September 10"):t("Manage your money with confidence.")}</p></div>
  <LanguageSelect/>
  <Select defaultValue="sep"><SelectTrigger className="month-select" aria-label={t("Select month")}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="sep">{t("September 2026")}</SelectItem><SelectItem value="aug">{t("August 2026")}</SelectItem><SelectItem value="jul">{t("July 2026")}</SelectItem></SelectContent></Select>
  <button type="button" aria-label={t("Notifications")}><Bell/></button>
  {quickAdd}
 </header>;
}

export function MobileNavigation({view,go}:{view:AppView;go:Navigate}){
 const t=useT();
 const items=[["dashboard","Home",Home],["transactions","Transactions",ReceiptText],["add","Add",Plus],["budgets","Budgets",PiggyBank],["family","Family Group",Users]] as const;
 return <nav className="bottom" aria-label={t("Mobile navigation")}>{items.map(([id,label,Icon])=>
  <button type="button" className={(view===id?"active ":"")+(id==="add"?"add":"")} onClick={()=>go(id==="add"?"transactions":id)} key={id}><Icon/>{t(label)}</button>
 )}</nav>;
}
