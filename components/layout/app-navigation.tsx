"use client";
import { useAuthUser } from "@/components/providers/auth-provider";
import {useContext,useState,type ReactNode} from "react";
import {ChartNoAxesCombined,ChevronRight,Gift,Home,Landmark,LayoutDashboard,MoreHorizontal,PiggyBank,Plus,ReceiptText,Settings,Sparkles,Target,Users} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import {Sheet,SheetClose,SheetContent,SheetDescription,SheetHeader,SheetTitle,SheetTrigger} from "@/components/ui/sheet";
import {LanguageContext,LanguageSelect,useT} from "@/components/providers/language-provider";
import {Logo} from "@/components/layout/logo";

export type AppView="dashboard"|"family"|"wishlists"|"transactions"|"budgets"|"accounts"|"goals"|"analytics"|"assistant"|"settings";
type Navigate=(view:AppView|"landing")=>void;
type Prefetch=(view:AppView)=>void;

export const APP_NAVIGATION=[
 ["dashboard","Dashboard",LayoutDashboard],
 ["family","Family Group",Users],
 ["wishlists","Wishlists",Gift],
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
 const {user}=useAuthUser();
 const displayName=typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : user?.email||"BudgetBuddy";
 const email=user?.email||"";
 return <aside className="sidebar">
  <Logo go={()=>go("landing")}/>
  <small>{t("WORKSPACE")}</small>
  <nav aria-label={t("Main navigation")}>{APP_NAVIGATION.map(([id,label,Icon])=>
   <button type="button" className={view===id?"active":""} aria-current={view===id?"page":undefined} onClick={()=>go(id)} onMouseEnter={()=>prefetch?.(id)} onFocus={()=>prefetch?.(id)} key={id}><Icon aria-hidden="true"/>{t(label)}{id==="assistant"&&<em>AI</em>}</button>
  )}</nav>
  <div className="plan"><b><Sparkles aria-hidden="true"/>{t("Core plan")}</b><small>{t("12 days in trial")}</small><Progress value={60} aria-label={t("Trial progress")} /><button type="button" onClick={()=>go("settings")}>{t("View plan")}<ChevronRight aria-hidden="true"/></button></div>
  <div className="profile"><button type="button" onClick={()=>go("settings")} aria-label={t("Manage account")}><Settings aria-hidden="true"/></button><b>{displayName}<small>{email}</small></b></div>
 </aside>;
}

export function AppHeader({view,quickAdd}:{view:AppView;quickAdd:ReactNode}){
 const t=useT();
 const {language}=useContext(LanguageContext);
 const label=APP_NAVIGATION.find(([id])=>id===view)?.[1]??"Dashboard";
 const locale=language==="tr"?"tr-TR":"en-US";
 const today=new Intl.DateTimeFormat(locale,{weekday:"long",day:"numeric",month:"long",timeZone:"Europe/Istanbul"}).format(new Date());
 return <header>
  <div><h1>{t(label)}</h1><p>{view==="dashboard"?today:t("Manage your money with confidence.")}</p></div>
  <LanguageSelect/>
  {quickAdd}
 </header>;
}

export function MobileNavigation({view,go,prefetch}:{view:AppView;go:Navigate;prefetch?:Prefetch}){
 const t=useT();
 const [moreOpen,setMoreOpen]=useState(false);
 const items=[["dashboard","Home",Home],["transactions","Transactions",ReceiptText],["add","Add",Plus],["assistant","AI Assistant",Sparkles]] as const;
 const moreItems=APP_NAVIGATION.filter(([id])=>!["dashboard","transactions","assistant"].includes(id));
 const moreActive=moreItems.some(([id])=>id===view);
 const navigate=(destination:AppView)=>{
  setMoreOpen(false);
  go(destination);
 };
 return <nav className="bottom" aria-label={t("Mobile navigation")}>{items.map(([id,label,Icon])=>
  <button type="button" className={(view===id?"active ":"")+(id==="add"?"add":"")} aria-current={view===id?"page":undefined} onClick={()=>go(id==="add"?"transactions":id)} onPointerEnter={()=>prefetch?.(id==="add"?"transactions":id)} onFocus={()=>prefetch?.(id==="add"?"transactions":id)} key={id}><Icon aria-hidden="true"/>{t(label)}</button>
 )}<Sheet open={moreOpen} onOpenChange={setMoreOpen}>
  <SheetTrigger asChild><button type="button" className={moreActive?"active":""} aria-expanded={moreOpen}><MoreHorizontal aria-hidden="true"/>{t("More")}</button></SheetTrigger>
  <SheetContent side="bottom" className="mobile-more-sheet" showCloseButton={false}>
   <SheetHeader><SheetTitle>{t("More")}</SheetTitle><SheetDescription>{t("Manage your money with confidence.")}</SheetDescription></SheetHeader>
   <div className="mobile-more-list">{moreItems.map(([id,label,Icon])=><button type="button" className={view===id?"active":""} aria-current={view===id?"page":undefined} onClick={()=>navigate(id)} onPointerEnter={()=>prefetch?.(id)} onFocus={()=>prefetch?.(id)} key={id}><Icon aria-hidden="true"/><span>{t(label)}</span><ChevronRight aria-hidden="true"/></button>)}</div>
   <SheetClose asChild><button type="button" className="mobile-more-close">{t("Close")}</button></SheetClose>
  </SheetContent>
 </Sheet></nav>;
}
