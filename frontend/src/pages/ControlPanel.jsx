import { useState } from "react";
import { Link } from "react-router-dom";
import {
  SlidersHorizontal,
  Wallet,
  ArrowRightLeft,
  Shield,
  Coins,
  Banknote,
  CreditCard,
  BadgeDollarSign,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Database,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatRate, formatDateTime } from "../utils/format.js";
import DollarRateCard from "../components/control-panel/DollarRateCard.jsx";
import ReserveCard from "../components/control-panel/ReserveCard.jsx";
import EditReserveModal from "../components/control-panel/EditReserveModal.jsx";
import UniversalTransferModal from "../components/control-panel/UniversalTransferModal.jsx";
import PendingDebtsCard from "../components/control-panel/PendingDebtsCard.jsx";

export default function ControlPanel() {
  const { currentBalances, reserves, rateInfo, syncStatus, triggerManualSync } = useExpenses();

  const [editingReserveId, setEditingReserveId] = useState(null);
  const [transferModal, setTransferModal] = useState(null); // { from, to } | null

  const handleOpenTransfer = (from, to) => {
    setTransferModal({ from, to });
  };

  const currentRate = rateInfo?.rate || 12850;

  return (
    <div className="control-panel-page animate-fade-in" style={{ paddingBottom: 48 }}>
      {/* Sarlavha va tezkor amallar */}
      <div className="dashboard-header" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge badge--primary" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <SlidersHorizontal size={13} />
              <span>Boshqaruv markazi</span>
            </span>
            <span className="badge badge--success">To'liq monitoring</span>
          </div>
          <h1 className="dashboard-title" style={{ marginTop: 6 }}>
            Moliya Boshqaruv Paneli (Control Panel)
          </h1>
          <p className="dashboard-subtitle">
            Barcha oddiy va asosiy (rezerv) hisoblar, CBU dollar kursi va hisoblararo universal o'tkazmalar
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/settings" className="btn btn--subtle" title="Sinxronizatsiya va sozlamalar">
            <Settings size={16} />
            <span>Sozlamalar & DB</span>
          </Link>
          <Link to="/money" className="btn btn--subtle">
            <Wallet size={16} />
            <span>Money Managerga o'tish</span>
          </Link>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleOpenTransfer("naqd", "naqd-asosiy")}
          >
            <ArrowRightLeft size={16} />
            <span>Universal o'tkazma</span>
          </button>
        </div>
      </div>

      {/* DB Sinxronizatsiya Holati Tezkor Paneli */}
      <div
        className="card"
        style={{
          padding: "12px 18px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Database
            size={20}
            style={{
              color: syncStatus?.isConnected ? "var(--income)" : "var(--warning)",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: "0.88rem" }}>
                DB Aloqasi: {syncStatus?.isConnected ? "Ulangan (Faol)" : "Oflayn xotira"}
              </strong>
              {syncStatus?.pendingCount > 0 ? (
                <span className="badge badge--warning" style={{ fontSize: "0.72rem" }}>
                  {syncStatus.pendingCount} ta kutilmoqda
                </span>
              ) : (
                <span className="badge badge--success" style={{ fontSize: "0.72rem" }}>
                  DBga to'liq saqlangan
                </span>
              )}
            </div>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
              {syncStatus?.lastSyncedAt
                ? `Oxirgi sync: ${formatDateTime(syncStatus.lastSyncedAt)}`
                : "Avtomatik sinxronizatsiya faol"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn--primary btn--xs"
            onClick={() => triggerManualSync()}
            disabled={syncStatus?.isSyncing}
          >
            <RefreshCw size={13} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
            <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "Qoʻlda sinxronlash"}</span>
          </button>
          <Link to="/settings" className="btn btn--ghost btn--xs">
            <span>Barcha sozlamalar →</span>
          </Link>
        </div>
      </div>

      {/* 1. Umumiy 3 ta KPI sarhisob bloklari */}
      <div className="control-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 22 }}>
        {/* Oddiy Balanslar Yig'indisi */}
        <div className="kpi-card kpi-card--oddiy" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Barcha Oddiylar Yig'indisi
            </span>
            <span className="badge badge--wallet" style={{ fontSize: "0.7rem" }}>
              Kundalik erkin
            </span>
          </div>
          <div className="mono" style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--text)" }}>
            {formatSum(currentBalances.totalOddiyWithDollar)}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>So'm: <strong className="mono">{formatSum(currentBalances.totalOddiyUZS)}</strong></span>
            <span>Dollar: <strong className="mono">{formatDollar(currentBalances.dollar)}</strong></span>
          </div>
        </div>

        {/* Asosiy (Rezerv) Balanslar Yig'indisi */}
        <div className="kpi-card kpi-card--asosiy" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Shield size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)" }}>
                Barcha Asosiylar (Rezerv) Yig'indisi
              </span>
            </div>
            <span className="badge badge--primary" style={{ fontSize: "0.7rem" }}>
              Daxlsiz jamg'arma
            </span>
          </div>
          <div className="mono" style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--accent)" }}>
            {formatSum(currentBalances.totalAsosiyWithDollar)}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>So'm: <strong className="mono">{formatSum(currentBalances.totalAsosiyUZS)}</strong></span>
            <span>Dollar: <strong className="mono">{formatDollar(currentBalances.dollarAsosiy)}</strong></span>
          </div>
        </div>

        {/* Hammasining Umumiy Yig'indisi (Grand Total) */}
        <div className="kpi-card kpi-card--grand" style={{ background: "var(--surface)", border: "2px solid var(--accent-border, var(--border))", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>
              Barcha Mablag'lar Umumiy Jamg'armasi
            </span>
            <span className="badge badge--success" style={{ fontSize: "0.7rem" }}>
              Grand Total
            </span>
          </div>
          <div className="mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)" }}>
            {formatSum(currentBalances.grandTotalWithDollar)}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>Jami dollar: <strong className="mono">{formatDollar(currentBalances.grandTotalDollar)}</strong></span>
            <span>(@ {formatRate(currentRate)})</span>
          </div>
        </div>
      </div>

      {/* 2. Dollar Kursi Bloki (CBU.uz & Tarix) */}
      <div style={{ marginBottom: 22 }}>
        <DollarRateCard />
      </div>

      {/* 3. Hamma Walletlar To'liq Ko'rinishi (Oddiy + Asosiy) */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text)" }}>
              Pul Manbalari & Rezerv Balanslari
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Hamyon (mustaqil), Naqd pul, Plastik karta va Dollar manbalari to'liq nazorati
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* A) Hamyon (Yangi, mustaqil - faqat bitta oddiy balans) */}
          <div className="control-wallet-card" style={{ borderLeft: "3px solid var(--hamyon, #10b981)" }}>
            <div className="control-wallet-card__header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="control-wallet-card__icon"
                  style={{
                    background: "var(--hamyon-soft, rgba(16, 185, 129, 0.14))",
                    color: "var(--hamyon, #10b981)",
                    padding: 8,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="control-wallet-card__title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                    Hamyon (Mustaqil)
                  </h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Faqat bitta oddiy balans — kundalik xarajat va daromadlar uchun
                  </span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                  Mavjud erkin balans:
                </span>
                <strong className="mono" style={{ fontSize: "1.3rem", color: "var(--hamyon, #10b981)" }}>
                  {formatSum(currentBalances.hamyon)}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "var(--surface-hover)", padding: "10px 14px", borderRadius: 8 }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                💡 Hamyondagi pulni Naqd yoki Kartaga o'tkazish mumkin.
              </div>
              <button
                type="button"
                className="btn btn--primary btn--hamyon-transfer"
                onClick={() => handleOpenTransfer("hamyon", "naqd")}
                style={{ fontSize: "0.8rem", padding: "6px 14px" }}
              >
                <ArrowRightLeft size={14} />
                <span>Hamyondan o'tkazish</span>
              </button>
            </div>
          </div>

          {/* B) Naqd pul (Oddiy + Asosiy) */}
          <ReserveCard
            walletId="naqd"
            reserveId="naqd-asosiy"
            title="Naqd Pul"
            icon={Banknote}
            colorVar="--naqd"
            oddiyAmount={currentBalances.naqd}
            reserveData={reserves["naqd-asosiy"]}
            currency="UZS"
            currentRate={currentRate}
            onEditReserve={(id) => setEditingReserveId(id)}
            onTransfer={(from, to) => handleOpenTransfer(from, to)}
          />

          {/* C) Plastik karta (Oddiy + Asosiy) */}
          <ReserveCard
            walletId="karta"
            reserveId="karta-asosiy"
            title="Plastik Karta (Uzcard / Humo)"
            icon={CreditCard}
            colorVar="--karta"
            oddiyAmount={currentBalances.karta}
            reserveData={reserves["karta-asosiy"]}
            currency="UZS"
            currentRate={currentRate}
            onEditReserve={(id) => setEditingReserveId(id)}
            onTransfer={(from, to) => handleOpenTransfer(from, to)}
          />

          {/* D) AQSH Dollari (Oddiy + Asosiy) */}
          <ReserveCard
            walletId="dollar"
            reserveId="dollar-asosiy"
            title="AQSH Dollari ($)"
            icon={BadgeDollarSign}
            colorVar="--dollar"
            oddiyAmount={currentBalances.dollar}
            reserveData={reserves["dollar-asosiy"]}
            currency="USD"
            currentRate={currentRate}
            onEditReserve={(id) => setEditingReserveId(id)}
            onTransfer={(from, to) => handleOpenTransfer(from, to)}
          />
        </div>
      </div>

      {/* 4. Kelajak uchun: Kutilayotgan pullar (Qarzlar) */}
      <div style={{ marginBottom: 22 }}>
        <PendingDebtsCard />
      </div>

      {/* Modallar */}
      {editingReserveId && (
        <EditReserveModal
          reserveId={editingReserveId}
          onClose={() => setEditingReserveId(null)}
        />
      )}

      {transferModal && (
        <UniversalTransferModal
          initialFrom={transferModal.from}
          initialTo={transferModal.to}
          onClose={() => setTransferModal(null)}
        />
      )}
    </div>
  );
}
