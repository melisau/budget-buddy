"use client";
import {BrandMark} from "@/components/brand/brand-mark";

export function Logo({go}:{go?:()=>void}){
 return <button type="button" className="logo" onClick={go} aria-label="BudgetBuddy"><BrandMark size={36} className="logo-mark"/>Budget<b>Buddy</b></button>;
}
