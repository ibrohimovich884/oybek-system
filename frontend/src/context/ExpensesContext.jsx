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
import * as peopleApi from "../api/people.js";
import { syncService } from "../services/syncService.js";
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

// Helper: Zaxira hisoblari bilan bog'liq tranzaksiyalarni aniqlash
export const isReserveTransaction = (item) => {
  if (!item) return false;
  const reserveWallets = [
    "naqd_reserve",
    "karta_reserve",
    "dollar_reserve",
    "naqd-asosiy",
    "karta-asosiy",
    "dollar-asosiy",
  ];

  const from = item.fromWallet || item.from;
  const to = item.toWallet || item.to;
  const method = item.paymentMethod || item.wallet;

  if (
    reserveWallets.includes(from) ||
    reserveWallets.includes(to) ||
    reserveWallets.includes(method)
  ) {
    return true;
  }
  if (item.isReserve === true) return true;
  if (
    item.category === "Zaxira" ||
    item.category === "Zaxira o‘tkazmasi" ||
    item.category === "Zaxira o'tkazmasi"
  ) {
    return true;
  }
  if (item.subcategory === "Zaxira") return true;
  if (item.target === "asosiy" || item.target === "reserve") return true;

  return false;
};

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
  const [syncStatus, setSyncStatus] = useState(() => syncService.getSyncStatus());

  // CBU dollar kursini yuklash
  const loadCbuRate = useCallback(async () => {
    try {
      const data = await fetchCbuUsdRate();
      setRateInfo(data);
    } catch (err) {
      console.warn("Valyuta kursini yuklashda xatolik:", err);
    }
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
    if (typeof window === "undefined") return;
    const handleLocalDebtsUpdated = () => {
      setDebts(debtsApi.readLocalDebts());
    };
    window.addEventListener("oybek:debts-local-updated", handleLocalDebtsUpdated);
    return () => window.removeEventListener("oybek:debts-local-updated", handleLocalDebtsUpdated);
  }, []);

  // Backend holatiga va SyncService holatiga obuna bo'lish
  useEffect(() => {
    const unsubscribeBackend = expensesApi.subscribeBackendStatus((status) => {
      setBackendStatus(status);
    });
    const unsubscribeSync = syncService.subscribe((status) => {
      setSyncStatus(status);
    });
    expensesApi.checkBackendConnection();
    return () => {
      unsubscribeBackend();
      unsubscribeSync();
    };
  }, []);

  // Sync yakunlanganda yoki foydalanuvchi o'zgarganda ma'lumotlarni yangilash
  useEffect(() => {
    const handleSyncComplete = () => {
      refresh();
    };
    const handleItemSynced = () => {
      refresh();
    };
    const handleUserChanged = () => {
      refresh();
    };
    const handleLogout = () => {
      setInitialWallets({ ...DEFAULT_WALLETS });
      setReserves({ ...DEFAULT_RESERVES });
      setExpenses([]);
      setDebts([]);
      setDollarRateHistory([]);
    };
    window.addEventListener("oybek:sync-complete", handleSyncComplete);
    window.addEventListener("oybek:item-synced", handleItemSynced);
    window.addEventListener("oybek:user-changed", handleUserChanged);
    window.addEventListener("oybek:logout", handleLogout);
    return () => {
      window.removeEventListener("oybek:sync-complete", handleSyncComplete);
      window.removeEventListener("oybek:item-synced", handleItemSynced);
      window.removeEventListener("oybek:user-changed", handleUserChanged);
      window.removeEventListener("oybek:logout", handleLogout);
    };
  }, [refresh]);

  useEffect(() => {
    loadCbuRate();
  }, [loadCbuRate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const changeBackendPort = useCallback(async (newPort) => {
    await expensesApi.updateBackendPort(newPort);
    await refresh();
  }, [refresh]);

  const checkBackendHealth = useCallback(async () => {
    return await expensesApi.checkBackendConnection();
  }, []);

  // Hozirgi real vaqt balansi (DB wallets jadvalidagi jonli balans + oflayn tranzaksiyalar)
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
      // Zaxira hisoblar bilan bog'liq tranzaksiyalar oddiy xarajat/daromad statistikasiga kirmaydi
      if (isReserveTransaction(item)) continue;

      const amt = Number(item.amount || 0);
      const type = item.type || "expense";
      const method = item.paymentMethod || item.wallet || "hamyon";
      const isDollar = item.currency === "USD" || method === "dollar";

      // Umumiy statistika
      if (type === "expense") {
        if (isDollar) totalExpenseUSD += amt;
        else totalExpenseUZS += amt;
      } else if (type === "income") {
        if (isDollar) totalIncomeUSD += amt;
        else totalIncomeUZS += amt;
      }
    }

    // Faqat internet yo'q bo'lsa (backend ulanmagan paytda) oflayn navbatdagi tranzaksiyalarni lokal qo'shamiz/ayiramiz
    const isOffline = backendStatus?.isConnected === false;
    if (isOffline) {
      for (const item of expenses) {
        if (item.synced === false) {
          const amt = Number(item.amount || 0);
          const type = item.type || "expense";
          const method = item.paymentMethod || item.wallet || "hamyon";

          if (type === "expense") {
            if (method === "dollar") dollar -= amt;
            else if (method === "hamyon") hamyon -= amt;
            else if (method === "karta") karta -= amt;
            else if (method === "naqd") naqd -= amt;
          } else if (type === "income") {
            if (method === "dollar") dollar += amt;
            else if (method === "hamyon") hamyon += amt;
            else if (method === "karta") karta += amt;
            else if (method === "naqd") naqd += amt;
          } else if (type === "transfer") {
            const from = item.fromWallet || method;
            const to = item.toWallet;
            const targetAmount = Number(item.targetAmount ?? amt);

            if (from === "dollar") dollar -= amt;
            else if (from === "hamyon") hamyon -= amt;
            else if (from === "karta") karta -= amt;
            else if (from === "naqd") naqd -= amt;

            if (to === "dollar") dollar += targetAmount;
            else if (to === "hamyon") hamyon += targetAmount;
            else if (to === "karta") karta += targetAmount;
            else if (to === "naqd") naqd += targetAmount;
          }
        }
      }
    }

    // Oddiy balanslar yig'indisi
    const totalOddiyUZS = hamyon + naqd + karta;
    const totalOddiyWithDollar = totalOddiyUZS + dollar * currentUsdRate;

    // Asosiy (reserve) balanslar — DB wallets jadvali yagona haqiqat manbai
    const naqdAsosiy = Number(
      initialWallets.naqd_reserve ??
      initialWallets["naqd-asosiy"] ??
      reserves.naqd_reserve?.amount ??
      reserves["naqd-asosiy"]?.amount ??
      0
    );
    const kartaAsosiy = Number(
      initialWallets.karta_reserve ??
      initialWallets["karta-asosiy"] ??
      reserves.karta_reserve?.amount ??
      reserves["karta-asosiy"]?.amount ??
      0
    );
    const dollarAsosiy = Number(
      initialWallets.dollar_reserve ??
      initialWallets["dollar-asosiy"] ??
      reserves.dollar_reserve?.amount ??
      reserves["dollar-asosiy"]?.amount ??
      0
    );

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
      naqd_reserve: naqdAsosiy,
      karta_reserve: kartaAsosiy,
      dollar_reserve: dollarAsosiy,
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

  // Faqat oddiy (zaxira bo'lmagan) tranzaksiyalar ro'yxati (Home, History va Money Manager uchun)
  const regularExpenses = useMemo(() => {
    return (expenses || []).filter((e) => !isReserveTransaction(e));
  }, [expenses]);

  // Faqat zaxira hisoblari bilan bog'liq maxfiy o'tkazmalar (Faqat Control Panel uchun)
  const reserveTransactions = useMemo(() => {
    return (expenses || []).filter((e) => isReserveTransaction(e));
  }, [expenses]);

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
   * Yagona atomik tranzaksiya orqali bajariladi — 2 marta ayrilish xatosi bartaraf etildi.
   */
  const executeTransfer = useCallback(
    async ({ from, to, amount, targetAmount, exchangeRate, note }) => {
      const numAmount = Number(amount);
      const currentRate = exchangeRate || rateInfo?.rate || 12850;

      const isFromDollar = from === "dollar" || from.includes("dollar");
      const isToDollar = to === "dollar" || to.includes("dollar");

      let finalTargetAmount = targetAmount !== undefined && targetAmount !== null ? Number(targetAmount) : numAmount;
      if (isFromDollar && !isToDollar && (!targetAmount || targetAmount === numAmount)) {
        finalTargetAmount = Math.round(numAmount * currentRate);
      } else if (!isFromDollar && isToDollar && (!targetAmount || targetAmount === numAmount)) {
        finalTargetAmount = Number((numAmount / currentRate).toFixed(2));
      }

      const isFromAsosiy = from.endsWith("-asosiy") || from.endsWith("_reserve");
      const isToAsosiy = to.endsWith("-asosiy") || to.endsWith("_reserve");

      // Yagona transfer tranzaksiyasi:
      // Backend barcha hamyon balanslarini va zaxira izohlarini bir vaqtning o'zida atomik tarzda yangilaydi
      await expensesApi.addExpense({
        type: "transfer",
        amount: numAmount,
        targetAmount: finalTargetAmount,
        currency: isFromDollar ? "USD" : "UZS",
        wallet: from,
        fromWallet: from,
        toWallet: to,
        exchangeRateAtTime: isFromDollar || isToDollar ? currentRate : null,
        category: "O‘tkazma",
        subcategory: "Balanslararo",
        reason: note?.trim() || `${from} dan ${to} ga o'tkazma`,
        location: "Ichki o'tkazma",
        spentAt: new Date().toISOString(),
      });

      // Agar Dollar ishtirok etgan bo'lsa, dollar tarixini saqlash
      if (isFromDollar || isToDollar) {
        expensesApi.addDollarRateRecord({
          amount: isFromDollar ? numAmount : finalTargetAmount,
          direction: isFromDollar ? "chiqim" : "kirim",
          target: isFromAsosiy || isToAsosiy ? "asosiy" : "oddiy",
          exchangeRateAtTime: currentRate,
          occurredAt: new Date().toISOString(),
          note: `O'tkazma: ${from} -> ${to}. ${note || ""}`,
        });
      }

      await refresh();
      return true;
    },
    [rateInfo, refresh]
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

  const downloadDebtsCSV = useCallback(() => {
    const list = debts.length > 0 ? debts : debtsApi.readLocalDebts();
    if (!list.length) return;

    const headers = [
      "ID",
      "Turi",
      "Shaxs",
      "Aloqa",
      "Instagram",
      "Telegram",
      "Summa",
      "Valyuta",
      "To'langan",
      "Qoldiq",
      "Holati",
      "Qaytarish ehtimoli",
      "Sana",
      "Muddat",
      "Sababi",
      "Shaxsiy izoh",
    ];

    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

    const rows = list.map((d) => {
      const paid = (d.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const isClosed = d.status === "settled" || d.status === "forgiven";
      const remaining = isClosed ? 0 : Math.max(0, Number(d.amount || 0) - paid);
      const typeLabel = d.type === "taken" ? "Olingan qarz" : "Berilgan qarz";
      const statusMap = {
        pending: "Kutilmoqda",
        partial: "Qisman qaytarilgan",
        settled: "To'liq yopilgan",
        forgiven: "Voz kechilgan",
      };
      const probMap = { high: "Yuqori", medium: "O'rtacha", low: "Past" };

      return [
        escapeCsv(d.id),
        escapeCsv(typeLabel),
        escapeCsv(d.personName),
        escapeCsv(d.contact),
        escapeCsv(d.instagram),
        escapeCsv(d.telegram),
        Number(d.amount || 0),
        escapeCsv(d.currency || "UZS"),
        paid,
        remaining,
        escapeCsv(statusMap[d.status] || d.status),
        escapeCsv(probMap[d.repaymentProbability] || "Yuqori"),
        escapeCsv(d.date || d.createdAt || ""),
        escapeCsv(d.isDueDateUnknown ? "Muddatsiz" : (d.dueDate || "")),
        escapeCsv(d.reason),
        escapeCsv(d.personalNote),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oybek-system-qarzlar-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [debts]);

  const downloadPeopleCSV = useCallback(async () => {
    let list = peopleApi.readLocalPeople();
    if (!list.length) {
      list = await peopleApi.fetchPeople().catch(() => []);
    }
    if (!list.length) return;

    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "ID",
      "Ism / Laqab",
      "To'liq ism",
      "Jinsi",
      "Toifa",
      "Holati",
      "Ishonch darajasi",
      "Telefon",
      "Telegram",
      "Instagram",
      "Boshqa aloqa",
      "Tanishgan joy",
      "Tanishgan sana",
      "Tug'ilgan kun",
      "Hudud",
      "Yoqtirganimmi",
      "Crush bosqichi",
      "Izohlar",
    ];

    const trustMap = { high: "Ishonchli", medium: "O'rtacha", low: "Past" };
    const rows = list.map((p) =>
      [
        escapeCsv(p.id),
        escapeCsv(p.nickname),
        escapeCsv(p.fullName),
        escapeCsv(p.gender),
        escapeCsv(p.category),
        escapeCsv(p.status),
        escapeCsv(trustMap[p.trustLevel || "medium"] || p.trustLevel),
        escapeCsv(p.phone),
        escapeCsv(p.telegram),
        escapeCsv(p.instagram),
        escapeCsv(p.otherContacts),
        escapeCsv(p.metPlace),
        escapeCsv(p.metOn),
        escapeCsv(p.birthday),
        escapeCsv(p.profile?.area),
        escapeCsv(p.isCrush ? "Ha" : "Yo'q"),
        escapeCsv(p.crushStatus),
        escapeCsv(p.notes),
      ].join(",")
    );

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oybek-system-odamlar-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const getLinkedDebtTransactions = useCallback(
    (debt) => {
      if (!debt) return [];
      const debtId = debt.id;
      const pName = (debt.personName || "").trim().toLowerCase();
      return expenses.filter((tx) => {
        if (tx.debtId === debtId) return true;
        if (
          (tx.subcategory === "Qarz berish" ||
            tx.subcategory === "Qarz olish" ||
            tx.subcategory === "Qarz qaytishi" ||
            tx.subcategory === "Qarz to'lash") &&
          tx.reason &&
          pName &&
          tx.reason.toLowerCase().includes(pName)
        ) {
          return true;
        }
        return false;
      });
    },
    [expenses]
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
            debtId: created.id,
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
            debtId: created.id,
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

      if (paymentData.affectBalance && payment && payment.amount > 0) {
        if (updatedDebt.type === "given") {
          // Qarz olgan odam qaytardi -> hisobga pul kirdi (daromad)
          await expensesApi.addExpense({
            type: "income",
            amount: Number(payment.amount),
            wallet: payment.wallet || updatedDebt.wallet,
            paymentMethod: payment.wallet || updatedDebt.wallet,
            currency: updatedDebt.currency || "UZS",
            debtId: updatedDebt.id,
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
            wallet: payment.wallet || updatedDebt.wallet,
            paymentMethod: payment.wallet || updatedDebt.wallet,
            currency: updatedDebt.currency || "UZS",
            debtId: updatedDebt.id,
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

  const settleDebt = useCallback(
    async (debtId, customOpts = {}) => {
      const { updatedDebt, payment } = await debtsApi.settleDebtApi(debtId, customOpts);

      if (customOpts.affectBalance && payment && payment.amount > 0) {
        if (updatedDebt.type === "given") {
          await expensesApi.addExpense({
            type: "income",
            amount: Number(payment.amount),
            wallet: payment.wallet || updatedDebt.wallet,
            paymentMethod: payment.wallet || updatedDebt.wallet,
            currency: updatedDebt.currency || "UZS",
            debtId: updatedDebt.id,
            category: "Boshqa",
            subcategory: "Qarz qaytishi",
            reason: `${updatedDebt.personName} qarzni to'liq yopdi: ${customOpts.note || ""}`.trim(),
            spentAt: payment.date || new Date().toISOString(),
          });
        } else if (updatedDebt.type === "taken") {
          await expensesApi.addExpense({
            type: "expense",
            amount: Number(payment.amount),
            wallet: payment.wallet || updatedDebt.wallet,
            paymentMethod: payment.wallet || updatedDebt.wallet,
            currency: updatedDebt.currency || "UZS",
            debtId: updatedDebt.id,
            category: "Boshqa",
            subcategory: "Qarz to'lash",
            reason: `${updatedDebt.personName}ga qarz to'liq yopildi: ${customOpts.note || ""}`.trim(),
            spentAt: payment.date || new Date().toISOString(),
          });
        }
      }

      await refresh();
      return updatedDebt;
    },
    [refresh]
  );

  const forgiveDebt = useCallback(
    async (debtId, customOpts = {}) => {
      const { updatedDebt } = await debtsApi.forgiveDebtApi(debtId, customOpts);
      await refresh();
      return updatedDebt;
    },
    [refresh]
  );

  const deleteDebt = useCallback(
    async (debtId, { revertTransactions = false } = {}) => {
      const debt = debts.find((d) => d.id === debtId);
      if (revertTransactions && debt) {
        const linkedTxs = getLinkedDebtTransactions(debt);
        for (const tx of linkedTxs) {
          await expensesApi.deleteExpense(tx.id).catch(() => {});
        }
      }
      await debtsApi.deleteDebtRecord(debtId, { revertTransactions });
      await refresh();
    },
    [debts, getLinkedDebtTransactions, refresh]
  );

  const updateDebt = useCallback(
    async (debtId, updates, { syncLinkedTransaction = false } = {}) => {
      const debt = debts.find((d) => d.id === debtId);
      if (syncLinkedTransaction && debt) {
        const linkedTxs = getLinkedDebtTransactions(debt);
        const initialTx =
          linkedTxs.find((t) => t.subcategory === "Qarz berish" || t.subcategory === "Qarz olish") ||
          linkedTxs[0];

        if (initialTx) {
          const newAmount = updates.amount !== undefined ? Number(updates.amount) : initialTx.amount;
          const newWallet = updates.wallet || initialTx.wallet;
          const newPerson = updates.personName || debt.personName;
          const nextDebtType = updates.type || debt.type;
          const nextTxType = nextDebtType === "taken" ? "income" : "expense";
          const nextSubcategory = nextDebtType === "taken" ? "Qarz olish" : "Qarz berish";
          const reasonSuffix = updates.reason !== undefined ? updates.reason : (debt.reason || "");
          const newReason =
            nextDebtType === "taken"
              ? `${newPerson}dan qarz olindi: ${reasonSuffix}`.trim()
              : `${newPerson}ga qarz berildi: ${reasonSuffix}`.trim();

          await expensesApi.updateExpense(initialTx.id, {
            type: nextTxType,
            subcategory: nextSubcategory,
            amount: newAmount,
            wallet: newWallet,
            paymentMethod: newWallet,
            currency: updates.currency || initialTx.currency || "UZS",
            reason: newReason,
            location: updates.location !== undefined ? updates.location : initialTx.location,
            spentAt: updates.date || initialTx.spentAt,
          }).catch(() => {});
        }
      }

      const updated = await debtsApi.updateDebtRecord(debtId, updates);
      await refresh();
      return updated;
    },
    [debts, getLinkedDebtTransactions, refresh]
  );

  /**
   * Foydalanuvchi tugma orqali qo'lda sinxronizatsiya qilishi
   */
  const triggerManualSync = useCallback(async () => {
    const result = await syncService.syncNow({ forcePull: true });
    await refresh();
    return result;
  }, [refresh]);

  const forcePullFromDB = useCallback(async () => {
    const result = await syncService.syncNow({ forcePull: true });
    await refresh();
    return result;
  }, [refresh]);

  const forcePushAllToDB = useCallback(async () => {
    const result = await syncService.forcePushAllToDB();
    await refresh();
    return result;
  }, [refresh]);

  const setAutoSync = useCallback((enabled) => {
    syncService.setAutoSyncEnabled(enabled);
  }, []);

  const changeBackendUrl = useCallback(async (newUrl) => {
    expensesApi.updateBackendUrl(newUrl);
    await expensesApi.checkBackendConnection();
    await refresh();
  }, [refresh]);

  const clearSyncLogs = useCallback(() => {
    syncService.clearLogs();
  }, []);

  const clearSyncQueue = useCallback(() => {
    syncService.clearQueue();
  }, []);

  const clearLocalStorageData = useCallback(
    async ({ preserveConnection = true, refetchFromDB = true } = {}) => {
      setIsLoading(true);
      try {
        const result = syncService.clearAllStorage({ preserveBackendConfig: preserveConnection });

        // Ichki xotirani toza holatga keltiramiz
        setInitialWallets({ ...DEFAULT_WALLETS });
        setReserves({ ...DEFAULT_RESERVES });
        setExpenses([]);
        setDebts([]);
        setDollarRateHistory([]);

        // Agar DB ulangan bo'lsa, DBdan toza ma'lumotlarni tortib olamiz
        if (refetchFromDB) {
          try {
            await syncService.syncNow({ forcePull: true });
          } catch (e) {
            console.warn("DBdan yangilashda ogohlantirish:", e);
          }
        }
        await refresh();
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  const value = {
    expenses,
    regularExpenses,
    reserveTransactions,
    isReserveTransaction,
    initialWallets,
    reserves,
    dollarRateHistory,
    debts,
    rateInfo,
    currentBalances,
    isLoading,
    backendStatus,
    syncStatus,
    changeBackendPort,
    changeBackendUrl,
    checkBackendHealth,
    triggerManualSync,
    forcePullFromDB,
    forcePushAllToDB,
    setAutoSync,
    clearSyncLogs,
    clearSyncQueue,
    clearLocalStorageData,
    addExpense,
    updateExpense,
    deleteExpense,
    updateWallets,
    updateReserve,
    executeTransfer,
    setManualUsdRate,
    resetManualUsdRate,
    loadCbuRate,
    downloadCSV,
    downloadDebtsCSV,
    downloadPeopleCSV,
    getLinkedDebtTransactions,
    addDebt,
    repayDebt,
    settleDebt,
    forgiveDebt,
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
