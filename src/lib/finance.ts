import { SettingsDB } from "./db";

export type TransactionType = "income" | "expense";

export type TransactionCategory =
  | "photo_session"
  | "reprint"
  | "event_rental"
  | "digital_package"
  | "other_income"
  | "paper_ribbon"
  | "props_decor"
  | "space_electricity"
  | "staff_salary"
  | "maintenance"
  | "marketing"
  | "other_expense";

export type PaymentMethod = "cash" | "qris" | "transfer" | "debit" | "other";

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  description: string;
  notes?: string;
  date: string; // YYYY-MM-DD or ISO string
  sessionCode?: string;
  createdAt: string;
}

export const INCOME_CATEGORIES: { id: TransactionCategory; label: string; emoji: string }[] = [
  { id: "photo_session", label: "Sesi Foto Booth", emoji: "" },
  { id: "reprint", label: "Cetak Tambahan / Ulang", emoji: "" },
  { id: "event_rental", label: "Sewa Booth Event / Wedding", emoji: "" },
  { id: "digital_package", label: "Paket File Digital", emoji: "" },
  { id: "other_income", label: "Pemasukan Lainnya", emoji: "" },
];

export const EXPENSE_CATEGORIES: { id: TransactionCategory; label: string; emoji: string }[] = [
  { id: "paper_ribbon", label: "Kertas Foto & Ribbon / Tinta", emoji: "" },
  { id: "props_decor", label: "Properti & Aksesoris Foto", emoji: "" },
  { id: "space_electricity", label: "Sewa Tempat & Listrik / WiFi", emoji: "" },
  { id: "staff_salary", label: "Gaji Operator / Tim Booth", emoji: "" },
  { id: "maintenance", label: "Servis & Perawatan Alat", emoji: "" },
  { id: "marketing", label: "Promosi & Iklan", emoji: "" },
  { id: "other_expense", label: "Pengeluaran Lainnya", emoji: "" },
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; emoji: string }[] = [
  { id: "cash", label: "Tunai (Cash)", icon: "", emoji: "" },
  { id: "qris", label: "QRIS", icon: "", emoji: "" },
  { id: "transfer", label: "Transfer Bank", icon: "", emoji: "" },
  { id: "debit", label: "Kartu Debit / EDC", icon: "", emoji: "" },
  { id: "other", label: "Lainnya", icon: "", emoji: "" },
];

export function formatRupiah(amount: number): string {
  return "Rp " + Math.round(amount || 0).toLocaleString("id-ID");
}

export function getCategoryInfo(category: TransactionCategory) {
  return ALL_CATEGORIES.find((c) => c.id === category) || { id: category, label: category, emoji: "" };
}

export function getPaymentMethodInfo(method: PaymentMethod) {
  return PAYMENT_METHODS.find((m) => m.id === method) || { id: method, label: method, icon: "", emoji: "" };
}

export class FinanceDB {
  private localKey = "yodha_finance_transactions";
  private settingsDB = new SettingsDB();

  async getTransactions(): Promise<FinanceTransaction[]> {
    const local = this.getLocal();
    try {
      const fromSettings = await this.settingsDB.getSetting<FinanceTransaction[]>("finance_transactions", local);
      if (Array.isArray(fromSettings) && fromSettings.length > 0) {
        this.saveLocal(fromSettings);
        return fromSettings;
      }
    } catch {}
    return local;
  }

  async saveTransaction(tx: Omit<FinanceTransaction, "id" | "createdAt"> & { id?: string }): Promise<FinanceTransaction> {
    const list = await this.getTransactions();
    const newTx: FinanceTransaction = {
      ...tx,
      id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTx, ...list.filter((t) => t.id !== newTx.id)];
    this.saveLocal(updated);
    try {
      await this.settingsDB.saveSetting("finance_transactions", updated);
    } catch {}
    return newTx;
  }

  async updateTransaction(id: string, patch: Partial<FinanceTransaction>): Promise<void> {
    const list = await this.getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch };
      this.saveLocal(list);
      try {
        await this.settingsDB.saveSetting("finance_transactions", list);
      } catch {}
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    const list = await this.getTransactions();
    const filtered = list.filter((t) => t.id !== id);
    this.saveLocal(filtered);
    try {
      await this.settingsDB.saveSetting("finance_transactions", filtered);
    } catch {}
  }

  private getLocal(): FinanceTransaction[] {
    try {
      const data = localStorage.getItem(this.localKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocal(data: FinanceTransaction[]): void {
    try {
      localStorage.setItem(this.localKey, JSON.stringify(data));
    } catch {}
  }
}
