import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as expensesApi from "../api/expenses.js";
import { DEFAULT_WALLETS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, WALLET_CONFIG } from "../constants/money.js";

const ExpensesContext = createContext(null);

export function ExpensesProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [initialWallets, setInitialWallets] = useState(DEFAULT_WALLETS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [walletData, expenseData] = await Promise.all([
        expensesApi.getWallets(),
        expensesApi.getExpenses(),
      ]);
      setInitialWallets(walletData);
      setExpenses(expenseData);
    } catch (err) {
      console.error("Ma'lumotlarni yuklashda xatolik:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Hozirgi real vaqt balansi (Boshlang'ich balans + Daromadlar - Xarajatlar + O'tkazmalar)
  const currentBalances = useMemo(() => {
    let naqd = Number(initialWallets.naqd || 0);
    let karta = Number(initialWallets.karta || 0);

    let totalExpense = 0;
    let totalIncome = 0;

    for (const item of expenses) {
      const amt = Number(item.amount || 0);
      const type = item.type || "expense";
      const method = item.paymentMethod || item.wallet || "naqd";

      if (type === "expense") {
        totalExpense += amt;
        if (method === "naqd") {
          naqd -= amt;
        } else {
          karta -= amt;
        }
      } else if (type === "income") {
        totalIncome += amt;
        if (method === "naqd") {
          naqd += amt;
        } else {
          karta += amt;
        }
      } else if (type === "transfer") {
        const from = item.fromWallet || (method === "naqd" ? "naqd" : "karta");
        const to = item.toWallet || (from === "karta" ? "naqd" : "karta");
        if (from === "naqd") naqd -= amt;
        if (from === "karta") karta -= amt;
        if (to === "naqd") naqd += amt;
        if (to === "karta") karta += amt;
      }
    }

    return {
      naqd,
      karta,
      total: naqd + karta,
      totalExpense,
      totalIncome,
    };
  }, [initialWallets, expenses]);

  const addExpense = useCallback(
    async (payload) => {
      await expensesApi.addExpense(payload);
      await refresh();
    },
    [refresh]
  );

  const updateExpense = useCallback(
    async (id, updates) => {
      await expensesApi.updateExpense(id, updates);
      await refresh();
    },
    [refresh]
  );

  const deleteExpense = useCallback(
    async (id) => {
      await expensesApi.deleteExpense(id);
      await refresh();
    },
    [refresh]
  );

  const updateWallets = useCallback(
    async (updates) => {
      const saved = await expensesApi.updateWallets(updates);
      setInitialWallets(saved);
      await refresh();
    },
    [refresh]
  );

  const downloadBackup = useCallback(async () => {
    const backup = await expensesApi.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oybek-system-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadCSV = useCallback(() => {
    if (!expenses.length) return;

    const headers = [
      "ID",
      "Sana (spentAt)",
      "Turi",
      "To'lov usuli (paymentMethod)",
      "Kategoriya",
      "Kichik kategoriya (subcategory)",
      "Miqdor (so'm)",
      "Soni (quantity)",
      "Sabab/Nima olindi (reason)",
      "Joy (location)",
      "Yaratilgan vaqti (createdAt)",
      "O'zgarishlar soni",
    ];

    const categoryMap = {};
    [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((c) => {
      categoryMap[c.id] = c.label;
    });

    const rows = expenses.map((item) => {
      const typeLabel =
        item.type === "income"
          ? "Daromad"
          : item.type === "transfer"
          ? "O'tkazma"
          : "Xarajat";

      const method = item.paymentMethod || item.wallet || "naqd";
      const walletLabel =
        item.type === "transfer"
          ? `${WALLET_CONFIG[item.fromWallet]?.label || "Karta"} -> ${WALLET_CONFIG[item.toWallet]?.label || "Naqd"}`
          : WALLET_CONFIG[method]?.label || method;

      const catLabel = categoryMap[item.category] || item.category || "—";
      const subcatLabel = item.subcategory || "—";
      const reason = (item.reason || "").replace(/"/g, '""');
      const loc = (item.location || "").replace(/"/g, '""');
      const editsCount = Array.isArray(item.edits) ? item.edits.length : 0;

      return [
        `"${item.id}"`,
        `"${item.spentAt || ""}"`,
        `"${typeLabel}"`,
        `"${walletLabel}"`,
        `"${catLabel}"`,
        `"${subcatLabel}"`,
        item.amount,
        item.quantity || 1,
        `"${reason}"`,
        `"${loc}"`,
        `"${item.createdAt || ""}"`,
        editsCount,
      ].join(",");
    });

    // UTF-8 BOM for Excel in Uzbek/Russian characters
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oybek-system-moliya-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [expenses]);

  const importBackup = useCallback(
    async (fileContent) => {
      try {
        const parsed = JSON.parse(fileContent);
        await expensesApi.importBackup(parsed);
        await refresh();
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [refresh]
  );

  const value = {
    expenses,
    initialWallets,
    currentBalances,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    updateWallets,
    downloadBackup,
    downloadCSV,
    importBackup,
    refresh,
  };

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) {
    throw new Error("useExpenses ExpensesProvider ichida ishlatilishi kerak");
  }
  return ctx;
}
