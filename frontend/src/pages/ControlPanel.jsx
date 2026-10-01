import { useState } from "react";
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
} from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatRate } from "../utils/format.js";
import EditReserveModal from "../components/control-panel/EditReserveModal.jsx";
import UniversalTransferModal from "../components/control-panel/UniversalTransferModal.jsx";

export default function ControlPanel() {
  const {
    currentBalances,
    reserves,
    rateInfo,
    loadCbuRate,
    setManualUsdRate,
  } = useExpenses();

  const [editingReserveId, setEditingReserveId] = useState(null);
  const [transferModal, setTransferModal] = useState(null); // { from, to } | null
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(rateInfo?.rate || 12850));

  const currentRate = rateInfo?.rate || 12850;

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

  return (
    <div className="cp-compact-page">
      {/* 1. Ultra-ixcham Top Bar: Sarlavha + Kurs pill + O'tkazma tugmasi */}
      <div className="cp-topbar">
        <h1 className="cp-title">Boshqaruv</h1>

        <div className="cp-topbar-actions">
          {/* Kurs Pill (bosilsa tahrirlash ochiladi) */}
          <div
            className={`cp-rate-pill ${rateInfo?.isManual ? "is-manual" : ""}`}
            onClick={() => {
              setRateInput(String(currentRate));
              setIsEditingRate(true);
            }}
            title="Kursni o'zgartirish yoki yangilash"
          >
            <span className="mono">1$ = {formatRate(currentRate)}</span>
            <button
              type="button"
              className="cp-rate-refresh-btn"
              onClick={handleRefreshCbu}
              disabled={isRefreshingRate}
              title="CBU kursini yangilash"
            >
              <RefreshCw size={11} className={isRefreshingRate ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Tezkor Universal O'tkazma Tugmasi */}
          <button
            type="button"
            className="btn btn--primary cp-transfer-cta"
            onClick={() => setTransferModal({ from: "naqd", to: "naqd_reserve" })}
            title="Universal o'tkazma"
          >
            <ArrowRightLeft size={13} />
            <span>Oʻtkazma</span>
          </button>
        </div>
      </div>

      {/* 2. Ultra-ixcham Sarhisob (Barcha mablag'lar) */}
      <div className="cp-summary-strip">
        <div className="cp-summary-main">
          <span className="cp-summary-label">Jami mablagʻ:</span>
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
            <span className="cp-sub-label">Erkin:</span>
            <strong className="mono">{formatSum(currentBalances.totalOddiyWithDollar)}</strong>
          </div>
          <div className="cp-sub-divider">|</div>
          <div className="cp-sub-item">
            <span className="cp-sub-dot cp-sub-dot--reserve" />
            <span className="cp-sub-label">Zaxira:</span>
            <strong className="mono">{formatSum(currentBalances.totalAsosiyWithDollar)}</strong>
          </div>
        </div>
      </div>

      {/* 3. Ixcham Hisoblar Ro'yxati (Barcha 4 manba bitta ekranda) */}
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
                title="Tahrirlash"
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
                title="Tahrirlash"
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
                title="Tahrirlash"
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

      {/* Kursni tahrirlash mini modal/dialog */}
      {isEditingRate && (
        <div className="modal-overlay" onClick={() => setIsEditingRate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, padding: 18 }}>
            <div className="modal-mobile-handle" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Dollar kursini belgilash</span>
              <button type="button" className="btn-icon" onClick={() => setIsEditingRate(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveRate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="field-label" style={{ fontSize: "0.78rem" }}>1 USD kursi (so'm):</label>
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
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setIsEditingRate(false)}>
                  Bekor
                </button>
                <button type="submit" className="btn btn--primary btn--sm">
                  <Check size={14} />
                  <span>Saqlash</span>
                </button>
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

      {/* Universal O'tkazma Modali */}
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
