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
  LayoutList,
  LayoutGrid,
  X,
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

const STORAGE_VIEW_KEY = "oybek_system:debts_view_mode";

export default function DebtsPage() {
  const { debts, addDebt, repayDebt, deleteDebt, updateDebt, rateInfo } = useExpenses();
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
    if (rem > 0) {
      await repayDebt(id, {
        amount: customOpts.amount !== undefined ? customOpts.amount : rem,
        wallet: customOpts.wallet || debt.wallet,
        affectBalance: customOpts.affectBalance !== undefined ? customOpts.affectBalance : false,
        note: customOpts.note || "To'liq yopildi deb belgilandi",
        date: new Date().toISOString(),
      });
    } else {
      await updateDebt(id, { status: "settled" });
    }
  };

  return (
    <div className="debts-page" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Sarlavha qismi */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(78, 184, 150, 0.15)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HandCoins size={19} />
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>Qarz daftari</h1>
          </div>
          <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
            Kutilayotgan pullar, berilgan va olingan qarzlar ro'yxati. Shaxs ustiga bosib barcha informatsiyalarini ko'rishingiz mumkin.
          </p>
        </div>

        <div className="debts-header-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Ko'rinish rejimi: Daftar (Notebook) yoki Karta (Cards) */}
          <div className="debt-view-toggle">
            <button
              type="button"
              className={`debt-view-toggle__btn ${viewMode === "ledger" ? "is-active" : ""}`}
              onClick={() => handleViewModeChange("ledger")}
              title="Daftar ko'rinishi (Hammasi bir ro'yxatda)"
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
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <PlusCircle size={16} />
            <span>Yangi qarz yozish</span>
          </button>
        </div>
      </div>

      {/* KPI Ko'rsatkichlari */}
      <div
        className="debts-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        {/* Men bergan qarzlar */}
        <div
          className="stat-card"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem" }}>
              <ArrowUpRight size={16} />
              <span>Men bergan qarzlar (Kutilmoqda)</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Qoldiq</span>
          </div>

          <div className="mono" style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text)" }}>
            {formatSum(stats.givenUzs)}
          </div>

          {stats.givenUsd > 0 && (
            <div style={{ fontSize: "0.85rem", color: "var(--dollar)", fontWeight: 600 }}>
              + {formatDollar(stats.givenUsd)}
            </div>
          )}

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Qaytarilishi kerak bo'lgan mablag'
          </div>
        </div>

        {/* Men olgan qarzlar */}
        <div
          className="stat-card"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b", fontWeight: 600, fontSize: "0.85rem" }}>
              <ArrowDownLeft size={16} />
              <span>Men olgan qarzlar (Majburiyat)</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Qoldiq</span>
          </div>

          <div className="mono" style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--expense)" }}>
            {formatSum(stats.takenUzs)}
          </div>

          {stats.takenUsd > 0 && (
            <div style={{ fontSize: "0.85rem", color: "var(--expense)", fontWeight: 600 }}>
              + {formatDollar(stats.takenUsd)}
            </div>
          )}

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            To'lashim kerak bo'lgan summa
          </div>
        </div>

        {/* Sof kutilayotgan saldo */}
        <div
          className="stat-card"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem" }}>
              <CheckCircle2 size={16} />
              <span>Sof kutilayotgan saldo</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Farq</span>
          </div>

          <div
            className="mono"
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              color: stats.grandNetUzs >= 0 ? "var(--income)" : "var(--expense)",
            }}
          >
            {stats.grandNetUzs >= 0 ? "+" : ""}{formatSum(stats.grandNetUzs)}
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
            Faol qarzlar: <strong>{stats.pendingCount} ta</strong> • Yopilgan: <strong>{stats.settledCount} ta</strong>
          </div>
        </div>
      </div>

      {/* Qidiruv va filtr tugmalari */}
      <div className="debts-filter-card">
        {/* Filtr tabs (Scrollable on mobile) */}
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
              className={`btn btn--xs ${filterType === tab.id ? "btn--primary" : "btn--ghost"}`}
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
            className="field-input field-input--sm"
            placeholder="Ism, joy, sabab yoki izoh..."
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

      {/* Qarzlar ro'yxati: Daftar yoki Kartalar */}
      {filteredDebts.length > 0 ? (
        viewMode === "ledger" ? (
          <DebtLedgerList
            debts={filteredDebts}
            onSelectDebt={(debt) => setSelectedDebt(debt)}
            onOpenRepay={(debt) => setRepayTargetDebt(debt)}
            onSettleDebt={handleSettle}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
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
        <div
          style={{
            background: "var(--surface)",
            padding: "40px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <HandCoins size={36} color="var(--text-muted)" />
          <div>
            <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text)" }}>
              {searchQuery ? "Hech qanday qarz topilmadi" : "Qarz daftari bo'sh"}
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {searchQuery
                ? "Qidiruv so'zini o'zgartirib ko'ring yoki filtrlarni tozalang."
                : "Berilgan yoki olingan qarzlar bo'lsa, 'Yangi qarz yozish' tugmasi orqali kiriting."}
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

      {/* Mobil telefonlar uchun tezkor qarz qo'shish suzuvchi (FAB) tugmasi */}
      <button
        type="button"
        className="debt-fab-btn"
        onClick={() => setIsAddModalOpen(true)}
        aria-label="Yangi qarz yozish"
        title="Yangi qarz yozish"
      >
        <PlusCircle size={22} />
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
