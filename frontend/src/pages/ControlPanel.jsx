import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  ArrowRightLeft,
  Shield,
  Banknote,
  CreditCard,
  BadgeDollarSign,
  Edit2,
  RefreshCw,
  Edit3,
  Check,
  X,
  Lock,
  Search,
  XCircle,
  Calendar,
  Clock,
  Database,
  Trash2,
  TrendingDown,
  TrendingUp,
  Layers,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { useSecurity } from "../context/SecurityContext.jsx";
import { formatSum, formatDollar, formatDateTime } from "../utils/format.js";
import { WALLET_CONFIG, RESERVE_CONFIG } from "../constants/money.js";
import EditReserveModal from "../components/control-panel/EditReserveModal.jsx";
import UniversalTransferModal from "../components/control-panel/UniversalTransferModal.jsx";
import EditTransactionModal from "../components/money-manager/EditTransactionModal.jsx";

export default function ControlPanel() {
  const navigate = useNavigate();
  const { lockScope } = useSecurity();
  const {
    currentBalances,
    reserves,
    reserveTransactions,
    deleteExpense,
    rateInfo,
    loadCbuRate,
    setManualUsdRate,
  } = useExpenses();

  const [editingReserveId, setEditingReserveId] = useState(null);
  const [transferModal, setTransferModal] = useState(null); // { from, to } | null
  const [editingTx, setEditingTx] = useState(null);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(Math.round(rateInfo?.rate || 12850)));

  // Zaxira o'tkazmalari qidiruv va filtrlari
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all"); // "all" | "in" (zaxiraga) | "out" (zaxiradan) | "cross" (zaxiralararo)
  const [reserveTypeFilter, setReserveTypeFilter] = useState("all"); // "all" | "naqd" | "karta" | "dollar"

  const currentRate = rateInfo?.rate || 12850;
  const roundedRate = Math.round(currentRate);

  const handleLockAndNavigate = () => {
    lockScope("control_panel");
    try {
      const saved = sessionStorage.getItem("oybek_unlocked_scopes");
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed.control_panel;
        sessionStorage.setItem("oybek_unlocked_scopes", JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn(e);
    }
    navigate("/");
  };

  const handleRefreshCbu = async (e) => {
    e.stopPropagation();
    setIsRefreshingRate(true);
    await loadCbuRate();
    setTimeout(() => setIsRefreshingRate(false), 400);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    const num = Number(rateInput);
    if (!num || num <= 0) return;
    await setManualUsdRate(num);
    setIsEditingRate(false);
  };

  const naqdReserve = reserves.naqd_reserve?.amount || reserves["naqd-asosiy"]?.amount || 0;
  const kartaReserve = reserves.karta_reserve?.amount || reserves["karta-asosiy"]?.amount || 0;
  const dollarReserve = reserves.dollar_reserve?.amount || reserves["dollar-asosiy"]?.amount || 0;

  // Zaxira tranzaksiyalarini filtrlash
  const filteredReserveTxs = useMemo(() => {
    const list = reserveTransactions || [];

    const result = list.filter((item) => {
      const from = item.fromWallet || item.from || "";
      const to = item.toWallet || item.to || "";
      const isFromReserve = from.includes("reserve") || from.includes("asosiy");
      const isToReserve = to.includes("reserve") || to.includes("asosiy");

      // 1. Yo'nalish filtri
      if (directionFilter === "in" && !(!isFromReserve && isToReserve)) {
        return false;
      }
      if (directionFilter === "out" && !(isFromReserve && !isToReserve)) {
        return false;
      }
      if (directionFilter === "cross" && !(isFromReserve && isToReserve)) {
        return false;
      }

      // 2. Zaxira turi filtri
      if (reserveTypeFilter !== "all") {
        const matchesNaqd = from.includes("naqd") || to.includes("naqd") || item.wallet === "naqd_reserve";
        const matchesKarta = from.includes("karta") || to.includes("karta") || item.wallet === "karta_reserve";
        const matchesDollar = from.includes("dollar") || to.includes("dollar") || item.wallet === "dollar_reserve";

        if (reserveTypeFilter === "naqd" && !matchesNaqd) return false;
        if (reserveTypeFilter === "karta" && !matchesKarta) return false;
        if (reserveTypeFilter === "dollar" && !matchesDollar) return false;
      }

      // 3. Qidiruv
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const reason = (item.reason || item.note || "").toLowerCase();
        const amtStr = String(item.amount || "");
        const fromName = (WALLET_CONFIG[from]?.label || from).toLowerCase();
        const toName = (WALLET_CONFIG[to]?.label || to).toLowerCase();

        if (!reason.includes(q) && !amtStr.includes(q) && !fromName.includes(q) && !toName.includes(q)) {
          return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.spentAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.spentAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }, [reserveTransactions, directionFilter, reserveTypeFilter, searchQuery]);

  // Zaxira harakatlari statistikasi
  const reserveStats = useMemo(() => {
    let inSumUZS = 0;
    let outSumUZS = 0;
    let inSumUSD = 0;
    let outSumUSD = 0;

    const rate = rateInfo?.rate || 12850;

    (reserveTransactions || []).forEach((item) => {
      const from = item.fromWallet || item.from || "";
      const to = item.toWallet || item.to || "";
      const isFromReserve = from.includes("reserve") || from.includes("asosiy");
      const isToReserve = to.includes("reserve") || to.includes("asosiy");
      const amt = Number(item.amount || 0);
      const isDollar = item.currency === "USD" || from.includes("dollar") || to.includes("dollar");

      if (!isFromReserve && isToReserve) {
        // Zaxiraga kirim
        if (isDollar) inSumUSD += amt;
        else inSumUZS += amt;
      } else if (isFromReserve && !isToReserve) {
        // Zaxiradan chiqim
        if (isDollar) outSumUSD += amt;
        else outSumUZS += amt;
      }
    });

    const totalInUZS = inSumUZS + inSumUSD * rate;
    const totalOutUZS = outSumUZS + outSumUSD * rate;
    const netReserveChange = totalInUZS - totalOutUZS;

    return {
      count: (reserveTransactions || []).length,
      totalInUZS,
      inSumUZS,
      inSumUSD,
      totalOutUZS,
      outSumUZS,
      outSumUSD,
      netReserveChange,
    };
  }, [reserveTransactions, rateInfo]);

  return (
    <div className="cp-compact-page">
      {/* 1. Ultra-ixcham Header: Sarlavha + Qulf va tagida Kurs + O'tkazma */}
      <div className="cp-header-section">
        <div className="cp-header-top">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-accent" />
            <h1 className="cp-title">Boshqaruv</h1>
          </div>

          <button
            type="button"
            className="cp-lock-btn"
            onClick={handleLockAndNavigate}
            title="Boshqaruv panelini qulflash va Bosh sahifaga o'tish"
          >
            <Lock size={13} />
            <span>Qulflash</span>
          </button>
        </div>

        {/* Ikkinchi qator: Kurs ko'rsatkichi va O'tkazma */}
        <div className="cp-header-actions-row">
          <div className="cp-rate-wrapper">
            <button
              type="button"
              className={`cp-rate-pill ${rateInfo?.isManual ? "is-manual" : ""}`}
              onClick={() => {
                setRateInput(String(roundedRate));
                setIsEditingRate(true);
              }}
              title="Dollar kursini o'zgartirish"
            >
              <span className="cp-rate-pill__badge">{rateInfo?.isManual ? "Qoʻlda" : "CBU"}</span>
              <span className="mono cp-rate-pill__val">
                1$ = {roundedRate.toLocaleString("uz-UZ")}
              </span>
              <Edit3 size={10} className="cp-rate-pill__icon" />
            </button>
            <button
              type="button"
              className="cp-rate-refresh-btn"
              onClick={handleRefreshCbu}
              disabled={isRefreshingRate}
              title="CBU rasmiy kursini yangilash"
            >
              <RefreshCw size={11} className={isRefreshingRate ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Tezkor Universal O'tkazma Tugmasi */}
          <button
            type="button"
            className="btn btn--primary cp-transfer-cta"
            onClick={() => setTransferModal({ from: "naqd", to: "naqd_reserve" })}
            title="Universal zaxira o'tkazmasi"
          >
            <ArrowRightLeft size={13} />
            <span>Zaxira oʻtkazmasi</span>
          </button>
        </div>
      </div>

      {/* 2. Sarhisob (Barcha mablag'lar) */}
      <div className="cp-summary-strip">
        <div className="cp-summary-main">
          <span className="cp-summary-label">Jami jamgʻarma (Oddiy + Zaxira):</span>
          <div className="cp-summary-numbers">
            <span className="mono cp-grand-sum">
              {formatSum(currentBalances.grandTotalWithDollar)}
            </span>
            <span className="mono cp-grand-usd">
              ≈ {formatDollar(currentBalances.grandTotalDollar)}
            </span>
          </div>
        </div>

        <div className="cp-summary-sub">
          <div className="cp-sub-item">
            <span className="cp-sub-dot cp-sub-dot--daily" />
            <span className="cp-sub-label">Kundalik erkin:</span>
            <strong className="mono">{formatSum(currentBalances.totalOddiyWithDollar)}</strong>
          </div>
          <div className="cp-sub-divider">|</div>
          <div className="cp-sub-item">
            <span className="cp-sub-dot cp-sub-dot--reserve" />
            <span className="cp-sub-label">Maxfiy zaxira:</span>
            <strong className="mono text-accent">{formatSum(currentBalances.totalAsosiyWithDollar)}</strong>
          </div>
        </div>
      </div>

      {/* 3. Ixcham Hisoblar Ro'yxati (Barcha 4 manba) */}
      <div className="cp-accounts-list">
        {/* A) Hamyon (Mustaqil - Faqat oddiy) */}
        <div className="cp-row cp-row--hamyon">
          <div className="cp-row-header">
            <div className="cp-row-title-wrap">
              <span className="cp-icon cp-icon--hamyon"><Wallet size={15} /></span>
              <span className="cp-account-name">Hamyon</span>
            </div>
            <strong className="mono cp-account-total" style={{ color: "var(--hamyon, #10b981)" }}>
              {formatSum(currentBalances.hamyon)}
            </strong>
          </div>

          <div className="cp-subrow">
            <div className="cp-subrow-left">
              <span className="cp-type-badge">Oddiy:</span>
              <span className="mono">{formatSum(currentBalances.hamyon)}</span>
            </div>
            <button
              type="button"
              className="cp-mini-btn"
              onClick={() => setTransferModal({ from: "hamyon", to: "naqd" })}
              title="Hamyondan boshqa hisobga o'tkazish"
            >
              <ArrowRightLeft size={11} />
              <span>Oʻtkazish</span>
            </button>
          </div>
        </div>

        {/* B) Naqd pul (Oddiy + Zaxira) */}
        <div className="cp-row cp-row--naqd">
          <div className="cp-row-header">
            <div className="cp-row-title-wrap">
              <span className="cp-icon cp-icon--naqd"><Banknote size={15} /></span>
              <span className="cp-account-name">Naqd pul</span>
            </div>
            <strong className="mono cp-account-total">
              {formatSum(currentBalances.naqd + naqdReserve)}
            </strong>
          </div>

          {/* Oddiy qism */}
          <div className="cp-subrow">
            <div className="cp-subrow-left">
              <span className="cp-type-badge">Oddiy:</span>
              <span className="mono">{formatSum(currentBalances.naqd)}</span>
            </div>
            <button
              type="button"
              className="cp-mini-btn"
              onClick={() => setTransferModal({ from: "naqd", to: "naqd_reserve" })}
              title="Zaxiraga o'tkazish"
            >
              <ArrowRightLeft size={11} />
              <span>Zaxiraga</span>
            </button>
          </div>

          {/* Zaxira qism */}
          <div className="cp-subrow cp-subrow--reserve">
            <div className="cp-subrow-left">
              <span className="cp-type-badge cp-type-badge--reserve">Zaxira:</span>
              <span className="mono cp-reserve-val">{formatSum(naqdReserve)}</span>
            </div>
            <div className="cp-subrow-actions">
              <button
                type="button"
                className="cp-mini-btn"
                onClick={() => setEditingReserveId("naqd_reserve")}
                title="Qoldiqni tahrirlash"
              >
                <Edit2 size={11} />
                <span>Tahrir</span>
              </button>
              <button
                type="button"
                className="cp-mini-btn"
                onClick={() => setTransferModal({ from: "naqd_reserve", to: "naqd" })}
                title="Oddiy balansga yechish"
              >
                <ArrowRightLeft size={11} />
                <span>Yechish</span>
              </button>
            </div>
          </div>
        </div>

        {/* C) Plastik karta (Oddiy + Zaxira) */}
        <div className="cp-row cp-row--karta">
          <div className="cp-row-header">
            <div className="cp-row-title-wrap">
              <span className="cp-icon cp-icon--karta"><CreditCard size={15} /></span>
              <span className="cp-account-name">Plastik karta</span>
            </div>
            <strong className="mono cp-account-total">
              {formatSum(currentBalances.karta + kartaReserve)}
            </strong>
          </div>

          {/* Oddiy qism */}
          <div className="cp-subrow">
            <div className="cp-subrow-left">
              <span className="cp-type-badge">Oddiy:</span>
              <span className="mono">{formatSum(currentBalances.karta)}</span>
            </div>
            <button
              type="button"
              className="cp-mini-btn"
              onClick={() => setTransferModal({ from: "karta", to: "karta_reserve" })}
              title="Zaxiraga o'tkazish"
            >
              <ArrowRightLeft size={11} />
              <span>Zaxiraga</span>
            </button>
          </div>

          {/* Zaxira qism */}
          <div className="cp-subrow cp-subrow--reserve">
            <div className="cp-subrow-left">
              <span className="cp-type-badge cp-type-badge--reserve">Zaxira:</span>
              <span className="mono cp-reserve-val">{formatSum(kartaReserve)}</span>
            </div>
            <div className="cp-subrow-actions">
              <button
                type="button"
                className="cp-mini-btn"
                onClick={() => setEditingReserveId("karta_reserve")}
                title="Qoldiqni tahrirlash"
              >
                <Edit2 size={11} />
                <span>Tahrir</span>
              </button>
              <button
                type="button"
                className="cp-mini-btn"
                onClick={() => setTransferModal({ from: "karta_reserve", to: "karta" })}
                title="Oddiy balansga yechish"
              >
                <ArrowRightLeft size={11} />
                <span>Yechish</span>
              </button>
            </div>
          </div>
        </div>

        {/* D) AQSH Dollari (Oddiy + Zaxira) */}
        <div className="cp-row cp-row--dollar">
          <div className="cp-row-header">
            <div className="cp-row-title-wrap">
              <span className="cp-icon cp-icon--dollar"><BadgeDollarSign size={15} /></span>
              <span className="cp-account-name">Dollar ($)</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <strong className="mono cp-account-total" style={{ color: "var(--dollar)" }}>
                {formatDollar(currentBalances.dollar + dollarReserve)}
              </strong>
              <span className="mono cp-dollar-equiv">
                ~ {formatSum((currentBalances.dollar + dollarReserve) * currentRate)}
              </span>
            </div>
          </div>

          {/* Oddiy qism */}
          <div className="cp-subrow">
            <div className="cp-subrow-left">
              <span className="cp-type-badge">Oddiy:</span>
              <span className="mono">{formatDollar(currentBalances.dollar)}</span>
            </div>
            <button
              type="button"
              className="cp-mini-btn"
              onClick={() => setTransferModal({ from: "dollar", to: "dollar_reserve" })}
              title="Zaxiraga o'tkazish"
            >
              <ArrowRightLeft size={11} />
              <span>Zaxiraga</span>
            </button>
          </div>

          {/* Zaxira qism */}
          <div className="cp-subrow cp-subrow--reserve">
            <div className="cp-subrow-left">
              <span className="cp-type-badge cp-type-badge--reserve">Zaxira:</span>
              <span className="mono cp-reserve-val">{formatDollar(dollarReserve)}</span>
            </div>
            <div className="cp-subrow-actions">
              <button
                type="button"
                className="cp-mini-btn"
                onClick={() => setEditingReserveId("dollar_reserve")}
                title="Qoldiqni tahrirlash"
              >
                <Edit2 size={11} />
                <span>Tahrir</span>
              </button>
              <button
                type="button"
                className="cp-mini-btn"
                onClick={() => setTransferModal({ from: "dollar_reserve", to: "dollar" })}
                title="Oddiy balansga yechish"
              >
                <ArrowRightLeft size={11} />
                <span>Yechish</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAXSUS ZAXIRA O'TKAZMALARI DASHBOARDI */}
      <section className="cp-reserve-dashboard-section" style={{ marginTop: 28 }}>
        <div className="section-header-row" style={{ marginBottom: 12 }}>
          <div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              <h2 className="section-title" style={{ fontSize: "1.15rem" }}>
                Zaxira O'tkazmalari Dashboardi
              </h2>
            </div>
            <p className="section-desc">
              Faqat maxfiy zaxira hisoblari bilan bog'liq o'tkazmalar, tushumlar va yechishlar tarixi
            </p>
          </div>

          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setTransferModal({ from: "naqd", to: "naqd_reserve" })}
          >
            <ArrowRightLeft size={14} />
            <span>Yangi o'tkazma</span>
          </button>
        </div>

        {/* Zaxira Statistikasi Kichik Paneli */}
        <div className="cp-reserve-stats-grid">
          <div className="cp-reserve-stat-card cp-reserve-stat-card--in">
            <div className="cp-reserve-stat-card__label">
              <TrendingUp size={13} className="text-income" />
              <span>Zaxiraga kirim (+)</span>
            </div>
            <div className="cp-reserve-stat-card__val mono text-income">
              +{formatSum(reserveStats.inSumUZS)}
              {reserveStats.inSumUSD > 0 && <span> (+{formatDollar(reserveStats.inSumUSD)})</span>}
            </div>
          </div>

          <div className="cp-reserve-stat-card cp-reserve-stat-card--out">
            <div className="cp-reserve-stat-card__label">
              <TrendingDown size={13} className="text-expense" />
              <span>Zaxiradan yechilgan (-)</span>
            </div>
            <div className="cp-reserve-stat-card__val mono text-expense">
              -{formatSum(reserveStats.outSumUZS)}
              {reserveStats.outSumUSD > 0 && <span> (-{formatDollar(reserveStats.outSumUSD)})</span>}
            </div>
          </div>

          <div className="cp-reserve-stat-card cp-reserve-stat-card--count">
            <div className="cp-reserve-stat-card__label">
              <ArrowRightLeft size={13} className="text-transfer" />
              <span>Jami amallar</span>
            </div>
            <div className="cp-reserve-stat-card__val mono text-transfer">
              {reserveStats.count} ta o'tkazma
            </div>
          </div>
        </div>

        {/* Qidiruv va Filtrlar */}
        <div className="cp-reserve-filter-bar" style={{ marginTop: 12, marginBottom: 12 }}>
          <div className="history-search-row cp-reserve-filter-row">
            <div className="search-box" style={{ flex: 1, minWidth: 160 }}>
              <Search size={15} className="search-box__icon" />
              <input
                type="text"
                placeholder="Zaxira o'tkazmalarini qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-box__input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-box__clear"
                  onClick={() => setSearchQuery("")}
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            <div className="cp-reserve-selects-wrap">
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Barcha yo'nalish</option>
                <option value="in">Zaxiraga kirim (+)</option>
                <option value="out">Zaxiradan yechish (-)</option>
                <option value="cross">Zaxiralararo (⇄)</option>
              </select>

              <select
                value={reserveTypeFilter}
                onChange={(e) => setReserveTypeFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Barcha zaxiralar</option>
                <option value="naqd">Naqd zaxira</option>
                <option value="karta">Karta zaxira</option>
                <option value="dollar">Dollar zaxira</option>
              </select>
            </div>
          </div>
        </div>

        {/* O'tkazmalar Ro'yxati */}
        <div className="ledger-card">
          {filteredReserveTxs.length === 0 ? (
            <div className="ledger-empty" style={{ padding: 24 }}>
              <p>Zaxira hisobi bilan bog'liq hech qanday o'tkazma topilmadi.</p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setTransferModal({ from: "naqd", to: "naqd_reserve" })}
                style={{ marginTop: 8 }}
              >
                <ArrowRightLeft size={13} />
                <span>Birinchi zaxira o'tkazmasini qilish</span>
              </button>
            </div>
          ) : (
            <div className="ledger">
              {filteredReserveTxs.map((tx) => {
                const from = tx.fromWallet || tx.from || "";
                const to = tx.toWallet || tx.to || "";
                const isFromReserve = from.includes("reserve") || from.includes("asosiy");
                const isToReserve = to.includes("reserve") || to.includes("asosiy");

                const fromInfo = WALLET_CONFIG[from] || RESERVE_CONFIG[from] || { label: from, shortLabel: from };
                const toInfo = WALLET_CONFIG[to] || RESERVE_CONFIG[to] || { label: to, shortLabel: to };

                const isDollar = tx.currency === "USD" || from.includes("dollar") || to.includes("dollar");

                const isDeposit = !isFromReserve && isToReserve;
                const isWithdraw = isFromReserve && !isToReserve;

                return (
                  <div key={tx.id} className="ledger-row ledger-row--transfer">
                    <div className="ledger-row__header">
                      <div className="ledger-cell--category">
                        <div className="category-tag category-tag--transfer">
                          <ArrowRightLeft size={13} color="var(--transfer)" />
                          <span className="cat-name">
                            {isDeposit
                              ? "Zaxiraga ajratildi"
                              : isWithdraw
                              ? "Zaxiradan yechildi"
                              : "Zaxiralararo o'tkazma"}
                          </span>
                        </div>
                      </div>

                      <div className="ledger-cell--amount mono ledger-row__amount--transfer">
                        <div className="ledger-amount-val">
                          {isDeposit ? "+ " : isWithdraw ? "- " : "⇄ "}
                          {isDollar ? formatDollar(tx.amount) : formatSum(tx.amount)}
                        </div>
                        {isDollar && tx.exchangeRateAtTime && (
                          <span className="ledger-amount-sub">
                            ~ {formatSum(tx.amount * tx.exchangeRateAtTime)}
                          </span>
                        )}
                      </div>
                    </div>

                    {(tx.reason || tx.note) && (
                      <div className="ledger-cell--desc">
                        <div className="ledger-row__reason">
                          {tx.reason || tx.note}
                        </div>
                      </div>
                    )}

                    <div className="ledger-row__footer">
                      <div className="ledger-cell--meta">
                        <span className="ledger-row__date mono">
                          {formatDateTime(tx.spentAt || tx.createdAt)}
                        </span>
                        <span className="ledger-meta-dot">•</span>
                        <span className="badge badge--transfer" style={{ background: "var(--surface-3)" }}>
                          {fromInfo.shortLabel || from} → {toInfo.shortLabel || to}
                        </span>
                        {tx.synced ? (
                          <span className="badge badge--db-synced">
                            <Database size={9} />
                            <span>DB</span>
                          </span>
                        ) : (
                          <span className="badge badge--db-pending">
                            <Clock size={9} />
                            <span>Lokal</span>
                          </span>
                        )}
                      </div>

                      <div className="ledger-cell--actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => setEditingTx(tx)}
                          title="Tahrirlash"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon--danger"
                          onClick={() => {
                            if (window.confirm("Rostdan ham ushbu zaxira amalini o'chirmoqchimisiz?")) {
                              deleteExpense(tx.id);
                            }
                          }}
                          title="O'chirish"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Kursni tahrirlash dialogi */}
      {isEditingRate && (
        <div className="modal-overlay" onClick={() => setIsEditingRate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, padding: 18 }}>
            <div className="modal-mobile-handle" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", display: "block" }}>1 USD kursi</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Rasmiy CBU: {Math.round(rateInfo?.rate || 12850).toLocaleString("uz-UZ")} soʻm
                </span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsEditingRate(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="field-label" style={{ fontSize: "0.78rem" }}>
                  1 Dollar narxi (so'mda):
                </label>
                <input
                  type="number"
                  step="any"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="field-input mono"
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[12800, 12850, 12900, 13000].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`quick-chip-btn ${Number(rateInput) === r ? "is-active" : ""}`}
                    onClick={() => setRateInput(String(r))}
                  >
                    {r.toLocaleString("uz-UZ")}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn--subtle btn--xs"
                  onClick={async () => {
                    await loadCbuRate();
                    setIsEditingRate(false);
                  }}
                  title="CBU rasmiy kursini qayta o'rnatish"
                >
                  <RefreshCw size={12} />
                  <span>CBU kursiga qaytarish</span>
                </button>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setIsEditingRate(false)}>
                    Bekor
                  </button>
                  <button type="submit" className="btn btn--primary btn--sm">
                    <Check size={14} />
                    <span>Saqlash</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rezerv Tahrirlash Modali */}
      {editingReserveId && (
        <EditReserveModal
          reserveId={editingReserveId}
          onClose={() => setEditingReserveId(null)}
        />
      )}

      {/* Universal Zaxira O'tkazma Modali */}
      {transferModal && (
        <UniversalTransferModal
          initialFrom={transferModal.from}
          initialTo={transferModal.to}
          onClose={() => setTransferModal(null)}
        />
      )}

      {/* Tranzaksiyani tahrirlash modali */}
      {editingTx && (
        <EditTransactionModal
          item={editingTx}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
