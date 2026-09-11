"use client";
import {WalletCards} from "lucide-react";

export function Logo({go}:{go?:()=>void}){
 return <button type="button" className="logo" onClick={go}><span><WalletCards/></span>Budget<b>Buddy</b></button>;
}
