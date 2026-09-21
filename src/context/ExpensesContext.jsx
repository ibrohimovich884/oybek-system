import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as expensesApi from "../api/expenses.js";
import * as debtsApi from "../api/debts.js";
import {
  DEFAULT_WALLETS,
  DEFAULT_RESERVES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  WALLET_CONFIG,
  RESERVE_CONFIG,
} from "../constants/money.js";
import {
  fetchCbuUsdRate,
  getStoredRateData,
  saveManualRate,
  removeManualRate,
} from "../services/exchangeRateService.js";

const ExpensesContext = createContext(null);

export function ExpensesProvider({ children }) {
  const [expenses, setExpenses] = useState([]);
  const [initialWallets, setInitialWallets] = useState(DEFAULT_WALLETS);
  const [reserves, setReserves] = useState(DEFAULT_RESERVES);
  const [dollarRateHistory, setDollarRateHistory] = useState([]);
  const [debts, setDebts] = useState([]);
  const [rateInfo, setRateInfo] = useState(() => getStoredRateData());
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState(expensesApi.getBackendStatus());

  // Backend holatiga obuna bo'lish
  useEffect(() => {
    const unsubscribe = expensesApi.subscribeBackendStatus((status) => {
      setBackendStatus(status);
    });
    expensesApi.checkBackendConnection();
    return unsubscribe;
  }, []);

  // CBU dollar kursini yuklash
  const loadCbuRate = useCallback(async () => {
    try {
      const data = await fetchCbuUsdRate();
      setRateInfo(data);
    } catch (err) {
      console.warn("Valyuta kursini yuklashda xatolik:", err);
    }
  }, []);

  useEffect(() => {
    loadCbuRate();
  }, [loadCbuRate]);

  const changeBackendPort = useCallback(async (newPort) => {
    await expensesApi.updateBackendPort(newPort);
    await refresh();
  }, []);

  const checkBackendHealth = useCallback(async () => {
    return await expensesApi.checkBackendConnection();
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [walletData, expenseData, reserveData, dollarHistory, debtData] = await Promise.all([
        expensesApi.getWallets(),
        expensesApi.getExpenses(),
        expensesApi.getReserves(),
        expensesApi.getDollarRateHistory(),
        debtsApi.getDebts(),
      ]);
      setInitialWallets(walletData);
      setExpenses(expenseData);
      setReserves(reserveData);
      setDollarRateHistory(dollarHistory);
      setDebts(debtData);
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
    let hamyon = Number(initialWallets.hamyon ?? DEFAULT_WALLETS.hamyon);
    let naqd = Number(initialWallets.naqd ?? DEFAULT_WALLETS.naqd);
    let karta = Number(initialWallets.karta ?? DEFAULT_WALLETS.karta);
    let dollar = Number(initialWallets.dollar ?? DEFAULT_WALLETS.dollar);

    let totalExpenseUZS = 0;
    let totalIncomeUZS = 0;
    let totalExpenseUSD = 0;
    let totalIncomeUSD = 0;

    const currentUsdRate = rateInfo?.rate || 12850;

    for (const item of expenses) {
      const amt = Number(item.amount || 0);
      const type = item.type || "expense";
      const method = item.paymentMethod || item.wallet || "hamyon";

      if (type === "expense") {
        if (method === "dollar") {
          dollar -= amt;
          totalExpenseUSD += amt;
        } else {
          if (method === "hamyon") hamyon -= amt;
          else if (method === "karta") karta -= amt;
          else naqd -= amt;
          totalExpenseUZS += amt;
        }
      } else if (type === "income") {
        if (method === "dollar") {
          dollar += amt;
          totalIncomeUSD += amt;
        } else {
          if (method === "hamyon") hamyon += amt;
          else if (method === "karta") karta += amt;
          else naqd += amt;
          totalIncomeUZS += amt;
        }
      } else if (type === "transfer") {
        const from = item.fromWallet || method;
        const to = item.toWallet;

        // Manbadan ayirish
        if (from === "dollar") {
          dollar -= amt;
        } else if (from === "hamyon") {
          hamyon -= amt;
        } else if (from === "karta") {
          karta -= amt;
        } else if (from === "naqd") {
          naqd -= amt;
        }

        // Qabul qiluvchiga qo'shish
        const targetAmount = Number(item.targetAmount ?? amt);
        if (to === "dollar") {
          dollar += targetAmount;
        } else if (to === "hamyon") {
          hamyon += targetAmount;
        } else if (to === "karta") {
          karta += targetAmount;
        } else if (to === "naqd") {
          naqd += targetAmount;
        }
      }
    }

    // Oddiy balanslar yig'indisi
    const totalOddiyUZS = hamyon + naqd + karta;
    const totalOddiyWithDollar = totalOddiyUZS + dollar * currentUsdRate;

    // Asosiy (reserve) balanslar
    const naqdAsosiy = Number(reserves["naqd-asosiy"]?.amount || 0);
    const kartaAsosiy = Number(reserves["karta-asosiy"]?.amount || 0);
    const dollarAsosiy = Number(reserves["dollar-asosiy"]?.amount || 0);

    const totalAsosiyUZS = naqdAsosiy + kartaAsosiy;
    const totalAsosiyWithDollar = totalAsosiyUZS + dollarAsosiy * currentUsdRate;

    // Barcha balanslar (Oddiy + Asosiy)
    const grandTotalUZS = totalOddiyUZS + totalAsosiyUZS;
    const grandTotalWithDollar = totalOddiyWithDollar + totalAsosiyWithDollar;
    const grandTotalDollar = dollar + dollarAsosiy;

    return {
      hamyon,
      naqd,
      karta,
      dollar,
      totalOddiyUZS,
      totalOddiyWithDollar,
      total: totalOddiyWithDollar, // orqaga moslik
      naqdAsosiy,
      kartaAsosiy,
      dollarAsosiy,
      totalAsosiyUZS,
      totalAsosiyWithDollar,
      grandTotalUZS,
      grandTotalWithDollar,
      grandTotalDollar,
      totalExpenseUZS,
      totalIncomeUZS,
      totalExpenseUSD,
      totalIncomeUSD,
      totalExpense: totalExpenseUZS + totalExpenseUSD * currentUsdRate,
      totalIncome: totalIncomeUZS + totalIncomeUSD * currentUsdRate,
    };
  }, [initialWallets, expenses, reserves, rateInfo]);

  const addExpense = useCallback(
    async (payload) => {
      const isDollar = payload.wallet === "dollar" || payload.paymentMethod === "dollar";
      const currentRate = rateInfo?.rate || 12850;

      const prepared = {
        ...payload,
        currency: isDollar ? "USD" : "UZS",
        exchangeRateAtTime: isDollar ? (payload.exchangeRateAtTime || currentRate) : null,
      };

      await expensesApi.addExpense(prepared);

      // Agar dollar hisobida operatsiya bo'lsa, kurs tarixini ham yozamiz
      if (isDollar) {
        expensesApi.addDollarRateRecord({
          amount: payload.amount,
          direction: payload.type === "income" ? "kirim" : "chiqim",
          target: "oddiy",
          exchangeRateAtTime: payload.exchangeRateAtTime || currentRate,
          occurredAt: payload.spentAt || new Date().toISOString(),
          note: payload.reason || (payload.type === "income" ? "Dollar kirimi" : "Dollar xarajati"),
        });
      }

      await refresh();
    },
    [rateInfo, refresh]
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

  const updateReserve = useCallback(
    async (id, { amount, noteText, exchangeRateAtTime }) => {
      const currentRate = exchangeRateAtTime || rateInfo?.rate || 12850;
      const updated = await expensesApi.updateReserve(id, {
        amount,
        noteText,
        exchangeRateAtTime: currentRate,
      });
      setReserves(updated);
      await refresh();
      return updated;
    },
    [rateInfo, refresh]
  );

  /**
   * Universal Transfer: Har qanday ikki balans o'rtasida pul o'tkazish
   * (Oddiy <-> Oddiy, Oddiy <-> Asosiy, Asosiy <-> Asosiy)
   */
  const executeTransfer = useCallback(
    async ({ from, to, amount, targetAmount, exchangeRate, note }) => {
      const numAmount = Number(amount);
      const currentRate = exchangeRate || rateInfo?.rate || 12850;
      const finalTargetAmount = Number(targetAmount || numAmount);

      const isFromAsosiy = from.endsWith("-asosiy");
      const isToAsosiy = to.endsWith("-asosiy");

      // 1. Agar manba Asosiy zaxira bo'lsa
      if (isFromAsosiy) {
        const currentAmount = reserves[from]?.amount || 0;
        const newAmount = Math.max(0, currentAmount - numAmount);
        await expensesApi.updateReserve(from, {
          amount: newAmount,
          noteText: `O'tkazma: ${from} dan ${to} ga o'tkazildi (-${numAmount}). Izoh: ${note || "O'tkazma"}`,
          exchangeRateAtTime: currentRate,
        });
      }

      // 2. Agar qabul qiluvchi Asosiy zaxira bo'lsa
      if (isToAsosiy) {
        const currentAmount = reserves[to]?.amount || 0;
        const newAmount = currentAmount + finalTargetAmount;
        await expensesApi.updateReserve(to, {
          amount: newAmount,
          noteText: `O'tkazma: ${from} dan ${to} ga qabul qilindi (+${finalTargetAmount}). Izoh: ${note || "O'tkazma"}`,
          exchangeRateAtTime: currentRate,
        });
      }

      // 3. Agar hech bo'lmaganda biri Oddiy balans bo'lsa, tranzaksiya tarixida aks etishi uchun transfer yozamiz
      if (!isFromAsosiy || !isToAsosiy) {
        await expensesApi.addExpense({
          type: "transfer",
          amount: numAmount,
          targetAmount: finalTargetAmount,
          wallet: from,
          fromWallet: from,
          toWallet: to,
          exchangeRateAtTime: from === "dollar" || to === "dollar" ? currentRate : null,
          category: "O‘tkazma",
          subcategory: "Balanslararo",
          reason: note || `${from} dan ${to} ga o'tkazma`,
          location: "Ichki o'tkazma",
          spentAt: new Date().toISOString(),
        });
      }

      // 4. Dollar ishtirok etgan bo'lsa, dollar tarixini saqlash
      if (from === "dollar" || to === "dollar") {
        expensesApi.addDollarRateRecord({
          amount: from === "dollar" ? numAmount : finalTargetAmount,
          direction: from === "dollar" ? "chiqim" : "kirim",
          target: "oddiy",
          exchangeRateAtTime: currentRate,
          occurredAt: new Date().toISOString(),
          note: `O'tkazma: ${from} -> ${to}. ${note || ""}`,
        });
      }

      await refresh();
      return true;
    },
    [reserves, rateInfo, refresh]
  );

  const setManualUsdRate = useCallback(async (newRate) => {
    saveManualRate(newRate);
    const updated = getStoredRateData();
    setRateInfo(updated);
  }, []);

  const resetManualUsdRate = useCallback(async () => {
    removeManualRate();
    await loadCbuRate();
  }, [loadCbuRate]);

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
      "Sana",
      "Turi",
      "Hamyon",
      "Kategoriya",
      "Subkategoriya",
      "Summa",
      "Miqdor",
      "Izoh",
      "Joy",
      "Yaratilgan sana",
      "Tahrirlar soni",
    ];

    const rows = expenses.map((item) => {
      const typeLabel =
        item.type === "transfer"
          ? "O'tkazma"
          : item.type === "income"
          ? "Daromad"
          : "Xarajat";
      const catLabel = item.category || "Qorin uchun";
      const subcatLabel = item.subcategory || "";
      const walletLabel =
        WALLET_CONFIG[item.wallet]?.label || item.wallet || "Hamyon";
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

  const addDebt = useCallback(
    async (debtData) => {
      const created = await debtsApi.addDebtRecord(debtData);

      // Agar foydalanuvchi hisob balansidan yechilsin / qo'shilsin deb tanlagan bo'lsa:
      if (debtData.affectBalance) {
        if (debtData.type === "given") {
          // Men qarz berdim -> hisobdan pul chiqdi (xarajat)
          await expensesApi.addExpense({
            type: "expense",
            amount: Number(debtData.amount),
            wallet: debtData.wallet,
            paymentMethod: debtData.wallet,
            currency: debtData.currency || "UZS",
            category: "Boshqa",
            subcategory: "Qarz berish",
            reason: `${debtData.personName}ga qarz berildi: ${debtData.reason || ""}`.trim(),
            location: debtData.location || "",
            spentAt: debtData.date || new Date().toISOString(),
          });
        } else if (debtData.type === "taken") {
          // Men qarz oldim -> hisobga pul kirdi (daromad)
          await expensesApi.addExpense({
            type: "income",
            amount: Number(debtData.amount),
            wallet: debtData.wallet,
            paymentMethod: debtData.wallet,
            currency: debtData.currency || "UZS",
            category: "Boshqa",
            subcategory: "Qarz olish",
            reason: `${debtData.personName}dan qarz olindi: ${debtData.reason || ""}`.trim(),
            location: debtData.location || "",
            spentAt: debtData.date || new Date().toISOString(),
          });
        }
      }

      await refresh();
      return created;
    },
    [refresh]
  );

  const repayDebt = useCallback(
    async (debtId, paymentData) => {
      const { updatedDebt, payment } = await debtsApi.recordDebtPayment(debtId, paymentData);

      if (paymentData.affectBalance) {
        if (updatedDebt.type === "given") {
          // Qarz olgan odam qaytardi -> hisobga pul kirdi (daromad)
          await expensesApi.addExpense({
            type: "income",
            amount: Number(payment.amount),
            wallet: payment.wallet,
            paymentMethod: payment.wallet,
            currency: updatedDebt.currency || "UZS",
            category: "Boshqa",
            subcategory: "Qarz qaytishi",
            reason: `${updatedDebt.personName} qarzni qaytardi: ${payment.note || ""}`.trim(),
            spentAt: payment.date || new Date().toISOString(),
          });
        } else if (updatedDebt.type === "taken") {
          // Men qarzimni qaytardim -> hisobdan pul chiqdi (xarajat)
          await expensesApi.addExpense({
            type: "expense",
            amount: Number(payment.amount),
            wallet: payment.wallet,
            paymentMethod: payment.wallet,
            currency: updatedDebt.currency || "UZS",
            category: "Boshqa",
            subcategory: "Qarz to'lash",
            reason: `${updatedDebt.personName}ga qarz qaytarildi: ${payment.note || ""}`.trim(),
            spentAt: payment.date || new Date().toISOString(),
          });
        }
      }

      await refresh();
      return updatedDebt;
    },
    [refresh]
  );

  const deleteDebt = useCallback(
    async (debtId) => {
      await debtsApi.deleteDebtRecord(debtId);
      await refresh();
    },
    [refresh]
  );

  const updateDebt = useCallback(
    async (debtId, updates) => {
      const updated = await debtsApi.updateDebtRecord(debtId, updates);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const value = {
    expenses,
    initialWallets,
    reserves,
    dollarRateHistory,
    debts,
    rateInfo,
    currentBalances,
    isLoading,
    backendStatus,
    changeBackendPort,
    checkBackendHealth,
    addExpense,
    updateExpense,
    deleteExpense,
    updateWallets,
    updateReserve,
    executeTransfer,
    setManualUsdRate,
    resetManualUsdRate,
    loadCbuRate,
    downloadBackup,
    downloadCSV,
    importBackup,
    addDebt,
    repayDebt,
    deleteDebt,
    updateDebt,
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
