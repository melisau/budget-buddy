"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useFinanceDataVersion } from "@/lib/finance/data-events";

import { Check, Copy, Crown, MessageCircle, MoreHorizontal, Plus, Settings2, ReceiptText, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

import { toast } from "sonner";

import { LanguageContext } from "@/components/providers/language-provider";

import { PanelHead } from "@/components/budgetbuddy/shared";

import { FamilyCollaboration } from "@/components/budgetbuddy/family-collaboration";

import { TransactionForm } from "@/components/transactions/transaction-form";

import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { ProfileAvatarData } from "@/lib/profile/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

import { Progress } from "@/components/ui/progress";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FamilyMember = { avatar?: ProfileAvatarData | null; id: string; userId: string | null; name: string; email: string | null; role: "owner" | "member" | "viewer"; invitationStatus: "pending" | "accepted" | "declined" };

type FamilyGroup = { id: string; name: string; currency: string; ownerUserId: string; role: "owner" | "member" | "viewer"; members: FamilyMember[] };

type Invitation = { id: string; familyGroupId: string; groupName: string; role: "member" | "viewer" };

type Transaction = { id: string; title: string; amount: number; type: "income" | "expense"; familyGroupId: string | null; ownerUserId?: string | null; transactionDate: string; hasReceipt?: boolean };


function roleLabel(role: FamilyMember["role"], tr: boolean) { return role === "owner" ? (tr ? "Yönetici" : "Owner") : role === "member" ? (tr ? "Üye" : "Member") : (tr ? "Görüntüleyici" : "Viewer"); }

export function FamilyScreen() {

  const [createOpen, setCreateOpen] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);

  const { language } = useContext(LanguageContext);

  const tr = language === "tr";

  const [groups, setGroups] = useState<FamilyGroup[]>([]);

  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {

    setLoading(true);

    try {

      const [familyResult, inviteResult, transactionResult] = await Promise.all([fetch("/api/family"), fetch("/api/family/invitations"), fetch("/api/transactions")]);

      const [family, invite, transaction] = await Promise.all([familyResult.json(), inviteResult.json(), transactionResult.json()]) as [{ groups?: FamilyGroup[]; error?: string }, { invitations?: Invitation[] }, { transactions?: Transaction[] }];

      if (!familyResult.ok) throw new Error(family.error);

      setGroups(family.groups ?? []); setInvitations(invite.invitations ?? []); setTransactions(transaction.transactions ?? []);

      setSelectedGroupId((current) => current && (family.groups ?? []).some((group) => group.id === current) ? current : family.groups?.[0]?.id ?? "");

    } catch (error) {

      toast.error(error instanceof Error && error.message ? error.message : (tr ? "Aile verileri yüklenemedi." : "Unable to load family data."));

    } finally { setLoading(false); }

  }, [tr]);

  const dataVersion = useFinanceDataVersion();

  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, [dataVersion, reload]);

  const group = groups.find((item) => item.id === selectedGroupId) ?? null;

  const familyTransactions = useMemo(() => transactions.filter((item) => item.familyGroupId === group?.id), [transactions, group?.id]);

  const income = familyTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);

  const expenses = familyTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

  const money = (value: number) => new Intl.NumberFormat(tr ? "tr-TR" : "en-US", { style: "currency", currency: group?.currency ?? "TRY", maximumFractionDigits: 2 }).format(value);

  const respond = async (invitation: Invitation, accept: boolean) => {

    const response = await fetch(`/api/family/invitations/${invitation.id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept }) });

    const payload = await response.json().catch(() => ({})) as { error?: string };

    if (!response.ok) { toast.error(payload.error ?? (tr ? "Davet güncellenemedi." : "Unable to update invitation.")); return; }

    toast.success(accept ? (tr ? "Aile daveti kabul edildi." : "Family invitation accepted.") : (tr ? "Davet reddedildi." : "Invitation declined."));

    void reload();

  };

  if (loading && !groups.length) return null;

  if (!group) return <EmptyFamily invitations={invitations} onRespond={respond} onCreated={reload} tr={tr} />;

  const writable = group.role !== "viewer";

  const accepted = group.members.filter((member) => member.invitationStatus === "accepted");

  const spendTotal = Math.max(expenses, 1);

  return <section className="family-page">

    <header className="family-page-heading"><div><span className="family-eyebrow">{tr ? "AİLE ALANI" : "FAMILY SPACE"}</span>{groups.length > 1 ? <Select value={group.id} onValueChange={setSelectedGroupId}><SelectTrigger className="family-title-select" aria-label={tr ? "Aile grubu seç" : "Select family group"}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{groups.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select> : <h2>{group.name}</h2>}<p>{tr ? "Ortak bütçeniz ve günlük ihtiyaçlarınız, tek yerde." : "Your shared budget and daily needs, in one place."}</p></div><div className="family-page-actions">

      {group.role === "owner" && <InviteMember group={group} onComplete={reload} tr={tr} />}

      {writable && <FamilyTransaction group={group} onComplete={reload} tr={tr} />}

      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={tr ? "Grup seçenekleri" : "Group options"}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onSelect={() => setCreateOpen(true)}><Plus />{tr ? "Grup oluştur" : "Create group"}</DropdownMenuItem><DropdownMenuItem onSelect={() => setManageOpen(true)}><Settings2 />{tr ? "Grubu yönet" : "Manage group"}</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>

    </div></header>

    <CreateFamily onComplete={reload} tr={tr} open={createOpen} onOpenChange={setCreateOpen} />

    <GroupControls group={group} onComplete={reload} tr={tr} open={manageOpen} onOpenChange={setManageOpen} />

    {invitations.length > 0 && <div className="panel family-invites"><b>{tr ? "Bekleyen aile davetleri" : "Pending family invitations"}</b>{invitations.map((invite) => <div key={invite.id}><span>{invite.groupName} · {roleLabel(invite.role, tr)}</span><Button size="sm" onClick={() => void respond(invite, true)}>{tr ? "Kabul et" : "Accept"}</Button><Button size="sm" variant="outline" onClick={() => void respond(invite, false)}>{tr ? "Reddet" : "Decline"}</Button></div>)}</div>}

    <div className="family-banner"><div><span><Users /></span><div><small>{tr ? "AİLE TOPLAM BAKİYESİ" : "TOTAL FAMILY BALANCE"}</small><strong>{money(income - expenses)}</strong><p>{accepted.length} {tr ? "üye" : "members"}</p></div></div><div><b>{money(income)}<small>{tr ? "Toplam gelir" : "Total income"}</small></b><b>{money(expenses)}<small>{tr ? "Toplam gider" : "Total expenses"}</small></b><b>{income ? `${Math.max(0, (income - expenses) / income * 100).toFixed(1)}%` : "—"}<small>{tr ? "Tasarruf oranı" : "Savings rate"}</small></b></div></div>

    <FamilyCollaboration key={group.id} groupId={group.id} role={group.role} members={group.members} tr={tr} />

    <div className="family-grid">

      <article className="panel family-members"><PanelHead title={tr ? "Aile bireyleri" : "Family members"} sub={tr ? "Rol ve erişim durumları" : "Roles and access"} />{group.members.filter((member) => member.invitationStatus !== "declined").map((member) => <MemberRow key={member.id} group={group} member={member} tr={tr} onComplete={reload} />)}</article>

      <article className="panel family-spending"><PanelHead title={tr ? "Aile işlemleri" : "Family transactions"} sub={tr ? "İşlem sahibine göre giderler" : "Expenses by transaction owner"} />{accepted.map((member) => { const spent = member.userId ? familyTransactions.filter((item) => item.type === "expense" && item.ownerUserId === member.userId).reduce((sum, item) => sum + item.amount, 0) : 0; const percent = Math.round(spent / spendTotal * 100); return <div className="member-spend" key={member.id}><div><b>{member.name}</b><span>{money(spent)}</span></div><Progress value={percent} /><small>{percent}%</small></div>; })}</article>

      <article className="panel family-activity"><PanelHead title={tr ? "Aile hareketleri" : "Family activity"} sub={tr ? "Ortak kaydedilen son işlemler" : "Recent shared transactions"} />{familyTransactions.length ? familyTransactions.slice(0, 6).map((transaction) => <div className="family-tx" key={transaction.id}><span>{transaction.title.slice(0, 1).toUpperCase()}</span><div><b>{transaction.title}</b><small>{transaction.transactionDate}</small></div>{transaction.hasReceipt && <FamilyReceiptLink transactionId={transaction.id} tr={tr} />}<strong className={transaction.type === "income" ? "pos" : "neg"}>{transaction.type === "income" ? "+" : "−"}{money(transaction.amount)}</strong></div>) : <p className="empty-copy">{tr ? "Henüz ortak işlem yok." : "There are no shared transactions yet."}</p>}</article>

      <article className="panel family-rules"><PanelHead title={tr ? "Grup yetkileri" : "Group permissions"} sub={tr ? "Güvenli ortak kullanım" : "Safe shared access"} /><ul><li><Check /><span><b>{tr ? "Yönetici" : "Owner"}</b>{tr ? " davetleri ve rolleri yönetir." : " manages invitations and roles."}</span></li><li><Check /><span><b>{tr ? "Üye" : "Member"}</b>{tr ? " aile işlemi ekler." : " adds family transactions."}</span></li><li><Check /><span><b>{tr ? "Görüntüleyici" : "Viewer"}</b>{tr ? " verileri görür, değiştiremez." : " sees data but cannot change it."}</span></li></ul><p><ShieldCheck />{tr ? "İşlem kaydı, ekleyen kişiyi ve işlem sahibini saklar." : "Transaction records keep the creator and owner."}</p></article>

    </div>

  </section>;

}

function FamilyReceiptLink({ transactionId, tr }: { transactionId: string; tr: boolean }) {

  const [opening, setOpening] = useState(false);

  const open = async () => { setOpening(true); try { const response = await fetch(`/api/transactions/${transactionId}/receipt`, { cache: "no-store" }); const payload = await response.json() as { url?: string; error?: string }; if (!response.ok || !payload.url) throw new Error(payload.error); window.open(payload.url, "_blank", "noopener,noreferrer"); } catch (error) { toast.error(error instanceof Error && error.message ? error.message : (tr ? "Fiş açılamadı." : "Unable to open receipt.")); } finally { setOpening(false); } };

  return <Button variant="ghost" size="sm" className="family-receipt" disabled={opening} onClick={() => void open()}><ReceiptText />{tr ? "Fiş" : "Receipt"}</Button>;

}

function EmptyFamily({ invitations, onRespond, onCreated, tr }: { invitations: Invitation[]; onRespond: (invite: Invitation, accept: boolean) => Promise<void>; onCreated: () => Promise<void>; tr: boolean }) { return <section className="family-page"><div className="panel empty-family"><Users /><h2>{tr ? "Aile grubunu oluştur" : "Create a family group"}</h2><p>{tr ? "Ortak bütçeyi başlatın, ardından üyeleri e-posta adresleriyle davet edin." : "Start a shared budget, then invite members with their email addresses."}</p><CreateFamily onComplete={onCreated} tr={tr} />{invitations.length > 0 && <div className="family-invites">{invitations.map((invite) => <div key={invite.id}><span>{invite.groupName} · {roleLabel(invite.role, tr)}</span><Button size="sm" onClick={() => void onRespond(invite, true)}>{tr ? "Kabul et" : "Accept"}</Button><Button size="sm" variant="outline" onClick={() => void onRespond(invite, false)}>{tr ? "Reddet" : "Decline"}</Button></div>)}</div>}</div></section>; }

function CreateFamily({ onComplete, tr, open: controlledOpen, onOpenChange }: { onComplete: () => Promise<void>; tr: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) { const [name, setName] = useState(""); const [localOpen, setLocalOpen] = useState(false); const open = controlledOpen ?? localOpen; const setOpen = onOpenChange ?? setLocalOpen; const [saving, setSaving] = useState(false); const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); try { const response = await fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error); toast.success(tr ? "Aile grubu oluşturuldu." : "Family group created."); setOpen(false); setName(""); await onComplete(); } catch (error) { toast.error(error instanceof Error && error.message ? error.message : "Unable to create family group."); } finally { setSaving(false); } }; return <Dialog open={open} onOpenChange={setOpen}>{!onOpenChange && <DialogTrigger asChild><Button><Plus />{tr ? "Grup oluştur" : "Create group"}</Button></DialogTrigger>}<DialogContent><DialogHeader><DialogTitle>{tr ? "Yeni aile grubu" : "New family group"}</DialogTitle><DialogDescription>{tr ? "Grubun ilk yöneticisi siz olacaksınız." : "You will be the first owner of this group."}</DialogDescription></DialogHeader><form className="modal" onSubmit={submit}><label>{tr ? "Grup adı" : "Group name"}<Input value={name} onChange={(event) => setName(event.target.value)} placeholder={tr ? "Örn. Uyar Ailesi" : "e.g. Uyar Family"} /></label><Button disabled={saving} type="submit">{saving ? (tr ? "Oluşturuluyor…" : "Creating…") : (tr ? "Grubu oluştur" : "Create group")}</Button></form></DialogContent></Dialog>; }

function InviteMember({ group, onComplete, tr }: { group: FamilyGroup; onComplete: () => Promise<void>; tr: boolean }) {

  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");

  const [role, setRole] = useState<"member" | "viewer">("member");

  const [saving, setSaving] = useState(false);

  const [invitationUrl, setInvitationUrl] = useState("");

  const changeOpen = (next: boolean) => {

    setOpen(next);

    if (!next) { setEmail(""); setRole("member"); setInvitationUrl(""); }

  };

  const submit = async (event: React.FormEvent) => {

    event.preventDefault(); setSaving(true);

    try {

      const response = await fetch("/api/family/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ familyGroupId: group.id, email, role }) });

      const payload = await response.json() as { error?: string; invitationUrl?: string };

      if (!response.ok || !payload.invitationUrl) throw new Error(payload.error);

      setInvitationUrl(payload.invitationUrl);

      toast.success(tr ? "Davet hazır. Bağlantıyı aile bireyinizle paylaşın." : "Invitation ready. Share the link with your family member.");

      await onComplete();

    } catch (error) { toast.error(error instanceof Error && error.message ? error.message : "Unable to create invitation."); }

    finally { setSaving(false); }

  };

  const copyLink = async () => {

    try { await navigator.clipboard.writeText(invitationUrl); toast.success(tr ? "Davet bağlantısı kopyalandı." : "Invitation link copied."); }

    catch { toast.error(tr ? "Bağlantı kopyalanamadı." : "Unable to copy the link."); }

  };

  const shareOnWhatsApp = () => {

    const message = tr ? `${group.name} Budget Buddy aile grubuna davet edildin. Daveti görmek için bağlantıyı aç ve ${email} adresiyle giriş yap: ${invitationUrl}` : `You are invited to the ${group.name} Budget Buddy family group. Open the link and sign in with ${email}: ${invitationUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");

  };

  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger asChild><Button variant="outline"><UserPlus />{tr ? "Üye davet et" : "Invite member"}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr ? "Aile bireyi davet et" : "Invite a family member"}</DialogTitle><DialogDescription>{invitationUrl ? (tr ? "Davet kaydedildi. Bağlantıyı yalnızca davet ettiğiniz kişiyle paylaşın." : "Invitation saved. Share the link only with the invited person.") : (tr ? "E-posta adresi daveti doğrulamak için kullanılır; herhangi bir e-posta gönderilmez." : "The email address verifies the invitation; no email is sent.")}</DialogDescription></DialogHeader>{invitationUrl ? <div className="modal"><Input readOnly value={invitationUrl} aria-label={tr ? "Davet bağlantısı" : "Invitation link"} /><Button type="button" onClick={() => void copyLink()}><Copy />{tr ? "Bağlantıyı kopyala" : "Copy invitation link"}</Button><Button type="button" variant="outline" onClick={shareOnWhatsApp}><MessageCircle />{tr ? "WhatsApp'ta paylaş" : "Share on WhatsApp"}</Button><Button type="button" variant="ghost" onClick={() => changeOpen(false)}>{tr ? "Tamam" : "Done"}</Button></div> : <form className="modal" onSubmit={submit}><label>{tr ? "E-posta adresi" : "Email address"}<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="family@example.com" /></label><label>{tr ? "Rol" : "Role"}<Select value={role} onValueChange={(value) => setRole(value as "member" | "viewer")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">{tr ? "Üye" : "Member"}</SelectItem><SelectItem value="viewer">{tr ? "Görüntüleyici" : "Viewer"}</SelectItem></SelectContent></Select></label><Button disabled={saving} type="submit">{saving ? (tr ? "Hazırlanıyor…" : "Preparing…") : (tr ? "Davet bağlantısı oluştur" : "Create invitation link")}</Button></form>}</DialogContent></Dialog>;

}

function FamilyTransaction({ group, onComplete, tr }: { group: FamilyGroup; onComplete: () => Promise<void>; tr: boolean }) { const [open, setOpen] = useState(false); return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus />{tr ? "Aile işlemi ekle" : "Add family transaction"}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tr ? "Aile işlemi ekle" : "Add family transaction"}</DialogTitle><DialogDescription>{tr ? "Bu işlem yalnızca kendi adınıza kaydedilir; diğer üyeler görüntüleyebilir." : "This transaction is saved only in your name; other members can view it."}</DialogDescription></DialogHeader><TransactionForm familyGroupId={group.id} onSuccess={() => { setOpen(false); void onComplete(); }} /></DialogContent></Dialog>; }

function GroupControls({ group, onComplete, tr, open: controlledOpen, onOpenChange }: { group: FamilyGroup; onComplete: () => Promise<void>; tr: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) { const [localOpen, setLocalOpen] = useState(false); const open = controlledOpen ?? localOpen; const setOpen = onOpenChange ?? setLocalOpen; const [nextOwner, setNextOwner] = useState(""); const [saving, setSaving] = useState(false); const people = group.members.filter((member) => member.invitationStatus === "accepted" && member.userId && member.role !== "owner"); const request = async (url: string, method: string, body?: object) => { setSaving(true); try { const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); const payload = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(payload.error); setOpen(false); await onComplete(); } catch (error) { toast.error(error instanceof Error && error.message ? error.message : "Unable to update family group."); } finally { setSaving(false); } }; const transfer = () => { if (nextOwner) void request(`/api/family/${group.id}`, "PATCH", { transferOwnershipTo: nextOwner }); }; const leave = () => { if (window.confirm(tr ? "Bu aile grubundan ayrılmak istiyor musunuz?" : "Leave this family group?")) void request(`/api/family/${group.id}/leave`, "POST"); }; const remove = () => { if (window.confirm(tr ? "Aile grubu ve ortak verileri silinsin mi?" : "Delete this family group and its shared data?")) void request(`/api/family/${group.id}`, "DELETE"); }; return <Dialog open={open} onOpenChange={setOpen}>{!onOpenChange && <DialogTrigger asChild><Button variant="outline">{tr ? "Grubu yönet" : "Manage group"}</Button></DialogTrigger>}<DialogContent><DialogHeader><DialogTitle>{tr ? "Aile grubunu yönet" : "Manage family group"}</DialogTitle><DialogDescription>{group.role === "owner" ? (tr ? "Sahipliği devredebilir veya grubu silebilirsiniz." : "You can transfer ownership or delete the group.") : (tr ? "Bu gruptan ayrılabilirsiniz." : "You can leave this group.")}</DialogDescription></DialogHeader>{group.role === "owner" ? <div className="modal"><label>{tr ? "Yeni yönetici" : "New owner"}<Select value={nextOwner} onValueChange={setNextOwner}><SelectTrigger><SelectValue placeholder={tr ? "Üye seç" : "Choose a member"} /></SelectTrigger><SelectContent>{people.map((member) => <SelectItem key={member.id} value={member.userId!}>{member.name}</SelectItem>)}</SelectContent></Select></label><Button disabled={!nextOwner || saving} type="button" variant="outline" onClick={transfer}>{tr ? "Sahipliği devret" : "Transfer ownership"}</Button><Button disabled={saving} type="button" variant="destructive" onClick={remove}>{tr ? "Aile grubunu sil" : "Delete family group"}</Button></div> : <div className="modal"><Button disabled={saving} type="button" variant="destructive" onClick={leave}>{tr ? "Aile grubundan ayrıl" : "Leave family group"}</Button></div>}</DialogContent></Dialog>; }

function MemberRow({ group, member, onComplete, tr }: { group: FamilyGroup; member: FamilyMember; onComplete: () => Promise<void>; tr: boolean }) {
  const canManage = group.role === "owner" && member.role !== "owner";
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  async function update(method: "PATCH" | "DELETE", role?: "member" | "viewer") {
    setBusy(true);
    try {
      const response = await fetch(`/api/family/${group.id}/members/${member.id}`, { method, headers: { "Content-Type": "application/json" }, body: role ? JSON.stringify({ role }) : undefined });
      if (!response.ok) throw new Error();
      toast.success(method === "DELETE" ? (tr ? "Üye kaldırıldı." : "Member removed.") : (tr ? "Rol güncellendi." : "Role updated."));
      await onComplete();
    } catch { toast.error(tr ? "Üye güncellenemedi. Tekrar deneyin." : "Unable to update member. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="family-member-row"><ProfileAvatar name={member.name} avatar={member.avatar} /><div className="family-member-identity"><b>{member.name}</b><div className="family-member-labels"><Badge variant="secondary" className="family-role-badge" data-role={member.role}>{member.role === "owner" && <Crown aria-hidden="true" />}{roleLabel(member.role, tr)}</Badge>{member.invitationStatus === "pending" && <span className="family-invite-status">{tr ? "Davet bekliyor" : "Invitation pending"}</span>}</div></div>
    {canManage && <><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busy} aria-label={`${member.name}: ${tr ? "Üye seçenekleri" : "Member options"}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem disabled={member.role === "member"} onSelect={() => void update("PATCH", "member")}><Users />{tr ? "Üye yap" : "Make member"}</DropdownMenuItem><DropdownMenuItem disabled={member.role === "viewer"} onSelect={() => void update("PATCH", "viewer")}><ShieldCheck />{tr ? "Görüntüleyici yap" : "Make viewer"}</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setRemoving(true)}><Trash2 />{tr ? "Üyeyi kaldır" : "Remove member"}</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
    <AlertDialog open={removing} onOpenChange={setRemoving}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{tr ? "Üye kaldırılsın mı?" : "Remove this member?"}</AlertDialogTitle><AlertDialogDescription>{tr ? "Bu kişinin aile grubuna erişimi kaldırılır. Daha sonra yeniden davet edebilirsin." : "Their access to this family group will be removed. You can invite them again later."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{tr ? "Vazgeç" : "Cancel"}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={() => void update("DELETE")}>{tr ? "Kaldır" : "Remove"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}
  </div>;
}
