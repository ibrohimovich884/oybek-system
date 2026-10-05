import { useState, useMemo, useEffect } from "react";
import {
  HandCoins,
  PlusCircle,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  BookOpen,
  LayoutGrid,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum, formatDollar } from "../utils/format.js";
import { DEBT_TYPES } from "../constants/debts.js";
import DebtCard from "../components/debts/DebtCard.jsx";
import DebtLedgerList from "../components/debts/DebtLedgerList.jsx";
import DebtDetailModal from "../components/debts/DebtDetailModal.jsx";
import EditDebtModal from "../components/debts/EditDebtModal.jsx";
import AddDebtModal from "../components/debts/AddDebtModal.jsx";
import RepayDebtModal from "../components/debts/RepayDebtModal.jsx";
import Loader from "../components/common/Loader.jsx";

const STORAGE_VIEW_KEY = "oybek_system:debts_view_mode";

export default function DebtsPage() {
  const { debts, addDebt, repayDebt, deleteDebt, updateDebt, rateInfo, isLoading } = useExpenses();
  const currentUsdRate = rateInfo?.rate || 12850;

  // Standart ko'rinish: Samsung Notes / Daftar ko'rinishi ("ledger")
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_VIEW_KEY) || "ledger";
    }
    return "ledger";
  });

  const [filterType, setFilterType] = useState("all"); // "all" | "given" | "taken" | "pending" | "settled"
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [repayTargetDebt, setRepayTargetDebt] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);

  // View mode o'zgarganda saqlash
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_VIEW_KEY, mode);
    }
  };

  // Agar selectedDebt o'zgarsa (masalan context yangilansa), yangi nusxasini olamiz
  useEffect(() => {
    if (selectedDebt) {
      const fresh = debts.find((d) => d.id === selectedDebt.id);
      if (fresh) {
        setSelectedDebt(fresh);
      } else {
        setSelectedDebt(null);
      }
    }
  }, [debts, selectedDebt?.id]);

  // Statistika hisoblash
  const stats = useMemo(() => {
    let givenUzs = 0;
    let givenUsd = 0;
    let takenUzs = 0;
    let takenUsd = 0;
    let pendingCount = 0;
    let settledCount = 0;

    debts.forEach((debt) => {
      const isSettled = debt.status === "settled";
      const totalAmount = Number(debt.amount || 0);
      const paid = (debt.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const remaining = Math.max(0, totalAmount - paid);

      if (isSettled || remaining <= 0) {
        settledCount += 1;
      } else {
        pendingCount += 1;
        if (debt.type === DEBT_TYPES.GIVEN) {
          if (debt.currency === "USD") givenUsd += remaining;
          else givenUzs += remaining;
        } else if (debt.type === DEBT_TYPES.TAKEN) {
          if (debt.currency === "USD") takenUsd += remaining;
          else takenUzs += remaining;
        }
      }
    });

    const netUzs = givenUzs - takenUzs;
    const netUsd = givenUsd - takenUsd;
    const grandNetUzs = netUzs + Math.round(netUsd * currentUsdRate);

    return {
      givenUzs,
      givenUsd,
      takenUzs,
      takenUsd,
      netUzs,
      netUsd,
      grandNetUzs,
      pendingCount,
      settledCount,
      totalCount: debts.length,
    };
  }, [debts, currentUsdRate]);

  // Qidiruv va filtrlar
  const filteredDebts = useMemo(() => {
    return debts
      .filter((d) => {
        // Filtr bo'yicha
        if (filterType === "given" && d.type !== DEBT_TYPES.GIVEN) return false;
        if (filterType === "taken" && d.type !== DEBT_TYPES.TAKEN) return false;
        if (filterType === "pending" && d.status === "settled") return false;
        if (filterType === "settled" && d.status !== "settled") return false;

        // Qidiruv bo'yicha
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (d.personName || "").toLowerCase().includes(q);
          const matchContact = (d.contact || "").toLowerCase().includes(q);
          const matchReason = (d.reason || "").toLowerCase().includes(q);
          const matchLoc = (d.location || "").toLowerCase().includes(q);
          const matchNote = (d.personalNote || "").toLowerCase().includes(q);
          return matchName || matchContact || matchReason || matchLoc || matchNote;
        }

        return true;
      })
      .sort((a, b) => {
        // Avval kutilayotganlar, keyin yopilganlar; kutilayotganlarda eng yangi yoki muddati yaqinlari
        if (a.status === "settled" && b.status !== "settled") return 1;
        if (a.status !== "settled" && b.status === "settled") return -1;
        return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
      });
  }, [debts, filterType, searchQuery]);

  const handleSettle = async (id, customOpts = {}) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    const paid = (debt.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const rem = Math.max(0, Number(debt.amount || 0) - paid);
    
    await repayDebt(id, {
      amount: customOpts.amount !== undefined ? Number(customOpts.amount) : rem,
      wallet: customOpts.wallet || debt.wallet,
      affectBalance: customOpts.affectBalance !== undefined ? customOpts.affectBalance : false,
      note: customOpts.note || "To'liq yopildi deb belgilandi",
      status: "settled",
      markSettled: true,
      date: new Date().toISOString(),
    });
  };

  return (
    <div className="debts-page">
      {/* 1. Sarlavha qismi (Page Header) */}
      <div className="debts-page__header">
        <div className="debts-page__title-block">
          <div className="debts-page__title-row">
            <div className="debts-page__logo-badge">
              <HandCoins size={20} />
            </div>
            <div>
              <h1 className="debts-page__title">Qarz daftari</h1>
              <p className="debts-page__subtitle">
                Kutilayotgan va berilgan qarzlar roʻyxati
              </p>
            </div>
          </div>
        </div>

        <div className="debts-header-actions">
          {/* Ko'rinish rejimi: Daftar (Notebook) yoki Karta (Cards) */}
          <div className="debt-view-toggle">
            <button
              type="button"
              className={`debt-view-toggle__btn ${viewMode === "ledger" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("ledger")}
              title="Daftar ko'rinishi (Ro'yxat)"
            >
              <BookOpen size={14} />
              <span>Daftar</span>
            </button>
            <button
              type="button"
              className={`debt-view-toggle__btn ${viewMode === "cards" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("cards")}
              title="Karta ko'rinishi"
            >
              <LayoutGrid size={14} />
              <span>Kartalar</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn--primary debts-add-btn"
            onClick={() => setIsAddModalOpen(true)}
          >
            <PlusCircle size={16} />
            <span>Yangi qarz</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Ko'rsatkichlari (Responsive stat cards) */}
      <div className="debts-stats-grid">
        {/* Men bergan qarzlar */}
        <div className="debts-stat-card debts-stat-card--given">
          <div className="debts-stat-card__top">
            <div className="debts-stat-card__label">
              <ArrowUpRight size={15} />
              <span>Berilgan (Kutilmoqda)</span>
            </div>
            <span className="debts-stat-card__badge">Qoldiq</span>
          </div>

          <div className="debts-stat-card__val mono">
            {formatSum(stats.givenUzs)}
          </div>

          {stats.givenUsd > 0 && (
            <div className="debts-stat-card__usd-val mono">
              + {formatDollar(stats.givenUsd)}
            </div>
          )}

          <div className="debts-stat-card__meta">
            Qaytarilishi kerak bo'lgan mablag'
          </div>
        </div>

        {/* Men olgan qarzlar */}
        <div className="debts-stat-card debts-stat-card--taken">
          <div className="debts-stat-card__top">
            <div className="debts-stat-card__label">
              <ArrowDownLeft size={15} />
              <span>Olgan (Majburiyat)</span>
            </div>
            <span className="debts-stat-card__badge">Qoldiq</span>
          </div>

          <div className="debts-stat-card__val debts-stat-card__val--taken mono">
            {formatSum(stats.takenUzs)}
          </div>

          {stats.takenUsd > 0 && (
            <div className="debts-stat-card__usd-val debts-stat-card__usd-val--taken mono">
              + {formatDollar(stats.takenUsd)}
            </div>
          )}

          <div className="debts-stat-card__meta">
            To'lashim kerak bo'lgan summa
          </div>
        </div>

        {/* Sof kutilayotgan saldo */}
        <div className="debts-stat-card debts-stat-card--net">
          <div className="debts-stat-card__top">
            <div className="debts-stat-card__label">
              <CheckCircle2 size={15} />
              <span>Sof kutilayotgan saldo</span>
            </div>
            <span className="debts-stat-card__badge">Farq</span>
          </div>

          <div
            className={`debts-stat-card__val mono ${
              stats.grandNetUzs >= 0
                ? "debts-stat-card__val--net-pos"
                : "debts-stat-card__val--net-neg"
            }`}
          >
            {stats.grandNetUzs >= 0 ? "+" : ""}{formatSum(stats.grandNetUzs)}
          </div>

          <div className="debts-stat-card__meta">
            Faol: <strong>{stats.pendingCount} ta</strong> • Yopilgan: <strong>{stats.settledCount} ta</strong>
          </div>
        </div>
      </div>

      {/* 3. Qidiruv va filtr tugmalari (Fluid scrollable tabs) */}
      <div className="debts-filter-card">
        {/* Filtr tabs */}
        <div className="debts-filter-scroll">
          {[
            { id: "all", label: `Barchasi (${debts.length})` },
            { id: "given", label: "Men bergan" },
            { id: "taken", label: "Men olgan" },
            { id: "pending", label: `Kutilmoqda (${stats.pendingCount})` },
            { id: "settled", label: `Yopilgan (${stats.settledCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`debts-filter-tab ${
                filterType === tab.id ? "is-active" : ""
              }`}
              onClick={() => setFilterType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Qidiruv input */}
        <div className="input-with-icon debts-search-box">
          <Search size={15} className="input-icon" />
          <input
            type="text"
            className="field-input field-input--sm debts-search-input"
            placeholder="Ism, telefon, joy, sabab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="debts-search-clear"
              onClick={() => setSearchQuery("")}
              title="Qidiruvni tozalash"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Qarzlar ro'yxati: Daftar yoki Kartalar */}
      {isLoading ? (
        <Loader
          variant="block"
          size="lg"
          text="Qarzlar daftari yuklanmoqda..."
          subtext="Berilgan va olingan qarzlar hisob-kitobi"
          blur="5px"
        />
      ) : filteredDebts.length > 0 ? (
        viewMode === "ledger" ? (
          <DebtLedgerList
            debts={filteredDebts}
            onSelectDebt={(debt) => setSelectedDebt(debt)}
            onOpenRepay={(debt) => setRepayTargetDebt(debt)}
            onSettleDebt={handleSettle}
          />
        ) : (
          <div className="debts-cards-grid">
            {filteredDebts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onSelectDebt={(d) => setSelectedDebt(d)}
                onOpenRepay={(d) => setRepayTargetDebt(d)}
                onDeleteDebt={deleteDebt}
                onSettleDebt={handleSettle}
              />
            ))}
          </div>
        )
      ) : (
        <div className="debts-empty-state">
          <HandCoins size={36} color="var(--text-muted)" />
          <div>
            <h4 className="debts-empty-title">
              {searchQuery ? "Hech qanday qarz topilmadi" : "Qarz daftari bo'sh"}
            </h4>
            <p className="debts-empty-subtitle">
              {searchQuery
                ? "Qidiruv so'zini o'zgartirib ko'ring yoki filtrlarni tozalang."
                : "Berilgan yoki olingan qarzlar bo'lsa, 'Yangi qarz' tugmasi orqali kiriting."}
            </p>
          </div>
          {!searchQuery && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setIsAddModalOpen(true)}
            >
              <PlusCircle size={15} />
              <span>Qarz kiritish</span>
            </button>
          )}
        </div>
      )}

      {/* Mobil telefonlar uchun qulay suzuvchi (FAB) tugma */}
      <button
        type="button"
        className="debt-fab-btn"
        onClick={() => setIsAddModalOpen(true)}
        aria-label="Yangi qarz yozish"
        title="Yangi qarz yozish"
      >
        <PlusCircle size={20} />
        <span>Qarz yozish</span>
      </button>

      {/* Qarzdor shaxsning to'liq informatsiyalari modali */}
      <DebtDetailModal
        isOpen={Boolean(selectedDebt)}
        onClose={() => setSelectedDebt(null)}
        debt={selectedDebt}
        onOpenRepay={(d) => setRepayTargetDebt(d)}
        onOpenEdit={(d) => setEditingDebt(d)}
        onDeleteDebt={deleteDebt}
        onSettleDebt={handleSettle}
      />

      {/* Yangi qarz qo'shish modali */}
      <AddDebtModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDebt={addDebt}
      />

      {/* Qarz ma'lumotlarini tahrirlash modali */}
      <EditDebtModal
        isOpen={Boolean(editingDebt)}
        onClose={() => setEditingDebt(null)}
        debt={editingDebt}
        onUpdateDebt={updateDebt}
      />

      {/* Qisman / to'liq to'lov qayd qilish modali */}
      <RepayDebtModal
        isOpen={Boolean(repayTargetDebt)}
        onClose={() => setRepayTargetDebt(null)}
        debt={repayTargetDebt}
        onRepay={repayDebt}
      />
    </div>
  );
}
