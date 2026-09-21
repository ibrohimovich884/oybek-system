import { useState } from "react";
import {
  Wallet,
  CreditCard,
  Banknote,
  BadgeDollarSign,
  ArrowRightLeft,
  Settings2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatRate } from "../../utils/format.js";
import InitialBalanceModal from "./InitialBalanceModal.jsx";

export default function WalletCards({ onOpenTransfer }) {
  const { currentBalances, rateInfo, loadCbuRate } = useExpenses();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  const handleRefreshRate = async () => {
    setIsRefreshingRate(true);
    await loadCbuRate();
    setTimeout(() => setIsRefreshingRate(false), 500);
  };

  const currentRate = rateInfo?.rate || 12850;

  return (
    <>
      <div className="wallet-grid wallet-grid--expanded">
        {/* 1. Umumiy Oddiy Balans */}
        <div className="wallet-card wallet-card--total">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--accent">
              <Wallet size={20} />
            </div>
            <div>
              <span className="wallet-card__tag">Kundalik umumiy mablag'</span>
              {currentBalances.dollar > 0 && (
                <span className="wallet-card__sub-rate">
                  (shundan {formatDollar(currentBalances.dollar)} @ {formatRate(currentRate)})
                </span>
              )}
            </div>
            <button
              type="button"
              className="wallet-card__btn-settings"
              title="Boshlang'ich balanslarni o'zgartirish"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings2 size={16} />
              <span>Sozlash</span>
            </button>
          </div>
          <div className="wallet-card__amount mono">
            {formatSum(currentBalances.totalOddiyWithDollar)}
          </div>
          <div className="wallet-card__footer">
            <span className="wallet-card__stat wallet-card__stat--income">
              <TrendingUp size={14} />
              <span>+{formatSum(currentBalances.totalIncomeUZS)}</span>
            </span>
            <span className="wallet-card__stat wallet-card__stat--expense">
              <TrendingDown size={14} />
              <span>-{formatSum(currentBalances.totalExpenseUZS)}</span>
            </span>
          </div>
        </div>

        {/* 2. Hamyon (Yangi, mustaqil) */}
        <div className="wallet-card wallet-card--hamyon">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--hamyon">
              <Wallet size={20} />
            </div>
            <span className="wallet-card__label">Hamyon</span>
            <span className="wallet-card__badge wallet-card__badge--hamyon">Kundalik</span>
          </div>
          <div className="wallet-card__amount mono" style={{ color: "var(--hamyon, #10b981)" }}>
            {formatSum(currentBalances.hamyon)}
          </div>
          <div className="wallet-card__actions">
            <button
              type="button"
              className="btn btn--subtle btn--hamyon-transfer"
              onClick={() => onOpenTransfer && onOpenTransfer("hamyon", "naqd")}
              title="Hamyondan Naqd yoki Kartaga pul o'tkazish"
            >
              <ArrowRightLeft size={14} />
              <span>Hamyondan o'tkazish</span>
            </button>
          </div>
        </div>

        {/* 3. Naqd pul (Oddiy) */}
        <div className="wallet-card wallet-card--naqd">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--naqd">
              <Banknote size={20} />
            </div>
            <span className="wallet-card__label">Naqd pul</span>
            <span className="wallet-card__badge">Oddiy</span>
          </div>
          <div className="wallet-card__amount mono">
            {formatSum(currentBalances.naqd)}
          </div>
          <div className="wallet-card__actions">
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => onOpenTransfer && onOpenTransfer("naqd", "karta")}
              title="Naqd pulni kartaga o'tkazish"
            >
              <ArrowRightLeft size={14} />
              <span>Kartaga o'tkazish</span>
            </button>
          </div>
        </div>

        {/* 4. Plastik karta (Oddiy) */}
        <div className="wallet-card wallet-card--karta">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--karta">
              <CreditCard size={20} />
            </div>
            <span className="wallet-card__label">Plastik karta</span>
            <span className="wallet-card__badge">Uzcard / Humo</span>
          </div>
          <div className="wallet-card__amount mono">
            {formatSum(currentBalances.karta)}
          </div>
          <div className="wallet-card__actions">
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => onOpenTransfer && onOpenTransfer("karta", "naqd")}
              title="Kartadan naqdga yechish"
            >
              <ArrowRightLeft size={14} />
              <span>Naqdga yechish</span>
            </button>
          </div>
        </div>

        {/* 5. AQSH Dollari (Oddiy) */}
        <div className="wallet-card wallet-card--dollar">
          <div className="wallet-card__header">
            <div className="wallet-card__icon-wrapper wallet-card__icon-wrapper--dollar">
              <BadgeDollarSign size={20} />
            </div>
            <span className="wallet-card__label">AQSH Dollari</span>
            <span className="wallet-card__badge wallet-card__badge--dollar">USD (Oddiy)</span>
            <button
              type="button"
              className="btn-icon btn-icon--sm"
              onClick={handleRefreshRate}
              title="CBU kursini yangilash"
              style={{ marginLeft: "auto" }}
            >
              <RefreshCw size={13} className={isRefreshingRate ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="wallet-card__amount mono" style={{ color: "var(--dollar, #22c55e)" }}>
            {formatDollar(currentBalances.dollar)}
          </div>
          <div className="wallet-card__usd-conv mono">
            ~ {formatSum(currentBalances.dollar * currentRate)}
          </div>
          <div className="wallet-card__actions">
            <button
              type="button"
              className="btn btn--subtle"
              onClick={() => onOpenTransfer && onOpenTransfer("dollar", "karta")}
              title="Dollarni so'mga almashtirish yoki o'tkazish"
            >
              <ArrowRightLeft size={14} />
              <span>So'mga almashtirish</span>
            </button>
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <InitialBalanceModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
