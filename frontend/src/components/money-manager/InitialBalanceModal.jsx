import { useState } from "react";
import { X, Check, RotateCcw, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { DEFAULT_WALLETS } from "../../constants/money.js";
import { formatSum, formatDollar } from "../../utils/format.js";

export default function InitialBalanceModal({ onClose }) {
  const { initialWallets, updateWallets, rateInfo, reserves, updateReserve } = useExpenses();
  const [hamyon, setHamyon] = useState(initialWallets.hamyon ?? DEFAULT_WALLETS.hamyon);
  const [naqd, setNaqd] = useState(initialWallets.naqd ?? DEFAULT_WALLETS.naqd);
  const [karta, setKarta] = useState(initialWallets.karta ?? DEFAULT_WALLETS.karta);
  const [dollar, setDollar] = useState(initialWallets.dollar ?? DEFAULT_WALLETS.dollar);

  // Zaxira hisoblar (b punkt - zaxira shotlar)
  const [naqdReserve, setNaqdReserve] = useState(
    reserves.naqd_reserve?.amount ?? reserves["naqd-asosiy"]?.amount ?? initialWallets.naqd_reserve ?? 0
  );
  const [kartaReserve, setKartaReserve] = useState(
    reserves.karta_reserve?.amount ?? reserves["karta-asosiy"]?.amount ?? initialWallets.karta_reserve ?? 0
  );
  const [dollarReserve, setDollarReserve] = useState(
    reserves.dollar_reserve?.amount ?? reserves["dollar-asosiy"]?.amount ?? initialWallets.dollar_reserve ?? 0
  );

  const [showReserves, setShowReserves] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentRate = rateInfo?.rate || 12850;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateWallets({
        hamyon: Number(hamyon) || 0,
        naqd: Number(naqd) || 0,
        karta: Number(karta) || 0,
        dollar: Number(dollar) || 0,
        naqd_reserve: Number(naqdReserve) || 0,
        karta_reserve: Number(kartaReserve) || 0,
        dollar_reserve: Number(dollarReserve) || 0,
      });

      // Agar zaxiralar o'zgargan bo'lsa ularni ham yangilash
      if (Number(naqdReserve) !== Number(reserves.naqd_reserve?.amount ?? reserves["naqd-asosiy"]?.amount ?? 0)) {
        await updateReserve("naqd_reserve", {
          amount: Number(naqdReserve) || 0,
          noteText: "Dastlabki zaxira balansi o'rnatildi",
        }).catch(() => {});
      }
      if (Number(kartaReserve) !== Number(reserves.karta_reserve?.amount ?? reserves["karta-asosiy"]?.amount ?? 0)) {
        await updateReserve("karta_reserve", {
          amount: Number(kartaReserve) || 0,
          noteText: "Dastlabki zaxira balansi o'rnatildi",
        }).catch(() => {});
      }
      if (Number(dollarReserve) !== Number(reserves.dollar_reserve?.amount ?? reserves["dollar-asosiy"]?.amount ?? 0)) {
        await updateReserve("dollar_reserve", {
          amount: Number(dollarReserve) || 0,
          noteText: "Dastlabki zaxira balansi o'rnatildi",
          exchangeRateAtTime: currentRate,
        }).catch(() => {});
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setHamyon(DEFAULT_WALLETS.hamyon);
    setNaqd(DEFAULT_WALLETS.naqd);
    setKarta(DEFAULT_WALLETS.karta);
    setDollar(DEFAULT_WALLETS.dollar);
    setNaqdReserve(DEFAULT_WALLETS.naqd_reserve);
    setKartaReserve(DEFAULT_WALLETS.karta_reserve);
    setDollarReserve(DEFAULT_WALLETS.dollar_reserve);
  };

  const totalOddiyUZS = (Number(hamyon) || 0) + (Number(naqd) || 0) + (Number(karta) || 0);
  const totalOddiyWithUSD = totalOddiyUZS + (Number(dollar) || 0) * currentRate;

  const totalZaxiraUZS = (Number(naqdReserve) || 0) + (Number(kartaReserve) || 0);
  const totalZaxiraWithUSD = totalZaxiraUZS + (Number(dollarReserve) || 0) * currentRate;

  const grandTotal = totalOddiyWithUSD + totalZaxiraWithUSD;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Boshlang'ich balanslarni sozlash</h3>
            <p className="modal-subtitle">
              Sizda bor bo'lgan dastlabki kundalik va zaxira hisob mablag'larini kiriting
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            1. Oddiy (Kundalik) Pul Manbalari
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label" htmlFor="initial-hamyon">
              Hamyon (so'm) — Mustaqil kundalik
            </label>
            <input
              id="initial-hamyon"
              type="number"
              min="0"
              step="any"
              value={hamyon}
              onChange={(e) => setHamyon(e.target.value)}
              className="expense-form__input mono"
              required
            />
            <span className="field-hint">Hozir: {formatSum(hamyon || 0)}</span>
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label" htmlFor="initial-naqd">
              Naqd pul (so'm) — Oddiy
            </label>
            <input
              id="initial-naqd"
              type="number"
              min="0"
              step="any"
              value={naqd}
              onChange={(e) => setNaqd(e.target.value)}
              className="expense-form__input mono"
              required
            />
            <span className="field-hint">Hozir: {formatSum(naqd || 0)}</span>
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label" htmlFor="initial-karta">
              Plastik karta (so'm) — Oddiy
            </label>
            <input
              id="initial-karta"
              type="number"
              min="0"
              step="any"
              value={karta}
              onChange={(e) => setKarta(e.target.value)}
              className="expense-form__input mono"
              required
            />
            <span className="field-hint">Hozir: {formatSum(karta || 0)}</span>
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label" htmlFor="initial-dollar">
              AQSH Dollari ($) — Oddiy
            </label>
            <input
              id="initial-dollar"
              type="number"
              min="0"
              step="any"
              value={dollar}
              onChange={(e) => setDollar(e.target.value)}
              className="expense-form__input mono"
              required
            />
            <span className="field-hint">
              Hozir: {formatDollar(dollar || 0)} (~ {formatSum((Number(dollar) || 0) * currentRate)})
            </span>
          </div>

          {/* 2. Zaxira hisoblar (b punkt) */}
          <div style={{ marginTop: 12, borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
            <button
              type="button"
              className="btn-link"
              onClick={() => setShowReserves(!showReserves)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                color: "var(--text)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={15} style={{ color: "var(--accent)" }} />
                <span>2. Zaxira (Rezerv) hisoblar boshlang'ich balansi</span>
              </div>
              {showReserves ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showReserves && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="expense-form__field">
                  <label className="expense-form__label" htmlFor="initial-naqd-res">
                    Naqd zaxira (so'm)
                  </label>
                  <input
                    id="initial-naqd-res"
                    type="number"
                    min="0"
                    step="any"
                    value={naqdReserve}
                    onChange={(e) => setNaqdReserve(e.target.value)}
                    className="expense-form__input mono"
                  />
                </div>

                <div className="expense-form__field">
                  <label className="expense-form__label" htmlFor="initial-karta-res">
                    Karta zaxira (so'm)
                  </label>
                  <input
                    id="initial-karta-res"
                    type="number"
                    min="0"
                    step="any"
                    value={kartaReserve}
                    onChange={(e) => setKartaReserve(e.target.value)}
                    className="expense-form__input mono"
                  />
                </div>

                <div className="expense-form__field">
                  <label className="expense-form__label" htmlFor="initial-dollar-res">
                    Dollar zaxira ($)
                  </label>
                  <input
                    id="initial-dollar-res"
                    type="number"
                    min="0"
                    step="any"
                    value={dollarReserve}
                    onChange={(e) => setDollarReserve(e.target.value)}
                    className="expense-form__input mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="initial-total-preview" style={{ marginTop: 14 }}>
            <span>Barcha hisoblar jami:</span>
            <strong className="mono">{formatSum(grandTotal)}</strong>
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleResetDefault}
              title="Standart qiymatlarga qaytarish"
            >
              <RotateCcw size={14} />
              <span>Standartga</span>
            </button>
            <div className="modal-actions-right">
              <button type="button" className="btn" onClick={onClose}>
                Bekor qilish
              </button>
              <button type="submit" className="btn btn--primary" disabled={isSaving}>
                <Check size={16} />
                <span>Saqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
