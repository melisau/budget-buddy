"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Crown, ImagePlus, MoreHorizontal, Plus, ReceiptText, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { LanguageContext } from "@/components/providers/language-provider";
import { PanelHead } from "@/components/budgetbuddy/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyReceiptDraft } from "@/types/finance";

const members = [
  ["Melisa", "Owner · You", "MU", "#5267df"],
  ["Berk", "Member", "BC", "#2c9b7b"],
  ["Birdal", "Member", "BU", "#d47a62"],
  ["Nevin", "Viewer", "NM", "#9b72cf"],
] as const;

const memberSpending = [
  ["Melisa", 21300, 41],
  ["Berk", 16850, 33],
  ["Birdal", 8290, 16],
  ["Nevin", 4990, 10],
] as const;

type TransactionType = "expense" | "income";
type FamilyActivity = {
  id: string;
  creator: string;
  owner: string;
  label: string;
  labelTr?: string;
  amount: number;
  receiptName?: string;
  userAdded?: boolean;
};

const storageKey = "budgetbuddy-family-activities:v1";
const defaultActivities: FamilyActivity[] = [
  { id: "default-groceries", creator: "Melisa", owner: "Berk", label: "Groceries", labelTr: "Market alışverişi", amount: -1850 },
  { id: "default-electricity", creator: "Berk", owner: "family", label: "Electricity bill", labelTr: "Elektrik faturası", amount: -1240 },
  { id: "default-pension", creator: "Birdal", owner: "Birdal", label: "Pension", labelTr: "Emekli maaşı", amount: 18500 },
];

export function FamilyScreen() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [activities, setActivities] = useState<FamilyActivity[]>(defaultActivities);

  useEffect(() => {
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as FamilyActivity[];
      if (Array.isArray(parsed)) restoreTimer = setTimeout(() => setActivities(parsed), 0);
    } catch {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Storage can be unavailable in privacy-focused browser modes.
      }
    }
    return () => { if (restoreTimer) clearTimeout(restoreTimer); };
  }, []);

  const addActivity = (activity: Omit<FamilyActivity, "id" | "creator" | "userAdded">) => {
    const nextActivity: FamilyActivity = {
      ...activity,
      id: window.crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      creator: "Melisa",
      userAdded: true,
    };
    setActivities((current) => {
      const next = [nextActivity, ...current];
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The current session still keeps the activity when storage is unavailable.
      }
      return next;
    });
  };

  const addedActivities = activities.filter((activity) => activity.userAdded);
  const addedIncome = addedActivities.reduce((total, activity) => total + Math.max(0, activity.amount), 0);
  const addedExpenses = addedActivities.reduce((total, activity) => total + Math.max(0, -activity.amount), 0);
  const familyBalance = 146850 + addedIncome - addedExpenses;
  const familyIncome = 92000 + addedIncome;
  const familyExpenses = 51430 + addedExpenses;
  const savingsRate = familyIncome ? Math.max(0, (familyIncome - familyExpenses) / familyIncome * 100) : 0;
  const formatMoney = (value: number) => `₺${value.toLocaleString(tr ? "tr-TR" : "en-US", { maximumFractionDigits: 2 })}`;

  return <section className="family-page">
    <div className="page-head">
      <div><h2>{tr ? "Uyar Ailesi bütçesi" : "Uyar Family budget"}</h2><p>{tr ? "Ailenizin ortak gelir, gider ve hedeflerini tek yerden takip edin." : "Track shared income, expenses, and goals in one place."}</p></div>
      <div className="family-actions"><InviteMember /><FamilyTransaction onSave={addActivity} /></div>
    </div>
    <div className="family-banner">
      <div><span><Users /></span><div><small>{tr ? "AİLE TOPLAM BAKİYESİ" : "TOTAL FAMILY BALANCE"}</small><strong>{formatMoney(familyBalance)}</strong><p>{tr ? "4 aile bireyi · Eylül 2026" : "4 family members · September 2026"}</p></div></div>
      <div><b>{formatMoney(familyIncome)}<small>{tr ? "Toplam gelir" : "Total income"}</small></b><b>{formatMoney(familyExpenses)}<small>{tr ? "Toplam gider" : "Total expenses"}</small></b><b>{savingsRate.toLocaleString(tr ? "tr-TR" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%<small>{tr ? "Tasarruf oranı" : "Savings rate"}</small></b></div>
    </div>
    <div className="family-grid">
      <article className="panel family-members">
        <PanelHead title={tr ? "Aile bireyleri" : "Family members"} sub={tr ? "Rol ve erişim durumları" : "Roles and access"} />
        {members.map((member, index) => <div className="member" key={member[0]}><span style={{ background: member[3] }}>{member[2]}</span><b>{member[0]}<small>{tr ? member[1].replace("Owner · You", "Yönetici · Sen").replace("Member", "Üye").replace("Viewer", "Görüntüleyici") : member[1]}</small></b>{index === 0 && <Crown />}<button type="button" aria-label={tr ? "Üye işlemleri" : "Member actions"}><MoreHorizontal /></button></div>)}
      </article>
      <article className="panel family-spending">
        <PanelHead title={tr ? "Kişiye göre harcama" : "Spending by member"} sub={tr ? "Bu ay" : "This month"} />
        {memberSpending.map(([name, amount, percentage]) => <div className="member-spend" key={name}><div><b>{name}</b><span>{formatMoney(amount)}</span></div><Progress value={percentage} /><small>{percentage}%</small></div>)}
      </article>
      <article className="panel family-activity">
        <PanelHead title={tr ? "Aile hareketleri" : "Family activity"} sub={tr ? "Kim, kimin için işlem ekledi" : "Who added what for whom"} />
        {activities.map((activity) => <div className="family-tx" key={activity.id}>
          <span>{activity.creator.slice(0, 1)}</span>
          <div><b>{tr && activity.labelTr ? activity.labelTr : activity.label}</b><small>{activity.creator} → {activity.owner === "family" ? (tr ? "Aile" : "Family") : activity.owner}{activity.receiptName && <em><ReceiptText />{activity.receiptName}</em>}</small></div>
          <strong className={activity.amount > 0 ? "pos" : "neg"}>{activity.amount > 0 ? "+" : "−"}{formatMoney(Math.abs(activity.amount))}</strong>
        </div>)}
      </article>
      <article className="panel family-rules">
        <PanelHead title={tr ? "Grup yetkileri" : "Group permissions"} sub={tr ? "Güvenli ortak kullanım" : "Safe shared access"} />
        <ul>
          <li><Check /><span><b>{tr ? "Yönetici" : "Owner"}</b>{tr ? " Üye davet eder ve rolleri yönetir." : " invites members and manages roles."}</span></li>
          <li><Check /><span><b>{tr ? "Üye" : "Member"}</b>{tr ? " Kendisi veya aile için işlem ekler." : " adds transactions for self or family."}</span></li>
          <li><Check /><span><b>{tr ? "Görüntüleyici" : "Viewer"}</b>{tr ? " Bütçeyi görür, değiştiremez." : " can view but cannot edit."}</span></li>
        </ul>
        <p><ShieldCheck />{tr ? "Her işlemde ekleyen kişi ve işlem sahibi kaydedilir." : "Every transaction records its creator and owner."}</p>
      </article>
    </div>
  </section>;
}

function InviteMember() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  return <Dialog><DialogTrigger asChild><Button variant="outline"><UserPlus />{tr ? "Üye davet et" : "Invite member"}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr ? "Aile bireyi davet et" : "Invite a family member"}</DialogTitle><DialogDescription>{tr ? "E-posta adresini ve gruptaki rolünü belirleyin." : "Choose their email address and group role."}</DialogDescription></DialogHeader><form className="modal"><label>{tr ? "E-posta adresi" : "Email address"}<Input type="email" placeholder="family@example.com" /></label><label>{tr ? "Rol" : "Role"}<Select defaultValue="member"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">{tr ? "Üye" : "Member"}</SelectItem><SelectItem value="viewer">{tr ? "Görüntüleyici" : "Viewer"}</SelectItem></SelectContent></Select></label><Button type="button">{tr ? "Daveti gönder" : "Send invitation"}</Button></form></DialogContent></Dialog>;
}

function FamilyTransaction({ onSave }: { onSave: (activity: Omit<FamilyActivity, "id" | "creator" | "userAdded">) => void }) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState("family");
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<FamilyReceiptDraft | null>(null);
  const receiptRef = useRef<FamilyReceiptDraft | null>(null);

  useEffect(() => {
    receiptRef.current = receipt;
  }, [receipt]);

  useEffect(() => () => {
    if (receiptRef.current) URL.revokeObjectURL(receiptRef.current.previewUrl);
  }, []);

  const clearReceipt = () => setReceipt((current) => {
    if (current) URL.revokeObjectURL(current.previewUrl);
    return null;
  });

  const chooseReceipt = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(tr ? "Görsel en fazla 5 MB olabilir." : "The image must be 5 MB or smaller.");
      return;
    }
    setError("");
    setReceipt((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return { name: file.name, size: file.size, previewUrl: URL.createObjectURL(file) };
    });
  };

  const resetForm = () => {
    setOwner("family");
    setTransactionType("expense");
    setAmount("");
    setDescription("");
    setCategory("");
    setAccount("");
    setError("");
    clearReceipt();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const saveTransaction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount.replace(/\s|₺/g, "").replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(tr ? "Geçerli bir tutar girin." : "Enter a valid amount.");
      return;
    }
    if (!description.trim()) {
      setError(tr ? "Açıklama alanını doldurun." : "Enter a description.");
      return;
    }
    if (!category || !account) {
      setError(tr ? "Kategori ve hesap seçin." : "Select a category and account.");
      return;
    }

    onSave({ owner, label: description.trim(), amount: transactionType === "expense" ? -numericAmount : numericAmount, receiptName: receipt?.name });
    toast.success(tr ? "Aile işlemi kaydedildi." : "Family transaction saved.");
    setOpen(false);
    resetForm();
  };

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button><Plus />{tr ? "Aile işlemi ekle" : "Add family transaction"}</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>{tr ? "Aile işlemi ekle" : "Add family transaction"}</DialogTitle><DialogDescription>{tr ? "İşlemin kimin için olduğunu seçin. Ekleyen kişi otomatik kaydedilir." : "Choose who this transaction belongs to. Its creator is recorded automatically."}</DialogDescription></DialogHeader>
      <form className="modal" onSubmit={saveTransaction}>
        <label>{tr ? "İşlem sahibi" : "Transaction owner"}<Select value={owner} onValueChange={setOwner}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="family">{tr ? "Ortak aile bütçesi" : "Shared family budget"}</SelectItem><SelectItem value="Melisa">Melisa</SelectItem><SelectItem value="Berk">Berk</SelectItem><SelectItem value="Birdal">Birdal</SelectItem></SelectContent></Select></label>
        <div className="type"><button type="button" className={transactionType === "expense" ? "active" : ""} onClick={() => setTransactionType("expense")}>{tr ? "Gider" : "Expense"}</button><button type="button" className={transactionType === "income" ? "active" : ""} onClick={() => setTransactionType("income")}>{tr ? "Gelir" : "Income"}</button></div>
        <label>{tr ? "Tutar" : "Amount"}<Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="₺0,00" /></label>
        <label>{tr ? "Açıklama" : "Description"}<Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={tr ? "Örn. Market alışverişi" : "e.g. Groceries"} /></label>
        <div className="form-grid">
          <label>{tr ? "Kategori" : "Category"}<Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder={tr ? "Kategori seç" : "Select category"} /></SelectTrigger><SelectContent><SelectItem value="food">{tr ? "Market" : "Groceries"}</SelectItem><SelectItem value="home">{tr ? "Ev" : "Housing"}</SelectItem></SelectContent></Select></label>
          <label>{tr ? "Hesap" : "Account"}<Select value={account} onValueChange={setAccount}><SelectTrigger><SelectValue placeholder={tr ? "Hesap seç" : "Select account"} /></SelectTrigger><SelectContent><SelectItem value="family">{tr ? "Aile hesabı" : "Family account"}</SelectItem><SelectItem value="cash">{tr ? "Nakit" : "Cash"}</SelectItem></SelectContent></Select></label>
        </div>
        <div className="receipt-field">
          <div><b>{tr ? "Fiş veya belge görseli" : "Receipt or document image"}</b><small>{tr ? "İsteğe bağlı · JPG, PNG veya WEBP · en fazla 5 MB" : "Optional · JPG, PNG or WEBP · up to 5 MB"}</small></div>
          {receipt ? <div className="receipt-preview"><Image src={receipt.previewUrl} alt={tr ? "Seçilen fiş önizlemesi" : "Selected receipt preview"} width={120} height={120} unoptimized /><span><Check />{tr ? "Görsel hazır" : "Image ready"}<button type="button" onClick={clearReceipt}>{tr ? "Kaldır" : "Remove"}</button></span></div> : <label className="receipt-upload"><ImagePlus /><span><b>{tr ? "Görsel ekle" : "Add image"}</b><small>{tr ? "Kameradan çek veya galeriden seç" : "Take a photo or choose from gallery"}</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseReceipt(event.target.files?.[0])} /></label>}
        </div>
        <p className="receipt-visibility"><Users />{tr ? "Bu görsel aile grubundaki yetkili kişiler tarafından görüntülenebilir." : "This image will be visible to authorized family group members."}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit">{tr ? "İşlemi kaydet" : "Save transaction"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
