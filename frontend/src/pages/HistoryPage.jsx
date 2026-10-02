import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatDateTime } from "../utils/format.js";
import {
  History,
  Search,
  XCircle,
  Calendar,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Download,
  FileSpreadsheet,
  Layers,
  MapPin,
  Clock,
  Database,
  Edit2,
  Trash2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  WALLET_CONFIG,
} from "../constants/money.js";
import CategoryIcon from "../components/money-manager/CategoryIcon.jsx";
import EditTransactionModal from "../components/money-manager/EditTransactionModal.jsx";
import TransferModal from "../components/money-manager/TransferModal.jsx";

const CATEGORY_MAP = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].forEach((c) => {
  CATEGORY_MAP[c.id] = c;
});
if (CATEGORY_MAP["Qorin uchun"]) {
  CATEGORY_MAP["Oziq-ovqat"] = CATEGORY_MAP["Qorin uchun"];
}

const ITEMS_PER_PAGE = 25;

export default function HistoryPage() {
  const {
    regularExpenses,
    deleteExpense,
    downloadBackup,
    downloadCSV,
    syncStatus,
    triggerManualSync,
    rateInfo,
  } = useExpenses();

  // FAQAT oddiy kundalik tranzaksiyalar (Zaxira hisoblar mutlaqo kiritilmaydi)
  const txData = regularExpenses || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "expense" | "income" | "transfer"
  const [walletFilter, setWalletFilter] = useState("all"); // "all" | "hamyon" | "naqd" | "karta" | "dollar"
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "today" | "yesterday" | "week" | "month" | "last_month" | "year" | "custom"
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc"); // "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  // Modallar
  const [editingItem, setEditingItem] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Barcha mavjud kategoriyalar ro'yxati (dinamik)
  const availableCategories = useMemo(() => {
    const cats = new Set();
    txData.forEach((e) => {
      if (e.category && e.type !== "transfer") {
        cats.add(e.category);
      }
    });
    return Array.from(cats).sort();
  }, [txData]);

  // Filtrlash va saralash
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday.getTime() - 1);

    const startOfWeek = new Date(startOfToday);
    const dayOfWeek = (startOfWeek.getDay() + 6) % 7; // Dushanba = 0
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const result = txData.filter((item) => {
      // 1. Amal turi filtri
      if (typeFilter !== "all" && item.type !== typeFilter) {
        return false;
      }

      // 2. Hisob / Hamyon filtri (Faqat oddiy hisoblar)
      if (walletFilter !== "all") {
        if (item.type === "transfer") {
          if (item.fromWallet !== walletFilter && item.toWallet !== walletFilter) {
            return false;
          }
        } else {
          const method = item.paymentMethod || item.wallet || "naqd";
          if (method !== walletFilter) {
            return false;
          }
        }
      }

      // 3. Kategoriya filtri
      if (categoryFilter !== "all") {
        if (item.category !== categoryFilter) {
          return false;
        }
      }

      // 4. Sana filtri
      if (dateFilter !== "all" && item.spentAt) {
        const itemDate = new Date(item.spentAt);

        if (dateFilter === "today" && itemDate < startOfToday) {
          return false;
        }
        if (dateFilter === "yesterday") {
          if (itemDate < startOfYesterday || itemDate > endOfYesterday) {
            return false;
          }
        }
        if (dateFilter === "week" && itemDate < startOfWeek) {
          return false;
        }
        if (dateFilter === "month" && itemDate < startOfMonth) {
          return false;
        }
        if (dateFilter === "last_month") {
          if (itemDate < startOfLastMonth || itemDate > endOfLastMonth) {
            return false;
          }
        }
        if (dateFilter === "year" && itemDate < startOfYear) {
          return false;
        }
        if (dateFilter === "custom") {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }
        }
      }

      // 5. Qidiruv so'rovi (Matn, sabab, joy, kategoriya, izoh, summa)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const reason = (item.reason || item.note || "").toLowerCase();
        const loc = (item.location || "").toLowerCase();
        const cat = (item.category || "").toLowerCase();
        const subcat = (item.subcategory || "").toLowerCase();
        const fromW = (item.fromWallet || "").toLowerCase();
        const toW = (item.toWallet || "").toLowerCase();
        const method = (item.paymentMethod || item.wallet || "").toLowerCase();
        const amtStr = String(item.amount || "");

        const matches =
          reason.includes(query) ||
          loc.includes(query) ||
          cat.includes(query) ||
          subcat.includes(query) ||
          fromW.includes(query) ||
          toW.includes(query) ||
          method.includes(query) ||
          amtStr.includes(query);

        if (!matches) return false;
      }

      return true;
    });

    // Saralash
    result.sort((a, b) => {
      const dateA = new Date(a.spentAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.spentAt || b.createdAt || 0).getTime();
      const numA = Number(a.amount || 0);
      const numB = Number(b.amount || 0);

      if (sortBy === "date_desc") return dateB - dateA;
      if (sortBy === "date_asc") return dateA - dateB;
      if (sortBy === "amount_desc") return numB - numA;
      if (sortBy === "amount_asc") return numA - numB;
      return dateB - dateA;
    });

    return result;
  }, [
    txData,
    typeFilter,
    walletFilter,
    categoryFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    searchQuery,
    sortBy,
  ]);

  // Statistik hisobot
  const stats = useMemo(() => {
    let expenseSumUZS = 0;
    let incomeSumUZS = 0;
    let transferSumUZS = 0;
    let expenseSumUSD = 0;
    let incomeSumUSD = 0;
    let transferSumUSD = 0;
    let transferCount = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    const rate = rateInfo?.rate || 12850;

    filteredTransactions.forEach((item) => {
      const amt = Number(item.amount || 0);
      const isUsd =
        item.currency === "USD" ||
        item.paymentMethod === "dollar" ||
        item.fromWallet === "dollar";

      if (item.type === "expense") {
        expenseCount++;
        if (isUsd) expenseSumUSD += amt;
        else expenseSumUZS += amt;
      } else if (item.type === "income") {
        incomeCount++;
        if (isUsd) incomeSumUSD += amt;
        else incomeSumUZS += amt;
      } else if (item.type === "transfer") {
        transferCount++;
        if (isUsd) transferSumUSD += amt;
        else transferSumUZS += amt;
      }
    });

    const totalExpenseInUZS = expenseSumUZS + expenseSumUSD * rate;
    const totalIncomeInUZS = incomeSumUZS + incomeSumUSD * rate;
    const netSavings = totalIncomeInUZS - totalExpenseInUZS;

    return {
      count: filteredTransactions.length,
      expenseCount,
      incomeCount,
      transferCount,
      expenseSumUZS,
      expenseSumUSD,
      totalExpenseInUZS,
      incomeSumUZS,
      incomeSumUSD,
      totalIncomeInUZS,
      transferSumUZS,
      transferSumUSD,
      netSavings,
    };
  }, [filteredTransactions, rateInfo]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    typeFilter !== "all" ||
    walletFilter !== "all" ||
    categoryFilter !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "date_desc";

  const clearAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setWalletFilter("all");
    setCategoryFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortBy("date_desc");
    setDisplayCount(ITEMS_PER_PAGE);
  };

  const paginatedTransactions = filteredTransactions.slice(0, displayCount);
  const hasMore = filteredTransactions.length > displayCount;

  // Sanalar bo'yicha guruhlash (kun bo'yicha)
  const groupedTransactions = useMemo(() => {
    const groups = [];
    let currentKey = null;
    let currentItems = [];

    paginatedTransactions.forEach((tx) => {
      const d = new Date(tx.spentAt || tx.createdAt || Date.now());
      const key = d.toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      });

      if (key !== currentKey) {
        if (currentKey !== null) {
          groups.push({ dateLabel: currentKey, items: currentItems });
        }
        currentKey = key;
        currentItems = [tx];
      } else {
        currentItems.push(tx);
      }
    });

    if (currentKey !== null) {
      groups.push({ dateLabel: currentKey, items: currentItems });
    }

    return groups;
  }, [paginatedTransactions]);

  const unsyncedCount = txData.filter((e) => e.synced === false).length;

  return (
    <div className="history-page">
      {/* 1. Sarlavha & Asboblar paneli */}
      <div className="page-header-row">
        <div>
          <div className="flex items-center gap-2">
            <History size={24} className="text-accent" />
            <h1 className="page-title">Tranzaksiyalar & O'tkazmalar tarixi</h1>
          </div>
          <p className="page-subtitle">
            Kundalik barcha xarajatlar, daromadlar va hisoblararo oddiy o'tkazmalarni qidirish, sana va hamyonlar bo'yicha saralash
          </p>
        </div>

        <div className="backup-toolbar">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setIsTransferModalOpen(true)}
            title="Hisoblararo o'tkazma kiritish"
          >
            <ArrowRightLeft size={15} />
            <span>O'tkazma qilish</span>
          </button>

          <Link
            to="/money"
            className="btn btn--subtle btn--sm"
            title="Yangi amal kiritish sahifasiga o'tish"
          >
            <PlusCircle size={15} />
            <span>Yangi xarajat</span>
          </Link>

          <button
            type="button"
            className="btn btn--subtle btn--sm backup-btn"
            onClick={downloadCSV}
            title="Barcha amallarni Excel (CSV) fayl sifatida yuklash"
          >
            <FileSpreadsheet size={15} />
            <span className="backup-btn__label">Excel</span>
          </button>

          <button
            type="button"
            className="btn btn--subtle btn--sm backup-btn"
            onClick={downloadBackup}
            title="JSON zaxira faylini yuklab olish"
          >
            <Download size={15} />
            <span className="backup-btn__label">Zaxira</span>
          </button>
        </div>
      </div>

      {/* Oflayn / Kutilayotgan sinxronizatsiya holati */}
      {unsyncedCount > 0 && (
        <div className="sync-pending-banner">
          <div className="sync-pending-banner__left">
            <Clock size={16} className="text-warning animate-pulse" />
            <div>
              <span className="sync-pending-banner__title">
                {unsyncedCount} ta amal qurilma xotirasida saqlangan
              </span>
              <span className="sync-pending-banner__sub">
                Server DB bilan aloqa o'rnatilganda avtomatik sinxronlanadi.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--subtle btn--xs"
            onClick={() => triggerManualSync()}
            disabled={syncStatus?.isSyncing}
          >
            <RefreshCw size={13} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
            <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "DBga yozish"}</span>
          </button>
        </div>
      )}

      {/* 2. Statistik indikatorlar paneli */}
      <div className="history-stats-grid">
        <div className="history-stat-card">
          <div className="history-stat-card__header">
            <span className="history-stat-card__title">Topilgan amallar</span>
            <span className="history-stat-card__badge">{stats.count} ta</span>
          </div>
          <div className="history-stat-card__val mono">
            {stats.count} <span className="history-stat-card__unit">tranzaksiya</span>
          </div>
          <div className="history-stat-card__meta">
            <span>{stats.expenseCount} chiqim · {stats.incomeCount} kirim · {stats.transferCount} o'tkazma</span>
          </div>
        </div>

        <div className="history-stat-card history-stat-card--expense">
          <div className="history-stat-card__header">
            <div className="flex items-center gap-1.5">
              <TrendingDown size={14} className="text-expense" />
              <span className="history-stat-card__title">Jami chiqim</span>
            </div>
            <span className="history-stat-card__badge history-stat-card__badge--expense">
              -{formatSum(stats.totalExpenseInUZS)}
            </span>
          </div>
          <div className="history-stat-card__val mono text-expense">
            -{formatSum(stats.expenseSumUZS)}
            {stats.expenseSumUSD > 0 && (
              <span className="history-stat-card__sub-curr"> + {formatDollar(stats.expenseSumUSD)}</span>
            )}
          </div>
          <div className="history-stat-card__meta">
            <span>Tanlangan davr xarajatlari</span>
          </div>
        </div>

        <div className="history-stat-card history-stat-card--income">
          <div className="history-stat-card__header">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-income" />
              <span className="history-stat-card__title">Jami daromad</span>
            </div>
            <span className="history-stat-card__badge history-stat-card__badge--income">
              +{formatSum(stats.totalIncomeInUZS)}
            </span>
          </div>
          <div className="history-stat-card__val mono text-income">
            +{formatSum(stats.incomeSumUZS)}
            {stats.incomeSumUSD > 0 && (
              <span className="history-stat-card__sub-curr"> + {formatDollar(stats.incomeSumUSD)}</span>
            )}
          </div>
          <div className="history-stat-card__meta">
            <span>Kirim & keshbeklar</span>
          </div>
        </div>

        <div className="history-stat-card history-stat-card--transfer">
          <div className="history-stat-card__header">
            <div className="flex items-center gap-1.5">
              <ArrowRightLeft size={14} className="text-transfer" />
              <span className="history-stat-card__title">O'tkazmalar hajmi</span>
            </div>
            <span className="history-stat-card__badge history-stat-card__badge--transfer">
              {stats.transferCount} ta
            </span>
          </div>
          <div className="history-stat-card__val mono text-transfer">
            ⇄ {formatSum(stats.transferSumUZS)}
            {stats.transferSumUSD > 0 && (
              <span className="history-stat-card__sub-curr"> + {formatDollar(stats.transferSumUSD)}</span>
            )}
          </div>
          <div className="history-stat-card__meta">
            <span>Hisoblararo almashinuv</span>
          </div>
        </div>
      </div>

      {/* 3. Interaktiv Filtrlar va Qidiruv Paneli */}
      <div className="history-filter-section">
        {/* Yuqori qator: Amal turi tablari */}
        <div className="history-type-tabs">
          <button
            type="button"
            className={`history-type-tab ${typeFilter === "all" ? "is-active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            <span>Barchasi</span>
            <span className="history-type-count">({txData.length})</span>
          </button>
          <button
            type="button"
            className={`history-type-tab history-type-tab--expense ${typeFilter === "expense" ? "is-active" : ""}`}
            onClick={() => setTypeFilter("expense")}
          >
            <ArrowDownLeft size={14} />
            <span>Chiqimlar</span>
          </button>
          <button
            type="button"
            className={`history-type-tab history-type-tab--income ${typeFilter === "income" ? "is-active" : ""}`}
            onClick={() => setTypeFilter("income")}
          >
            <ArrowUpRight size={14} />
            <span>Kirimlar</span>
          </button>
          <button
            type="button"
            className={`history-type-tab history-type-tab--transfer ${typeFilter === "transfer" ? "is-active" : ""}`}
            onClick={() => setTypeFilter("transfer")}
          >
            <ArrowRightLeft size={14} />
            <span>O'tkazmalar</span>
          </button>
        </div>

        {/* Qidiruv va asosiy filtrlash qatori */}
        <div className="history-search-row">
          <div className="search-box history-search-box">
            <Search size={16} className="search-box__icon" />
            <input
              type="text"
              placeholder="Qidiruv: sabab, kategoriya, joy, hisob yoki summa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-box__input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-box__clear"
                onClick={() => setSearchQuery("")}
                aria-label="Qidiruvni tozalash"
              >
                <XCircle size={15} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn--subtle btn--sm history-reset-btn"
              onClick={clearAllFilters}
              title="Barcha filtrlarni tozalash"
            >
              <RotateCcw size={13} />
              <span>Filtrlarni tozalash</span>
            </button>
          )}
        </div>

        {/* Kengaytirilgan select filterlar grid (Faqat oddiy kundalik hisoblar) */}
        <div className="history-controls-grid">
          {/* Hamyon / Hisob bo'yicha */}
          <div className="filter-field">
            <label className="filter-field__label">Hisob / Hamyon:</label>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Barcha hisoblar</option>
              <option value="hamyon">Hamyon (Kundalik)</option>
              <option value="naqd">Naqd pul</option>
              <option value="karta">Plastik karta</option>
              <option value="dollar">AQSH Dollari ($)</option>
            </select>
          </div>

          {/* Sana oralig'i bo'yicha */}
          <div className="filter-field">
            <label className="filter-field__label">Vaqt oralig'i:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Barcha vaqt</option>
              <option value="today">Bugun</option>
              <option value="yesterday">Kecha</option>
              <option value="week">Shu hafta</option>
              <option value="month">Shu oy</option>
              <option value="last_month">O'tgan oy</option>
              <option value="year">Shu yil</option>
              <option value="custom">Maxsus sana oralig'i...</option>
            </select>
          </div>

          {/* Kategoriya bo'yicha */}
          {typeFilter !== "transfer" && (
            <div className="filter-field">
              <label className="filter-field__label">Kategoriya:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Barcha kategoriyalar</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_MAP[cat]?.label || cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Saralash */}
          <div className="filter-field">
            <label className="filter-field__label">Saralash:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="date_desc">Eng yangi sana avval</option>
              <option value="date_asc">Eng eski sana avval</option>
              <option value="amount_desc">Katta summa avval</option>
              <option value="amount_asc">Kichik summa avval</option>
            </select>
          </div>
        </div>

        {/* Maxsus sana tanlash inputlari */}
        {dateFilter === "custom" && (
          <div className="history-custom-date-row">
            <div className="custom-date-item">
              <label>Boshlanish sanasi:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="custom-date-item">
              <label>Tugash sanasi:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="field-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Tranzaksiyalar Ro'yxati */}
      <div className="history-ledger-container">
        {filteredTransactions.length === 0 ? (
          <div className="history-empty-state">
            <History size={40} className="text-muted" />
            <p className="history-empty-title">Hech qanday tranzaksiya topilmadi</p>
            <p className="history-empty-sub">
              Qidiruv so'rovi yoki filtrlarni o'zgartirib ko'ring
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn--subtle btn--sm mt-2"
                onClick={clearAllFilters}
              >
                <RotateCcw size={14} />
                <span>Filtrlarni bekor qilish</span>
              </button>
            )}
          </div>
        ) : (
          <div className="history-feed">
            {groupedTransactions.map((group) => (
              <div key={group.dateLabel} className="history-group">
                <div className="history-group__header">
                  <Calendar size={13} className="text-muted" />
                  <span className="history-group__date">{group.dateLabel}</span>
                  <span className="history-group__badge">{group.items.length} ta amal</span>
                </div>

                <div className="history-group__list">
                  {group.items.map((tx) => {
                    const isIncome = tx.type === "income";
                    const isTransfer = tx.type === "transfer";
                    const catObj = CATEGORY_MAP[tx.category] || {
                      label: tx.category || "Boshqa",
                      icon: "Package",
                    };
                    const paymentMethod = tx.paymentMethod || tx.wallet || "naqd";
                    const walletInfo = WALLET_CONFIG[paymentMethod] || WALLET_CONFIG.naqd;
                    const quantity = tx.quantity || 1;
                    const hasEdits = Array.isArray(tx.edits) && tx.edits.length > 0;

                    const fromWalletInfo = WALLET_CONFIG[tx.fromWallet] || {
                      shortLabel: tx.fromWallet || "Hisob",
                    };
                    const toWalletInfo = WALLET_CONFIG[tx.toWallet] || {
                      shortLabel: tx.toWallet || "Hisob",
                    };

                    return (
                      <div
                        key={tx.id}
                        className={`history-item history-item--${tx.type || "expense"}`}
                      >
                        {/* Chap ustun: Ikonka */}
                        <div className="history-item__icon-col">
                          {isTransfer ? (
                            <div className="history-item__icon history-item__icon--transfer">
                              <ArrowRightLeft size={16} />
                            </div>
                          ) : isIncome ? (
                            <div className="history-item__icon history-item__icon--income">
                              {catObj.emoji ? (
                                <span className="cat-emoji">{catObj.emoji}</span>
                              ) : (
                                <CategoryIcon iconName={catObj.icon} size={15} />
                              )}
                            </div>
                          ) : (
                            <div className="history-item__icon history-item__icon--expense">
                              {catObj.emoji ? (
                                <span className="cat-emoji">{catObj.emoji}</span>
                              ) : (
                                <CategoryIcon iconName={catObj.icon} size={15} />
                              )}
                            </div>
                          )}
                        </div>

                        {/* O'rta ustun: Tafsilotlar */}
                        <div className="history-item__details">
                          <div className="history-item__title-row">
                            <span className="history-item__title">
                              {isTransfer
                                ? tx.reason || tx.note || `${fromWalletInfo.shortLabel}dan ${toWalletInfo.shortLabel}ga o'tkazma`
                                : tx.reason || catObj.label}
                            </span>
                            {tx.subcategory && (
                              <span className="history-subcat-badge">
                                {tx.subcategory}
                              </span>
                            )}
                          </div>

                          <div className="history-item__meta-row">
                            <span className="history-meta-time mono">
                              {formatDateTime(tx.spentAt || tx.createdAt)}
                            </span>

                            <span className="history-meta-dot">·</span>

                            {isTransfer ? (
                              <span className="history-wallet-badge history-wallet-badge--transfer">
                                <ArrowRightLeft size={10} />
                                {fromWalletInfo.shortLabel} → {toWalletInfo.shortLabel}
                              </span>
                            ) : (
                              <span className={`history-wallet-badge history-wallet-badge--${paymentMethod}`}>
                                {walletInfo.shortLabel}
                              </span>
                            )}

                            {tx.location && (
                              <>
                                <span className="history-meta-dot">·</span>
                                <span className="history-meta-loc" title={tx.location}>
                                  <MapPin size={10} />
                                  <span>{tx.location}</span>
                                </span>
                              </>
                            )}

                            {quantity > 1 && (
                              <>
                                <span className="history-meta-dot">·</span>
                                <span className="history-meta-qty">
                                  <Layers size={10} />
                                  <span>{quantity} dona</span>
                                </span>
                              </>
                            )}

                            {hasEdits && (
                              <>
                                <span className="history-meta-dot">·</span>
                                <span className="history-meta-edited" title="Tahrirlangan">
                                  Tahrirlangan ({tx.edits.length})
                                </span>
                              </>
                            )}

                            <span className="history-meta-dot">·</span>
                            {tx.synced ? (
                              <span className="history-db-badge history-db-badge--synced" title="DBda saqlangan">
                                <Database size={9} />
                                <span>DB</span>
                              </span>
                            ) : (
                              <span className="history-db-badge history-db-badge--pending" title="Xotirada">
                                <Clock size={9} />
                                <span>Lokal</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* O'ng ustun: Summa va Amallar */}
                        <div className="history-item__right-col">
                          <div
                            className={`history-item__amount mono ${
                              isIncome
                                ? "history-item__amount--income"
                                : isTransfer
                                ? "history-item__amount--transfer"
                                : "history-item__amount--expense"
                            }`}
                          >
                            <span>
                              {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
                              {tx.currency === "USD" || paymentMethod === "dollar"
                                ? formatDollar(tx.amount)
                                : formatSum(tx.amount)}
                            </span>
                            {(tx.currency === "USD" || paymentMethod === "dollar") && tx.exchangeRateAtTime && (
                              <span className="history-item__amount-sub">
                                ~ {formatSum(tx.amount * tx.exchangeRateAtTime)}
                              </span>
                            )}
                          </div>

                          <div className="history-item__actions">
                            <button
                              type="button"
                              className="btn-icon btn-icon--sm"
                              onClick={() => setEditingItem(tx)}
                              title="Tahrirlash / Ko'rish"
                              aria-label="Tahrirlash"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon btn-icon--sm btn-icon--danger"
                              onClick={() => {
                                if (window.confirm("Rostdan ham ushbu amalni o'chirmoqchimisiz?")) {
                                  deleteExpense(tx.id);
                                }
                              }}
                              title="O'chirish"
                              aria-label="O'chirish"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Ko'proq yuklash tugmasi */}
            {hasMore && (
              <div className="history-load-more">
                <button
                  type="button"
                  className="btn btn--subtle history-load-more-btn"
                  onClick={() => setDisplayCount((prev) => prev + ITEMS_PER_PAGE)}
                >
                  <ChevronDown size={16} />
                  <span>
                    Yana {Math.min(ITEMS_PER_PAGE, filteredTransactions.length - displayCount)} ta amalni yuklash ({displayCount} / {filteredTransactions.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Tahrirlash Modali */}
      {editingItem && (
        <EditTransactionModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* 6. Oddiy Hisoblararo O'tkazma Modali (Faqat kundalik oddiy hisoblar) */}
      {isTransferModalOpen && (
        <TransferModal
          initialFrom="karta"
          initialTo="naqd"
          onClose={() => setIsTransferModalOpen(false)}
        />
      )}
    </div>
  );
}
