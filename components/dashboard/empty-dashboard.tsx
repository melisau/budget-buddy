import { Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyDashboardProps {
  onAddTransaction: () => void;
  language: "en" | "tr";
}

export function EmptyDashboard({ onAddTransaction, language }: EmptyDashboardProps) {
  const isTurkish = language === "tr";

  return (
    <section className="panel empty-state dashboard-empty">
      <WalletCards aria-hidden="true" />
      <div>
        <h2>{isTurkish ? "Henüz işlem yok." : "No transactions yet."}</h2>
        <p>
          {isTurkish
            ? "Finansal görünümünü görmek için ilk gelirini veya giderini ekle."
            : "Add your first income or expense to start seeing your financial overview."}
        </p>
      </div>
      <Button onClick={onAddTransaction}>
        <Plus />
        {isTurkish ? "İşlem ekle" : "Add transaction"}
      </Button>
    </section>
  );
}
