"use client";
import {WalletCards} from "lucide-react";

export function Logo({go}:{go?:()=>void}){
 return <button type="button" className="logo" onClick={go} aria-label="BudgetBuddy"><span><WalletCards aria-hidden="true"/></span>Budget<b>Buddy</b></button>;
}
