"use client";
import {BrandMark} from "@/components/brand/brand-mark";

/** The landing page uses the wordmark alone (mark={false}); the app and sign-in pages show the icon too. */
export function Logo({go,mark=true}:{go?:()=>void;mark?:boolean}){
 return <button type="button" className="logo" onClick={go} aria-label="BudgetBuddy">{mark&&<BrandMark size={36} className="logo-mark"/>}Budget<b>Buddy</b></button>;
}
