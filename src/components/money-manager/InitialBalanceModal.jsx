import { useState } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { DEFAULT_WALLETS } from "../../constants/money.js";
import { formatSum, formatDollar } from "../../utils/format.js";

export default function InitialBalanceModal({ onClose }) {
  const { initialWallets, updateWallets, rateInfo } = useExpenses();
  const [hamyon, setHamyon] = useState(initialWallets.hamyon ?? DEFAULT_WALLETS.hamyon);
  const [naqd, setNaqd] = useState(initialWallets.naqd ?? DEFAULT_WALLETS.naqd);
  const [karta, setKarta] = useState(initialWallets.karta ?? DEFAULT_WALLETS.karta);
  const [dollar, setDollar] = useState(initialWallets.dollar ?? DEFAULT_WALLETS.dollar);
  const [isSaving, setIsSaving] = useState(false);

  const currentRate = rateInfo?.rate || 12850;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateWallets({
      hamyon: Number(hamyon) || 0,
      naqd: Number(naqd) || 0,
      karta: Number(karta) || 0,
      dollar: Number(dollar) || 0,
    });
    setIsSaving(false);
    onClose();
  };

  const handleResetDefault = () => {
    setHamyon(DEFAULT_WALLETS.hamyon);
    setNaqd(DEFAULT_WALLETS.naqd);
    setKarta(DEFAULT_WALLETS.karta);
    setDollar(DEFAULT_WALLETS.dollar);
  };

  const totalUZS = (Number(hamyon) || 0) + (Number(naqd) || 0) + (Number(karta) || 0);
  const totalWithUSD = totalUZS + (Number(dollar) || 0) * currentRate;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Boshlang'ich balanslarni sozlash</h3>
            <p className="modal-subtitle">
              Sizda bor bo'lgan dastlabki kundalik pul manbalari mablag'larini kiriting
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="expense-form__field">
            <label className="expense-form__label" htmlFor="initial-hamyon">
              Hamyon (so'm) — Kundalik
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

          <div className="initial-total-preview">
            <span>Boshlang'ich jami mablag' (so'mda):</span>
            <strong className="mono">{formatSum(totalWithUSD)}</strong>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleResetDefault}
              title="Standart qiymatlarga qaytarish"
            >
              <RotateCcw size={14} />
              <span>Standartga qaytarish</span>
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
